import { prisma } from './prisma';

let isSeeding = false;

export async function ensureInitialData() {
  if (isSeeding) return;
  isSeeding = true;

  try {
    // 1. Global Setting Seed
    const existingGlobal = await prisma.globalSetting.findUnique({ where: { id: 'global' } }).catch(() => null);
    if (!existingGlobal) {
      await prisma.globalSetting.create({
        data: {
          id: 'global',
          primaryEngine: 'gemini-3.6-flash',
          apiKeyMode: 'AUTO_ROTATION',
          autoFallback: true,
          systemPrompt: `Ты — ИИ-ассистент в Telegram. Отвечай структурированно, профессионально и по существу, строго следуя инструкциям бота.`,
        },
      }).catch(() => {});
    }

    // 2. Seed Primary API Key if provided in env
    const envKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (envKey && !envKey.includes('AIzaSyB...')) {
      const existingKey = await prisma.geminiApiKey.findFirst().catch(() => null);
      if (!existingKey) {
        await prisma.geminiApiKey.create({
          data: {
            name: 'Google Gemini (Основной)',
            key: envKey,
            provider: 'gemini',
            status: 'ACTIVE',
            isPrimary: true,
            latencyMs: 110,
          },
        }).catch(() => {});
      }
    }

    // 3. Seed Admins
    await prisma.admin.upsert({
      where: { email: (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase() },
      update: {},
      create: {
        email: (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase(),
        name: 'Главный администратор (Lasley)',
        passwordHash: process.env.ADMIN_PASSWORD || 'Danyap0l4ndbot615!',
        clearanceLevel: 4,
        role: 'SUPERADMIN',
      },
    }).catch(() => {});

    // 4. Seed Main Hub Bot (Only if no main hub bot exists)
    const existingHub = await prisma.bot.findFirst({ where: { isMainHub: true } }).catch(() => null);
    if (!existingHub) {
      const defaultFunnelSteps = [
        {
          id: 'step_1',
          stepIndex: 0,
          text: `🕵️‍♂️ *Добро пожаловать в Детективное Бюро Скотланд-Ярда!*\n\nВы приняты на службу в качестве младшего инспектора. Здесь расследуются самые загадочные и громкие преступления Лондона.`,
          delaySeconds: 0,
          mediaUrl: '',
          buttonText: 'Получить инструкции 📜',
        },
        {
          id: 'step_2',
          stepIndex: 1,
          text: `📋 *Как проходит расследование:*\n\n1️⃣ Вы выбираете доступное Дело из архива.\n2️⃣ Получаете досье и доступ к личным контактам всех подозреваемых.\n3️⃣ Допрашиваете каждого персонажа по очереди.`,
          delaySeconds: 2,
          mediaUrl: '',
          buttonText: 'Понятно, что дальше? 🔍',
        },
        {
          id: 'step_3',
          stepIndex: 2,
          text: `⚖️ *Вынесение вердикта:*\n\nКогда у вас сложится картина преступления, используйте команду */accuse* в этом боте, укажите имя преступника и мотив.\n\nИспользуйте команду */cases*, чтобы в любой момент открыть список расследований.`,
          delaySeconds: 2,
          mediaUrl: '',
          buttonText: '📂 Открыть архив Дел',
        },
      ];

      await prisma.bot.create({
        data: {
          botId: 'hub_main',
          name: 'Детективное Бюро (Главный Хаб)',
          role: 'Шеф Бюро / Архивариус',
          token: process.env.MAIN_BOT_TOKEN || '1234567890:DEMO_HUB_TOKEN',
          isMainHub: true,
          model: 'gemini-3.6-flash',
          onboardingSteps: JSON.stringify(defaultFunnelSteps),
          prompt: `Ты — Шеф Детективного Бюро Скотланд-Ярда и Главный Архивариус.
Твоя задача — помогать сыщикам, напоминать об их открытых делах, презентовать новые расследования дня и оценивать финальные обвинения (/accuse).
Общайся солидно, сдержанно, по-детективному, в духе классических романов Артура Конан Дойла.`,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Initial data seed soft error:', err);
  } finally {
    isSeeding = false;
  }
}
