'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  initialBot: any;
}

export function BotDetailClient({ initialBot }: Props) {
  const [bot, setBot] = useState(initialBot);
  const [saving, setSaving] = useState(false);
  const [syncingTg, setSyncingTg] = useState(false);
  const [name, setName] = useState(bot.name || '');
  const [username, setUsername] = useState(bot.username || '');
  const [token, setToken] = useState(bot.token || '');
  const [avatarUrl, setAvatarUrl] = useState(bot.avatarUrl || '');
  const [role, setRole] = useState(bot.role || '');
  const [model, setModel] = useState(bot.model || 'gemini-3.5-flash');
  const [temperature, setTemperature] = useState(
    bot.temperature !== undefined ? bot.temperature : 0.7
  );
  const [prompt, setPrompt] = useState(bot.prompt || '');
  const [toastMessage, setToastMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gpt-4o',
    'claude-3-5-sonnet-20241022',
  ]);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSyncTelegram = async () => {
    if (!token || !token.includes(':')) {
      alert('Укажите токен бота @BotFather');
      return;
    }

    setSyncingTg(true);
    try {
      const res = await fetch('/api/telegram/bot-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка синхронизации');

      if (data.bot) {
        if (data.bot.name) setName(data.bot.name);
        if (data.bot.username) setUsername(data.bot.username);
        if (data.bot.avatarUrl) setAvatarUrl(data.bot.avatarUrl);
        showToast('Данные и фото бота успешно загружены из Telegram!');
      }
    } catch (e: any) {
      alert(e.message || 'Ошибка синхронизации');
    } finally {
      setSyncingTg(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          token,
          avatarUrl,
          role,
          model,
          temperature,
          prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBot(data.bot);
      showToast('Настройки бота успешно сохранены!');
    } catch (e: any) {
      alert(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = () => {
    if (avatarUrl && !avatarUrl.includes('unsplash.com')) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    const initials = name ? name.substring(0, 2).toUpperCase() : 'BT';
    return (
      <div className="w-full h-full bg-[#1c1b1b] border border-primary-container/30 flex items-center justify-center text-primary font-mono text-base font-bold">
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#242424] border border-primary-container text-primary font-mono-code text-xs px-4 py-3 rounded shadow-2xl flex items-center gap-2 modal-animate">
          <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Header breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/bots"
            className="text-on-surface-variant hover:text-white flex items-center gap-1 text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Назад к ботам
          </Link>
          <span className="text-on-surface-variant/40">/</span>
          <span className="text-white font-semibold text-sm">{bot.name}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-container text-[#1a1a1a] font-bold px-6 py-2 rounded text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,191,0,0.15)] disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid-gutter">
        {/* Left Column: Info & Telegram Sync */}
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-6 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-[#333333] shrink-0">
              {renderAvatar()}
            </div>
            <div>
              <h3 className="font-title-sm text-base text-white font-semibold">{name || bot.name}</h3>
              <p className="text-xs text-on-surface-variant font-mono-code">{bot.botId}</p>
              <button
                type="button"
                onClick={handleSyncTelegram}
                disabled={syncingTg}
                className="mt-1 text-[11px] text-primary hover:underline font-mono flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-xs ${syncingTg ? 'animate-spin' : ''}`}>
                  sync
                </span>
                {syncingTg ? 'Загрузка...' : 'Синхронизировать фото'}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
              Telegram Token (@BotFather)
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-xs text-white font-mono-code focus:border-primary-container outline-none"
            />
          </div>

          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
              Имя бота
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
            />
          </div>

          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
            />
          </div>

          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
              Роль / Назначение
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
            />
          </div>

          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
              Модель ИИ
            </label>
            <input
              type="text"
              list="models-detail-list"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-3.5-flash, gemini-2.5-flash, gpt-4o..."
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
            />
            <datalist id="models-detail-list">
              {availableModels.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="font-label-caps text-on-surface-variant uppercase">Температура</label>
              <span className="font-mono-code text-primary font-bold">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary-container"
            />
          </div>
        </div>

        {/* Right Column: Continuous System Prompt */}
        <div className="lg:col-span-2 bg-[#242424] border border-[#333333] rounded-lg p-6 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-title-sm text-base text-white font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">terminal</span>
              Системный промпт бота
            </h3>
            <span className="text-xs text-on-surface-variant font-mono-code">Сплошной текст</span>
          </div>

          <textarea
            rows={16}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите инструкции для бота сплошным текстом..."
            className="w-full flex-1 min-h-[360px] bg-[#1a1a1a] border border-[#333333] rounded p-4 text-xs font-mono-code text-white leading-relaxed focus:border-primary-container outline-none resize-y"
          />
        </div>
      </div>
    </div>
  );
}
