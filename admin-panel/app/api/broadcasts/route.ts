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

    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ broadcasts });
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
    const { message, audience, scheduledAt, isInstant } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Текст рассылки обязателен' },
        { status: 400 }
      );
    }

    const code = `BC-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate audience size
    const totalUsers = await prisma.telegramUser.count({
      where: { status: 'ACTIVE' },
    });

    const broadcast = await prisma.broadcast.create({
      data: {
        code,
        message,
        audience: audience || 'Все Активные Пользователи',
        status: isInstant ? 'DELIVERED' : 'SCHEDULED',
        sentCount: isInstant ? totalUsers : 0,
        totalTarget: totalUsers,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return NextResponse.json({ broadcast });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
