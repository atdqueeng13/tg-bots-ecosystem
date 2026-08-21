'use client';

import { useState, useEffect } from 'react';

interface Props {
  initialBots: any[];
  groups?: any[];
}

export function BotsClient({ initialBots, groups = [] }: Props) {
  const [bots, setBots] = useState(initialBots);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingTg, setSyncingTg] = useState(false);
  const [restartingBotId, setRestartingBotId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [dialogueLogs, setDialogueLogs] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gpt-4o',
    'claude-3-5-sonnet-20241022',
  ]);

  // Prompt preview & test chat states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [compiledPromptPreview, setCompiledPromptPreview] = useState('');
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);
  const [testChatMessages, setTestChatMessages] = useState<
    Array<{ role: 'user' | 'bot'; text: string; time: string; tokens?: number }>
  >([]);
  const [testChatInput, setTestChatInput] = useState('');
  const [testChatLoading, setTestChatLoading] = useState(false);

  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'HUB' | 'SUSPECTS'>('ALL');

  // Form state (continuous prompt)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    username: '',
    botId: '',
    token: '',
    avatarUrl: '',
    role: 'Подозреваемый',
    groupId: '',
    model: 'gemini-3.6-flash',
    temperature: 0.7,
    reasoningEnabled: false,
    isActive: true,
    isMainHub: false,
    orderIndex: 0,
    isGuilty: false,
    secretAlibi: '',
    prompt: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Fetch real available models from active API keys on mount
  useEffect(() => {
    fetch('/api/ai/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
        }
      })
      .catch(() => {});
  }, []);

  const filteredBots = bots.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.username && b.username.toLowerCase().includes(q)) ||
      (b.role && b.role.toLowerCase().includes(q)) ||
      (b.group && b.group.title.toLowerCase().includes(q))
    );
  });

  // Individual Bot Quick Restart directly from card panel
  const handleQuickRestartBot = async (bot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setRestartingBotId(bot.id);

    try {
      const res = await fetch(`/api/bots/${bot.id}/restart`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.bot) {
        setBots(bots.map((b) => (b.id === bot.id ? { ...b, ...data.bot } : b)));
      }
      showToast(`Бот "${bot.name}" успешно перезапущен!`);
    } catch (err: any) {
      alert(err.message || 'Ошибка перезапуска бота');
    } finally {
      setRestartingBotId(null);
    }
  };

  // Auto sync bot photo and info from Telegram API
  const handleSyncTelegram = async (tokenOverride?: string) => {
    const tokenToUse = (tokenOverride || formData.token).trim();
    if (!tokenToUse || !tokenToUse.includes(':')) {
      alert('Укажите корректный токен @BotFather (например: 1234567890:AAH...)');
      return;
    }

    setSyncingTg(true);
    try {
      const res = await fetch('/api/telegram/bot-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось получить данные от Telegram');

      if (data.bot) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name && prev.name !== 'Новый бот' ? prev.name : data.bot.name,
          username: data.bot.username || prev.username,
          botId: prev.botId && !prev.botId.startsWith('bot_') ? prev.botId : data.bot.botId,
          avatarUrl: data.bot.avatarUrl || prev.avatarUrl,
        }));
        showToast('Данные и фото бота успешно загружены из Telegram!');
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка синхронизации с Telegram');
    } finally {
      setSyncingTg(false);
    }
  };

  const handleOpenEdit = async (bot: any) => {
    setSelectedBot(bot);
    setFormData({
      id: bot.id,
      name: bot.name || '',
      username: bot.username ? bot.username.replace('@', '') : '',
      botId: bot.botId || '',
      token: bot.token || '',
      avatarUrl: bot.avatarUrl || '',
      role: bot.role || (bot.isMainHub ? 'Игровой Мастер (Хаб)' : 'Подозреваемый'),
      groupId: bot.groupId || '',
      model: bot.model || 'gemini-3.6-flash',
      temperature: bot.temperature !== undefined ? bot.temperature : 0.7,
      reasoningEnabled: !!bot.reasoningEnabled,
      isActive: bot.isActive !== undefined ? bot.isActive : true,
      isMainHub: !!bot.isMainHub,
      orderIndex: bot.orderIndex !== undefined ? bot.orderIndex : 0,
      isGuilty: !!bot.isGuilty,
      secretAlibi: bot.secretAlibi || '',
      prompt: bot.prompt || '',
    });

    setIsCreating(false);
    setIsEditing(true);
    setShowToken(false);
    setTestChatMessages([
      {
        role: 'bot',
        text: `Здравствуйте! Я — ${bot.name}. Задайте мне вопрос для проверки системного промпта.`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Fetch dialogue logs for this bot
    try {
      const res = await fetch(`/api/bots/${bot.id}`);
      const data = await res.json();
      if (data.bot?.dialogues) {
        setDialogueLogs(data.bot.dialogues);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = (forMainHub: boolean = false) => {
    setSelectedBot(null);
    setFormData({
      id: '',
      name: forMainHub ? 'Детективное Бюро (Хаб)' : '',
      username: '',
      botId: forMainHub ? 'hub_main' : `bot_${Math.random().toString(36).substring(2, 7)}`,
      token: '',
      avatarUrl: '',
      role: forMainHub ? 'Игровой Мастер (Хаб)' : 'Подозреваемый',
      groupId: forMainHub ? '' : groups[0]?.id || '',
      model: availableModels[0] || 'gemini-3.6-flash',
      temperature: 0.7,
      reasoningEnabled: false,
      isActive: true,
      isMainHub: forMainHub,
      orderIndex: 0,
      isGuilty: false,
      secretAlibi: '',
      prompt: forMainHub
        ? `🕵️‍♂️ *Добро пожаловать в Детективное Бюро!*\n\nПеред вами архив нераскрытых дел. Выберите расследование, чтобы изучить материалы, допросить подозреваемых и раскрыть преступление.`
        : '',
    });
    setIsCreating(true);
    setIsEditing(true);
    setShowToken(false);
    setDialogueLogs([]);
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedBot(null);
    setIsPreviewOpen(false);
    setIsTestChatOpen(false);
  };

  const handleToggleActive = async (bot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = !bot.isActive;
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: updated,
          status: updated ? 'ACTIVE' : 'OFFLINE',
        }),
      });
      const data = await res.json();
      if (data.bot) {
        setBots(bots.map((b) => (b.id === bot.id ? { ...b, ...data.bot } : b)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.token.trim()) {
      alert('Пожалуйста, укажите имя бота и токен @BotFather');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        groupId: formData.groupId || null,
        username: formData.username
          ? formData.username.startsWith('@')
            ? formData.username
            : `@${formData.username}`
          : '',
      };

      if (isCreating) {
        const res = await fetch('/api/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка создания');
        setBots([data.bot, ...bots]);
      } else {
        const res = await fetch(`/api/bots/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
        setBots(bots.map((b) => (b.id === formData.id ? { ...b, ...data.bot } : b)));
      }

      handleCloseModal();
      showToast('Бот успешно сохранен!');
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!selectedBot) return;
    if (!confirm(`Вы действительно хотите удалить бота "${selectedBot.name}"?`)) return;

    try {
      const res = await fetch(`/api/bots/${selectedBot.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      setBots(bots.filter((b) => b.id !== selectedBot.id));
      handleCloseModal();
      showToast('Бот удален.');
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  // Preview Prompt
  const handleOpenPromptPreview = async () => {
    try {
      const res = await fetch(`/api/bots/${formData.id || 'draft'}/test-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'prompt_preview_request',
          botDraft: formData,
        }),
      });
      const data = await res.json();
      setCompiledPromptPreview(data.compiledSystemPrompt || 'Промпт не сгенерирован');
      setIsPreviewOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Send message in Test Chat
  const handleSendTestChat = async () => {
    if (!testChatInput.trim() || testChatLoading) return;
    const userMsg = testChatInput.trim();
    setTestChatInput('');

    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setTestChatMessages((prev) => [...prev, { role: 'user', text: userMsg, time }]);
    setTestChatLoading(true);

    try {
      const res = await fetch(`/api/bots/${formData.id || 'draft'}/test-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          botDraft: formData,
        }),
      });
      const data = await res.json();
      setTestChatMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: data.reply || 'Нет ответа',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          tokens: data.tokens,
        },
      ]);
    } catch (err: any) {
      setTestChatMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Ошибка вызова ИИ: ${err.message}`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setTestChatLoading(false);
    }
  };

  const renderBotAvatar = (botName: string, avatarUrl?: string | null) => {
    if (avatarUrl && !avatarUrl.includes('unsplash.com')) {
      return (
        <img
          src={avatarUrl}
          alt={botName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    const initials = botName ? botName.substring(0, 2).toUpperCase() : 'BT';
    return (
      <div className="w-full h-full bg-[#1c1b1b] border border-primary-container/30 flex items-center justify-center text-primary font-mono text-xs font-bold">
        {initials}
      </div>
    );
  };

  return (
    <>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#242424] border border-primary-container text-primary font-mono-code text-xs px-4 py-3 rounded shadow-2xl flex items-center gap-2 modal-animate">
          <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold flex items-center gap-3">
            Боты-Подозреваемые
          </h2>
          <p className="text-on-surface-variant font-body-base text-body-base">
            Управление персонажами расследований, характерами, системными промптами и шкалой раскола.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск подозреваемых..."
              className="bg-[#1a1a1a] border border-[#333333] text-on-surface rounded px-4 py-2 pl-9 w-56 focus:border-primary-container focus:outline-none transition-colors text-sm placeholder:text-on-surface-variant/60"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
          </div>

          <a
            href="/hub"
            className="border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 text-xs font-mono"
          >
            <span>⭐</span>
            Главный Бот (Хаб) ➡️
          </a>

          <button
            onClick={() => handleOpenCreate(false)}
            className="bg-primary-container text-[#1a1a1a] font-bold px-5 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(255,191,0,0.15)] active:scale-95 text-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            + Добавить Подозреваемого
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#333333] pb-3">
        <button
          onClick={() => setActiveTabFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            activeTabFilter === 'ALL'
              ? 'bg-[#333333] text-white font-bold'
              : 'text-on-surface-variant hover:text-white'
          }`}
        >
          Все ({bots.length})
        </button>
        <button
          onClick={() => setActiveTabFilter('HUB')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
            activeTabFilter === 'HUB'
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
              : 'text-on-surface-variant hover:text-white'
          }`}
        >
          <span>⭐</span> Главный Хаб ({bots.filter((b) => b.isMainHub).length})
        </button>
        <button
          onClick={() => setActiveTabFilter('SUSPECTS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
            activeTabFilter === 'SUSPECTS'
              ? 'bg-[#333333] text-white font-bold'
              : 'text-on-surface-variant hover:text-white'
          }`}
        >
          <span>🕵️</span> Подозреваемые ({bots.filter((b) => !b.isMainHub).length})
        </button>
      </div>

      {/* Bento Grid Layout for Bots */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-grid-gutter">
        {filteredBots
          .filter((b) => {
            if (activeTabFilter === 'HUB') return b.isMainHub;
            if (activeTabFilter === 'SUSPECTS') return !b.isMainHub;
            return true;
          })
          .map((bot) => {
          const isActive = bot.isActive && bot.status === 'ACTIVE';
          const isRestarting = restartingBotId === bot.id;

          return (
            <div
              key={bot.id}
              onClick={() => handleOpenEdit(bot)}
              className={`bg-[#242424] border rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group cursor-pointer transition-all hover:border-primary-container/60 shadow-lg ${
                bot.isMainHub
                  ? 'border-amber-500/40 bg-gradient-to-br from-[#272216] to-[#242424]'
                  : 'border-[#333333]'
              } ${!isActive ? 'opacity-70' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors shrink-0 ${
                      bot.isMainHub
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : isActive
                        ? 'border-primary-container'
                        : 'border-[#333333]'
                    }`}
                  >
                    {renderBotAvatar(bot.name, bot.avatarUrl)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                        {bot.name}
                      </h3>
                      {bot.isMainHub && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ХАБ
                        </span>
                      )}
                      {bot.isGuilty && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          УБИЙЦА
                        </span>
                      )}
                    </div>
                    <p className="font-label-caps text-xs text-on-surface-variant mt-0.5">
                      {bot.username || bot.role || 'Подозреваемый'}
                    </p>
                    {bot.group && (
                      <span className="inline-block mt-1 bg-[#1a1a1a] text-primary text-[10px] font-mono-code px-2 py-0.5 rounded border border-[#333333]">
                        {bot.group.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle switch */}
                <div
                  onClick={(e) => handleToggleActive(bot, e)}
                  title={isActive ? 'Отключить бота' : 'Включить бота'}
                  className="relative inline-block w-12 align-middle select-none transition duration-200 cursor-pointer"
                >
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isActive ? 'bg-primary-container' : 'bg-[#333333]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out transform mt-0.5 ml-0.5 ${
                        isActive ? 'translate-x-6' : 'translate-x-0 bg-[#888888]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#333333] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    }`}
                  />
                  <span
                    className={`font-label-caps text-xs font-semibold ${
                      isActive ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {isActive ? 'Активен' : 'Отключён'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono-code text-[11px] text-on-surface-variant bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333333]">
                    {bot.model}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleQuickRestartBot(bot, e)}
                    disabled={isRestarting}
                    title="Перезагрузить бота"
                    className="p-1.5 rounded text-on-surface-variant hover:text-primary hover:bg-[#1a1a1a] transition-all"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        isRestarting ? 'animate-spin text-primary' : ''
                      }`}
                    >
                      restart_alt
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(bot);
                    }}
                    title="Настройки бота"
                    className="p-1.5 rounded text-on-surface-variant hover:text-primary-container hover:bg-[#1a1a1a] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Bot Modal */}
      {isEditing && (
        <div
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
        >
          <div className="bg-[#2c2c2c] w-full max-w-5xl rounded-lg border border-[#333333] flex flex-col max-h-[92vh] overflow-hidden modal-animate relative shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-[#333333] shrink-0 bg-[#242424]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container text-[28px]">
                  {formData.isMainHub ? 'stars' : 'smart_toy'}
                </span>
                <h2 className="font-headline-md text-xl font-bold text-on-background">
                  {isCreating
                    ? formData.isMainHub
                      ? 'Создать Главного Бота-Хаба'
                      : 'Создать Нового Подозреваемого'
                    : `Настройки бота: ${formData.name}`}
                </h2>
                {formData.isMainHub && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                    ГЛАВНЫЙ ИГРОВОЙ ХАБ
                  </span>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Type Switcher Banner */}
              <div className="bg-[#1a1a1a] border border-[#333333] p-3 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{formData.isMainHub ? '⭐ Главный Бот (Игровой Мастер / Воронка)' : '🕵️ Бот-Подозреваемый'}</span>
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {formData.isMainHub
                      ? 'Управляет приветственной воронкой, каталогом расследований, оплатой Telegram Stars и финалом (/accuse).'
                      : 'Персонаж внутри дела. Имеет алиби, характер, грязный секрет и реагирует на допрос детектива.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      isMainHub: !formData.isMainHub,
                      role: !formData.isMainHub ? 'Игровой Мастер (Хаб)' : 'Подозреваемый',
                    })
                  }
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${
                    formData.isMainHub
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#333333] text-white hover:bg-[#444444]'
                  }`}
                >
                  {formData.isMainHub ? 'Переключить в Подозреваемого' : 'Сделать Главным Хабом'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid-gutter">
                {/* Left Column: Profile & Parameters */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  {/* Section 1: Telegram Token & Auto-Sync */}
                  <section className="bg-surface-container rounded-lg border border-[#333333] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-title-sm text-sm text-on-surface font-semibold">
                        Подключение к Telegram
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleSyncTelegram()}
                        disabled={syncingTg}
                        className="text-primary hover:underline text-[11px] font-mono flex items-center gap-1 disabled:opacity-50"
                        title="Подтянуть имя, username и аватарку из Telegram"
                      >
                        <span className={`material-symbols-outlined text-xs ${syncingTg ? 'animate-spin' : ''}`}>
                          sync
                        </span>
                        {syncingTg ? 'Загрузка...' : 'Синхронизировать фото'}
                      </button>
                    </div>

                    <div>
                      <label className="block font-label-caps text-xs text-on-surface-variant mb-1">
                        Telegram Token (@BotFather) *
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={formData.token}
                          onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                          onBlur={(e) => {
                            if (e.target.value.includes(':') && !formData.avatarUrl) {
                              handleSyncTelegram(e.target.value);
                            }
                          }}
                          placeholder="1234567890:AAH_XxYyZz..."
                          className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container focus:ring-1 focus:ring-primary-container text-[#ffffff] font-mono-code text-xs px-3 py-2 pr-10 transition-colors outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary-container"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showToken ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Profile details */}
                    <div className="flex items-center gap-4 pt-2 border-t border-[#333333]">
                      <div className="relative group w-14 h-14 rounded-full overflow-hidden border border-[#333333] shrink-0 bg-surface-variant flex items-center justify-center">
                        {renderBotAvatar(formData.name || 'Бот', formData.avatarUrl)}
                      </div>
                      <div className="flex-1">
                        <label className="block font-label-caps text-xs text-on-surface-variant mb-1">
                          Имя бота
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Имя бота в Telegram"
                          className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container focus:ring-1 focus:ring-primary-container text-[#ffffff] font-body-base text-sm px-3 py-1.5 transition-colors outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-label-caps text-xs text-on-surface-variant mb-1">
                          Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-mono-code">
                            @
                          </span>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) =>
                              setFormData({ ...formData, username: e.target.value })
                            }
                            placeholder="my_tg_bot"
                            className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container focus:ring-1 focus:ring-primary-container text-[#ffffff] font-mono-code text-xs pl-6 pr-2 py-1.5 transition-colors outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-label-caps text-xs text-on-surface-variant mb-1">
                          Роль / Должность
                        </label>
                        <input
                          type="text"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          placeholder={formData.isMainHub ? 'Игровой Мастер' : 'Дворецкий'}
                          className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container focus:ring-1 focus:ring-primary-container text-[#ffffff] text-xs px-2.5 py-1.5 transition-colors outline-none"
                        />
                      </div>
                    </div>

                    {!formData.isMainHub && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block font-label-caps text-xs text-on-surface-variant mb-1">
                            Привязка к Делу
                          </label>
                          <select
                            value={formData.groupId}
                            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container text-[#ffffff] text-xs px-3 py-2 transition-colors outline-none cursor-pointer"
                          >
                            <option value="">Без дела</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.title} ({g.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-label-caps text-xs text-amber-300 mb-1" title="Порядковый номер допроса в деле">
                            Номер #
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={formData.orderIndex}
                            onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                            placeholder="1"
                            className="w-full bg-[#1a1a1a] border border-amber-500/40 rounded focus:border-amber-400 text-amber-200 font-mono font-bold text-xs px-2.5 py-2 transition-colors outline-none text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Suspect Guilty Toggle */}
                    {!formData.isMainHub && (
                      <div className="bg-[#1a1a1a] p-3 rounded border border-[#333333] flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-red-400">Настоящий убийца в деле</div>
                          <div className="text-[10px] text-on-surface-variant">Будет врать и паниковать при уликах</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.isGuilty}
                          onChange={(e) => setFormData({ ...formData, isGuilty: e.target.checked })}
                          className="w-4 h-4 accent-red-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </section>

                  {/* Section 2: Model Parameters */}
                  <section className="bg-surface-container rounded-lg border border-[#333333] p-4 flex flex-col gap-3">
                    <h3 className="font-title-sm text-sm text-on-surface font-semibold mb-1">
                      Параметры ИИ Модели
                    </h3>

                    <div>
                      <label className="block font-label-caps text-xs text-on-surface-variant mb-1">
                        Модель ИИ
                      </label>
                      <input
                        type="text"
                        list="models-list"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="gemini-3.6-flash, gpt-4o..."
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container text-[#ffffff] font-mono-code text-xs px-3 py-2 transition-colors outline-none"
                      />
                      <datalist id="models-list">
                        {availableModels.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-label-caps text-xs text-on-surface-variant">
                          Температура
                        </label>
                        <span className="font-mono-code text-xs text-primary-container font-bold">
                          {formData.temperature}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) =>
                          setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                        }
                        className="w-full accent-primary-container cursor-pointer bg-[#1a1a1a] h-1.5 rounded-full appearance-none"
                      />
                    </div>
                  </section>
                </div>

                {/* Right Column: Prompts, Secrets, & Dialogue Logs */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Section 3: Prompts */}
                  <section className="bg-surface-container rounded-lg border border-[#333333] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-title-sm text-sm text-on-surface font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          {formData.isMainHub ? 'campaign' : 'terminal'}
                        </span>
                        {formData.isMainHub
                          ? 'Текст Воронки и Приветствия (/start)'
                          : 'Системный промпт / Характер и Алиби'}
                      </h3>
                    </div>

                    <textarea
                      rows={formData.isMainHub ? 6 : 8}
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      placeholder={
                        formData.isMainHub
                          ? '🕵️‍♂️ Добро пожаловать в Детективное Бюро! Опишите воронку входа для игрока...'
                          : 'Опиши характер персонажа, отношения с жертвой и официальное алиби на вечер...'
                      }
                      className="w-full bg-[#1a1a1a] border border-[#333333] rounded focus:border-primary-container text-[#ffffff] font-mono-code text-xs p-4 leading-relaxed resize-y transition-colors outline-none"
                    />

                    {/* Secret Alibi field for suspects */}
                    {!formData.isMainHub && (
                      <div className="mt-2">
                        <label className="block font-label-caps text-xs text-amber-300 font-bold mb-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">lock_open</span>
                          {formData.isGuilty
                            ? 'Нелепая ложь при расколе (для настоящего убийцы):'
                            : 'Настоящий секрет при расколе (для невиновного):'}
                        </label>
                        <textarea
                          rows={3}
                          value={formData.secretAlibi}
                          onChange={(e) => setFormData({ ...formData, secretAlibi: e.target.value })}
                          placeholder={
                            formData.isGuilty
                              ? 'Я был там, но просто уронил карманные часы на ковер в темноте!'
                              : 'Да, я соврал, потому что тайком брал деньги из сейфа, но я не убивал!'
                          }
                          className="w-full bg-[#1a1a1a] border border-amber-500/30 rounded focus:border-amber-400 text-amber-100 font-mono-code text-xs p-3 leading-relaxed resize-y transition-colors outline-none"
                        />
                      </div>
                    )}
                  </section>

                  {/* Section 4: Dialogue Logs */}
                  <section className="bg-surface-container rounded-lg border border-[#333333] p-4 flex flex-col min-h-[160px]">
                    <h3 className="font-title-sm text-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">forum</span>
                      История диалогов бота
                    </h3>
                    <div className="flex-1 bg-[#1a1a1a] border border-[#333333] rounded p-3 overflow-y-auto max-h-[180px] flex flex-col gap-3">
                      {dialogueLogs.length === 0 ? (
                        <p className="text-xs text-on-surface-variant/70 italic text-center py-4">
                          Диалогов с этим ботом пока не зафиксировано.
                        </p>
                      ) : (
                        dialogueLogs.map((d: any) => (
                          <div key={d.id} className="space-y-1.5 text-xs font-mono-code border-b border-[#333333]/50 pb-2">
                            <div className="flex justify-between text-on-surface-variant text-[10px]">
                              <span>Пользователь: {d.user?.username || d.user?.telegramId || 'User'}</span>
                              <span>{new Date(d.createdAt).toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="text-on-surface"><b className="text-on-surface-variant">[Юзер]:</b> {d.userMessage}</div>
                            <div className="text-primary"><b className="text-primary-container">[Бот]:</b> {d.botResponse}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-[#333333] bg-[#242424] flex items-center justify-between shrink-0">
              <div>
                {!isCreating && (
                  <button
                    type="button"
                    onClick={handleDeleteBot}
                    className="text-error hover:underline text-xs font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Удалить бота
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenPromptPreview}
                  className="bg-[#1a1a1a] hover:bg-[#202020] border border-[#333333] text-primary text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Предпросмотр промпта
                </button>
                <button
                  type="button"
                  onClick={() => setIsTestChatOpen(true)}
                  className="bg-[#1a1a1a] hover:bg-[#202020] border border-[#333333] text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  Тестовый диалог
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded border border-[#333333] text-on-surface font-title-sm text-xs hover:bg-[#333333] transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary-container text-[#1a1a1a] font-bold px-6 py-2 rounded text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] modal-animate">
            <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
              <h3 className="font-title-sm text-base text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">terminal</span>
                Скомпилированный системный промпт ({formData.name})
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-on-surface-variant hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto my-4 p-4 bg-[#141414] border border-[#333333] rounded font-mono-code text-xs text-[#ffffff] whitespace-pre-wrap leading-relaxed">
              {compiledPromptPreview}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 bg-primary-container text-[#1a1a1a] font-bold rounded text-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Chat Modal */}
      {isTestChatOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-xl max-w-2xl w-full h-[620px] shadow-2xl flex flex-col modal-animate">
            <div className="flex justify-between items-center p-4 border-b border-[#333333]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                <h3 className="font-title-sm text-sm font-bold text-on-surface">
                  Тестовый диалог: {formData.name} ({formData.model})
                </h3>
              </div>
              <button
                onClick={() => setIsTestChatOpen(false)}
                className="text-on-surface-variant hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Chat message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#181818]">
              {testChatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg max-w-[85%] text-xs font-body-base leading-relaxed ${
                    msg.role === 'user'
                      ? 'ml-auto bg-[#2c2c2c] border border-[#444444] text-white'
                      : 'mr-auto bg-[#202020] border border-primary-container/30 text-white'
                  }`}
                >
                  <div className="flex justify-between text-[10px] text-on-surface-variant font-mono-code mb-1">
                    <span>{msg.role === 'user' ? 'Вы (Тестер)' : formData.name}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {testChatLoading && (
                <div className="p-3 bg-[#202020] border border-primary-container/20 text-primary text-xs rounded-lg max-w-[80%] animate-pulse">
                  {formData.name} генерирует ответ...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-[#333333] bg-[#242424] flex gap-2">
              <input
                type="text"
                value={testChatInput}
                onChange={(e) => setTestChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendTestChat();
                }}
                placeholder="Введите тестовое сообщение..."
                className="flex-1 bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-xs text-white outline-none focus:border-primary-container"
              />
              <button
                type="button"
                onClick={handleSendTestChat}
                disabled={testChatLoading}
                className="px-5 py-2 bg-primary-container text-[#1a1a1a] font-bold rounded text-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
              >
                <span>Отправить</span>
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
