import { prisma } from './prisma';

export async function ensureInitialData() {
  try {
    // 1. Global Setting
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

    // 2. Groups / Cases
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

    // 3. Bots
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

    // 4. Sample Users
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

    const user2 = await prisma.telegramUser.upsert({
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

    // 5. Sample Dialogue Log
    const orionBot = await prisma.bot.findUnique({ where: { botId: 'BR-8921' } });
    if (orionBot) {
      const existingLog = await prisma.userDialogueLog.findFirst({
        where: { userId: user1.id },
      });
      if (!existingLog) {
        await prisma.userDialogueLog.create({
          data: {
            userId: user1.id,
            botId: orionBot.id,
            userMessage: 'Кто стоял у входа в архив в 21:00?',
            botResponse: '[ПРОТОКОЛ ДОПРОСА #849]: Записи камер повреждены, однако в журнале регистрации числится пропуск с идентификатором посла Волкова.',
            modelUsed: 'gemini-2.0-flash',
            tokens: 142,
            status: 'SUCCESS',
          },
        });
      }
    }

    // 6. Sample Broadcast
    const existingBroadcast = await prisma.broadcast.findFirst();
    if (!existingBroadcast) {
      await prisma.broadcast.create({
        data: {
          code: 'BC-8892',
          message: 'Внимание всем агентам: получены новые данные по делу 742-ALPHA. Проверьте реестр улик.',
          audience: 'Дело: 742-ALPHA',
          status: 'DELIVERED',
          sentCount: 148,
          totalTarget: 148,
        },
      });
    }

    // 7. Sample API Key if empty
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
  } catch (err) {
    console.error('Initial data seed error:', err);
  }
}
