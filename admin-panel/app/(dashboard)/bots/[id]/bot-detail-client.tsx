'use client';

import { useState } from 'react';

interface Props {
  initialBot: any;
  groups: any[];
}

export function BotDetailClient({ initialBot, groups }: Props) {
  const [bot, setBot] = useState(initialBot);
  const [activeTab, setActiveTab] = useState<'profile' | 'prompt' | 'model'>('prompt');
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testChatOpen, setTestChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([
    { role: 'bot', text: `[СВЯЗЬ УСТАНОВЛЕНА]: Объект ${bot.name} на линии. Чем могу служить?` },
  ]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Form State
  const [legend, setLegend] = useState(bot.legend || '');
  const [knowledge, setKnowledge] = useState(bot.knowledge || '');
  const [secrets, setSecrets] = useState(bot.secrets || '');
  const [character, setCharacter] = useState(bot.character || '');
  const [triggers, setTriggers] = useState(bot.triggers || '');
  const [model, setModel] = useState(bot.model || 'gemini-2.0-flash');
  const [temperature, setTemperature] = useState(bot.temperature || 0.7);
  const [reasoningEnabled, setReasoningEnabled] = useState(bot.reasoningEnabled || false);
  const [name, setName] = useState(bot.name || '');
  const [role, setRole] = useState(bot.role || '');
  const [groupId, setGroupId] = useState(bot.groupId || '');

  const totalTokens = Math.ceil(
    (legend.length + knowledge.length + secrets.length + character.length + triggers.length) / 3.5
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          groupId,
          legend,
          knowledge,
          secrets,
          character,
          triggers,
          model,
          temperature,
          reasoningEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBot(data.bot);
      alert('Конфигурация бота и промпт успешно сохранены!');
    } catch (e: any) {
      alert(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || chatLoading) return;

    const userText = userInput.trim();
    setUserInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/bot-runtime/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: bot.id,
          telegramId: 'ADMIN_TEST_CHAT',
          username: 'admin_tester',
          userMessage: userText,
          generateResponse: true,
        }),
      });

      const data = await res.json();
      if (data.botResponse) {
        setChatMessages((prev) => [...prev, { role: 'bot', text: data.botResponse }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'bot', text: `[ОШИБКА ГЕНЕРАЦИИ]: ${data.error || 'Не удалось получить ответ'}` },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'bot', text: `[ОШИБКА СЕТИ]: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      {/* Left Column: Bot Configuration */}
      <div className="flex-grow flex flex-col gap-6 max-w-4xl">
        {/* Header / Identity Block */}
        <div className="bg-surface-container-high rounded-xl border border-outline-variant p-6 flex items-start gap-6 relative overflow-hidden shadow-lg">
          {/* Photo Slot */}
          <div className="w-24 h-32 bg-surface border border-outline-variant rounded relative flex-shrink-0 p-1">
            {bot.avatarUrl ? (
              <img
                src={bot.avatarUrl}
                alt={bot.name}
                className="w-full h-full object-cover grayscale opacity-80 mix-blend-screen"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-lowest text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl">smart_toy</span>
              </div>
            )}
            <div className="absolute top-1 right-1 w-2 h-4 bg-outline-variant rounded-sm rotate-45" />
          </div>

          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-display-case text-display-case text-on-surface">
                  Объект: {name}
                </h2>
                <p className="font-data-mono text-data-mono text-on-surface-variant mt-1 text-xs">
                  ID: #{bot.botId}
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-label-caps text-on-error-container bg-error-container border border-error rounded-sm transform rotate-[-2deg] font-bold">
                АКТИВНАЯ ДИРЕКТИВА
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1 text-[11px]">
                  НАЗНАЧЕНИЕ
                </span>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="font-data-mono text-data-mono text-on-surface bg-surface-container border border-outline-variant rounded px-2 py-1 text-xs w-full outline-none focus:border-secondary"
                />
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1 text-[11px]">
                  ПРИВЯЗКА К ДЕЛУ
                </span>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="font-data-mono text-data-mono text-on-surface bg-surface-container border border-outline-variant rounded px-2 py-1 text-xs w-full outline-none focus:border-secondary"
                >
                  <option value="">Без группы</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code}: {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-outline-variant">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-6 py-3 font-title-md text-title-md transition-colors border-b-2 font-semibold text-sm ${
              activeTab === 'prompt'
                ? 'text-secondary border-secondary bg-surface-container/50'
                : 'text-on-surface-variant hover:text-secondary border-transparent'
            }`}
          >
            Промпт персонажа
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-title-md text-title-md transition-colors border-b-2 font-semibold text-sm ${
              activeTab === 'profile'
                ? 'text-secondary border-secondary bg-surface-container/50'
                : 'text-on-surface-variant hover:text-secondary border-transparent'
            }`}
          >
            Профиль & Токен
          </button>
        </div>

        {/* Active Tab Content: Промпт персонажа */}
        {activeTab === 'prompt' && (
          <div className="bg-surface-container rounded-xl border border-outline-variant p-6 space-y-6 shadow-lg">
            {/* Field 1: Public Legend */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-label-caps text-label-caps text-secondary text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm">visibility</span>
                ПУБЛИЧНАЯ ЛЕГЕНДА
              </label>
              <textarea
                value={legend}
                onChange={(e) => setLegend(e.target.value)}
                rows={3}
                placeholder="Введите известную публичную информацию о персонаже..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-data-mono text-data-mono text-on-surface text-xs focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none resize-y"
              />
            </div>

            <div className="border-t border-dashed border-outline-variant w-full" />

            {/* Field 2: Knowledge */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-label-caps text-label-caps text-secondary text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm">database</span>
                БАЗА ЗНАНИЙ
              </label>
              <textarea
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                rows={3}
                placeholder="Определите, что знает персонаж..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-data-mono text-data-mono text-on-surface text-xs focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none resize-y"
              />
            </div>

            <div className="border-t border-dashed border-outline-variant w-full" />

            {/* Field 3: Secrets */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-label-caps text-label-caps text-error text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm">lock</span>
                СЕКРЕТНЫЕ ДАННЫЕ
              </label>
              <textarea
                value={secrets}
                onChange={(e) => setSecrets(e.target.value)}
                rows={3}
                placeholder="Скрытые мотивы или информация, доступная только по кодовому слову..."
                className="w-full bg-surface-container-lowest border border-error/50 rounded-lg p-4 font-data-mono text-data-mono text-on-surface text-xs focus:border-error focus:ring-1 focus:ring-error transition-all outline-none resize-y"
              />
            </div>

            <div className="border-t border-dashed border-outline-variant w-full" />

            {/* Field 4: Character/Speech */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-label-caps text-label-caps text-secondary text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm">record_voice_over</span>
                ХАРАКТЕР / ОСОБЕННОСТИ РЕЧИ
              </label>
              <textarea
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                rows={3}
                placeholder="Указания по голосу и стилю общения..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-data-mono text-data-mono text-on-surface text-xs focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none resize-y"
              />
            </div>

            <div className="border-t border-dashed border-outline-variant w-full" />

            {/* Field 5: Triggers */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-label-caps text-label-caps text-tertiary text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm">bolt</span>
                ПОВЕДЕНЧЕСКИЕ ТРИГГЕРЫ
              </label>
              <textarea
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                rows={3}
                placeholder="ЕСЛИ произойдет X -> сделать Y..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-data-mono text-data-mono text-on-surface text-xs focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all outline-none resize-y"
              />
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-surface-container rounded-xl border border-outline-variant p-6 space-y-6 shadow-lg">
            <div>
              <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                Имя персонажа
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-sm text-on-surface outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                Токен бота (Telegram @BotFather)
              </label>
              <input
                type="password"
                value={bot.token}
                readOnly
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 font-data-mono text-xs text-tertiary outline-none"
              />
              <p className="font-data-mono text-[10px] text-on-surface-variant mt-1">
                Токен безопасно хранится в базе данных и скрыт от коммитов.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Parameters & Actions (Tactical Sidebar) */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6">
        {/* Action Buttons */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col gap-3 shadow-lg">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-secondary text-surface-container-lowest font-title-md text-sm py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-secondary-fixed-dim transition-colors font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>

          <button
            onClick={() => setPreviewOpen(true)}
            className="w-full bg-primary-container text-on-primary-container font-title-md text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container/80 transition-colors"
          >
            <span className="material-symbols-outlined text-base">terminal</span>
            Предпросмотр промпта
          </button>

          <button
            onClick={() => setTestChatOpen(true)}
            className="w-full border border-outline hover:border-secondary text-on-surface font-title-md text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 hover:text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-base">forum</span>
            Тестовый чат
          </button>
        </div>

        {/* Parameters Block */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col gap-6 flex-grow shadow-lg">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2 pb-2 border-b border-outline-variant text-[11px] uppercase tracking-wider font-bold">
            <span className="material-symbols-outlined text-sm">tune</span>
            СИСТЕМНЫЕ ПАРАМЕТРЫ
          </h3>

          {/* Model Dropdown */}
          <div className="space-y-2">
            <label className="font-data-mono text-data-mono text-on-surface block text-xs">
              LLM Модель
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 font-data-mono text-data-mono text-xs text-on-surface outline-none focus:border-secondary"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Основной)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Глубокий анализ)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Скоростной)</option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-data-mono text-data-mono text-on-surface block text-xs">
                Температура
              </label>
              <span className="font-data-mono text-data-mono text-secondary text-xs font-bold">
                {temperature}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-secondary"
            />
            <div className="flex justify-between font-label-caps text-label-caps text-on-surface-variant text-[10px]">
              <span>Детерминированный (0.0)</span>
              <span>Творческий (2.0)</span>
            </div>
          </div>

          {/* Reasoning Toggle */}
          <div className="space-y-3 pt-2 border-t border-outline-variant">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-data-mono text-data-mono text-on-surface block text-xs font-semibold">
                  Цепочка рассуждений
                </label>
                <span className="font-label-caps text-label-caps text-on-surface-variant text-[10px]">
                  Включить скрытые шаги анализа
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReasoningEnabled(!reasoningEnabled)}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  reasoningEnabled ? 'bg-secondary' : 'bg-surface-container-highest border border-outline-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-surface transition-transform ${
                    reasoningEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Token Estimate */}
          <div className="mt-auto pt-4 border-t border-dashed border-outline-variant">
            <div className="flex justify-between items-center font-data-mono text-data-mono text-xs text-on-surface-variant">
              <span>Оценка токенов:</span>
              <span className="text-secondary font-bold">~{totalTokens} tk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 max-w-3xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
              <h3 className="font-headline-lg text-lg text-on-surface">
                Скомпилированный системный промпт ({name})
              </h3>
              <button onClick={() => setPreviewOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto my-4 p-4 bg-[#020617] border border-outline-variant rounded font-data-mono text-xs text-tertiary whitespace-pre-wrap leading-relaxed">
              {`[ГЛОБАЛЬНЫЙ ПРОТОКОЛ СИСТЕМЫ]:\n(Наследуется из глобальных настроек)\n\n---\n\n[ОБЩИЙ ЛОР ДЕЛА]:\n${bot.group?.lore || 'Не привязано к делу'}\n\n---\n\n[ПУБЛИЧНАЯ ЛЕГЕНДА]:\n${legend}\n\n---\n\n[БАЗА ЗНАНИЙ]:\n${knowledge}\n\n---\n\n[СЕКРЕТНЫЕ ДАННЫЕ]:\n${secrets}\n\n---\n\n[ХАРАКТЕР И РЕЧЬ]:\n${character}\n\n---\n\n[ПОВЕДЕНЧЕСКИЕ ТРИГГЕРЫ]:\n${triggers}`}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-5 py-2 bg-surface-container-highest text-on-surface rounded font-medium text-xs hover:bg-surface-container-high"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Chat Modal */}
      {testChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 max-w-2xl w-full shadow-2xl relative h-[600px] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">forum</span>
                <h3 className="font-title-md text-sm font-bold text-on-surface">
                  Тестовый терминал диалога с {name} ({model})
                </h3>
              </div>
              <button onClick={() => setTestChatOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Chat Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#020617] border border-outline-variant rounded my-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg max-w-[85%] font-body-md text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'ml-auto bg-surface-container-high border border-outline-variant text-on-surface'
                      : 'mr-auto bg-surface-container-low border border-secondary/30 text-secondary'
                  }`}
                >
                  <p className="font-label-caps text-[9px] uppercase tracking-widest mb-1 opacity-70">
                    {msg.role === 'user' ? 'Следователь' : name}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="p-3 bg-surface-container-low border border-secondary/20 text-secondary text-xs rounded-lg max-w-[85%] animate-pulse">
                  {name} обрабатывает ответ через Gemini API...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendTestMessage} className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Введите тестовую реплику для бота..."
                className="flex-1 bg-surface-container-lowest border border-outline-variant rounded p-2.5 text-xs text-on-surface outline-none focus:border-secondary"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="px-5 py-2.5 bg-secondary text-surface-container-lowest font-bold text-xs rounded hover:bg-secondary-fixed-dim transition-colors disabled:opacity-50"
              >
                Отправить
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
