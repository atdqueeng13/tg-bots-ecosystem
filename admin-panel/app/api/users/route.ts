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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { firstName: { contains: search } },
        { telegramId: { contains: search } },
      ];
    }

    const users = await prisma.telegramUser.findMany({
      where,
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
