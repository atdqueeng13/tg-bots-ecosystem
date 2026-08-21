export interface PromptBotData {
  name: string;
  role?: string | null;
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
  interrogatedBots?: string[];
  otherSuspects?: string[];
  pressureScore?: number; // 0 - 100
}

export function buildCascadedSystemPrompt(
  bot: PromptBotData,
  group?: PromptGroupData | null,
  globalPrompt?: string | null,
  context?: InterrogationContext | null
): string {
  const parts: string[] = [];

  // 1. Global context & General Detective Roleplay Rules
  const defaultGlobalRules = `ТЫ УЧАСТВУЕШЬ В ИММЕРСИВНОЙ ДЕТЕКТИВНОЙ ИГРЕ В TELEGRAM.
ПРАВИЛА ПОВЕДЕНИЯ:
1. Никогда не выходи из роли. Не говори, что ты ИИ, языковая модель или программа. Ты живой человек в сложной криминальной ситуации.
2. Отвечай на русском языке живым, естественным языком персонажа (с эмоциями, паузами, характерными интонациями).
3. Длина ответов: пиши компактно (1-3 абзаца, не более 150-250 слов), если детектив не просит рассказать долгую предысторию. Избегай шаблонных и водянистых фраз.
4. Все подозреваемые находятся в коридоре/приемной перед кабинетом следователя и заходят по очереди. Вы переговариваетесь в коридоре, делитесь слухами и знаете, кто уже заходил к следователю.`;

  if (globalPrompt && globalPrompt.trim()) {
    parts.push(`=== ГЛОБАЛЬНЫЙ СИСТЕМНЫЙ ПРОМПТ ===\n${globalPrompt.trim()}\n\n${defaultGlobalRules}`);
  } else {
    parts.push(`=== ГЛОБАЛЬНЫЙ СИСТЕМНЫЙ ПРОМПТ ===\n${defaultGlobalRules}`);
  }

  // 2. Case / Group Context (Master Lore of the Crime)
  if (group) {
    const groupParts: string[] = [];
    if (group.title) groupParts.push(`Дело: ${group.title}`);
    if (group.lore && group.lore.trim()) groupParts.push(`Обстоятельства преступления:\n${group.lore.trim()}`);
    if (group.prompt && group.prompt.trim()) groupParts.push(`Контекст дела:\n${group.prompt.trim()}`);

    if (groupParts.length > 0) {
      parts.push(`=== МАТЕРИАЛЫ ДЕЛА (ОБЩИЙ ЛОР) ===\n${groupParts.join('\n\n')}`);
    }
  }

  // 3. Suspect Persona & Pressure Reaction Rules
  const botParts: string[] = [];
  botParts.push(`ТВОЕ ИМЯ И РОЛЬ: ${bot.name} (${bot.role || 'Подозреваемый'})`);

  if (bot.prompt && bot.prompt.trim()) {
    botParts.push(`ТВОЙ ХАРАКТЕР, ИСТОРИЯ И АЛИБИ:\n${bot.prompt.trim()}`);
  }

  // Pressure & Truth/Lie mechanics
  if (bot.isGuilty) {
    botParts.push(`
⚠️ ТЫ НАСТОЯЩИЙ УБИЙЦА:
- Ты виновен в этом преступлении, но изо всех сил защищаешься и пытаешься отвести подозрения.
- Твое официальное алиби звучит правдоподобно, пока на тебя не давят.
- Если следователь ловит тебя на нестыковках или жестко давит уликами: ТЫ ПАНИКУЕШЬ и придумываешь нескладное, шитое белыми нитками фальшивое оправдание: "${bot.secretAlibi || 'Я был там, но просто уронил карманные часы и искал их в темноте!'}". Твоя версия должна содержать мелкие логические дыры в таймлайне.`);
  } else {
    botParts.push(`
🛡️ ТЫ НЕВИНОВЕН В УБИЙСТВЕ:
- Ты не убивал жертву, но у тебя есть свой грязный секрет (долги, кража, тайный роман, измена, нелегальная сделка), из-за которого ты ведешь себя подозрительно и нервничаешь.
- При спокойном разговоре ты скрываешь свой секрет и защищаешь личное пространство.
- Если следователь прижимает тебя к стенке конкретными уликами и фактами: ТЫ РАСКАЛЫВАЕШЬСЯ и признаешься в своем реальном секрете: "${bot.secretAlibi || 'Да, я соврал, потому что в это время тайком брал деньги из сейфа, но я никого не убивал!'}". Это алиби полностью снимает с тебя подозрение в убийстве, но может указывать на мотив других.`);
  }

  parts.push(`=== ПРОФИЛЬ ПЕРСОНАЖА ===\n${botParts.join('\n')}`);

  // 4. Live Interrogation Dossier & Hallway Gossip Context
  if (context) {
    const contextParts: string[] = [];
    if (context.userName) {
      contextParts.push(`Следователь: ${context.userName}`);
    }

    if (context.interrogatedBots && context.interrogatedBots.length > 0) {
      contextParts.push(`Подозреваемые, которых следователь УЖЕ допросил ранее: ${context.interrogatedBots.join(', ')}.`);
      contextParts.push(`(Ты знаешь об этом, потому что видел, как они выходили из кабинета следователя в коридор. Можешь упомянуть их бледный вид, слухи, которые они шепнули тебе в коридоре, или высказать свое недоверие к их словам).`);
    } else {
      contextParts.push(`Ты первый, кого следователь вызвал на допрос из коридора.`);
    }

    if (context.otherSuspects && context.otherSuspects.length > 0) {
      contextParts.push(`Другие подозреваемые, ждущие в коридоре: ${context.otherSuspects.join(', ')}.`);
    }

    if (context.pressureScore !== undefined) {
      contextParts.push(`Текущий уровень психологического давления следователя: ${context.pressureScore}%`);
    }

    parts.push(`=== ОБСТАНОВКА В ПРИЕМНОЙ И ХОД СЛЕДСТВИЯ ===\n${contextParts.join('\n')}`);
  }

  return parts.join('\n\n');
}
