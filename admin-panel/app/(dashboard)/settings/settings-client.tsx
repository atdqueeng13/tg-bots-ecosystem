'use client';

import { useState, useEffect } from 'react';

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  provider?: string;
  maskedKey: string;
  status: string;
  isPrimary: boolean;
  latencyMs: number;
  requestCount: number;
  supportedModels: string[];
  lastUsedAt?: string | null;
}

interface Props {
  initialSettings: any;
  initialKeys: ApiKeyItem[];
  bots: any[];
}

export function SettingsClient({ initialSettings, initialKeys, bots }: Props) {
  const [systemPrompt, setSystemPrompt] = useState(
    initialSettings?.systemPrompt ||
      `Ты — ИИ-ассистент в Telegram. Отвечай структурированно, профессионально и по существу, строго следуя инструкциям бота.`
  );
  const [primaryEngine, setPrimaryEngine] = useState(
    initialSettings?.primaryEngine || 'gemini-3.6-flash'
  );
  const [apiKeyMode, setApiKeyMode] = useState<'AUTO_ROTATION' | 'FIXED'>(
    initialSettings?.apiKeyMode === 'FIXED' ? 'FIXED' : 'AUTO_ROTATION'
  );
  const [activeApiKeyId, setActiveApiKeyId] = useState(
    initialSettings?.activeApiKeyId || (initialKeys.find((k) => k.isPrimary)?.id || '')
  );
  const [fallbackBotId, setFallbackBotId] = useState(
    initialSettings?.fallbackBotId || (bots[0]?.id || '')
  );
  const [autoFallback, setAutoFallback] = useState(
    initialSettings?.autoFallback !== undefined ? initialSettings.autoFallback : true
  );

  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // Add Key Modal
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyDefaultModel, setNewKeyDefaultModel] = useState('gemini-3.6-flash');
  const [addingKey, setAddingKey] = useState(false);

  // Available models list
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
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

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          primaryEngine,
          apiKeyMode,
          activeApiKeyId: apiKeyMode === 'FIXED' ? activeApiKeyId : null,
          fallbackBotId: fallbackBotId || null,
          autoFallback,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Настройки и основная модель успешно сохранены!');
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения настроек');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim()) {
      alert('Введите API ключ');
      return;
    }

    setAddingKey(true);
    try {
      const res = await fetch('/api/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim() || `API Ключ #${keys.length + 1}`,
          key: newKeyValue.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // If user selected a default model in modal, update primary engine
      if (newKeyDefaultModel && newKeyDefaultModel !== primaryEngine) {
        setPrimaryEngine(newKeyDefaultModel);
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primaryEngine: newKeyDefaultModel }),
        });
      }

      // Re-fetch all keys
      const keysRes = await fetch('/api/gemini-keys');
      const keysData = await keysRes.json();
      if (keysData.keys) {
        setKeys(keysData.keys);
      }

      setIsAddKeyModalOpen(false);
      setNewKeyName('');
      setNewKeyValue('');
      showToast('API ключ успешно добавлен и проверен!');
    } catch (err: any) {
      alert(err.message || 'Ошибка добавления API ключа');
    } finally {
      setAddingKey(false);
    }
  };

  const handleSetPrimaryKey = async (keyId: string) => {
    try {
      const res = await fetch('/api/gemini-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: keyId, setPrimary: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKeys(
        keys.map((k) => ({
          ...k,
          isPrimary: k.id === keyId,
        }))
      );
      setActiveApiKeyId(keyId);
      showToast('Активный API ключ обновлен!');
    } catch (err: any) {
      alert(err.message || 'Ошибка установки активного ключа');
    }
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    try {
      const res = await fetch('/api/gemini-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: keyId, testKey: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.key) {
        setKeys(
          keys.map((k) =>
            k.id === keyId
              ? {
                  ...k,
                  status: data.key.status,
                  provider: data.key.provider || k.provider,
                  latencyMs: data.key.latencyMs,
                  supportedModels: data.models || k.supportedModels,
                }
              : k
          )
        );
      }
      showToast('API ключ проверен. Модели актуализированы!');
    } catch (err: any) {
      alert(err.message || 'Ошибка проверки ключа');
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (keys.length <= 1) {
      alert('Нельзя удалить единственный API ключ в системе');
      return;
    }

    if (!confirm(`Удалить API ключ "${keyName}"?`)) return;

    try {
      const res = await fetch(`/api/gemini-keys?id=${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');

      setKeys(keys.filter((k) => k.id !== keyId));
      showToast('API ключ удален.');
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const getProviderBadge = (provider?: string) => {
    const p = (provider || 'gemini').toLowerCase();
    if (p === 'openai') {
      return (
        <span className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
          OpenAI
        </span>
      );
    }
    if (p === 'anthropic') {
      return (
        <span className="bg-purple-950/50 border border-purple-500/40 text-purple-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
          Claude
        </span>
      );
    }
    if (p === 'openrouter') {
      return (
        <span className="bg-blue-950/50 border border-blue-500/40 text-blue-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
          OpenRouter
        </span>
      );
    }
    return (
      <span className="bg-amber-950/50 border border-amber-500/40 text-amber-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
        Gemini
      </span>
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

      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background font-bold">
            Настройки
          </h2>
          <p className="text-on-surface-variant mt-1 font-body-base text-body-base">
            Управление системным промптом, основной моделью ИИ по умолчанию и пулом API ключей.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="bg-primary-container text-[#1a1a1a] font-bold px-6 py-2.5 rounded hover:opacity-90 transition-opacity flex items-center gap-2 text-sm active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(255,191,0,0.15)]"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {savingSettings ? 'Сохранение...' : 'Сохранить все настройки'}
        </button>
      </header>

      {/* Section 1: Default Primary Engine & Model Configuration */}
      <section className="bg-[#242424] border border-[#333333] rounded-lg p-6 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#333333] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center border border-[#333333]">
              <span className="material-symbols-outlined text-primary text-[22px]">psychology</span>
            </div>
            <div>
              <h3 className="font-title-sm text-base text-on-background font-semibold">
                Основная модель ИИ по умолчанию
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Эта модель автоматически подставляется при создании новых ботов и подозреваемых в панели управления.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-mono-code">Текущая:</span>
            <span className="bg-primary-container text-[#1a1a1a] font-bold font-mono-code text-xs px-2.5 py-1 rounded">
              {primaryEngine}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1.5 font-semibold">
              Выбрать или ввести модель вручную
            </label>
            <input
              type="text"
              list="primary-models-list"
              value={primaryEngine}
              onChange={(e) => setPrimaryEngine(e.target.value)}
              placeholder="gemini-3.6-flash, gemini-3.5-flash..."
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3.5 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
            />
            <datalist id="primary-models-list">
              {availableModels.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1.5 font-semibold">
              Быстрый выбор рекомендованных моделей
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrimaryEngine(m)}
                  className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                    primaryEngine === m
                      ? 'bg-primary-container text-[#1a1a1a] font-bold border-primary-container'
                      : 'bg-[#1a1a1a] text-on-surface-variant border-[#333333] hover:text-white hover:border-[#555555]'
                  }`}
                >
                  {m} {m === 'gemini-3.6-flash' && '⭐️ (Осн)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: API Keys Manager */}
      <section className="bg-[#242424] border border-[#333333] rounded-lg p-6 flex flex-col gap-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#333333] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center border border-[#333333]">
              <span className="material-symbols-outlined text-primary text-[22px]">key</span>
            </div>
            <div>
              <h3 className="font-title-sm text-base text-on-background font-semibold">
                Список API ключей ИИ
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Пул ключей Google Gemini, OpenAI, Claude для генерации ответов ботов.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center bg-[#1a1a1a] border border-[#333333] rounded p-1 text-xs">
              <button
                type="button"
                onClick={() => setApiKeyMode('AUTO_ROTATION')}
                className={`px-3 py-1.5 rounded transition-colors font-medium flex items-center gap-1.5 ${
                  apiKeyMode === 'AUTO_ROTATION'
                    ? 'bg-primary-container text-[#1a1a1a] font-bold'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">autorenew</span>
                Автосмена API (Ротация при 429)
              </button>
              <button
                type="button"
                onClick={() => setApiKeyMode('FIXED')}
                className={`px-3 py-1.5 rounded transition-colors font-medium flex items-center gap-1.5 ${
                  apiKeyMode === 'FIXED'
                    ? 'bg-primary-container text-[#1a1a1a] font-bold'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">pin</span>
                Фиксированный ключ
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddKeyModalOpen(true)}
              className="bg-[#333333] hover:bg-[#444444] text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Добавить API ключ
            </button>
          </div>
        </div>

        {/* Keys Table */}
        <div className="overflow-x-auto border border-[#333333] rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#333333]">
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase">
                  Название
                </th>
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase">
                  Провайдер
                </th>
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase">
                  API Ключ
                </th>
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase">
                  Статус
                </th>
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase">
                  Запросов / Пинг
                </th>
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase">
                  Доступные модели
                </th>
                <th className="py-3 px-4 font-label-caps text-xs text-on-surface-variant uppercase text-right">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333] text-xs">
              {keys.map((k) => {
                const isActive = k.status === 'ACTIVE';
                const isCooldown = k.status === 'COOLDOWN';
                const isSelectedFixed = apiKeyMode === 'FIXED' && activeApiKeyId === k.id;

                return (
                  <tr key={k.id} className="hover:bg-[#2c2c2c] transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      {k.name}
                      {k.isPrimary && (
                        <span className="bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-mono-code px-1.5 py-0.5 rounded">
                          Основной
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getProviderBadge(k.provider)}
                    </td>
                    <td className="py-3 px-4 font-mono-code text-on-surface-variant">
                      {k.maskedKey}
                    </td>
                    <td className="py-3 px-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Активен
                        </span>
                      ) : isCooldown ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-amber-950/40 border border-amber-500/40 text-amber-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Лимит (429)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-red-950/40 border border-red-500/40 text-red-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Ошибка
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-code text-on-surface-variant">
                      {k.requestCount} req • {k.latencyMs} ms
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {k.supportedModels && k.supportedModels.length > 0 ? (
                          k.supportedModels.slice(0, 3).map((mod) => (
                            <span
                              key={mod}
                              className="bg-[#1a1a1a] border border-[#333333] text-[10px] font-mono-code text-primary px-1.5 py-0.5 rounded"
                            >
                              {mod}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-on-surface-variant italic">
                            gemini-3.6-flash
                          </span>
                        )}
                        {k.supportedModels && k.supportedModels.length > 3 && (
                          <span className="text-[10px] text-on-surface-variant">
                            +{k.supportedModels.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {apiKeyMode === 'FIXED' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveApiKeyId(k.id);
                              handleSetPrimaryKey(k.id);
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isSelectedFixed
                                ? 'bg-primary-container text-[#1a1a1a]'
                                : 'bg-[#1a1a1a] hover:bg-[#333333] text-white border border-[#333333]'
                            }`}
                          >
                            {isSelectedFixed ? 'Выбран' : 'Выбрать'}
                          </button>
                        ) : (
                          !k.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryKey(k.id)}
                              className="text-on-surface-variant hover:text-primary transition-colors text-xs"
                              title="Сделать приоритетным"
                            >
                              В топ
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => handleTestKey(k.id)}
                          disabled={testingKeyId === k.id}
                          className="text-on-surface-variant hover:text-white transition-colors p-1"
                          title="Проверить ключ и актуализировать модели"
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              testingKeyId === k.id ? 'animate-spin' : ''
                            }`}
                          >
                            refresh
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.id, k.name)}
                          className="text-on-surface-variant hover:text-error transition-colors p-1"
                          title="Удалить ключ"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grid: Global System Prompt & Fallback Bot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid-gutter">
        {/* Left: Global System Prompt */}
        <section className="lg:col-span-2 space-y-stack-gap">
          <div className="bg-[#242424] border border-[#333333] rounded-lg p-6 flex flex-col h-full shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">terminal</span>
              <h3 className="font-title-sm text-base text-on-background font-semibold">
                Глобальный системный промпт
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-3">
              Этот системный контекст автоматически наследуется всеми ботами платформы.
            </p>
            <div className="flex flex-col flex-1">
              <textarea
                rows={10}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Введите глобальный контекст для всех ботов..."
                className="w-full flex-1 min-h-[220px] bg-surface border border-[#333333] rounded p-4 text-on-surface font-mono-code text-xs focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors resize-y leading-relaxed"
              />
            </div>
          </div>
        </section>

        {/* Right: Fallback Bot & Parameters */}
        <section className="space-y-stack-gap">
          <div className="bg-[#242424] border border-[#333333] rounded-lg p-6 shadow-lg flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              <h3 className="font-title-sm text-base text-on-background font-semibold">
                Резервный бот (Fallback)
              </h3>
            </div>

            {/* Auto-Fallback Toggle */}
            <div className="flex items-center justify-between border-b border-[#333333] pb-4">
              <div>
                <p className="font-body-base text-on-background font-semibold text-sm">
                  Автопереключение на резервного бота
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Если бот отключен или возвращает ошибку
                </p>
              </div>
              <div
                onClick={() => setAutoFallback(!autoFallback)}
                className="relative inline-block w-12 align-middle select-none transition duration-200 cursor-pointer"
              >
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${
                    autoFallback ? 'bg-primary-container' : 'bg-[#333333]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out transform mt-0.5 ml-0.5 ${
                      autoFallback ? 'translate-x-6' : 'translate-x-0 bg-[#888888]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Select Fallback Bot */}
            <div>
              <label className="font-label-caps text-xs text-on-surface-variant uppercase mb-2 block font-semibold">
                Выберите резервного бота
              </label>
              <select
                value={fallbackBotId}
                onChange={(e) => setFallbackBotId(e.target.value)}
                className="w-full bg-surface border border-[#333333] rounded p-3 text-on-surface text-sm focus:border-primary-container outline-none cursor-pointer"
              >
                <option value="">Без резервного бота</option>
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.username || b.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#1a1a1a] border border-[#333333] rounded p-3 text-xs text-on-surface-variant leading-relaxed">
              💡 При включенном автопереключении, любые необработанные запросы перенаправляются на выбранного резервного бота.
            </div>
          </div>
        </section>
      </div>

      {/* Add API Key Modal */}
      {isAddKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-xl p-6 max-w-md w-full shadow-2xl modal-animate">
            <h3 className="font-title-sm text-base text-on-surface font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">key</span>
              Добавить API ключ
            </h3>

            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  Название ключа
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Например: Основной Gemini Flash"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  API Ключ *
                </label>
                <input
                  type="text"
                  required
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="AIzaSy... или AQ.Ab8..."
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Поддерживаются Google Gemini, OpenAI, Claude, OpenRouter. Провайдер и модели определяются автоматически.
                </p>
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  Использовать модель как основную по умолчанию
                </label>
                <input
                  type="text"
                  list="modal-models-list"
                  value={newKeyDefaultModel}
                  onChange={(e) => setNewKeyDefaultModel(e.target.value)}
                  placeholder="gemini-3.6-flash"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
                />
                <datalist id="modal-models-list">
                  {availableModels.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setIsAddKeyModalOpen(false)}
                  className="px-4 py-2 border border-[#333333] text-white rounded text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={addingKey}
                  className="px-5 py-2 bg-primary-container text-[#1a1a1a] font-bold rounded text-xs hover:opacity-90 disabled:opacity-50"
                >
                  {addingKey ? 'Проверка...' : 'Добавить и установить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
