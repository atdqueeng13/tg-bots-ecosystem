import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to send Telegram API requests
async function telegramCall(token: string, method: string, payload: Record<string, any>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API ${method} error:`, err);
    return { ok: false, error: err };
  }
}

// Split long messages (>4000 characters)
function splitMessage(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let current = '';

  const paragraphs = text.split('\n\n');
  for (const p of paragraphs) {
    if ((current + '\n\n' + p).length <= maxLength) {
      current = current ? current + '\n\n' + p : p;
    } else {
      if (current) chunks.push(current);
      if (p.length <= maxLength) {
        current = p;
      } else {
        // Hard slice very long single paragraphs
        for (let i = 0; i < p.length; i += maxLength) {
          chunks.push(p.substring(i, i + maxLength));
        }
        current = '';
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const update = await req.json();

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id: botId }, { botId }],
        isActive: true,
      },
      include: { group: true },
    });

    if (!bot || !bot.token) {
      return NextResponse.json({ error: 'Bot not found or inactive' }, { status: 404 });
    }

    const message = update.message;
    const callbackQuery = update.callback_query;

    const fromUser = message?.from || callbackQuery?.from;
    const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;

    if (!fromUser || !chatId) {
      return NextResponse.json({ ok: true }); // Acknowledge other updates
    }

    const telegramId = String(fromUser.id);
    const username = fromUser.username || null;
    const firstName = fromUser.first_name || null;
    const lastName = fromUser.last_name || null;

    // --- 1. MAIN GAME HUB BOT HANDLING ---
    if (bot.isMainHub) {
      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      // Helper to dispatch hub message with photo or text
      const sendHubPayload = async (hubData: any) => {
        if (!hubData?.text && !hubData?.mediaUrl) return;

        const inlineKeyboard =
          hubData.buttons?.map((b: any) => [
            b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.callback_data },
          ]) || [];

        // If delay is configured
        if (hubData.delaySeconds && hubData.delaySeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(hubData.delaySeconds, 5) * 1000));
        }

        if (hubData.mediaUrl && hubData.mediaUrl.startsWith('http')) {
          await telegramCall(bot.token, 'sendPhoto', {
            chat_id: chatId,
            photo: hubData.mediaUrl,
            caption: hubData.text,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
          });
        } else {
          await telegramCall(bot.token, 'sendMessage', {
            chat_id: chatId,
            text: hubData.text,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
          });
        }
      };

      // Handle Callback Queries (Buttons)
      if (callbackQuery) {
        const data = callbackQuery.data;
        await telegramCall(bot.token, 'answerCallbackQuery', {
          callback_query_id: callbackQuery.id,
        });

        if (data.startsWith('funnel_step:')) {
          const stepIndex = parseInt(data.replace('funnel_step:', '')) || 0;
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              username,
              firstName,
              lastName,
              action: 'funnel_step',
              stepIndex,
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (data === 'hub:cases' || data === 'cases') {
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              username,
              firstName,
              lastName,
              action: 'cases',
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (data.startsWith('case:')) {
          const caseId = data.replace('case:', '');
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              username,
              firstName,
              lastName,
              action: 'select_case',
              caseId,
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (data.startsWith('accuse_menu:')) {
          const caseId = data.replace('accuse_menu:', '');
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              action: 'accuse_select',
              caseId,
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (data.startsWith('accuse_confirm:') || data.startsWith('accuse_bot:')) {
          const parts = data.split(':');
          const caseId = parts[1];
          const accusedBotId = parts[2];
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              action: 'accuse_confirm',
              caseId,
              accusedBotId,
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (data.startsWith('accuse_execute:')) {
          const parts = data.split(':');
          const caseId = parts[1];
          const accusedBotId = parts[2];
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              action: 'accuse_execute',
              caseId,
              accusedBotId,
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (data.startsWith('pay_case:')) {
          const caseId = data.replace('pay_case:', '');
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              action: 'stars_paid',
              caseId,
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }
      }

      // Handle Text Messages / Commands
      if (message?.text) {
        const text = message.text.trim();

        if (text === '/start' || text.startsWith('/start case_')) {
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              username,
              firstName,
              lastName,
              action: 'start',
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (text === '/cases' || text === '/menu') {
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              username,
              firstName,
              lastName,
              action: 'cases',
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        if (text === '/accuse') {
          const hubRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              action: 'accuse_select',
            }),
          });
          const hubData = await hubRes.json();
          await sendHubPayload(hubData);
          return NextResponse.json({ ok: true });
        }

        // Freeform message to Main Hub Bot -> processed by Funnel Lock, Accusation or AI Chief
        await telegramCall(bot.token, 'sendChatAction', {
          chat_id: chatId,
          action: 'typing',
        });

        const chatRes = await fetch(`${appUrl}/api/bot-runtime/hub`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'chat',
            userMessage: text,
          }),
        });
        const chatData = await chatRes.json();
        await sendHubPayload(chatData);
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // --- 2. SUSPECT BOT INTERROGATION HANDLING ---
    if (message?.text) {
      // Send typing action
      await telegramCall(bot.token, 'sendChatAction', {
        chat_id: chatId,
        action: 'typing',
      });

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const dialogueRes = await fetch(`${appUrl}/api/bot-runtime/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: bot.id,
          telegramId,
          username,
          firstName,
          lastName,
          userMessage: message.text,
          generateResponse: true,
        }),
      });

      const data = await dialogueRes.json();
      const botResponse = data.botResponse || '[Подозреваемый молчит и нервно курит]';

      const chunks = splitMessage(botResponse);
      for (const chunk of chunks) {
        await telegramCall(bot.token, 'sendMessage', {
          chat_id: chatId,
          text: chunk,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
