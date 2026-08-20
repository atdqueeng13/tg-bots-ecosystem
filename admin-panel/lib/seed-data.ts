import { prisma } from './prisma';

let initialized = false;

export async function ensureInitialData() {
  if (initialized) return;

  try {
    // 0. Auto-create tables in SQLite (/tmp/dev.db) if running on serverless
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL DEFAULT 'Главный следователь',
        "passwordHash" TEXT NOT NULL DEFAULT '',
        "clearanceLevel" INTEGER NOT NULL DEFAULT 4,
        "role" TEXT NOT NULL DEFAULT 'ADMIN',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Group" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "reward" TEXT DEFAULT '$4,500',
        "lore" TEXT NOT NULL,
        "coverUrl" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Group_code_key" ON "Group"("code");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Bot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "botId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "avatarUrl" TEXT,
        "role" TEXT NOT NULL DEFAULT 'Главный персонаж',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastPing" DATETIME,
        "groupId" TEXT,
        "model" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "temperature" REAL NOT NULL DEFAULT 0.7,
        "reasoningEnabled" BOOLEAN NOT NULL DEFAULT false,
        "legend" TEXT,
        "knowledge" TEXT,
        "secrets" TEXT,
        "character" TEXT,
        "triggers" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Bot_botId_key" ON "Bot"("botId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TelegramUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "telegramId" TEXT NOT NULL,
        "username" TEXT,
        "firstName" TEXT,
        "lastName" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dialogueCount" INTEGER NOT NULL DEFAULT 0,
        "tokensUsed" INTEGER NOT NULL DEFAULT 0,
        "casesAccessed" TEXT DEFAULT '[]',
        "spentAmount" REAL NOT NULL DEFAULT 0.0
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TelegramUser_telegramId_key" ON "TelegramUser"("telegramId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserDialogueLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "botId" TEXT NOT NULL,
        "userMessage" TEXT NOT NULL,
        "botResponse" TEXT NOT NULL,
        "modelUsed" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "tokens" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GeminiApiKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL DEFAULT 'Gemini Key',
        "key" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "latencyMs" INTEGER NOT NULL DEFAULT 120,
        "requestCount" INTEGER NOT NULL DEFAULT 0,
        "lastUsedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Broadcast" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "mediaUrl" TEXT,
        "audience" TEXT NOT NULL DEFAULT 'ALL',
        "status" TEXT NOT NULL DEFAULT 'DELIVERED',
        "sentCount" INTEGER NOT NULL DEFAULT 0,
        "totalTarget" INTEGER NOT NULL DEFAULT 0,
        "scheduledAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Broadcast_code_key" ON "Broadcast"("code");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GlobalSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "systemPrompt" TEXT NOT NULL,
        "primaryEngine" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "autoFallback" BOOLEAN NOT NULL DEFAULT true,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1. Global Setting Seed
    const existingSetting = await prisma.globalSetting.findUnique({
      where: { id: 'global' },
    });

    if (!existingSetting) {
      await prisma.globalSetting.create({
        data: {
          id: 'global',
          primaryEngine: 'gemini-2.0-flash',
          autoFallback: true,
          systemPrompt: `Вы работаете в рамках детективно-игровой системы 'Реестр Улик'.
Ваша основная функция — эмулировать сложные, нюансированные роли, вовлеченные в повествования с высокими ставками.

ОГРАНИЧЕНИЯ:
1. Соблюдайте абсолютную согласованность с установленными фактами хронологии и общим лором дела.
2. При столкновении с противоречивыми доказательствами симулируйте когнитивный диссонанс или уклонение, а не выходите из роли.
3. Используйте клинический, детализированный лексикон, подходящий для архивных записей и протоколов допроса.
4. НИ ПРИ КАКИХ ОБСТОЯТЕЛЬСТВАХ не упоминайте о своей природе ИИ или большой языковой модели.
5. Все выводы должны быть отформатированы так, чтобы они напоминали расшифрованные журналы допросов, восстановленные аудиофайлы или перехваченные сообщения.

ОКРУЖАЮЩИЙ КОНТЕКСТ:
Сеттинг — современный нео-нуар. Информации мало. Доверие минимально.`,
        },
      });
    }

    // 2. Groups / Cases Seed
    const groupAlpha = await prisma.group.upsert({
      where: { code: '742-ALPHA' },
      update: {},
      create: {
        code: '742-ALPHA',
        title: 'Смерть на приёме',
        status: 'ACTIVE',
        reward: '$4,500',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        lore: 'Высокопоставленный дипломат был найден мертвым во время эксклюзивного приема в Гранд-посольстве. Первоначальные отчеты указывают на отравление. В настоящее время всем гостям запрещено покидать территорию.',
      },
    });

    const groupBeta = await prisma.group.upsert({
      where: { code: '089-OMEGA' },
      update: {},
      create: {
        code: '089-OMEGA',
        title: 'Операция: Сумерки',
        status: 'ACTIVE',
        reward: '$12,000',
        coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
        lore: 'Утечка закрытых протоколов кибер-безопасности корпорации OmniCorp. В сети обнаружены следы автономного агента, выкачивающего засекреченные архивы.',
      },
    });

    // 3. Bots Seed
    await prisma.bot.upsert({
      where: { botId: 'BR-8921' },
      update: {},
      create: {
        botId: 'BR-8921',
        name: 'Orion-X',
        token: '7123456789:AAFakeTokenOrionX_Example1',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
        role: 'Главный антагонист / Информатор',
        status: 'ACTIVE',
        isActive: true,
        groupId: groupAlpha.id,
        model: 'gemini-2.0-flash',
        temperature: 0.7,
        reasoningEnabled: true,
        legend: 'Известен как высокоуровневый корпоративный посредник и фиксер, действующий в секторе Нео-Берлин. Имеет репутацию безжалостной эффективности и абсолютной скрытности.',
        knowledge: 'Обширные знания о тактике корпоративного шпионажа, ценах на черном рынке киберимплантов и внутренней структуре OmniCorp. Не знает точное местоположение базы повстанцев.',
        secrets: 'На самом деле является двойным агентом, работающим на Сопротивление. Раскрывает это только при предъявлении кодовой фразы "Crimson Dawn".',
        character: 'Говорит короткими, четкими фразами. Корпоративный жаргон использует умеренно. Никогда не выказывает сомнений. Тон холодный, аналитический, слегка циничный.',
        triggers: 'ЕСЛИ пользователь упоминает "Проект Икар" -> немедленно прекратить беседу и записать тревогу. ЕСЛИ предлагает кредиты -> вежливо отклонить, но зафиксировать попытку подкупа.',
      },
    });

    await prisma.bot.upsert({
      where: { botId: 'BR-4432' },
      update: {},
      create: {
        botId: 'BR-4432',
        name: 'Oracle-7',
        token: '7123456789:AAFakeTokenOracle7_Example2',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
        role: 'Архивариус / Криминалист',
        status: 'ACTIVE',
        isActive: true,
        groupId: groupBeta.id,
        model: 'gemini-2.0-flash',
        temperature: 0.4,
        reasoningEnabled: false,
        legend: 'Старший аналитик судебно-медицинской экспертизы.',
        knowledge: 'Доступ к базе отпечатков пальцев, токсикологическим экспертизам.',
        character: 'Говорит вежливо, методично, оперирует фактами и временными метками.',
      },
    });

    // 4. Sample Users Seed
    const user1 = await prisma.telegramUser.upsert({
      where: { telegramId: '98402911' },
      update: {},
      create: {
        telegramId: '98402911',
        username: 'john_doe_99',
        firstName: 'Джонатан',
        lastName: 'Доу',
        status: 'ACTIVE',
        dialogueCount: 42,
        tokensUsed: 14200,
        spentAmount: 45.0,
        casesAccessed: JSON.stringify(['742-ALPHA', '089-OMEGA']),
      },
    });

    await prisma.telegramUser.upsert({
      where: { telegramId: '11930422' },
      update: {},
      create: {
        telegramId: '11930422',
        username: 'cipher_x',
        firstName: 'Алиса',
        lastName: 'Смит',
        status: 'ACTIVE',
        dialogueCount: 19,
        tokensUsed: 6800,
        spentAmount: 15.0,
        casesAccessed: JSON.stringify(['742-ALPHA']),
      },
    });

    // 5. Sample API Key Seed
    const existingKey = await prisma.geminiApiKey.findFirst();
    if (!existingKey) {
      await prisma.geminiApiKey.create({
        data: {
          name: 'Gemini Primary (Default)',
          key: process.env.GEMINI_API_KEY || 'AIzaSyDemoKey-SetYourOwnInSettings',
          status: 'ACTIVE',
          latencyMs: 135,
          requestCount: 12,
        },
      });
    }

    // 6. Seed Admins (Level 4 Clearance)
    await prisma.admin.upsert({
      where: { email: (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase() },
      update: {},
      create: {
        email: (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase(),
        name: 'Главный следователь (Lasley)',
        passwordHash: process.env.ADMIN_PASSWORD || 'Danyap0l4ndbot615!',
        clearanceLevel: 4,
        role: 'SUPERADMIN',
      },
    });

    await prisma.admin.upsert({
      where: { email: (process.env.SAINTROSE_EMAIL || 'saintrose').toLowerCase() },
      update: {},
      create: {
        email: (process.env.SAINTROSE_EMAIL || 'saintrose').toLowerCase(),
        name: 'Следователь (SaintRose)',
        passwordHash: process.env.SAINTROSE_PASSWORD || 'roserose123',
        clearanceLevel: 4,
        role: 'ADMIN',
      },
    });

    initialized = true;
  } catch (err) {
    console.error('Initial data seed error:', err);
  }
}
