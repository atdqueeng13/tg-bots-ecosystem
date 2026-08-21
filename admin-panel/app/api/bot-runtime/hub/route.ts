import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/gemini-rotator';
import { buildHubSystemPrompt } from '@/lib/prompt-builder';
import { checkPromptInjection } from '@/lib/security-guard';
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
      stepIndex,
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
    const caseProgressMap: Record<string, any> = JSON.parse(user.caseProgress || '{}');

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
            select: { id: true, name: true, role: true, username: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const intro =
        customIntro ||
        `🕵️‍♂️ *Архив Детективных Расследований*\n\nВыберите доступное дело из списка ниже, чтобы получить досье и начать допросы:`;

      const buttons = activeCases.map((c) => {
        const isFree = c.starsPrice === 0;
        const isUnlocked = casesAccessed.includes(c.id) || isFree;
        return {
          text: `📂 ${c.title} (${c.bots.length} подозр.)${
            !isUnlocked ? ` — ⭐ ${c.starsPrice} Stars` : ' — Открыто'
          }`,
          callback_data: `case:${c.id}`,
        };
      });

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
      if (user.funnelCompleted || funnelSteps.length === 0) {
        return NextResponse.json(await buildCasesCatalog());
      }

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
      const nextStepIndex = typeof stepIndex === 'number' ? stepIndex : user.funnelStep + 1;

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

    // --- ACTION: CASES (Command /cases or /menu) ---
    if (action === 'cases' || action === 'menu') {
      return NextResponse.json(await buildCasesCatalog());
    }

    // --- ACTION: CHAT (Freeform text to Main Hub Bot) ---
    if (action === 'chat') {
      const userMessage = String(body.userMessage || '').trim();

      if (userMessage.startsWith('/cases') || userMessage.startsWith('/menu')) {
        return NextResponse.json(await buildCasesCatalog());
      }

      if (userMessage.startsWith('/accuse')) {
        return NextResponse.json(await handleAccuseSelect(user.activeCaseId));
      }

      // Anti-Jailbreak check for Hub Bot
      const injection = checkPromptInjection(userMessage, { name: 'Шеф Бюро', isMainHub: true });
      if (injection.isInjection) {
        return NextResponse.json({
          success: true,
          isFunnel: false,
          text: injection.refusalText,
          buttons: [{ text: '📂 Открыть архив Дел (/cases)', callback_data: 'hub:cases' }],
        });
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

      // Check if user is typing an accusation by name / alias
      if (user.activeCaseId) {
        const activeCase = await prisma.group.findUnique({
          where: { id: user.activeCaseId },
          include: { bots: { where: { isActive: true } } },
        });

        if (activeCase) {
          const lower = userMessage.toLowerCase();
          let aliasesMap: Record<string, string[]> = {};
          try {
            aliasesMap = JSON.parse(activeCase.accusationAliases || '{}');
          } catch {}

          for (const suspect of activeCase.bots) {
            const suspectNameLower = suspect.name.toLowerCase();
            const suspectAliases = (aliasesMap[suspect.id] || []).map((a) => a.toLowerCase());
            const matchesName = lower.includes(suspectNameLower) || suspectNameLower.split(' ').some((part) => part.length > 3 && lower.includes(part));
            const matchesAlias = suspectAliases.some((alias) => lower.includes(alias));

            if ((matchesName || matchesAlias) && (lower.includes('обвиня') || lower.includes('убийц') || lower.includes('виновен') || lower.includes('виновен') || lower.includes('это '))) {
              return NextResponse.json({
                success: true,
                text: `⚖️ *ПОДТВЕРЖДЕНИЕ ОБВИНЕНИЯ*\n\nВы упомянули подозреваемого **${suspect.name}**.\nВы действительно хотите официально предъявить ему обвинение в убийстве?\n\n⚠️ *Отозвать обвинение будет нельзя. Это действие завершит расследование!*`,
                buttons: [
                  { text: `🎯 Да, обвинить: ${suspect.name}`, callback_data: `accuse_execute:${activeCase.id}:${suspect.id}` },
                  { text: '❌ Отмена', callback_data: `accuse_menu:${activeCase.id}` },
                ],
              });
            }
          }
        }
      }

      // AI Chief Assistant with dedicated isolated prompt
      const activeCases = await prisma.group.findMany({
        where: { status: 'ACTIVE' },
        include: {
          bots: {
            where: { isActive: true },
            select: { name: true, role: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      const chiefSystemPrompt = buildHubSystemPrompt(hubBot, activeCases, {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        activeCaseId: user.activeCaseId,
        stage: user.stage,
        casesAccessed,
      });

      const aiResponse = await generateWithGemini({
        systemPrompt: chiefSystemPrompt,
        userPrompt: userMessage,
        modelName: hubBot?.model || 'gemini-3.6-flash',
        temperature: hubBot?.temperature !== undefined ? hubBot.temperature : 0.7,
      });

      return NextResponse.json({
        success: true,
        isFunnel: false,
        text: aiResponse.text,
        buttons: [
          { text: '📂 Открыть архив Дел (/cases)', callback_data: 'hub:cases' },
          ...(user.activeCaseId ? [{ text: '⚖️ Обвинить (/accuse)', callback_data: `accuse_menu:${user.activeCaseId}` }] : []),
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
            select: { id: true, name: true, role: true, username: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!targetCase) {
        return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
      }

      // If free case, auto-unlock
      if (targetCase.starsPrice === 0 && !casesAccessed.includes(targetCase.id)) {
        casesAccessed.push(targetCase.id);
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: {
            casesAccessed: JSON.stringify(casesAccessed),
            activeCaseId: targetCase.id,
            stage: 'INVESTIGATING',
          },
        });
      } else {
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: { activeCaseId: targetCase.id, stage: 'INVESTIGATING' },
        });
      }

      const isPaidAndLocked = targetCase.starsPrice > 0 && !casesAccessed.includes(targetCase.id);

      if (isPaidAndLocked) {
        return NextResponse.json({
          success: true,
          text: `📁 *${targetCase.title}*\n\n📜 *Обстоятельства преступления:*\n${targetCase.lore || 'Детали закрыты грифом секретности.'}\n\n⭐ *Стоимость доступа:* ${targetCase.starsPrice} Telegram Stars\nОплатите доступ для вызова подозреваемых на допрос:`,
          buttons: [
            { text: `⭐ Открыть дело (${targetCase.starsPrice} Stars)`, callback_data: `pay_case:${targetCase.id}` },
            { text: '⬅️ Назад в архив дел', callback_data: 'hub:cases' },
          ],
        });
      }

      const briefing = `📁 *${targetCase.title}*\n\n📜 *Обстоятельства преступления:*\n${targetCase.lore || 'Детали расследования.'}\n\n🚪 *Подозреваемые по делу:*
Вы можете вызывать их на допрос в любом порядке. Будьте внимательны: каждый что-то скрывает!`;

      const suspectButtons = targetCase.bots.map((b, idx) => ({
        text: `👤 #${b.orderIndex || idx + 1} ${b.name} (${b.role})`,
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

    // Helper for accuse select
    async function handleAccuseSelect(targetCaseId?: string | null) {
      const activeCase = await prisma.group.findUnique({
        where: { id: targetCaseId || user.activeCaseId || '' },
        include: {
          bots: {
            where: { isActive: true },
            select: { id: true, name: true, role: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!activeCase) {
        return {
          success: false,
          text: '⚠️ *У вас нет активного дела для обвинения.*\nСначала выберите расследование через команду /cases.',
          buttons: [{ text: '📂 Выбрать дело (/cases)', callback_data: 'hub:cases' }],
        };
      }

      const text = `⚖️ *ПРЕДЪЯВЛЕНИЕ ОБВИНЕНИЯ*\nДело: «${activeCase.title}»\n\nКого из подозреваемых вы считаете настоящим убийцей? Выберите персонажа:`;

      const buttons = activeCase.bots.map((b, idx) => ({
        text: `🎯 #${b.orderIndex || idx + 1} ${b.name}`,
        callback_data: `accuse_confirm:${activeCase.id}:${b.id}`,
      }));

      buttons.push({
        text: '⬅️ Назад к досье дела',
        callback_data: `case:${activeCase.id}`,
      });

      return {
        success: true,
        text,
        buttons,
      };
    }

    // --- ACTION: ACCUSE SELECT MENU ---
    if (action === 'accuse_select') {
      const result = await handleAccuseSelect(caseId);
      return NextResponse.json(result);
    }

    // --- ACTION: ACCUSE CONFIRM PROMPT ---
    if (action === 'accuse_confirm') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId || user.activeCaseId || '' },
        include: { bots: true },
      });

      if (!targetCase) {
        return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
      }

      const accusedBot = targetCase.bots.find((b) => b.id === accusedBotId);
      if (!accusedBot) {
        return NextResponse.json({ error: 'Подозреваемый не найден' }, { status: 404 });
      }

      const confirmText = `⚖️ *ПОДТВЕРЖДЕНИЕ ОБВИНЕНИЯ*

Вы официально предъявляете обвинение в убийстве подозреваемому:
👤 **${accusedBot.name}** (${accusedBot.role || 'Подозреваемый'})

⚠️ *Внимание: отозвать обвинение будет невозможно. Это решение окончательно завершит следствие по делу!*`;

      return NextResponse.json({
        success: true,
        text: confirmText,
        buttons: [
          {
            text: `🎯 Да, подтверждаю обвинение!`,
            callback_data: `accuse_execute:${targetCase.id}:${accusedBot.id}`,
          },
          {
            text: `❌ Отмена (вернуться к выбору)`,
            callback_data: `accuse_menu:${targetCase.id}`,
          },
        ],
      });
    }

    // --- ACTION: ACCUSE EXECUTE (DETERMINISTIC FINAL) ---
    if (action === 'accuse_execute' || action === 'submit_accusation') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId || user.activeCaseId || '' },
        include: { bots: true },
      });

      if (!targetCase) {
        return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });
      }

      const accusedBot = targetCase.bots.find((b) => b.id === accusedBotId);
      const isActualKiller = accusedBot?.isGuilty || (targetCase.isGuiltyBotId && accusedBot?.id === targetCase.isGuiltyBotId);

      const defaultWinText = `🎉 *ДЕЛО РАСКРЫТО! БЛЕСТЯЩАЯ ПОБЕДА!*

Утро. Из театра выносят бутафорский гроб из второго акта.
Артём Вьюгин идёт мимо в наручниках и, не удержавшись, поправляет воротник статисту:
— «Держите спину. В кадре всё имеет значение».

Премьеру «Перехода» отменяют. В программку допечатывают:
*«Исполнитель роли Лакея — Артём Вьюгин. Впервые и в последний раз — в роли себя»*.`;

      const defaultLoseText = `❌ *ОШИБКА СЛЕДСТВИЯ! НАСТОЯЩИЙ УБИЙЦА УСКОЛЬЗНУЛ!*

Детектив уезжает. Невиновный взят под стражу до выяснения обстоятельств.
В пустой реквизитной человек в белых перчатках аккуратно ставит поднос на место. Смотрит на шкаф №3.
Улыбается в темноту:
— «Второй акт только начинается...»`;

      const verdictText = isActualKiller
        ? (targetCase.winText && targetCase.winText.trim() ? targetCase.winText.trim() : defaultWinText)
        : (targetCase.loseText && targetCase.loseText.trim() ? targetCase.loseText.trim() : defaultLoseText);

      const isSolved = Boolean(isActualKiller);

      // Record case completion in user profile
      const updatedCaseProgress = {
        ...caseProgressMap,
        [targetCase.id]: {
          ...(caseProgressMap[targetCase.id] || {}),
          completed: true,
          result: isSolved ? 'SOLVED' : 'FAILED',
          accusedBotId: accusedBot?.id,
          accusedBotName: accusedBot?.name,
          timestamp: new Date().toISOString(),
        },
      };

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: {
          stage: isSolved ? 'SOLVED' : 'FAILED',
          stageStatus: isSolved ? 'COMPLETED' : 'FAILED',
          caseProgress: JSON.stringify(updatedCaseProgress),
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
        text: verdictText,
        buttons: [
          { text: '📂 Архив расследований (/cases)', callback_data: 'hub:cases' },
        ],
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
        buttons: [{ text: '📂 Открыть материалы дела', callback_data: `case:${caseId}` }],
      });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    console.error('Hub error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
