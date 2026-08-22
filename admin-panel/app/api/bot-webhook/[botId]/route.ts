import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleHubRuntime, HubRuntimeResult } from '@/lib/hub-runtime';
import { handleDialogueRuntime } from '@/lib/dialogue-runtime';

// Helper to call Telegram Bot API with automatic Markdown fallback
async function telegramCall(token: string, method: string, payload: Record<string, any>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    // If Telegram fails due to Markdown entity parsing, automatically retry as plain text
    if (!data.ok && typeof data.description === 'string' && data.description.includes('can\'t parse entities') && payload.parse_mode) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.parse_mode;
      const retryRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload),
      });
      return await retryRes.json();
    }

    return data;
  } catch (err: any) {
    console.error(`Telegram API ${method} network error:`, err);
    return { ok: false, error: err?.message || String(err) };
  }
}

// Split long messages if needed (>4000 characters)
function splitMessage(text: string, maxLength = 4000): string[] {
  if (!text || text.length <= maxLength) return [text || ''];

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
  { params }: { params: any }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const pathBotId = req.nextUrl.pathname.split('/').pop() || '';
    const botId = resolvedParams?.botId || pathBotId;

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id: botId }, { botId: botId }],
        isActive: true,
      },
      include: { group: true },
    });

    if (!bot || !bot.token) {
      console.warn('Bot not found for botId:', botId);
      return NextResponse.json({ error: 'Bot not found or inactive' }, { status: 404 });
    }

    const update = await req.json();
    const message = update.message;
    const callbackQuery = update.callback_query;

    const fromUser = message?.from || callbackQuery?.from;
    const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;

    if (!fromUser || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const telegramId = String(fromUser.id);
    const username = fromUser.username ? `@${fromUser.username}` : null;
    const firstName = fromUser.first_name || null;
    const lastName = fromUser.last_name || null;

    // Helper to send Hub payload to Telegram
    const dispatchHubResponse = async (hubData: HubRuntimeResult) => {
      if (!hubData?.text && !hubData?.mediaUrl) return;

      const inlineKeyboard =
        hubData.buttons?.map((b) => [
          b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.callback_data || '' },
        ]) || [];

      // Handle optional delay
      if (hubData.delaySeconds && hubData.delaySeconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(hubData.delaySeconds || 0, 3) * 1000));
      }

      if (hubData.mediaUrl && hubData.mediaUrl.startsWith('http')) {
        await telegramCall(bot.token, 'sendPhoto', {
          chat_id: chatId,
          photo: hubData.mediaUrl,
          caption: hubData.text || '',
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
        });
      } else {
        const chunks = splitMessage(hubData.text || '');
        for (let i = 0; i < chunks.length; i++) {
          const isLast = i === chunks.length - 1;
          await telegramCall(bot.token, 'sendMessage', {
            chat_id: chatId,
            text: chunks[i],
            parse_mode: 'Markdown',
            reply_markup: isLast && inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
          });
        }
      }
    };

    // ========================================================
    // 1. MAIN GAME HUB BOT HANDLING
    // ========================================================
    if (bot.isMainHub) {
      // A) Handle Callback Queries (Buttons)
      if (callbackQuery) {
        const data = callbackQuery.data || '';
        await telegramCall(bot.token, 'answerCallbackQuery', {
          callback_query_id: callbackQuery.id,
        });

        // 1. Funnel Onboarding Next Step
        if (data.startsWith('funnel_step:')) {
          const stepIndex = parseInt(data.replace('funnel_step:', '')) || 0;
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'funnel_step',
            stepIndex,
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 2. Cases Catalog
        if (data === 'hub:cases' || data === 'cases') {
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'cases',
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 3. Select Case / Dossier
        if (data.startsWith('case:')) {
          const caseId = data.replace('case:', '');
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'select_case',
            caseId,
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 4. Pay / Unlock Case
        if (data.startsWith('pay_case:')) {
          const caseId = data.replace('pay_case:', '');
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'stars_paid',
            caseId,
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 5. Accuse Select Menu
        if (data === 'acc_m' || data.startsWith('acc_m:') || data.startsWith('accuse_menu:')) {
          const caseId = data.includes(':') ? data.split(':')[1] : null;
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'accuse_select',
            caseId,
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 6. Accuse Confirmation Prompt
        if (data.startsWith('acc_c:') || data.startsWith('accuse_confirm:')) {
          const parts = data.split(':');
          const accusedBotId = parts.length === 3 ? parts[2] : parts[1];
          const caseId = parts.length === 3 ? parts[1] : null;
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'accuse_confirm',
            caseId,
            accusedBotId,
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 7. Accuse Final Execution
        if (data.startsWith('acc_x:') || data.startsWith('accuse_execute:')) {
          const parts = data.split(':');
          const accusedBotId = parts.length === 3 ? parts[2] : parts[1];
          const caseId = parts.length === 3 ? parts[1] : null;
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'accuse_execute',
            caseId,
            accusedBotId,
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }
      }

      // B) Handle Text Messages & Commands
      if (message?.text) {
        const text = message.text.trim();

        // 1. /start command
        if (text === '/start' || text.startsWith('/start case_') || text.startsWith('/start')) {
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'start',
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 2. /cases or /menu command
        if (text === '/cases' || text.startsWith('/cases@') || text.startsWith('/cases') || text === '/menu') {
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'cases',
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 3. /accuse command
        if (text === '/accuse' || text.startsWith('/accuse@') || text.startsWith('/accuse') || text.toLowerCase() === 'обвинить' || text.toLowerCase() === 'предъявить обвинение') {
          const result = await handleHubRuntime({
            telegramId,
            username,
            firstName,
            lastName,
            action: 'accuse_select',
          });
          await dispatchHubResponse(result);
          return NextResponse.json({ ok: true });
        }

        // 4. Freeform chat with Main Hub Chief Assistant
        await telegramCall(bot.token, 'sendChatAction', {
          chat_id: chatId,
          action: 'typing',
        });

        const result = await handleHubRuntime({
          telegramId,
          username,
          firstName,
          lastName,
          action: 'chat',
          userMessage: text,
        });
        await dispatchHubResponse(result);
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ========================================================
    // 2. SUSPECT BOT INTERROGATION HANDLING
    // ========================================================
    if (message?.text) {
      const text = message.text.trim();

      // Show typing indicator
      await telegramCall(bot.token, 'sendChatAction', {
        chat_id: chatId,
        action: 'typing',
      });

      // Execute in-memory suspect dialogue
      const dialogueResult = await handleDialogueRuntime({
        botId: bot.id,
        telegramId,
        username,
        firstName,
        lastName,
        userMessage: text,
      });

      const replyText = dialogueResult.botResponse || 'Я внимательно слушаю ваш вопрос, детектив.';
      const chunks = splitMessage(replyText);

      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await telegramCall(bot.token, 'sendMessage', {
          chat_id: chatId,
          text: chunks[i],
          parse_mode: 'Markdown',
          reply_markup: isLast
            ? {
                inline_keyboard: [
                  [{ text: '🕵️‍♂️ Вернуться в Главный Хаб к Шефу', url: 'https://t.me/sherlock_main_bot' }],
                ],
              }
            : undefined,
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      error: error?.message || 'Webhook internal error',
      stack: error?.stack,
    }, { status: 500 });
  }
}
