import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/gemini-rotator';
import { buildCascadedSystemPrompt } from '@/lib/prompt-builder';
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

    // 4. Upsert Telegram User
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

    // 5. Load isolated Chat History for (userId + botId)
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

    // 6. Gather Hallway Context & Interrogation Progress
    let interrogatedBots: string[] = [];
    let otherSuspects: string[] = [];

    if (bot.groupId) {
      const groupSuspects = await prisma.bot.findMany({
        where: { groupId: bot.groupId, isActive: true },
        select: { id: true, name: true },
      });

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
    const pressureKeywords = ['улика', 'алиби', 'ложь', 'врешь', 'убийца', 'нож', 'яд', 'кровь', 'свидетель', 'видел', 'почему', 'признайся', 'тайна', 'секрет', 'мотив', 'смерть'];
    const lowerMsg = userMessage.toLowerCase();
    const keywordMatches = pressureKeywords.filter((k) => lowerMsg.includes(k)).length;
    const basePressure = Math.min(100, previousLogs.length * 15 + keywordMatches * 20);

    let finalResponse = precomputedResponse;
    let tokensEstimate = 0;
    let modelUsed = bot.model || 'gemini-2.0-flash';

    // 7. Generate AI response if requested
    if (generateResponse || !finalResponse) {
      const fullSystemPrompt = buildCascadedSystemPrompt(
        bot,
        bot.group,
        globalSetting?.systemPrompt,
        {
          userName: [firstName, lastName].filter(Boolean).join(' ') || username || 'Детектив',
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
        temperature: bot.temperature || 0.7,
      });

      finalResponse = aiResult.text;
      tokensEstimate = aiResult.tokensEstimate;
      modelUsed = aiResult.modelUsed;
    }

    // 8. Update user tokens count and stage
    await prisma.telegramUser.update({
      where: { id: user.id },
      data: {
        tokensUsed: { increment: tokensEstimate > 0 ? tokensEstimate : 0 },
        stage: user.stage === 'ONBOARDING' ? 'INVESTIGATING' : user.stage,
      },
    });

    // 9. Record Dialogue Log
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

    // 10. Update Bot ping
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastPing: new Date() },
    });

    // 11. Mirror to Firebase Realtime Database
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
