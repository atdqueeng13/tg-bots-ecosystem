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

    const groups = await prisma.group.findMany({
      include: {
        bots: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ groups });
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
    const { title, lore, prompt, coverUrl, status, solutionTruth, isGuiltyBotId, starsPrice, winText, loseText, accusationAliases } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Название группы обязательно' }, { status: 400 });
    }

    const code = `case_${Math.random().toString(36).substring(2, 7)}`;

    const group = await prisma.group.create({
      data: {
        code,
        title: title.trim(),
        lore: lore || '',
        prompt: prompt || '',
        solutionTruth: solutionTruth || '',
        winText: winText || '',
        loseText: loseText || '',
        accusationAliases: typeof accusationAliases === 'object' ? JSON.stringify(accusationAliases) : (accusationAliases || '{}'),
        isGuiltyBotId: isGuiltyBotId || null,
        starsPrice: starsPrice !== undefined ? Number(starsPrice) : 50,
        coverUrl: coverUrl || null,
        status: status || 'ACTIVE',
      },
      include: {
        bots: true,
      },
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
