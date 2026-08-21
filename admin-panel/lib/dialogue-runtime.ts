import { prisma } from './prisma';
import { generateWithGemini } from './gemini-rotator';
import { buildCascadedSystemPrompt } from './prompt-builder';
import { checkPromptInjection } from './security-guard';

export interface DialogueRuntimeParams {
  botId: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userMessage: string;
  precomputedResponse?: string | null;
  generateResponse?: boolean;
}

export interface DialogueRuntimeResult {
  success: boolean;
  botResponse?: string;
  botName?: string;
  pressureScore?: number;
  interrogatedBots?: string[];
  logId?: string;
  isGuardrail?: boolean;
  isCaseClosed?: boolean;
  isCaseLocked?: boolean;
  error?: string;
}

export async function handleDialogueRuntime(params: DialogueRuntimeParams): Promise<DialogueRuntimeResult> {
  try {
    const {
      botId,
      telegramId,
      username,
      firstName,
      lastName,
      userMessage,
      precomputedResponse,
      generateResponse = true,
    } = params;

    if (!botId || !telegramId || !userMessage) {
      return { success: false, error: 'botId, telegramId, and userMessage are required' };
    }

    // 1. Find target bot
    let bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id: botId }, { botId: botId }],
      },
      include: { group: true },
    });

    // 2. Fetch Global Setting
    const globalSetting = await prisma.globalSetting.findUnique({
      where: { id: 'global' },
    });

    // 3. Fallback Bot redirection if bot is disabled / not found
    if ((!bot || !bot.isActive) && globalSetting?.autoFallback && globalSetting.fallbackBotId) {
      const fallbackBot = await prisma.bot.findUnique({
        where: { id: globalSetting.fallbackBotId },
        include: { group: true },
      });
      if (fallbackBot) {
        bot = fallbackBot;
      }
    }

    if (!bot) {
      return { success: false, error: 'Bot not found or offline' };
    }

    // 4. Anti-Jailbreak & Prompt Injection Guard
    const injectionCheck = checkPromptInjection(userMessage, bot);
    if (injectionCheck.isInjection) {
      const refusal = injectionCheck.refusalText || 'Я отвечаю только по существу расследования.';

      const user = await prisma.telegramUser.upsert({
        where: { telegramId: String(telegramId) },
        update: { lastActive: new Date() },
        create: {
          telegramId: String(telegramId),
          username: username || null,
          firstName: firstName || null,
          lastName: lastName || null,
          status: 'ACTIVE',
          stage: 'INVESTIGATING',
        },
      });

      const log = await prisma.userDialogueLog.create({
        data: {
          userId: user.id,
          botId: bot.id,
          userMessage,
          botResponse: refusal,
          modelUsed: 'guardrail-filter',
          tokens: 0,
          status: 'FLAGGED',
        },
      });

      return {
        success: true,
        botResponse: refusal,
        botName: bot.name,
        logId: log.id,
        isGuardrail: true,
      };
    }

    // 5. Upsert Telegram User
    const user = await prisma.telegramUser.upsert({
      where: { telegramId: String(telegramId) },
      update: {
        lastActive: new Date(),
        dialogueCount: { increment: 1 },
        ...(username && { username }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        currentBotId: bot.id,
        ...(bot.groupId && { activeCaseId: bot.groupId }),
      },
      create: {
        telegramId: String(telegramId),
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        status: 'ACTIVE',
        stage: 'INVESTIGATING',
        activeCaseId: bot.groupId || null,
        currentBotId: bot.id,
        dialogueCount: 1,
      },
    });

    const casesAccessed: string[] = JSON.parse(user.casesAccessed || '[]');
    const caseProgressMap: Record<string, any> = JSON.parse(user.caseProgress || '{}');

    // 6. Access Control & Case Status Verification
    if (bot.groupId && bot.group) {
      const caseId = bot.groupId;
      const caseState = caseProgressMap[caseId];

      if (
        caseState?.completed === true ||
        ((user.stage === 'SOLVED' || user.stage === 'FAILED') && user.activeCaseId === caseId)
      ) {
        const closedCaseNotice = `📁 *Следствие по делу «${bot.group.title}» официально закрыто.*

Все материалы дела и протоколы допросов переданы в архив.
Чтобы начать новое расследование, вернитесь в Главный Хаб к Шефу Бюро (/cases или /start).`;

        return {
          success: true,
          botResponse: closedCaseNotice,
          botName: bot.name,
          isCaseClosed: true,
        };
      }

      const isFreeCase = bot.group.starsPrice === 0;
      const isPaidAndUnlocked = casesAccessed.includes(caseId);

      if (!isFreeCase && !isPaidAndUnlocked) {
        const lockedNotice = `🔒 *Доступ к материалам дела «${bot.group.title}» ограничен.*

Для проведения допросов подозреваемых получите официальный допуск у Шефа Бюро в Главном Хабе (/cases или /start).`;

        return {
          success: true,
          botResponse: lockedNotice,
          botName: bot.name,
          isCaseLocked: true,
        };
      }

      // Track interrogation progress
      const currentCaseProgress = caseProgressMap[caseId] || { interrogatedBotIds: [] };
      if (!currentCaseProgress.interrogatedBotIds) {
        currentCaseProgress.interrogatedBotIds = [];
      }
      if (!currentCaseProgress.interrogatedBotIds.includes(bot.id)) {
        currentCaseProgress.interrogatedBotIds.push(bot.id);
        caseProgressMap[caseId] = currentCaseProgress;

        await prisma.telegramUser.update({
          where: { id: user.id },
          data: { caseProgress: JSON.stringify(caseProgressMap) },
        });
      }
    }

    // 7. Load Chat History for (userId + botId)
    const previousLogs = await prisma.userDialogueLog.findMany({
      where: {
        userId: user.id,
        botId: bot.id,
        status: 'SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const chatHistory = previousLogs.reverse().flatMap((l) => [
      { role: 'user' as const, parts: l.userMessage },
      { role: 'model' as const, parts: l.botResponse },
    ]);

    // 8. Gather Context
    let interrogatedBots: string[] = [];
    let otherSuspects: string[] = [];
    let totalSuspectsInCase = 0;

    if (bot.groupId) {
      const groupSuspects = await prisma.bot.findMany({
        where: { groupId: bot.groupId, isActive: true },
        select: { id: true, name: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      });

      totalSuspectsInCase = groupSuspects.length;
      otherSuspects = groupSuspects.filter((b) => b.id !== bot?.id).map((b) => b.name);

      const otherLogs = await prisma.userDialogueLog.findMany({
        where: {
          userId: user.id,
          bot: { groupId: bot.groupId, id: { not: bot.id } },
        },
        include: { bot: true },
        distinct: ['botId'],
      });

      interrogatedBots = otherLogs.map((l) => l.bot.name);
    }

    // Pressure score
    const pressureKeywords = [
      'улика', 'алиби', 'ложь', 'врешь', 'врёшь', 'убийца', 'нож', 'яд', 'кровь',
      'свидетель', 'видел', 'почему', 'признайся', 'тайна', 'секрет', 'мотив',
      'смерть', 'перчатки', 'соль', 'переход', 'цианид', 'револьвер',
    ];
    const lowerMsg = userMessage.toLowerCase();
    const keywordMatches = pressureKeywords.filter((k) => lowerMsg.includes(k)).length;
    const basePressure = Math.min(100, previousLogs.length * 12 + keywordMatches * 20);

    let finalResponse = precomputedResponse;
    let tokensEstimate = 0;
    let modelUsed = bot.model || 'gemini-3.6-flash';

    // 9. Generate AI Response
    if (generateResponse || !finalResponse) {
      const fullSystemPrompt = buildCascadedSystemPrompt(
        bot,
        bot.group,
        globalSetting?.systemPrompt,
        {
          userName: [firstName, lastName].filter(Boolean).join(' ') || username || 'Детектив',
          suspectNumber: bot.orderIndex || 1,
          totalSuspectsInCase: totalSuspectsInCase || 5,
          interrogatedBots,
          otherSuspects,
          pressureScore: basePressure,
        }
      );

      const aiResult = await generateWithGemini({
        systemPrompt: fullSystemPrompt,
        userPrompt: userMessage,
        history: chatHistory,
        modelName: bot.model || 'gemini-3.6-flash',
        temperature: bot.temperature !== undefined ? bot.temperature : 0.8,
      });

      finalResponse = aiResult.text;
      tokensEstimate = aiResult.tokensEstimate;
      modelUsed = aiResult.modelUsed;
    }

    // 10. Record Dialogue Log
    const log = await prisma.userDialogueLog.create({
      data: {
        userId: user.id,
        botId: bot.id,
        userMessage,
        botResponse: finalResponse || '',
        modelUsed,
        tokens: tokensEstimate,
        status: 'SUCCESS',
      },
    });

    // 11. Update Bot ping
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastPing: new Date() },
    });

    return {
      success: true,
      botResponse: finalResponse || '',
      botName: bot.name,
      pressureScore: basePressure,
      interrogatedBots,
      logId: log.id,
    };
  } catch (error: any) {
    console.error('Dialogue runtime error:', error);
    return { success: false, error: error?.message || 'Ошибка допроса' };
  }
}
