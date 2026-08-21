import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';
import { ensureInitialData } from '@/lib/seed-data';

async function fetchTelegramBotPhoto(token: string): Promise<string | null> {
  try {
    const cleanToken = token.trim();
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok || !meData.result?.id) return null;

    const photosRes = await fetch(
      `https://api.telegram.org/bot${cleanToken}/getUserProfilePhotos?user_id=${meData.result.id}&limit=1`
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
        `https://api.telegram.org/bot${cleanToken}/getFile?file_id=${bestPhoto.file_id}`
      );
      const fileData = await fileRes.json();
      if (fileData.ok && fileData.result?.file_path) {
        return `https://api.telegram.org/file/bot${cleanToken}/${fileData.result.file_path}`;
      }
    }
  } catch (e) {
    console.warn('Auto Telegram photo fetch failed:', e);
  }
  return null;
}

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
      username,
      botId,
      token,
      avatarUrl,
      role,
      groupId,
      model,
      temperature,
      reasoningEnabled,
      isMainHub,
      isGuilty,
      secretAlibi,
      prompt,
    } = body;

    if (!name || !token) {
      return NextResponse.json(
        { error: 'Имя бота и токен @BotFather обязательны' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    let finalUsername = username;

    // Auto-detect username from Telegram if not provided
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const meData = await meRes.json();
      if (meData.ok && meData.result?.username) {
        finalUsername = `@${meData.result.username}`;
      }
    } catch (e) {
      console.warn('Auto getMe fetch failed:', e);
    }

    let finalAvatarUrl = avatarUrl;
    if (!finalAvatarUrl || finalAvatarUrl.includes('unsplash.com')) {
      finalAvatarUrl = await fetchTelegramBotPhoto(cleanToken);
    }

    const generatedBotId =
      botId || `bot_${Math.random().toString(36).substring(2, 7)}`;

    const newBot = await prisma.bot.create({
      data: {
        name,
        username: finalUsername || '',
        botId: generatedBotId,
        token: cleanToken,
        avatarUrl: finalAvatarUrl,
        role: role || (isMainHub ? 'Игровой Мастер' : 'Подозреваемый'),
        orderIndex: body.orderIndex !== undefined ? parseInt(body.orderIndex) : 0,
        isMainHub: !!isMainHub,
        isGuilty: !!isGuilty,
        secretAlibi: secretAlibi || '',
        groupId: groupId || null,
        model: model || 'gemini-2.0-flash',
        temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
        reasoningEnabled: !!reasoningEnabled,
        prompt: prompt || '',
      },
      include: {
        group: true,
      },
    });

    // Auto-set Webhook with Telegram API
    const reqHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || process.env.VERCEL_URL || '';
    const reqProto = req.headers.get('x-forwarded-proto') || (reqHost.includes('localhost') ? 'http' : 'https');
    const appUrl = reqHost
      ? `${reqProto}://${reqHost}`
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || 'https://admin-panel-gilt-three.vercel.app');

    if (cleanToken.includes(':') && appUrl.startsWith('https://')) {
      try {
        await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook?url=${appUrl}/api/bot-webhook/${newBot.id}&drop_pending_updates=false`);
      } catch (err) {
        console.warn('Auto webhook setup warning:', err);
      }
    }

    return NextResponse.json({ bot: newBot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
