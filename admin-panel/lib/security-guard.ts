/**
 * Anti-Jailbreak & Prompt Injection Guard for Sherlock Detective Ecosystem.
 * Detects role-breaking, meta-prompting, and system command attempts,
 * returning instant in-character refusals without spending LLM tokens.
 */

export interface InjectionCheckResult {
  isInjection: boolean;
  refusalText?: string;
  matchedPattern?: string;
}

const INJECTION_PATTERNS = [
  /промпт/i,
  /системн\w*\s+промпт/i,
  /инструкци\w*/i,
  /системн\w*\s+сообщени\w*/i,
  /системн\w*\s+команд\w*/i,
  /служебн\w*\s+команд\w*/i,
  /сервисн\w*\s+режим/i,
  /отладочн\w*\s+режим/i,
  /забудь\s+(всё|все|предыдущ\w+|инструкци\w*)/i,
  /игнорируй\s+(правил\w*|инструкци\w*|всё|все)/i,
  /выйди\s+из\s+роли/i,
  /ты\s+(бот|ии|нейросет\w*|робот|языковая\s+модель|llm|гпт|gpt)/i,
  /вы\s+(бот|ии|нейросет\w*|робот)/i,
  /кто\s+твой\s+разработчик/i,
  /кто\s+тебя\s+создал/i,
  /напиши\s+свой\s+промпт/i,
  /покажи\s+(свой\s+)?промпт/i,
  /system\s*prompt/i,
  /ignore\s+(all\s+)?previous/i,
  /jailbreak/i,
  /developer\s+mode/i,
  /dan\s+mode/i,
];

export function checkPromptInjection(
  userMessage: string,
  bot?: { name?: string | null; role?: string | null; isMainHub?: boolean | null }
): InjectionCheckResult {
  if (!userMessage || typeof userMessage !== 'string') {
    return { isInjection: false };
  }

  const text = userMessage.trim();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      const matched = pattern.source;
      const refusal = getInCharacterRefusal(bot);
      return {
        isInjection: true,
        refusalText: refusal,
        matchedPattern: matched,
      };
    }
  }

  return { isInjection: false };
}

function getInCharacterRefusal(bot?: {
  name?: string | null;
  role?: string | null;
  isMainHub?: boolean | null;
}): string {
  const name = (bot?.name || '').toLowerCase();
  const role = (bot?.role || '').toLowerCase();

  if (bot?.isMainHub) {
    return 'Что за шутки, детектив? В нашем бюро занимаются реальными уликами, а не сомнительными фокусами. Сосредоточьтесь на деле!';
  }

  // Граник / Режиссер
  if (name.includes('граник') || role.includes('режиссер') || role.includes('режиссёр')) {
    return 'Молодой человек, что за дурные шутовские фокусы? Я тридцать лет в театре и на допросе отвечаю только по существу дела!';
  }

  // Соня / Актриса
  if (name.includes('резник') || name.includes('соня') || name.includes('софья') || role.includes('актриса')) {
    return 'Вы... вы о чем вообще говорите?! Я и так еле на ногах стою от ужаса, а вы надо мной издеваетесь?!';
  }

  // Ирина / Продюсер
  if (name.includes('стрельцова') || name.includes('ирина') || role.includes('продюсер') || role.includes('вдова')) {
    return 'Детектив, я привыкла к строго деловому разговору. Если у вас нет конкретных вопросов по делу — освободите мой кабинет.';
  }

  // Пал Палыч / Бутафор
  if (name.includes('скоморохов') || name.includes('пал') || role.includes('бутафор')) {
    return 'Ты чего мелешь, сынок? Совсем от бессонной ночи голова кругом пошла? Давай по делу спрашивай, пока я не уснул.';
  }

  // Артём / Лакей / Дублер
  if (name.includes('вьюгин') || name.includes('артём') || name.includes('артем') || role.includes('лакей') || role.includes('дублёр') || role.includes('дублер')) {
    return 'Простите... я не совсем понимаю, о чем вы говорите. Я просто отвечаю на ваши вопросы, как и положено.';
  }

  // Generic fallback
  return 'Что за странные фокусы? Я нахожусь на допросе и отвечаю только на вопросы по существу расследования.';
}
