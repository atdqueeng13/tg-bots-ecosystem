import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Update all active bots ping & status
    const updateResult = await prisma.bot.updateMany({
      where: { isActive: true },
      data: {
        lastPing: now,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      restartedCount: updateResult.count,
      timestamp: now.toISOString(),
      message: `Успешно перезапущено ${updateResult.count} активных ботов.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
