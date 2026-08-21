import { prisma } from './prisma';

let initialized = false;

export async function ensureInitialData() {
  if (initialized) return;
  initialized = true;

  try {
    // 1. Global Setting Seed
    try {
      const existingGlobal = await prisma.globalSetting.findUnique({ where: { id: 'global' } });
      if (!existingGlobal) {
        await prisma.globalSetting.create({
          data: {
            id: 'global',
            primaryEngine: 'gemini-3.6-flash',
            apiKeyMode: 'AUTO_ROTATION',
            autoFallback: true,
            systemPrompt: `Ты — ИИ-ассистент в Telegram. Отвечай структурированно, профессионально и по существу, строго следуя инструкциям бота.`,
          },
        });
      }
    } catch (e) {
      console.warn('GlobalSetting seed note:', e);
    }

    // 2. Seed Primary API Key if provided in env
    const envKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (envKey && !envKey.includes('AIzaSyB...')) {
      const existingKey = await prisma.geminiApiKey.findFirst();
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
        });
      }
    }

    // 3. Seed Admins
    try {
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
      });
    } catch (e) {
      console.warn('Admin seed note:', e);
    }

    // 4. Seed Default Detective Case: Case #1 Blackwood
    const defaultCase = await prisma.group.upsert({
      where: { code: 'case_blackwood' },
      update: {},
      create: {
        code: 'case_blackwood',
        title: 'Дело №1: Тайна особняка Блэквуд',
        status: 'ACTIVE',
        starsPrice: 0, // Бесплатный демо-кейс
        lore: `Лорд Артур Блэквуд был найден мертвым в своем запертом кабинете ровно в 23:30. На дубовом столе стоял недопитый бокал выдержанного бренди. Судмедэкспертиза показала наличие редкого растительного яда кураре. В этот вечер в особняке находились 5 человек: племянник-наследник, молодая вдова, дворецкий, личный врач и садовник. Все они сейчас сидят в коридоре перед кабинетом следователя.`,
        prompt: `Все события происходят в викторианском особняке Блэквуд. Время смерти: между 22:45 и 23:15. Убийство совершено через отравленный бренди.`,
        solutionTruth: `Настоящий убийца — Дворецкий Джеймс Спенсер. Мотив: Лорд Блэквуд в этот вечер обнаружил крупную недостачу и подделку подписей на чеках и пообещал вызвать полицию утром. Джеймс проник в кабинет в 22:45 и подмешал каплю кураре в любимый графин бренди. При жестком давлении Джеймс начинает нервничать, путает время и выдает нелепое алиби: будто он в 22:45 случайно забрел в крыло лорда, потому что искал в темноте оброненные карманные часы.`,
      },
    });

    // 5. Seed Suspects for Case #1
    const suspectsSeed = [
      {
        botId: 'BR-8921',
        name: 'Марк Уитфилд',
        role: 'Племянник и наследник',
        groupId: defaultCase.id,
        isGuilty: false,
        token: process.env.BOT_01_TOKEN || '1234567890:DEMO_TOKEN_BOT1',
        prompt: `Ты — Марк Уитфилд, 28 лет, племянник убитого. Ты модно одет, но выглядишь нервным и уставшим. Дядя отказался покрыть твои карточные долги. С 22:30 до 23:15 ты был в бильярдной, но никто не может это подтвердить.`,
        secretAlibi: `Да, я соврал, что был в бильярдной! На самом деле в 22:40 я тайком проник в библиотеку и украл из сейфа дяди долговые расписки, чтобы спастись от ростовщиков. Но когда я уходил, дядя был жив и читал газету!`,
      },
      {
        botId: 'BR-4432',
        name: 'Виктория Блэквуд',
        role: 'Молодая вдова',
        groupId: defaultCase.id,
        isGuilty: false,
        token: process.env.BOT_02_TOKEN || '1234567890:DEMO_TOKEN_BOT2',
        prompt: `Ты — леди Виктория, 26 лет. Холодная, элегантная, держишься с достоинством, но скрываешь тайный роман. Ты утверждаешь, что весь вечер была в спальне с мигренью.`,
        secretAlibi: `Хорошо, следователь, я скажу правду! С 22:30 до 23:00 я была в оранжерее на тайном свидании с доктором Мортимером. Мы любим друг друга. Артур собирался подать на развод и лишить меня содержания. Но мы не убивали его!`,
      },
      {
        botId: 'BR-9901',
        name: 'Джеймс Спенсер',
        role: 'Дворецкий (УБИЙЦА)',
        groupId: defaultCase.id,
        isGuilty: true,
        token: process.env.BOT_03_TOKEN || '1234567890:DEMO_TOKEN_BOT3',
        prompt: `Ты — Джеймс Спенсер, 52 года, дворецкий особняка. Безупречные манеры, спокойный тон, идеальная выдержка. Ты утверждаешь, что весь вечер был в буфетной и начищал фамильное серебро. На самом деле ТЫ УБИЛ ЛОРДА.`,
        secretAlibi: `[Паникует, сбивается с дыхания]: Я... я был возле кабинета лорда в 22:45, да! Но только потому, что уронил там свои золотые часы и искал их на ковре в темноте! Я ничего не трогал и не подсыпал!`,
      },
      {
        botId: 'BR-1004',
        name: 'Доктор Мортимер',
        role: 'Семейный врач',
        groupId: defaultCase.id,
        isGuilty: false,
        token: process.env.BOT_04_TOKEN || '1234567890:DEMO_TOKEN_BOT4',
        prompt: `Ты — доктор Джон Мортимер, 45 лет. Интеллигентный, но дергается при упоминании лекарств и ядов. В твоей аптечке действительно был кураре для медицинских опытов.`,
        secretAlibi: `Я признаюсь! Неделю назад я заметил, что склянка с кураре пропала из моего саквояжа в буфетной. Я побоялся сказать Артуру, думая, что сам потерял её. А в 22:30 я был в оранжерее с Викторией!`,
      },
      {
        botId: 'BR-1005',
        name: 'Томас Рид',
        role: 'Садовник',
        groupId: defaultCase.id,
        isGuilty: false,
        token: process.env.BOT_05_TOKEN || '1234567890:DEMO_TOKEN_BOT5',
        prompt: `Ты — Томас Рид, 60 лет, угрюмый садовник. Говоришь простыми короткими фразами, куришь трубку. В 23:00 ты запирал теплицу и видел силуэты через окна особняка.`,
        secretAlibi: `Я видел, как в 22:45 в кабинет лорда заходил человек в черном фраке слуги и нес поднос. А через пять минут он выбежал оттуда и оглядывался по сторонам. Это был точно дворецкий Джеймс!`,
      },
    ];

    for (const s of suspectsSeed) {
      await prisma.bot.upsert({
        where: { botId: s.botId },
        update: {
          groupId: s.groupId,
          isGuilty: s.isGuilty,
          secretAlibi: s.secretAlibi,
        },
        create: {
          botId: s.botId,
          name: s.name,
          role: s.role,
          groupId: s.groupId,
          token: s.token,
          isGuilty: s.isGuilty,
          secretAlibi: s.secretAlibi,
          prompt: s.prompt,
          model: 'gemini-2.0-flash',
        },
      });
    }

    // 6. Seed Main Hub Bot (Fixed single Game Master with Onboarding Funnel)
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
        text: `📋 *Как проходит расследование:*\n\n1️⃣ Вы выбираете доступное Дело из архива.\n2️⃣ Получаете досье и доступ к личным контактам всех подозреваемых.\n3️⃣ Допрашиваете каждого персонажа по очереди. Помните: невиновные скрывают свои тайны, а убийца — паникует и выдумывает нелепую ложь!`,
        delaySeconds: 2,
        mediaUrl: '',
        buttonText: 'Понятно, что дальше? 🔍',
      },
      {
        id: 'step_3',
        stepIndex: 2,
        text: `⚖️ *Вынесение вердикта:*\n\nКогда у вас сложится картина преступления, используйте команду */accuse* в этом боте, укажите имя преступника и мотив. Суд оценит вашу логику по 10-балльной шкале!\n\nИспользуйте команду */cases*, чтобы в любой момент открыть список расследований.`,
        delaySeconds: 2,
        mediaUrl: '',
        buttonText: '📂 Открыть архив Дел',
      },
    ];

    await prisma.bot.upsert({
      where: { botId: 'hub_main' },
      update: {
        isMainHub: true,
      },
      create: {
        botId: 'hub_main',
        name: 'Детективное Бюро (Главный Хаб)',
        role: 'Шеф Бюро / Архивариус',
        token: process.env.MAIN_BOT_TOKEN || '1234567890:DEMO_HUB_TOKEN',
        isMainHub: true,
        model: 'gemini-3.6-flash',
        onboardingSteps: JSON.stringify(defaultFunnelSteps),
        prompt: `Ты — Шеф Детективного Бюро Скотланд-Ярда и Главный Архивариус.
Твоя задача — помогать сыщикам, напоминать об их открытых делах, презентовать новые расследования дня и оценивать финальные обвинения (/accuse).
Общайся солидно, сдержанно, по-детективному, в духе классических романов Артура Конан Дойла.
Если сыщик спрашивает о доступных делах, подскажи ему команду /cases или кратко расскажи про "Дело №1: Тайна особняка Блэквуд".`,
      },
    });

    initialized = true;
  } catch (err) {
    console.error('Initial data seed error:', err);
  }
}
