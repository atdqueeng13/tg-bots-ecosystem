import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update all bots' lastPing and ensure status is ACTIVE
    await prisma.bot.updateMany({
      data: {
        lastPing: new Date(),
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Сигнал глобального перезапуска успешно передан всем активным ботам.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
