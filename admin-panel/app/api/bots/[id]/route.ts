import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id }, { botId: id }],
      },
      include: {
        group: true,
        dialogues: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
    }

    return NextResponse.json({ bot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      username,
      role,
      status,
      isActive,
      isMainHub,
      isGuilty,
      secretAlibi,
      groupId,
      model,
      temperature,
      reasoningEnabled,
      prompt,
      avatarUrl,
      token,
      syncTelegram,
    } = body;

    let finalAvatarUrl = avatarUrl;
    if ((syncTelegram || (!finalAvatarUrl && token) || (finalAvatarUrl && finalAvatarUrl.includes('unsplash.com'))) && token) {
      const fetched = await fetchTelegramBotPhoto(token);
      if (fetched) finalAvatarUrl = fetched;
    }

    const updatedBot = await prisma.bot.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(role !== undefined && { role }),
        ...(body.orderIndex !== undefined && { orderIndex: parseInt(body.orderIndex) }),
        ...(status !== undefined && { status }),
        ...(isActive !== undefined && { isActive }),
        ...(isMainHub !== undefined && { isMainHub: !!isMainHub }),
        ...(isGuilty !== undefined && { isGuilty: !!isGuilty }),
        ...(secretAlibi !== undefined && { secretAlibi }),
        ...(groupId !== undefined && { groupId: groupId || null }),
        ...(model !== undefined && { model }),
        ...(temperature !== undefined && { temperature: parseFloat(temperature) }),
        ...(reasoningEnabled !== undefined && { reasoningEnabled: !!reasoningEnabled }),
        ...(prompt !== undefined && { prompt }),
        ...(finalAvatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
        ...(token !== undefined && { token: token.trim() }),
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json({ bot: updatedBot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.bot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
