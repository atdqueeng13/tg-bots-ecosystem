import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Compile complete unified prompt
    const compiledSystemPrompt = [
      globalSetting?.systemPrompt
        ? `[ГЛОБАЛЬНЫЙ ПРОТОКОЛ]:\n${globalSetting.systemPrompt}`
        : '',
      bot.group?.lore
        ? `[ОБЩИЙ ЛОР И КОНТЕКСТ ДЕЛА (${bot.group.code}: ${bot.group.title})]:\n${bot.group.lore}`
        : '',
      bot.legend ? `[ПУБЛИЧНАЯ ЛЕГЕНДА ПЕРСОНАЖА]:\n${bot.legend}` : '',
      bot.knowledge ? `[БАЗА ЗНАНИЙ]:\n${bot.knowledge}` : '',
      bot.secrets ? `[СЕКРЕТНЫЕ ДАННЫЕ]:\n${bot.secrets}` : '',
      bot.character ? `[ХАРАКТЕР И ОСОБЕННОСТИ РЕЧИ]:\n${bot.character}` : '',
      bot.triggers ? `[ПОВЕДЕНЧЕСКИЕ ТРИГГЕРЫ]:\n${bot.triggers}` : '',
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    return NextResponse.json({
      bot: {
        id: bot.id,
        botId: bot.botId,
        name: bot.name,
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
