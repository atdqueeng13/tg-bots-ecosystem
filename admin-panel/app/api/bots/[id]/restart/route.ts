import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id: params.id }, { botId: params.id }],
      },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
    }

    // Try refreshing photo and info from Telegram API
    let newAvatarUrl = bot.avatarUrl;
    try {
      if (bot.token && bot.token.includes(':')) {
        const meRes = await fetch(`https://api.telegram.org/bot${bot.token}/getMe`);
        const meData = await meRes.json();
        if (meData.ok && meData.result?.id) {
          const photosRes = await fetch(
            `https://api.telegram.org/bot${bot.token}/getUserProfilePhotos?user_id=${meData.result.id}&limit=1`
          );
          const photosData = await photosRes.json();
          if (
            photosData.ok &&
            photosData.result?.total_count > 0 &&
            photosData.result.photos?.[0]?.length > 0
          ) {
            const photoArray = photosData.result.photos[0];
            const bestPhoto = photoArray[photoArray.length - 1];
            const fileRes = await fetch(
              `https://api.telegram.org/bot${bot.token}/getFile?file_id=${bestPhoto.file_id}`
            );
            const fileData = await fileRes.json();
            if (fileData.ok && fileData.result?.file_path) {
              newAvatarUrl = `https://api.telegram.org/file/bot${bot.token}/${fileData.result.file_path}`;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Telegram photo sync error on restart:', e);
    }

    const updatedBot = await prisma.bot.update({
      where: { id: bot.id },
      data: {
        status: 'ACTIVE',
        isActive: true,
        lastPing: new Date(),
        avatarUrl: newAvatarUrl,
      },
      include: {
        group: true,
      },
    });

    // Auto-sync Webhook with Telegram API on restart
    const reqHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || process.env.VERCEL_URL || '';
    const reqProto = req.headers.get('x-forwarded-proto') || (reqHost.includes('localhost') ? 'http' : 'https');
    const appUrl = reqHost
      ? `${reqProto}://${reqHost}`
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || 'https://admin-panel-gilt-three.vercel.app');

    if (bot.token && bot.token.includes(':') && appUrl.startsWith('https://')) {
      try {
        await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook?url=${appUrl}/api/bot-webhook/${bot.id}&drop_pending_updates=false`);
      } catch (err) {
        console.warn('Auto setWebhook warning on restart:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Бот "${bot.name}" успешно перезапущен и синхронизирован с Telegram!`,
      bot: updatedBot,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
