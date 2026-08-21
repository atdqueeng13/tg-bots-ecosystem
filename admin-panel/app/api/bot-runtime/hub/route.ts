import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/gemini-rotator';
import { syncToFirebaseRTDB } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      telegramId,
      username,
      firstName,
      lastName,
      action = 'start',
      caseId,
      accusedBotId,
      accusationReason,
      starsAmount,
    } = body;

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    // 1. Upsert User
    const user = await prisma.telegramUser.upsert({
      where: { telegramId: String(telegramId) },
      update: {
        lastActive: new Date(),
        ...(username && { username }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
      create: {
        telegramId: String(telegramId),
        username,
        firstName,
        lastName,
        status: 'ACTIVE',
        stage: 'ONBOARDING',
      },
    });

    const casesAccessed: string[] = JSON.parse(user.casesAccessed || '[]');

    // Get the Main Hub Bot
    const hubBot = await prisma.bot.findFirst({
      where: { isMainHub: true },
    });

    const funnelSteps: Array<{
      id: string;
      stepIndex: number;
      text: string;
      delaySeconds: number;
      mediaUrl?: string;
      buttonText?: string;
    }> = JSON.parse(hubBot?.onboardingSteps || '[]');

    // Helper: Build Cases Catalog response
    const buildCasesCatalog = async (customIntro?: string) => {
      const activeCases = await prisma.group.findMany({
        where: { status: 'ACTIVE' },
        include: {
          bots: {
            where: { isActive: true },
            select: { id: true, name: true, role: true, username: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const intro =
        customIntro ||
        `🕵️‍♂️ *Архив Детективных Расследований*\n\nВыберите доступное дело из списка ниже, чтобы получить досье и начать допросы:`;

      const buttons = activeCases.map((c) => ({
        text: `📂 ${c.title} (${c.bots.length} подозр.)${
          c.starsPrice > 0 && !casesAccessed.includes(c.id) ? ` — ⭐ ${c.starsPrice} Stars` : ' — Открыто'
        }`,
        callback_data: `case:${c.id}`,
      }));

      return {
        success: true,
        isFunnel: false,
        text: intro,
        buttons,
        cases: activeCases,
      };
    };

    // --- ACTION: START (Runs Funnel if not completed) ---
    if (action === 'start') {
      // If user already completed funnel or no funnel steps exist, show cases catalog directly
      if (user.funnelCompleted || funnelSteps.length === 0) {
        return NextResponse.json(await buildCasesCatalog());
      }

      // Serve Step 0 of the Funnel
      const currentStepIndex = 0;
      const step = funnelSteps[currentStepIndex] || {
        text: 'Добро пожаловать в Детективное Бюро!',
        delaySeconds: 0,
        buttonText: 'Начать ➡️',
      };

      const isLastStep = funnelSteps.length <= 1;

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: { funnelStep: currentStepIndex },
      });

      return NextResponse.json({
        success: true,
        isFunnel: true,
        stepIndex: currentStepIndex,
        totalSteps: funnelSteps.length,
        text: step.text,
        delaySeconds: step.delaySeconds || 0,
        mediaUrl: step.mediaUrl || null,
        buttons: [
          {
            text: step.buttonText || (isLastStep ? '📂 Открыть архив Дел' : 'Далее ➡️'),
            callback_data: isLastStep ? 'hub:cases' : `funnel_step:${currentStepIndex + 1}`,
          },
        ],
      });
    }

    // --- ACTION: FUNNEL STEP (Next step in onboarding) ---
    if (action === 'funnel_step') {
      const nextStepIndex = typeof body.stepIndex === 'number' ? body.stepIndex : user.funnelStep + 1;

      // If reached end of funnel
      if (nextStepIndex >= funnelSteps.length) {
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: { funnelCompleted: true, stage: 'INVESTIGATING' },
        });

        return NextResponse.json(
          await buildCasesCatalog(`🎉 *Вводный инструктаж завершен!*\n\nВаш значок детектива активирован. Выберите свое первое расследование:`)
        );
      }

      const step = funnelSteps[nextStepIndex];
      const isLastStep = nextStepIndex === funnelSteps.length - 1;

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: { funnelStep: nextStepIndex },
      });

      return NextResponse.json({
        success: true,
        isFunnel: true,
        stepIndex: nextStepIndex,
        totalSteps: funnelSteps.length,
        text: step.text,
        delaySeconds: step.delaySeconds || 0,
        mediaUrl: step.mediaUrl || null,
        buttons: [
          {
            text: step.buttonText || (isLastStep ? '📂 Открыть архив Дел' : 'Далее ➡️'),
            callback_data: isLastStep ? 'hub:cases' : `funnel_step:${nextStepIndex + 1}`,
          },
        ],
      });
    }

    // --- ACTION: CASES (Command /cases or /menu - Shows Catalog Anytime) ---
    if (action === 'cases' || action === 'menu') {
      return NextResponse.json(await buildCasesCatalog());
    }

    // --- ACTION: CHAT (Freeform text to Main Hub Bot) ---
    if (action === 'chat') {
      const userMessage = String(body.userMessage || '').trim();

      // Check if user is typing commands
      if (userMessage.startsWith('/cases') || userMessage.startsWith('/menu')) {
        return NextResponse.json(await buildCasesCatalog());
      }

      // If funnel is NOT completed, lock AI
      if (!user.funnelCompleted && funnelSteps.length > 0) {
        const step = funnelSteps[user.funnelStep] || funnelSteps[0];
        return NextResponse.json({
          success: true,
          isFunnel: true,
          text: `⚠️ *Сначала завершите вводный инструктаж!*\n\nНажмите кнопку ниже, чтобы продолжить знакомство с правилами:`,
          buttons: [
            {
              text: step?.buttonText || 'Продолжить ➡️',
              callback_data: `funnel_step:${user.funnelStep + 1}`,
            },
          ],
        });
      }

      // If funnel is completed, AI Chief Assistant responds
      const activeCases = await prisma.group.findMany({
        where: { status: 'ACTIVE' },
        include: { bots: { where: { isActive: true }, select: { name: true, role: true } } },
      });

      const casesLoreSnippet = activeCases
        .map(
          (c) =>
            `- Дело "${c.title}": ${c.lore || 'без описания'}. Подозреваемые: ${c.bots
              .map((b) => `${b.name} (${b.role})`)
              .join(', ')}. Стоимость: ${c.starsPrice > 0 ? `${c.starsPrice} Stars` : 'Бесплатно'}.`
        )
        .join('\n');

      const systemPrompt = `${hubBot?.prompt || 'Ты — Шеф Детективного Бюро Скотланд-Ярда.'}
ДАННЫЕ АКТИВНЫХ ДЕЛ СЕГОДНЯ:
${casesLoreSnippet}

ДАННЫЕ ИГРОКА:
- Имя сыщика: ${user.firstName || user.username || 'Сыщик'}
- Текущее расследуемое дело ID: ${user.activeCaseId || 'Не выбрано'}

ПРАВИЛА ОТВЕТОВ:
1. Отвечай солидно, в атмосфере классического детективного романа.
2. Напоминай сыщику о доступных делах дня и открытых расследованиях.
3. Если сыщик хочет открыть список дел или оплатить, подскажи команду /cases.
4. Если сыщик готов обвинить преступника, подскажи команду /accuse.
5. Не раскрывай истину дел и имена убийц напрямую!`;

      const aiResponse = await generateWithGemini({
        systemPrompt,
        userPrompt: userMessage,
        modelName: hubBot?.model || 'gemini-3.6-flash',
        temperature: 0.7,
      });

      return NextResponse.json({
        success: true,
        isFunnel: false,
        text: aiResponse.text,
        buttons: [
          { text: '📂 Открыть архив Дел (/cases)', callback_data: 'hub:cases' },
        ],
      });
    }

    // --- ACTION: SELECT CASE / DOSSIER ---
    if (action === 'select_case') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId },
        include: {
          bots: {
            where: { isActive: true },
            select: { id: true, name: true, role: true, username: true },
          },
        },
      });

      if (!targetCase) {
        return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
      }

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: { activeCaseId: targetCase.id, stage: 'INVESTIGATING' },
      });

      const briefing = `📁 *${targetCase.title}*\n\n📜 *Обстоятельства преступления:*\n${targetCase.lore || 'Детали уточняются.'}\n\n🚪 *В коридоре перед вашим кабинетом ждут подозреваемые:*\nВы можете вызывать их на допрос в любом порядке. Будьте внимательны: они нервничают, передают слухи и пытаются скрыть свои секреты!`;

      const suspectButtons = targetCase.bots.map((b) => ({
        text: `👤 Допросить: ${b.name} (${b.role})`,
        url: b.username ? `https://t.me/${b.username.replace('@', '')}?start=case_${targetCase.id}_${telegramId}` : undefined,
        callback_data: !b.username ? `talk:${b.id}` : undefined,
      }));

      suspectButtons.push({
        text: '⚖️ Предъявить обвинение (/accuse)',
        url: undefined,
        callback_data: `accuse_menu:${targetCase.id}`,
      });

      return NextResponse.json({
        success: true,
        text: briefing,
        buttons: suspectButtons,
        case: targetCase,
      });
    }

    // --- ACTION: ACCUSE MENU ---
    if (action === 'accuse_select') {
      const activeCase = await prisma.group.findUnique({
        where: { id: caseId || user.activeCaseId || '' },
        include: { bots: { where: { isActive: true } } },
      });

      if (!activeCase) {
        return NextResponse.json({ error: 'Активное дело не найдено' }, { status: 404 });
      }

      const text = `⚖️ *ПРЕДЪЯВЛЕНИЕ ОБВИНЕНИЯ*\n\nКого из подозреваемых вы считаете настоящим убийцей? Выберите персонажа:`;

      const buttons = activeCase.bots.map((b) => ({
        text: `🎯 Обвинить: ${b.name}`,
        callback_data: `accuse_bot:${activeCase.id}:${b.id}`,
      }));

      return NextResponse.json({
        success: true,
        text,
        buttons,
      });
    }

    // --- ACTION: SUBMIT ACCUSATION ---
    if (action === 'submit_accusation') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId || user.activeCaseId || '' },
        include: { bots: true },
      });

      if (!targetCase) {
        return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
      }

      const accusedBot = targetCase.bots.find((b) => b.id === accusedBotId);
      const isActualKiller = accusedBot?.isGuilty || (targetCase.isGuiltyBotId && accusedBot?.id === targetCase.isGuiltyBotId);

      const evaluationPrompt = `ТЫ ГЛАВНЫЙ СУДЬЯ И ВЕДУЩИЙ ДЕТЕКТИВНОЙ ИГРЫ.
МАТЕРИАЛЫ ДЕЛА: ${targetCase.title}
ИСТИНА ПРЕСТУПЛЕНИЯ (ЗАКРЫТАЯ ИНФОРМАЦИЯ):
${targetCase.solutionTruth || targetCase.lore}

ОБВИНЕННЫЙ ИГРОКОМ: ${accusedBot?.name || 'Неизвестный'} (Является ли убийцей по факту: ${isActualKiller ? 'ДА, ЭТО УБИЙЦА' : 'НЕТ, ЭТО НЕВИНОВНЫЙ'})
ОБОСНОВАНИЕ ИГРОКА: "${accusationReason || 'Без комментариев'}"

ТВОЯ ЗАДАЧА:
1. Вынеси вердикт расследованию в ярком, атмосферном детективном стиле.
2. Поставь детективную оценку от 1 до 10.
3. Если обвинен убийца: похвали за раскрытие, объясни, как именно детектив раскусил его нескладную ложь, и раскрой полную картину преступления.
4. Если обвинен невиновный: драматично опиши, как настоящий убийца остался на свободе, раскрой истинную правду и покажи, где детектив ошибся.`;

      const aiVerdict = await generateWithGemini({
        systemPrompt: evaluationPrompt,
        userPrompt: `Вынеси вердикт по делу ${targetCase.title}. Обвиняемый: ${accusedBot?.name}. Аргументы: ${accusationReason}`,
        modelName: 'gemini-2.0-flash',
        temperature: 0.5,
      });

      const verdictText = aiVerdict.text;
      const isSolved = Boolean(isActualKiller);

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: {
          stage: isSolved ? 'SOLVED' : 'FAILED',
          stageStatus: isSolved ? 'COMPLETED' : 'FAILED',
        },
      });

      syncToFirebaseRTDB(`verdicts/${user.id}_${targetCase.id}`, {
        telegramId: String(telegramId),
        caseTitle: targetCase.title,
        accused: accusedBot?.name,
        isSolved,
        verdictText,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        isSolved,
        accusedBotName: accusedBot?.name,
        verdictText,
      });
    }

    // --- ACTION: STARS PAYMENT ---
    if (action === 'stars_paid') {
      if (caseId && !casesAccessed.includes(caseId)) {
        casesAccessed.push(caseId);
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: {
            casesAccessed: JSON.stringify(casesAccessed),
            spentAmount: { increment: starsAmount ? Number(starsAmount) : 0 },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Дело успешно разблокировано!',
      });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    console.error('Hub error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
