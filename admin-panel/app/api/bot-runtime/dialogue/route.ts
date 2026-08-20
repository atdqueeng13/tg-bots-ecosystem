import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/gemini-rotator';
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

    // 1. Find the bot
    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id: botId }, { botId: botId }],
      },
      include: { group: true },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // 2. Fetch Global Setting
    const globalSetting = await prisma.globalSetting.findUnique({
      where: { id: 'global' },
    });

    // 3. Upsert Telegram User
    const user = await prisma.telegramUser.upsert({
      where: { telegramId: String(telegramId) },
      update: {
        lastActive: new Date(),
        dialogueCount: { increment: 1 },
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
        dialogueCount: 1,
        casesAccessed: bot.group?.code
          ? JSON.stringify([bot.group.code])
          : '[]',
      },
    });

    let finalResponse = precomputedResponse;
    let tokensEstimate = 0;
    let modelUsed = bot.model || 'gemini-2.0-flash';

    // 4. Generate AI response if requested
    if (generateResponse || !finalResponse) {
      // Assemble unified prompt
      const fullSystemPrompt = [
        globalSetting?.systemPrompt ? `[ГЛОБАЛЬНЫЙ ПРОТОКОЛ]:\n${globalSetting.systemPrompt}` : '',
        bot.group?.lore ? `[ОБЩИЙ ЛОР И КОНТЕКСТ ДЕЛА]:\n${bot.group.lore}` : '',
        bot.legend ? `[ПУБЛИЧНАЯ ЛЕГЕНДА ПЕРСОНАЖА]:\n${bot.legend}` : '',
        bot.knowledge ? `[БАЗА ЗНАНИЙ]:\n${bot.knowledge}` : '',
        bot.secrets ? `[СЕКРЕТНЫЕ ДАННЫЕ]:\n${bot.secrets}` : '',
        bot.character ? `[ХАРАКТЕР И ОСОБЕННОСТИ РЕЧИ]:\n${bot.character}` : '',
        bot.triggers ? `[ПОВЕДЕНЧЕСКИЕ ТРИГГЕРЫ]:\n${bot.triggers}` : '',
      ]
        .filter(Boolean)
        .join('\n\n---\n\n');

      const aiResult = await generateWithGemini({
        systemPrompt: fullSystemPrompt,
        userPrompt: userMessage,
        modelName: bot.model || 'gemini-2.0-flash',
        temperature: bot.temperature || 0.7,
      });

      finalResponse = aiResult.text;
      tokensEstimate = aiResult.tokensEstimate;
      modelUsed = aiResult.modelUsed;
    }

    // 5. Update user tokens count
    if (tokensEstimate > 0) {
      await prisma.telegramUser.update({
        where: { id: user.id },
        data: { tokensUsed: { increment: tokensEstimate } },
      });
    }

    // 6. Record Dialogue Log
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

    // 7. Update Bot ping
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastPing: new Date() },
    });

    // 8. Mirror to Firebase Realtime Database
    syncToFirebaseRTDB(`users/${telegramId}`, {
      telegramId: String(telegramId),
      username: username || null,
      firstName: firstName || null,
      lastActive: new Date().toISOString(),
      lastBot: bot.name,
    });

    syncToFirebaseRTDB(`dialogues/${log.id}`, {
      telegramId: String(telegramId),
      botName: bot.name,
      userMessage,
      botResponse: finalResponse,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      botResponse: finalResponse,
      user,
      logId: log.id,
    });
  } catch (error: any) {
    console.error('Dialogue error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
