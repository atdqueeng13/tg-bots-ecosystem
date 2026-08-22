import { prisma } from '../lib/prisma';
import { handleHubRuntime, HubRuntimeResult } from '../lib/hub-runtime';
import { handleDialogueRuntime } from '../lib/dialogue-runtime';

// Helper to call Telegram Bot API
async function telegramCall(token: string, method: string, payload: Record<string, any>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    // Fallback if Markdown parsing error
    if (!data.ok && typeof data.description === 'string' && data.description.includes("can't parse entities") && payload.parse_mode) {
      const fallback = { ...payload };
      delete fallback.parse_mode;
      const retryRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallback),
      });
      return await retryRes.json();
    }

    return data;
  } catch (err: any) {
    console.error(`Telegram API ${method} error:`, err?.message || err);
    return { ok: false, error: err?.message };
  }
}

// Split long messages if needed (>4000 chars)
function splitMessage(text: string, maxLength = 4000): string[] {
  if (!text || text.length <= maxLength) return [text || ''];
  const chunks: string[] = [];
  let current = '';
  for (const p of text.split('\n\n')) {
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

// Dispatch Hub Response to Telegram Chat
async function dispatchHubResponse(token: string, chatId: number | string, hubData: HubRuntimeResult) {
  if (!hubData?.text && !hubData?.mediaUrl) return;

  const inlineKeyboard =
    hubData.buttons?.map((b) => [
      b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.callback_data || '' },
    ]) || [];

  if (hubData.delaySeconds && hubData.delaySeconds > 0) {
    await new Promise((r) => setTimeout(r, Math.min(hubData.delaySeconds || 0, 3) * 1000));
  }

  if (hubData.mediaUrl && hubData.mediaUrl.startsWith('http')) {
    await telegramCall(token, 'sendPhoto', {
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
      await telegramCall(token, 'sendMessage', {
        chat_id: chatId,
        text: chunks[i],
        parse_mode: 'Markdown',
        reply_markup: isLast && inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
      });
    }
  }
}

// Process an update for a specific bot
async function processUpdate(bot: any, update: any) {
  const message = update.message;
  const callbackQuery = update.callback_query;
  const fromUser = message?.from || callbackQuery?.from;
  const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;

  if (!fromUser || !chatId) return;

  console.log(`📩 [${bot.name}] Received update from @${fromUser.username || fromUser.id}:`, message?.text || callbackQuery?.data);

  const telegramId = String(fromUser.id);
  const username = fromUser.username ? `@${fromUser.username}` : null;
  const firstName = fromUser.first_name || null;
  const lastName = fromUser.last_name || null;

  // 1. MAIN HUB BOT
  if (bot.isMainHub) {
    if (callbackQuery) {
      const data = callbackQuery.data || '';
      await telegramCall(bot.token, 'answerCallbackQuery', { callback_query_id: callbackQuery.id });

      if (data.startsWith('funnel_step:')) {
        const stepIndex = parseInt(data.replace('funnel_step:', '')) || 0;
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'funnel_step', stepIndex });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (data === 'hub:cases' || data === 'cases') {
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'cases' });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (data.startsWith('case:')) {
        const caseId = data.replace('case:', '');
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'select_case', caseId });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (data.startsWith('pay_case:')) {
        const caseId = data.replace('pay_case:', '');
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'stars_paid', caseId });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (data === 'acc_m' || data.startsWith('acc_m:') || data.startsWith('accuse_menu:')) {
        const caseId = data.includes(':') ? data.split(':')[1] : null;
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'accuse_select', caseId });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (data.startsWith('acc_c:') || data.startsWith('accuse_confirm:')) {
        const parts = data.split(':');
        const accusedBotId = parts.length === 3 ? parts[2] : parts[1];
        const caseId = parts.length === 3 ? parts[1] : null;
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'accuse_confirm', caseId, accusedBotId });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (data.startsWith('acc_x:') || data.startsWith('accuse_execute:')) {
        const parts = data.split(':');
        const accusedBotId = parts.length === 3 ? parts[2] : parts[1];
        const caseId = parts.length === 3 ? parts[1] : null;
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'accuse_execute', caseId, accusedBotId });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
    }

    if (message?.text) {
      const text = message.text.trim();
      if (text === '/start' || text.startsWith('/start case_') || text.startsWith('/start')) {
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'start' });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (text === '/cases' || text.startsWith('/cases@') || text.startsWith('/cases') || text === '/menu') {
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'cases' });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }
      if (text === '/accuse' || text.startsWith('/accuse@') || text.startsWith('/accuse') || text.toLowerCase() === 'обвинить' || text.toLowerCase() === 'предъявить обвинение') {
        const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'accuse_select' });
        await dispatchHubResponse(bot.token, chatId, result);
        return;
      }

      await telegramCall(bot.token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
      const result = await handleHubRuntime({ telegramId, username, firstName, lastName, action: 'chat', userMessage: text });
      await dispatchHubResponse(bot.token, chatId, result);
      return;
    }
  }

  // 2. SUSPECT BOT INTERROGATION
  if (message?.text) {
    await telegramCall(bot.token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
    const result = await handleDialogueRuntime({
      botId: bot.id,
      telegramId,
      username,
      firstName,
      lastName,
      userMessage: message.text.trim(),
    });

    const replyText = result.botResponse || 'Я слушаю вас, детектив.';
    for (const chunk of splitMessage(replyText)) {
      await telegramCall(bot.token, 'sendMessage', {
        chat_id: chatId,
        text: chunk,
        parse_mode: 'Markdown',
      });
    }
  }
}

// Start polling for a single bot
async function startBotPolling(bot: any) {
  console.log(`🤖 Starting poller for ${bot.name} (${bot.isMainHub ? 'HUB' : 'SUSPECT'})...`);
  
  // Clear any existing webhook so polling works
  await fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=false`).catch(() => {});
  
  let offset = 0;
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${bot.token}/getUpdates?offset=${offset}&timeout=10`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await processUpdate(bot, update).catch((err) => console.error(`Error processing update for ${bot.name}:`, err));
        }
      }
    } catch (e: any) {
      // Network hiccup - sleep 2s and retry
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const bots = await prisma.bot.findMany({ where: { isActive: true } });
  console.log(`🚀 Launching live bot runner for ${bots.length} bots...`);
  
  for (const bot of bots) {
    if (bot.token && bot.token.includes(':')) {
      startBotPolling(bot);
    }
  }
}

main();
