import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildCascadedSystemPrompt } from '@/lib/prompt-builder';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botId = searchParams.get('botId');
    const token = searchParams.get('token');

    if (!botId && !token) {
      return NextResponse.json(
        { error: 'botId or token is required' },
        { status: 400 }
      );
    }

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [
          ...(botId ? [{ id: botId }, { botId }] : []),
          ...(token ? [{ token }] : []),
        ],
      },
      include: { group: true },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const globalSetting = await prisma.globalSetting.findUnique({
      where: { id: 'global' },
    });

    // Compile cascaded prompt (Global + Group + Bot)
    const compiledSystemPrompt = buildCascadedSystemPrompt(
      bot,
      bot.group,
      globalSetting?.systemPrompt
    );

    return NextResponse.json({
      bot: {
        id: bot.id,
        botId: bot.botId,
        name: bot.name,
        username: bot.username,
        role: bot.role,
        status: bot.status,
        isActive: bot.isActive,
        model: bot.model,
        temperature: bot.temperature,
        reasoningEnabled: bot.reasoningEnabled,
      },
      group: bot.group,
      compiledSystemPrompt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
