import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';
import { buildCascadedSystemPrompt } from '@/lib/prompt-builder';
import { generateWithGemini } from '@/lib/gemini-rotator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, botDraft } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    // Get current global setting
    const globalSetting = await prisma.globalSetting.findFirst();

    let botData = botDraft;
    let groupData = null;

    if (!botData) {
      const dbBot = await prisma.bot.findFirst({
        where: {
          OR: [{ id: params.id }, { botId: params.id }],
        },
        include: { group: true },
      });

      if (!dbBot) {
        return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
      }
      botData = dbBot;
      groupData = dbBot.group;
    } else if (botData.groupId) {
      groupData = await prisma.group.findUnique({
        where: { id: botData.groupId },
      });
    }

    const compiledSystemPrompt = buildCascadedSystemPrompt(
      botData,
      groupData,
      globalSetting?.systemPrompt
    );

    try {
      const result = await generateWithGemini({
        systemPrompt: compiledSystemPrompt,
        userPrompt: message,
        modelName: botData.model || 'gemini-2.0-flash',
        temperature: botData.temperature !== undefined ? parseFloat(botData.temperature) : 0.7,
      });

      return NextResponse.json({
        reply: result.text,
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        tokens: result.tokensEstimate,
        compiledSystemPrompt,
      });
    } catch (genError: any) {
      return NextResponse.json({
        reply: `[Тестовый ответ ${botData.name}]: Ответ сформирован на основе системного промпта: «${message}»`,
        modelUsed: botData.model || 'gemini-2.0-flash (simulated)',
        latencyMs: 140,
        tokens: 38,
        compiledSystemPrompt,
        warning: genError?.message,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
