import { prisma } from './prisma';
import { generateWithGemini } from './gemini-rotator';
import { buildHubSystemPrompt } from './prompt-builder';
import { checkPromptInjection } from './security-guard';

export interface HubRuntimeParams {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  action?: string;
  caseId?: string | null;
  accusedBotId?: string | null;
  starsAmount?: number | null;
  stepIndex?: number | null;
  userMessage?: string | null;
}

export interface HubButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface HubRuntimeResult {
  success: boolean;
  isFunnel?: boolean;
  stepIndex?: number;
  totalSteps?: number;
  text?: string;
  mediaUrl?: string | null;
  delaySeconds?: number;
  buttons?: HubButton[];
  cases?: any[];
  case?: any;
  isSolved?: boolean;
  accusedBotName?: string;
  message?: string;
  error?: string;
}

export async function handleHubRuntime(params: HubRuntimeParams): Promise<HubRuntimeResult> {
  try {
    const {
      telegramId,
      username,
      firstName,
      lastName,
      action = 'start',
      caseId,
      accusedBotId,
      starsAmount,
      stepIndex,
      userMessage,
    } = params;

    if (!telegramId) {
      return { success: false, error: 'telegramId is required' };
    }

    // 1. Upsert Telegram User
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
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
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
    const buildCasesCatalog = async (customIntro?: string): Promise<HubRuntimeResult> => {
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
        `🕵️‍♂️ *Архив Детективных Расследований*\n\nВыберите доступное дело из списка ниже, чтобы получить материалы и начать допросы:`;

      const buttons: HubButton[] = activeCases.map((c) => {
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

    // Helper: Build Case Dossier with Automatic Suspect Tags & Links
    const buildCaseDossier = (targetCase: any): HubRuntimeResult => {
      const suspects = targetCase.bots || [];

      // Build numbered list of suspects with telegram @tags
      const suspectsListText = suspects.length > 0
        ? suspects
            .map((b: any, idx: number) => {
              const num = idx + 1;
              const cleanUsername = b.username ? b.username.replace('@', '') : '';
              const tag = cleanUsername ? `@${cleanUsername}` : `[${b.name}]`;
              return `${num}️⃣ **${b.name}** — ${tag} _(${b.role || 'Подозреваемый'})_`;
            })
            .join('\n')
        : '_Подозреваемые пока не добавлены в это дело._';

      const briefing = `📁 *${targetCase.title}*\n\n📜 *Обстоятельства преступления:*\n${targetCase.lore || 'Материалы дела переданы следователю.'}\n\n👥 *Подозреваемые по делу:*\n${suspectsListText}\n\n👉 *К кому пойдёте первым? Выбирайте любого:*`;

      // Buttons linking directly to each suspect bot
      const suspectButtons: HubButton[] = suspects.map((b: any, idx: number) => {
        const cleanUsername = b.username ? b.username.replace('@', '') : '';
        return {
          text: `👤 #${b.orderIndex || idx + 1} ${b.name}`,
          url: cleanUsername
            ? `https://t.me/${cleanUsername}?start=case_${targetCase.id}_${telegramId}`
            : undefined,
          callback_data: !cleanUsername ? `talk:${b.id}` : undefined,
        };
      });

      // Accuse button
      suspectButtons.push({
        text: '⚖️ Предъявить обвинение (/accuse)',
        callback_data: `accuse_menu:${targetCase.id}`,
      });

      // Back to catalog button
      suspectButtons.push({
        text: '📂 Архив расследований (/cases)',
        callback_data: 'hub:cases',
      });

      return {
        success: true,
        text: briefing,
        buttons: suspectButtons,
        case: targetCase,
      };
    };

    // Helper: Build Accuse Selection Menu
    const handleAccuseSelect = async (targetCaseId?: string | null): Promise<HubRuntimeResult> => {
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
          text: '⚠️ *У вас нет активного расследования для обвинения.*\nСначала выберите дело из архива командой /cases.',
          buttons: [{ text: '📂 Выбрать дело (/cases)', callback_data: 'hub:cases' }],
        };
      }

      const text = `⚖️ *ПРЕДЪЯВЛЕНИЕ ОБВИНЕНИЯ*\nДело: «${activeCase.title}»\n\nКого из подозреваемых вы считаете настоящим убийцей? Выберите персонажа для суда:`;

      const buttons: HubButton[] = activeCase.bots.map((b: any, idx: number) => ({
        text: `🎯 #${b.orderIndex || idx + 1} ${b.name}`,
        callback_data: `accuse_confirm:${activeCase.id}:${b.id}`,
      }));

      buttons.push({
        text: '⬅️ Назад к материалам дела',
        callback_data: `case:${activeCase.id}`,
      });

      return {
        success: true,
        text,
        buttons,
      };
    };

    // ==========================================
    // ACTION DISPATCHER
    // ==========================================

    // --- 1. ACTION: START ---
    if (action === 'start') {
      if (user.funnelCompleted || funnelSteps.length === 0) {
        return await buildCasesCatalog();
      }

      const currentStepIndex = 0;
      const step = funnelSteps[currentStepIndex] || {
        text: '🕵️‍♂️ Добро пожаловать в Детективное Бюро!',
        delaySeconds: 0,
        buttonText: 'Начать ➡️',
      };

      const isLastStep = funnelSteps.length <= 1;

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: { funnelStep: currentStepIndex },
      });

      return {
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
      };
    }

    // --- 2. ACTION: FUNNEL STEP ---
    if (action === 'funnel_step') {
      const nextStepIndex = typeof stepIndex === 'number' ? stepIndex : user.funnelStep + 1;

      if (nextStepIndex >= funnelSteps.length) {
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: { funnelCompleted: true, stage: 'INVESTIGATING' },
        });

        return await buildCasesCatalog(
          `🎉 *Вводный инструктаж завершен!*\n\nВаш значок детектива активирован. Выберите свое первое расследование:`
        );
      }

      const step = funnelSteps[nextStepIndex];
      const isLastStep = nextStepIndex === funnelSteps.length - 1;

      await prisma.telegramUser.update({
        where: { id: user.id },
        data: { funnelStep: nextStepIndex },
      });

      return {
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
      };
    }

    // --- 3. ACTION: CASES / MENU ---
    if (action === 'cases' || action === 'menu') {
      return await buildCasesCatalog();
    }

    // --- 4. ACTION: SELECT CASE ---
    if (action === 'select_case') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId || '' },
        include: {
          bots: {
            where: { isActive: true },
            select: { id: true, name: true, role: true, username: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!targetCase) {
        return { success: false, error: 'Дело не найдено' };
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
        return {
          success: true,
          text: `📁 *${targetCase.title}*\n\n📜 *Обстоятельства преступления:*\n${targetCase.lore || 'Детали закрыты грифом секретности.'}\n\n⭐ *Стоимость доступа:* ${targetCase.starsPrice} Telegram Stars\nОплатите доступ для вызова подозреваемых на допрос:`,
          buttons: [
            { text: `⭐ Открыть дело (${targetCase.starsPrice} Stars)`, callback_data: `pay_case:${targetCase.id}` },
            { text: '⬅️ Назад в архив дел', callback_data: 'hub:cases' },
          ],
        };
      }

      return buildCaseDossier(targetCase);
    }

    // --- 5. ACTION: STARS PAYMENT / UNLOCK ---
    if (action === 'stars_paid' || action === 'pay_case') {
      if (caseId && !casesAccessed.includes(caseId)) {
        casesAccessed.push(caseId);
        await prisma.telegramUser.update({
          where: { id: user.id },
          data: {
            casesAccessed: JSON.stringify(casesAccessed),
            activeCaseId: caseId,
            stage: 'INVESTIGATING',
            spentAmount: { increment: starsAmount ? Number(starsAmount) : 0 },
          },
        });
      }

      const unlockedCase = await prisma.group.findUnique({
        where: { id: caseId || '' },
        include: {
          bots: {
            where: { isActive: true },
            select: { id: true, name: true, role: true, username: true, orderIndex: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!unlockedCase) {
        return { success: false, error: 'Дело не найдено' };
      }

      return buildCaseDossier(unlockedCase);
    }

    // --- 6. ACTION: ACCUSE SELECT ---
    if (action === 'accuse_select') {
      return await handleAccuseSelect(caseId);
    }

    // --- 7. ACTION: ACCUSE CONFIRM ---
    if (action === 'accuse_confirm') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId || user.activeCaseId || '' },
        include: { bots: true },
      });

      if (!targetCase) {
        return { success: false, error: 'Дело не найдено' };
      }

      const accusedBot = targetCase.bots.find((b: any) => b.id === accusedBotId);
      if (!accusedBot) {
        return { success: false, error: 'Подозреваемый не найден' };
      }

      const confirmText = `⚖️ *ПОДТВЕРЖДЕНИЕ ОБВИНЕНИЯ*\n\nВы официально предъявляете обвинение в убийстве подозреваемому:\n👤 **${accusedBot.name}** _(${accusedBot.role || 'Подозреваемый'})_\n\n⚠️ *Внимание: отозвать обвинение будет невозможно. Это решение окончательно завершит следствие по делу!*`;

      return {
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
      };
    }

    // --- 8. ACTION: ACCUSE EXECUTE (FINAL DETERMINISTIC VERDICT) ---
    if (action === 'accuse_execute' || action === 'submit_accusation') {
      const targetCase = await prisma.group.findUnique({
        where: { id: caseId || user.activeCaseId || '' },
        include: { bots: true },
      });

      if (!targetCase) {
        return { success: false, error: 'Дело не найдено' };
      }

      const accusedBot = targetCase.bots.find((b: any) => b.id === accusedBotId);
      const isActualKiller = accusedBot?.isGuilty || (targetCase.isGuiltyBotId && accusedBot?.id === targetCase.isGuiltyBotId);

      const defaultWinText = `🎉 *ДЕЛО РАСКРЫТО! БЛЕСТЯЩАЯ ПОБЕДА!*

Утро. Из театра выносят бутафорский гроб из второго акта.
${accusedBot?.name || 'Преступник'} идёт в наручниках и сознается под тяжестью улик!

*Блестящая работа, Детектив! Справедливость восторжествовала.*`;

      const defaultLoseText = `❌ *ОШИБКА СЛЕДСТВИЯ! НАСТОЯЩИЙ УБИЙЦА УСКОЛЬЗНУЛ!*

Детектив уезжает. Невиновный взят под стражу до выяснения обстоятельств.
Настоящий убийца остался на свободе и наблюдает за происходящим из темноты...`;

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

      return {
        success: true,
        isSolved,
        accusedBotName: accusedBot?.name,
        text: verdictText,
        buttons: [
          { text: '📂 Архив расследований (/cases)', callback_data: 'hub:cases' },
        ],
      };
    }

    // --- 9. ACTION: CHAT (Freeform text to Main Hub Bot) ---
    if (action === 'chat') {
      const msg = String(userMessage || '').trim();

      if (msg === '/start' || msg.startsWith('/start case_')) {
        return await handleHubRuntime({ ...params, action: 'start' });
      }

      if (msg === '/cases' || msg === '/menu') {
        return await buildCasesCatalog();
      }

      if (msg === '/accuse') {
        return await handleAccuseSelect(user.activeCaseId);
      }

      // Anti-Jailbreak check for Hub Bot
      const injection = checkPromptInjection(msg, { name: 'Шеф Бюро', isMainHub: true });
      if (injection.isInjection) {
        return {
          success: true,
          isFunnel: false,
          text: injection.refusalText,
          buttons: [{ text: '📂 Открыть архив Дел (/cases)', callback_data: 'hub:cases' }],
        };
      }

      // If funnel is NOT completed, lock AI
      if (!user.funnelCompleted && funnelSteps.length > 0) {
        const step = funnelSteps[user.funnelStep] || funnelSteps[0];
        return {
          success: true,
          isFunnel: true,
          text: `⚠️ *Сначала завершите вводный инструктаж!*\n\nНажмите кнопку ниже, чтобы продолжить знакомство с правилами:`,
          buttons: [
            {
              text: step?.buttonText || 'Продолжить ➡️',
              callback_data: `funnel_step:${user.funnelStep + 1}`,
            },
          ],
        };
      }

      // Check if user is typing an accusation by name / alias in freeform text
      if (user.activeCaseId) {
        const activeCase = await prisma.group.findUnique({
          where: { id: user.activeCaseId },
          include: { bots: { where: { isActive: true } } },
        });

        if (activeCase) {
          const lower = msg.toLowerCase();
          for (const suspect of activeCase.bots) {
            const suspectNameLower = suspect.name.toLowerCase();
            const matchesName =
              lower.includes(suspectNameLower) ||
              suspectNameLower.split(' ').some((part: string) => part.length > 3 && lower.includes(part));

            if (
              matchesName &&
              (lower.includes('обвиня') ||
                lower.includes('убийц') ||
                lower.includes('виновен') ||
                lower.includes('виновна') ||
                lower.includes('это '))
            ) {
              return {
                success: true,
                text: `⚖️ *ПОДТВЕРЖДЕНИЕ ОБВИНЕНИЯ*\n\nВы упомянули подозреваемого **${suspect.name}**.\nВы действительно хотите официально предъявить ему обвинение в убийстве?\n\n⚠️ *Отозвать обвинение будет нельзя. Это действие завершит расследование!*`,
                buttons: [
                  {
                    text: `🎯 Да, обвинить: ${suspect.name}`,
                    callback_data: `accuse_execute:${activeCase.id}:${suspect.id}`,
                  },
                  { text: '❌ Отмена', callback_data: `accuse_menu:${activeCase.id}` },
                ],
              };
            }
          }
        }
      }

      // AI Chief Assistant response
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
        userPrompt: msg,
        modelName: hubBot?.model || 'gemini-3.6-flash',
        temperature: hubBot?.temperature !== undefined ? hubBot.temperature : 0.7,
      });

      return {
        success: true,
        isFunnel: false,
        text: aiResponse.text,
        buttons: [
          { text: '📂 Открыть архив Дел (/cases)', callback_data: 'hub:cases' },
          ...(user.activeCaseId
            ? [{ text: '⚖️ Обвинить (/accuse)', callback_data: `accuse_menu:${user.activeCaseId}` }]
            : []),
        ],
      };
    }

    return { success: false, error: 'Неизвестное действие' };
  } catch (error: any) {
    console.error('Hub runtime error:', error);
    return { success: false, error: error?.message || 'Ошибка выполнения действия в Хабе' };
  }
}
