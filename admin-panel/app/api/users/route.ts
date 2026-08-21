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

    const users = await prisma.telegramUser.findMany({
      include: {
        dialogues: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { bot: true },
        },
      },
      orderBy: { lastActive: 'desc' },
    });

    return NextResponse.json({ users });
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
    const { telegramId, username, firstName, lastName, status } = body;

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID обязателен' }, { status: 400 });
    }

    const user = await prisma.telegramUser.create({
      data: {
        telegramId: String(telegramId),
        username: username || '',
        firstName: firstName || '',
        lastName: lastName || '',
        status: status || 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    const updated = await prisma.telegramUser.update({
      where: { id },
      data: {
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
