import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  try {
    await ensureInitialData();

    const activeBots = await prisma.bot.findMany({
      where: {
        isActive: true,
      },
      include: {
        group: {
          select: { id: true, code: true, title: true, isGuiltyBotId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const sanitized = activeBots.map((b) => ({
      id: b.id,
      botId: b.botId,
      name: b.name,
      username: b.username,
      token: b.token,
      role: b.role,
      isMainHub: b.isMainHub,
      isGuilty: b.isGuilty,
      groupId: b.groupId,
      groupTitle: b.group?.title || null,
      model: b.model,
      temperature: b.temperature,
    }));

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      bots: sanitized,
    });
  } catch (error: any) {
    console.error('Active bots error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
