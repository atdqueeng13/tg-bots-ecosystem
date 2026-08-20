import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';
import { ensureInitialData } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  try {
    await ensureInitialData();
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bots = await prisma.bot.findMany({
      include: {
        group: true,
        _count: {
          select: { dialogues: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bots });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      botId,
      token,
      avatarUrl,
      role,
      groupId,
      model,
      temperature,
      reasoningEnabled,
      legend,
      knowledge,
      secrets,
      character,
      triggers,
    } = body;

    if (!name || !token) {
      return NextResponse.json(
        { error: 'Имя бота и токен @BotFather обязательны' },
        { status: 400 }
      );
    }

    const generatedBotId =
      botId || `BR-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBot = await prisma.bot.create({
      data: {
        name,
        botId: generatedBotId,
        token,
        avatarUrl,
        role: role || 'Главный персонаж',
        groupId: groupId || null,
        model: model || 'gemini-2.0-flash',
        temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
        reasoningEnabled: !!reasoningEnabled,
        legend,
        knowledge,
        secrets,
        character,
        triggers,
      },
    });

    return NextResponse.json({ bot: newBot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
