'use client';

import { useState } from 'react';

interface FunnelStep {
  id: string;
  stepIndex: number;
  text: string;
  delaySeconds: number;
  mediaUrl?: string;
  buttonText?: string;
}

interface Props {
  initialHubBot: any;
  cases: any[];
}

export function HubClient({ initialHubBot, cases }: Props) {
  const [hubBot, setHubBot] = useState(initialHubBot);
  const [saving, setSaving] = useState(false);
  const [syncingTg, setSyncingTg] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activePreviewStep, setActivePreviewStep] = useState<number>(0);

  // Parse funnel steps
  const initialSteps: FunnelStep[] = (() => {
    try {
      const parsed = JSON.parse(hubBot.onboardingSteps || '[]');
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [
            {
              id: 'step_1',
              stepIndex: 0,
              text: '🕵️‍♂️ Добро пожаловать в Детективное Бюро!',
              delaySeconds: 0,
              mediaUrl: '',
              buttonText: 'Получить инструкции 📜',
            },
          ];
    } catch {
      return [];
    }
  })();

  const [steps, setSteps] = useState<FunnelStep[]>(initialSteps);
  const [formData, setFormData] = useState({
    name: hubBot.name || 'Детективное Бюро (Главный Хаб)',
    username: hubBot.username ? hubBot.username.replace('@', '') : '',
    token: hubBot.token || '',
    avatarUrl: hubBot.avatarUrl || '',
    model: hubBot.model || 'gemini-3.6-flash',
    temperature: hubBot.temperature !== undefined ? hubBot.temperature : 0.7,
    isActive: hubBot.isActive !== undefined ? hubBot.isActive : true,
    prompt: hubBot.prompt || '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Add a new step to the funnel
  const handleAddStep = () => {
    const newStep: FunnelStep = {
      id: `step_${Date.now()}`,
      stepIndex: steps.length,
      text: '',
      delaySeconds: 2,
      mediaUrl: '',
      buttonText: 'Далее ➡️',
    };
    setSteps([...steps, newStep]);
    setActivePreviewStep(steps.length);
  };

  // Remove a step
  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      alert('В воронке должен оставаться хотя бы 1 шаг!');
      return;
    }
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepIndex: i }));
    setSteps(updated);
    if (activePreviewStep >= updated.length) {
      setActivePreviewStep(Math.max(0, updated.length - 1));
    }
  };

  // Move step up or down
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const reindexed = updated.map((s, i) => ({ ...s, stepIndex: i }));
    setSteps(reindexed);
    setActivePreviewStep(targetIndex);
  };

  // Update specific step field
  const handleUpdateStep = (index: number, field: keyof FunnelStep, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  // Sync Telegram Bot Info
  const handleSyncTelegram = async (customToken?: string) => {
    const tokenToUse = customToken || formData.token;
    if (!tokenToUse || !tokenToUse.includes(':')) {
      alert('Укажите корректный токен Telegram');
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
      if (!res.ok) throw new Error(data.error);

      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        username: data.username ? data.username.replace('@', '') : prev.username,
        avatarUrl: data.avatarUrl || prev.avatarUrl,
      }));
      showToast('Данные и фото успешно синхронизированы из Telegram!');
    } catch (err: any) {
      alert(err.message || 'Ошибка синхронизации');
    } finally {
      setSyncingTg(false);
    }
  };

  // Save all Hub settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        isMainHub: true,
        onboardingSteps: JSON.stringify(steps),
        username: formData.username
          ? formData.username.startsWith('@')
            ? formData.username
            : `@${formData.username}`
          : '',
      };

      const res = await fetch(`/api/bots/${hubBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHubBot(data.bot);
      showToast('Настройки Главного Бота и Воронки сохранены!');
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#242424] border border-amber-400 text-amber-300 font-mono-code text-xs px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 modal-animate">
          <span className="material-symbols-outlined text-sm text-amber-400">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#333333] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <h1 className="font-display-lg text-2xl md:text-3xl text-on-surface font-bold">
              Главный Бот (Хаб & Игровой Мастер)
            </h1>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
              ЕДИНСТВЕННЫЙ
            </span>
          </div>
          <p className="text-on-surface-variant text-sm mt-1">
            Управление пошаговой воронкой онбординга, блокировкой ИИ, витриной расследований и ИИ-Шефом Бюро.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(251,191,36,0.2)] active:scale-95 text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>

      {/* Grid: Left Settings / Center Funnel Builder / Right Live Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (4 cols): Connection & AI Chief settings */}
        <div className="lg:col-span-4 space-y-6">
          {/* Connection Card */}
          <div className="bg-[#242424] border border-[#333333] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">link</span>
                Подключение Telegram
              </h3>
              <button
                type="button"
                onClick={() => handleSyncTelegram()}
                disabled={syncingTg}
                className="text-amber-400 hover:underline text-[11px] font-mono flex items-center gap-1 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-xs ${syncingTg ? 'animate-spin' : ''}`}>
                  sync
                </span>
                {syncingTg ? 'Загрузка...' : 'Синхронизировать'}
              </button>
            </div>

            {/* Profile Avatar & Name */}
            <div className="flex items-center gap-4 pt-2 border-t border-[#333333]">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/80 bg-surface-variant flex items-center justify-center shrink-0">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-400 font-bold text-lg">HUB</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Имя в Telegram</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Детективное Бюро"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Username & Token */}
            <div>
              <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Username бота</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="sherlock_hub_bot"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded pl-6 pr-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Токен @BotFather</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  placeholder="1234567890:AAH_XxYyZz..."
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-1.5 pr-8 text-xs text-white focus:border-amber-400 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showToken ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Webhook endpoint info */}
            <div className="pt-2 border-t border-[#333333] text-[11px] text-on-surface-variant font-mono">
              <span className="text-amber-400 font-bold">Вебхук роут:</span> /api/bot-webhook/hub_main
            </div>
          </div>

          {/* AI Chief Assistant Card (After Funnel) */}
          <div className="bg-[#242424] border border-[#333333] rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">smart_toy</span>
                ИИ-Шеф Бюро (После воронки)
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Активируется <b>только после</b> прохождения игроком всех шагов воронки. Отвечает на вопросы, напоминает о делах и судит `/accuse`.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Модель ИИ</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-mono text-on-surface-variant">Температура</label>
                <span className="text-xs font-mono text-amber-400 font-bold">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer bg-[#1a1a1a] h-1.5 rounded-full appearance-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-on-surface-variant mb-1">
                Системный промпт Архивариуса
              </label>
              <textarea
                rows={5}
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="Ты — Шеф Детективного Бюро Скотланд-Ярда..."
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded p-3 text-xs text-white font-mono focus:border-amber-400 outline-none leading-relaxed resize-y"
              />
            </div>
          </div>
        </div>

        {/* Center & Right Column (8 cols): Funnel Builder + Live Simulator */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#242424] border border-[#333333] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#333333] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">filter_alt</span>
                  Пошаговая Воронка Онбординга ({steps.length} {steps.length === 1 ? 'сообщение' : 'сообщений'})
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Сообщения отправляются новому игроку строго по цепочке. ИИ во время воронки <b>полностью отключен</b>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStep}
                className="bg-[#333333] hover:bg-[#444444] text-amber-300 border border-amber-400/30 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors self-start"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                + Добавить шаг
              </button>
            </div>

            {/* List of Funnel Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id || index}
                  onClick={() => setActivePreviewStep(index)}
                  className={`bg-[#1a1a1a] border rounded-xl p-4 transition-all ${
                    activePreviewStep === index
                      ? 'border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30'
                      : 'border-[#333333] hover:border-[#555555]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-black font-bold text-[11px] font-mono px-2 py-0.5 rounded">
                        ШАГ {index + 1}
                      </span>
                      <span className="text-xs text-on-surface-variant font-mono">
                        {step.delaySeconds > 0 ? `⏳ Задержка: ${step.delaySeconds}с` : '⚡ Мгновенно'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(index, 'up');
                        }}
                        disabled={index === 0}
                        title="Поднять выше"
                        className="p-1 rounded text-on-surface-variant hover:text-white disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(index, 'down');
                        }}
                        disabled={index === steps.length - 1}
                        title="Опустить ниже"
                        className="p-1 rounded text-on-surface-variant hover:text-white disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStep(index);
                        }}
                        title="Удалить шаг"
                        className="p-1 rounded text-error hover:bg-error/10 ml-2"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="space-y-3">
                    <div>
                      <textarea
                        rows={3}
                        value={step.text}
                        onChange={(e) => handleUpdateStep(index, 'text', e.target.value)}
                        placeholder="Текст сообщения (поддерживает *жирный* и _курсив_)..."
                        className="w-full bg-[#242424] border border-[#333333] rounded-lg p-3 text-xs text-white focus:border-amber-400 outline-none leading-relaxed resize-y font-body-base"
                      />
                    </div>

                    {/* Step Parameters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">
                          Задержка (сек)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={step.delaySeconds}
                          onChange={(e) =>
                            handleUpdateStep(index, 'delaySeconds', parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-[#242424] border border-[#333333] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">
                          Фото / Картинка URL
                        </label>
                        <input
                          type="text"
                          value={step.mediaUrl || ''}
                          onChange={(e) => handleUpdateStep(index, 'mediaUrl', e.target.value)}
                          placeholder="https://... или пусто"
                          className="w-full bg-[#242424] border border-[#333333] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">
                          Текст кнопки
                        </label>
                        <input
                          type="text"
                          value={step.buttonText || ''}
                          onChange={(e) => handleUpdateStep(index, 'buttonText', e.target.value)}
                          placeholder={index === steps.length - 1 ? '📂 Открыть архив Дел' : 'Далее ➡️'}
                          className="w-full bg-[#242424] border border-[#333333] rounded px-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Commands Reference Banner */}
            <div className="bg-[#1a1a1a] border border-[#333333] p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-amber-300 uppercase font-mono flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">terminal</span>
                Команды Главного Бота:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-[#242424] p-2 rounded border border-[#333333]">
                  <span className="text-amber-400 font-bold">/start</span> — запуск воронки
                </div>
                <div className="bg-[#242424] p-2 rounded border border-[#333333]">
                  <span className="text-amber-400 font-bold">/cases</span> — меню дел и оплата
                </div>
                <div className="bg-[#242424] p-2 rounded border border-[#333333]">
                  <span className="text-amber-400 font-bold">/accuse</span> — финал и вердикт
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
