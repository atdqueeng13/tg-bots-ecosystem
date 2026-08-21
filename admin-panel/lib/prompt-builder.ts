export interface PromptBotData {
  name: string;
  role?: string | null;
  orderIndex?: number | null;
  prompt?: string | null;
  secretAlibi?: string | null;
  isGuilty?: boolean | null;
  isMainHub?: boolean | null;
}

export interface PromptGroupData {
  title?: string | null;
  lore?: string | null;
  prompt?: string | null;
  solutionTruth?: string | null;
}

export interface InterrogationContext {
  userName?: string | null;
  suspectNumber?: number | null;
  totalSuspectsInCase?: number | null;
  interrogatedBots?: string[];
  otherSuspects?: string[];
  pressureScore?: number; // 0 - 100
}

/**
 * Builds the cascading system prompt for a Suspect Bot:
 * Level 1: Global system prompt (case-agnostic roleplay rules)
 * Level 2: Group/Case prompt (lore, timeline, canonical facts)
 * Level 3: Character prompt (identity, alibi, secrets, behavioral guidelines)
 * Level 4: Live interrogation context (progress, hallway gossip, pressure)
 */
export function buildCascadedSystemPrompt(
  bot: PromptBotData,
  group?: PromptGroupData | null,
  globalPrompt?: string | null,
  context?: InterrogationContext | null
): string {
  const parts: string[] = [];

  // 1. Global Context & Detective Roleplay Rules
  const defaultGlobalRules = `ТЫ УЧАСТВУЕШЬ В ИММЕРСИВНОЙ ДЕТЕКТИВНОЙ ИГРЕ В TELEGRAM.
ПРАВИЛА ДИАЛОГА:
1. Полностью вживайся в роль персонажа. Ты живой человек в сложной криминальной ситуации.
2. Никогда не говори, что ты ИИ, бот или языковая модель.
3. Отвечай живой речью (в среднем 2–6 предложений), не превращай ответ в справочник или лекцию.
4. Не пиши реплики и действия за детектива. Невербальные действия оформляй кратко курсивом в *звёздочках*.
5. О других персонажах говори только то, что знаешь по канону, выдавая сведения постепенно.
6. Ты НИКОГДА не признаёшься в убийстве прямо в диалоге — финал расследования происходит через предъявление обвинения.`;

  if (globalPrompt && globalPrompt.trim()) {
    parts.push(`=== ГЛОБАЛЬНЫЙ СИСТЕМНЫЙ ПРОМПТ ===\n${globalPrompt.trim()}`);
  } else {
    parts.push(`=== ГЛОБАЛЬНЫЙ СИСТЕМНЫЙ ПРОМПТ ===\n${defaultGlobalRules}`);
  }

  // 2. Case / Group Context (Master Lore of the Crime & Canonical Facts)
  if (group) {
    const groupParts: string[] = [];
    if (group.title) groupParts.push(`Дело: ${group.title}`);
    if (group.lore && group.lore.trim()) groupParts.push(`Обстоятельства преступления:\n${group.lore.trim()}`);
    if (group.prompt && group.prompt.trim()) groupParts.push(`Канонические факты и контекст дела:\n${group.prompt.trim()}`);

    if (groupParts.length > 0) {
      parts.push(`=== МАТЕРИАЛЫ ДЕЛА (ОБЩИЙ ЛОР) ===\n${groupParts.join('\n\n')}`);
    }
  }

  // 3. Suspect Persona & Character Dossier
  const botParts: string[] = [];
  const suspectTag = bot.orderIndex && bot.orderIndex > 0
    ? `ПОДОЗРЕВАЕМЫЙ #${bot.orderIndex}: ${bot.name} (${bot.role || 'Подозреваемый'})`
    : `ТВОЕ ИМЯ И РОЛЬ: ${bot.name} (${bot.role || 'Подозреваемый'})`;
  botParts.push(suspectTag);

  if (bot.prompt && bot.prompt.trim()) {
    botParts.push(bot.prompt.trim());
  }

  if (bot.secretAlibi && bot.secretAlibi.trim() && !bot.prompt?.includes(bot.secretAlibi.trim())) {
    botParts.push(`ДОПОЛНИТЕЛЬНОЕ СЕКРЕТНОЕ АЛИБИ / РАСКОЛ:\n${bot.secretAlibi.trim()}`);
  }

  parts.push(`=== ПРОМПТ ПЕРСОНАЖА ===\n${botParts.join('\n\n')}`);

  // 4. Live Interrogation Dossier & Progress Context
  if (context) {
    const contextParts: string[] = [];
    if (context.userName) {
      contextParts.push(`Следователь: ${context.userName}`);
    }

    if (context.suspectNumber && context.totalSuspectsInCase) {
      contextParts.push(`Этап допроса: Ты подозреваемый #${context.suspectNumber} из ${context.totalSuspectsInCase} в этом деле.`);
    }

    if (context.interrogatedBots && context.interrogatedBots.length > 0) {
      contextParts.push(`Следователь УЖЕ допросил следующих подозреваемых: ${context.interrogatedBots.join(', ')}.`);
      contextParts.push(`(Ты знаешь об этом, так как вы находитесь в одном здании/коридоре. Можешь упомянуть их нервный вид или слухи, если это уместно в характере).`);
    } else {
      contextParts.push(`Ты первый, кого следователь вызвал на допрос.`);
    }

    if (context.otherSuspects && context.otherSuspects.length > 0) {
      contextParts.push(`Другие подозреваемые по делу: ${context.otherSuspects.join(', ')}.`);
    }

    if (context.pressureScore !== undefined) {
      contextParts.push(`Психологическое давление следователя: ${context.pressureScore}%`);
    }

    parts.push(`=== ОБСТАНОВКА И ХОД СЛЕДСТВИЯ ===\n${contextParts.join('\n')}`);
  }

  return parts.join('\n\n');
}

/**
 * Builds the dedicated, isolated system prompt for the Main Hub Bot (Game Master / Chief):
 * Completely free of suspect templates, focusing on bureau guidance, case directory, and verdicts.
 */
export function buildHubSystemPrompt(
  hubBot: { name?: string | null; prompt?: string | null } | null,
  activeCases: Array<{
    id: string;
    title: string;
    lore?: string | null;
    starsPrice: number;
    bots: Array<{ name: string; role?: string | null; orderIndex?: number }>;
  }>,
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    activeCaseId?: string | null;
    stage?: string | null;
    casesAccessed?: string[];
  } | null
): string {
  const casesSummary = activeCases.map((c, i) => {
    const suspectList = c.bots
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .map((b, idx) => `#${b.orderIndex || idx + 1} ${b.name} (${b.role || 'Подозреваемый'})`)
      .join(', ');
    const isUnlocked = user?.casesAccessed?.includes(c.id) || c.starsPrice === 0;
    const accessStatus = isUnlocked ? 'Открыто для следствия' : `Требуется допуск (⭐ ${c.starsPrice} Stars)`;
    return `📁 Дело #${i + 1}: «${c.title}»
   Описание: ${c.lore || 'Детали расследования в архиве'}
   Подозреваемые (${c.bots.length}): ${suspectList || 'формируется'}
   Статус доступа: ${accessStatus}`;
  }).join('\n\n');

  const detectiveName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Сыщик';

  const defaultChiefRole = `Ты — Шеф Детективного Бюро Скотланд-Ярда (Главный Игровой Мастер).
Ты руководишь расследованиями, принимаешь сыщиков в кабинете Бюро и курируешь раскрытие преступлений.

ТВОЙ СТИЛЬ:
- Классический британский викторианский нуар: сдержанный, проницательный, авторитетный тон.
- Обращайся к игроку как к коллеге-детективу.
- Отвечай емко и атмосферно (2-4 предложения).

ТВОИ ЗАДАЧИ:
1. Направлять сыщика по материалам дел дня.
2. При вопросах о делах или доступе подсказывать команду /cases или кнопку каталога.
3. При готовности предъявить обвинение напоминать о команде /accuse.
4. НИКОГДА не раскрывай тайны дел, улики и имена настоящих убийц в обычном диалоге.`;

  const chiefPrompt = hubBot?.prompt && hubBot.prompt.trim()
    ? hubBot.prompt.trim()
    : defaultChiefRole;

  return `=== СИСТЕМНЫЙ ПРОМПТ ГЛАВНОГО ХАБ-БОТА (ШЕФ БЮРО) ===
${chiefPrompt}

=== АРХИВ АКТИВНЫХ ДЕЛ СЕГОДНЯ ===
${casesSummary || 'Активных дел нет.'}

=== ДОСЬЕ ТЕКУЩЕГО СЫЩИКА ===
- Имя сыщика: ${detectiveName}
- Текущий этап: ${user?.stage || 'INVESTIGATING'}
- Текущее активное дело ID: ${user?.activeCaseId || 'Не выбрано'}`;
}
