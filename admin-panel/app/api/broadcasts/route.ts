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

async function sendTelegramMessage(token: string, chatId: string, text: string, mediaUrl?: string | null) {
  try {
    if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: mediaUrl,
          caption: text,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (data.ok) return true;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error(`Error sending broadcast to ${chatId}:`, err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, mediaUrl, audience, scheduledAt, isInstant, botId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Текст рассылки обязателен' },
        { status: 400 }
      );
    }

    const code = `BC-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Fetch Target Users
    let targetUsers: Array<{ telegramId: string }> = [];
    if (audience === 'INACTIVE') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      targetUsers = await prisma.telegramUser.findMany({
        where: {
          OR: [
            { status: 'INACTIVE' },
            { lastActive: { lt: thirtyDaysAgo } },
          ],
        },
        select: { telegramId: true },
      });
    } else {
      targetUsers = await prisma.telegramUser.findMany({
        where: { status: 'ACTIVE' },
        select: { telegramId: true },
      });
    }

    const totalTarget = targetUsers.length;

    // 2. Find sender Bot
    const senderBot = await prisma.bot.findFirst({
      where: {
        OR: [
          ...(botId ? [{ id: botId }, { botId }] : []),
          { isMainHub: true, isActive: true },
          { isActive: true },
        ],
      },
    });

    const broadcast = await prisma.broadcast.create({
      data: {
        code,
        message,
        mediaUrl: mediaUrl || null,
        botId: senderBot?.id || null,
        audience: audience === 'INACTIVE' ? 'Неактивные (>30 дней)' : 'Все пользователи',
        status: isInstant ? 'IN_PROGRESS' : 'SCHEDULED',
        sentCount: 0,
        totalTarget,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    // 3. If Instant Broadcast and Bot Token available -> execute sending
    if (isInstant && senderBot?.token && targetUsers.length > 0) {
      (async () => {
        let sentCount = 0;
        for (const user of targetUsers) {
          const ok = await sendTelegramMessage(senderBot.token, user.telegramId, message, mediaUrl);
          if (ok) sentCount++;
          // Telegram rate limit delay: ~35ms
          await new Promise((resolve) => setTimeout(resolve, 35));
        }

        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: {
            sentCount,
            status: 'DELIVERED',
          },
        });
      })().catch((e) => console.error('Background broadcast execution error:', e));
    } else if (isInstant) {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: 'DELIVERED', sentCount: totalTarget },
      });
    }

    return NextResponse.json({ broadcast });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    await prisma.broadcast.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
