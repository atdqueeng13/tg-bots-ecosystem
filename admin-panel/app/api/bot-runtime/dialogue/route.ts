import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/gemini-rotator';
import { buildCascadedSystemPrompt } from '@/lib/prompt-builder';
import { checkPromptInjection } from '@/lib/security-guard';
import { syncToFirebaseRTDB } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      botId,
      telegramId,
      username,
      firstName,
      lastName,
      userMessage,
      botResponse: precomputedResponse,
      generateResponse = false,
    } = body;

    if (!botId || !telegramId || !userMessage) {
      return NextResponse.json(
        { error: 'botId, telegramId, and userMessage are required' },
        { status: 400 }
      );
    }

    // 1. Find the target bot
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

    // 3. Fallback Bot redirection if bot is disabled / not found and autoFallback is on
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
      return NextResponse.json({ error: 'Bot not found or offline' }, { status: 404 });
    }

    // 4. Anti-Jailbreak & Prompt Injection Guard (0 tokens, fast refusal)
    const injectionCheck = checkPromptInjection(userMessage, bot);
    if (injectionCheck.isInjection) {
      const refusal = injectionCheck.refusalText || 'Я отвечаю только по существу расследования.';

      // Find or create user for logging
      const user = await prisma.telegramUser.upsert({
        where: { telegramId: String(telegramId) },
        update: { lastActive: new Date() },
        create: {
          telegramId: String(telegramId),
          username,
          firstName,
          lastName,
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

      return NextResponse.json({
        success: true,
        botResponse: refusal,
        botName: bot.name,
        logId: log.id,
        isGuardrail: true,
      });
    }

    // 5. Upsert Telegram User
    let user = await prisma.telegramUser.upsert({
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
        username,
        firstName,
        lastName,
        status: 'ACTIVE',
        stage: 'INVESTIGATING',
        activeCaseId: bot.groupId || null,
        currentBotId: bot.id,
        dialogueCount: 1,
      },
    });

    const casesAccessed: string[] = JSON.parse(user.casesAccessed || '[]');
    const caseProgressMap: Record<string, any> = JSON.parse(user.caseProgress || '{}');

    // 6. Access Control & Case Closure Verification
    if (bot.groupId && bot.group) {
      const caseId = bot.groupId;
      const caseState = caseProgressMap[caseId];

      // Check if user already finished this case (verdict rendered)
      if (caseState?.completed === true || ((user.stage === 'SOLVED' || user.stage === 'FAILED') && user.activeCaseId === caseId)) {
        const closedCaseNotice = `📁 *Следствие по делу «${bot.group.title}» официально закрыто.*

Все материалы дела и протоколы допросов переданы в архив.
Чтобы начать новое расследование, вернитесь в Главный Хаб к Шефу Бюро (/cases или /start).`;

        return NextResponse.json({
          success: true,
          botResponse: closedCaseNotice,
          botName: bot.name,
          isCaseClosed: true,
        });
      }

      // Check if case is paid and not yet unlocked
      const isFreeCase = bot.group.starsPrice === 0;
      const isPaidAndUnlocked = casesAccessed.includes(caseId);

      if (!isFreeCase && !isPaidAndUnlocked) {
        const lockedNotice = `🔒 *Доступ к материалам дела «${bot.group.title}» ограничен.*

Для проведения допросов подозреваемых получите официальный допуск у Шефа Бюро в Главном Хабе (/cases или /start).`;

        return NextResponse.json({
          success: true,
          botResponse: lockedNotice,
          botName: bot.name,
          isCaseLocked: true,
        });
      }

      // Track interrogation progress in user profile
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

    // 7. Load isolated Chat History for (userId + botId)
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

    // 8. Gather Hallway Context & Interrogation Progress
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

    // Calculate dynamic pressure score (0 - 100)
    const pressureKeywords = ['улика', 'алиби', 'ложь', 'врешь', 'врёшь', 'убийца', 'нож', 'яд', 'кровь', 'свидетель', 'видел', 'почему', 'признайся', 'тайна', 'секрет', 'мотив', 'смерть', 'перчатки', 'соль', 'переход', 'цианид'];
    const lowerMsg = userMessage.toLowerCase();
    const keywordMatches = pressureKeywords.filter((k) => lowerMsg.includes(k)).length;
    const basePressure = Math.min(100, previousLogs.length * 12 + keywordMatches * 20);

    let finalResponse = precomputedResponse;
    let tokensEstimate = 0;
    let modelUsed = bot.model || 'gemini-2.0-flash';

    // 9. Generate AI response if requested
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
        modelName: bot.model || 'gemini-2.0-flash',
        temperature: bot.temperature !== undefined ? bot.temperature : 0.8,
      });

      finalResponse = aiResult.text;
      tokensEstimate = aiResult.tokensEstimate;
      modelUsed = aiResult.modelUsed;
    }

    // 10. Update user tokens count and stage
    await prisma.telegramUser.update({
      where: { id: user.id },
      data: {
        tokensUsed: { increment: tokensEstimate > 0 ? tokensEstimate : 0 },
        stage: user.stage === 'ONBOARDING' ? 'INVESTIGATING' : user.stage,
      },
    });

    // 11. Record Dialogue Log
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

    // 12. Update Bot ping
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastPing: new Date() },
    });

    // 13. Mirror to Firebase Realtime Database
    syncToFirebaseRTDB(`users/${telegramId}`, {
      telegramId: String(telegramId),
      username: username || null,
      firstName: firstName || null,
      lastActive: new Date().toISOString(),
      lastBot: bot.name,
      stage: 'INVESTIGATING',
      activeCaseId: bot.groupId || null,
      interrogatedCount: interrogatedBots.length + 1,
    });

    syncToFirebaseRTDB(`dialogues/${log.id}`, {
      telegramId: String(telegramId),
      botName: bot.name,
      userMessage,
      botResponse: finalResponse,
      pressureScore: basePressure,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      botResponse: finalResponse,
      botName: bot.name,
      pressureScore: basePressure,
      interrogatedBots,
      user,
      logId: log.id,
    });
  } catch (error: any) {
    console.error('Dialogue error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
