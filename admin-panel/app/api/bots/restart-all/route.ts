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

    const reqHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || process.env.VERCEL_URL || '';
    const reqProto = req.headers.get('x-forwarded-proto') || (reqHost.includes('localhost') ? 'http' : 'https');
    const appUrl = reqHost
      ? `${reqProto}://${reqHost}`
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || 'https://admin-panel-gilt-three.vercel.app');

    const activeBots = await prisma.bot.findMany({ where: { isActive: true } });
    if (appUrl.startsWith('https://')) {
      for (const b of activeBots) {
        if (b.token && b.token.includes(':')) {
          try {
            await fetch(`https://api.telegram.org/bot${b.token}/setWebhook?url=${appUrl}/api/bot-webhook/${b.id}&drop_pending_updates=false`);
          } catch (err) {
            console.warn(`Webhook error for ${b.name}:`, err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      restartedCount: activeBots.length,
      timestamp: now.toISOString(),
      message: `Успешно перезапущено и синхронизировано с Telegram ${activeBots.length} активных ботов.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
