'use client';

import { useState } from 'react';

interface Props {
  initialSettings: any;
  initialKeys: any[];
}

export function SettingsClient({ initialSettings, initialKeys }: Props) {
  const [systemPrompt, setSystemPrompt] = useState(initialSettings?.systemPrompt || '');
  const [primaryEngine, setPrimaryEngine] = useState(initialSettings?.primaryEngine || 'gemini-2.0-flash');
  const [autoFallback, setAutoFallback] = useState(initialSettings?.autoFallback ?? true);
  const [keys, setKeys] = useState(initialKeys);
  const [saving, setSaving] = useState(false);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);

  const tokenCount = Math.ceil(systemPrompt.length / 3.8);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          primaryEngine,
          autoFallback,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Глобальные параметры успешно применены ко всей экосистеме ботов!');
    } catch (e: any) {
      alert(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setAddingKey(true);
    try {
      const res = await fetch('/api/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName || 'Gemini Key',
          key: newKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh keys
      const keysRes = await fetch('/api/gemini-keys');
      const keysData = await keysRes.json();
      setKeys(keysData.keys || []);
      setIsAddKeyModalOpen(false);
      setKeyName('');
      setNewKey('');
      alert('API ключ Gemini успешно добавлен в пул авто-ротации!');
    } catch (e: any) {
      alert(e.message || 'Ошибка добавления ключа');
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Удалить этот API ключ из пула ротации?')) return;
    try {
      await fetch(`/api/gemini-keys?id=${id}`, { method: 'DELETE' });
      setKeys(keys.filter((k) => k.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-end border-b border-outline-variant pb-4 mb-section-margin">
        <div>
          <h2 className="font-display-case text-display-case text-on-surface mb-2">
            Глобальные параметры
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl text-xs leading-relaxed">
            Настройте общесистемное поведение, основные протоколы интеграции ИИ и строгие правила повествования для всех активных досье и ботов.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-primary-container text-on-primary-container border border-primary-container rounded font-label-caps text-label-caps hover:bg-inverse-primary hover:text-on-primary transition-colors flex items-center gap-2 uppercase tracking-widest text-xs font-bold shadow-lg"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {saving ? 'Сохранение...' : 'Применить изменения'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: System Prompt (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container rounded-lg border border-outline-variant p-6 relative overflow-hidden group shadow-xl">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-secondary">type_specimen</span>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">
                Глобальный системный промпт
              </h3>
              <span className="ml-auto font-label-caps text-[10px] bg-surface-container-lowest px-2 py-1 rounded text-secondary border border-outline-variant font-bold">
                ПЕРЕОПРЕДЕЛЕНИЕ УР. 1
              </span>
            </div>
            <p className="font-body-md text-on-surface-variant mb-4 text-xs leading-relaxed">
              Эта директива предшествует всем индивидуальным промптам персонажей. Она определяет фундаментальную реальность, ограничения и рабочий тон для механизма генерации ИИ.
            </p>
            <div className="relative">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="w-full bg-[#020617] text-tertiary font-data-mono text-xs p-4 border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary transition-all resize-none shadow-inner leading-relaxed outline-none"
                spellCheck={false}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="font-data-mono text-[10px] text-on-surface-variant bg-surface-container px-2 py-1 rounded border border-outline-variant">
                  Токены: ~{tokenCount}/8192
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: API & Technical (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Provider Matrix */}
          <div className="bg-surface-container rounded-lg border border-outline-variant p-6 relative shadow-xl">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-primary">router</span>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">
                Матрица провайдеров
              </h3>
            </div>

            {/* Provider Selector */}
            <div className="mb-5">
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2 uppercase tracking-widest text-[11px] font-bold">
                Основной движок
              </label>
              <select
                value={primaryEngine}
                onChange={(e) => setPrimaryEngine(e.target.value)}
                className="w-full bg-[#020617] text-on-surface font-body-md text-xs border border-outline-variant rounded px-3 py-2 outline-none focus:border-secondary transition-colors"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Основной / Рекомендуемый)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Глубокий анализ)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Скоростной)</option>
              </select>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded mb-5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary-fixed" />
                </div>
                <span className="font-data-mono text-[11px] text-on-surface font-bold">
                  Соединение стабильно
                </span>
              </div>
              <span className="font-data-mono text-[10px] text-secondary">
                Задержка: ~124мс
              </span>
            </div>

            {/* Auto-Fallback Toggle */}
            <div className="flex items-center justify-between border-t border-dashed border-outline-variant pt-4">
              <div>
                <span className="block font-label-caps text-[11px] text-on-surface mb-0.5 font-bold">
                  Авто-ротация и Fallback
                </span>
                <span className="block text-[11px] text-on-surface-variant">
                  Перенаправление при 429 квоте
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoFallback(!autoFallback)}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  autoFallback ? 'bg-secondary' : 'bg-surface-container-highest border border-outline-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-surface transition-transform ${
                    autoFallback ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Gemini API Keys Pool */}
          <div className="bg-surface-container rounded-lg border border-outline-variant p-6 relative shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-outline-variant">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">key</span>
                <h3 className="font-title-md text-title-md text-on-surface font-bold">
                  Пул API Ключей Gemini
                </h3>
              </div>
              <button
                onClick={() => setIsAddKeyModalOpen(true)}
                className="text-primary hover:text-inverse-primary transition-colors flex items-center gap-1 font-label-caps text-[11px] tracking-widest uppercase font-bold"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Добавить
              </button>
            </div>

            <div className="mb-4">
              <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                Система автоматически балансирует нагрузку и выполняет ротацию между активными ключами Gemini API при исчерпании лимитов.
              </p>
            </div>

            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between px-3 py-2 bg-surface-container-lowest rounded border border-outline-variant/50 text-xs font-data-mono"
                >
                  <div>
                    <p className="font-semibold text-on-surface">{k.name}</p>
                    <p className="text-tertiary text-[10px]">{k.maskedKey}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-secondary border border-secondary/30 px-1.5 py-0.5 rounded">
                      {k.status}
                    </span>
                    <button
                      onClick={() => handleDeleteKey(k.id)}
                      className="text-on-surface-variant hover:text-error transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add API Key Modal */}
      {isAddKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="font-headline-lg text-lg text-on-surface mb-3">
              Добавить API ключ Gemini в пул
            </h3>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                  Название ключа
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Например: Gemini Key 2 (Резерв)"
                  className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs text-on-surface outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                  Секретный ключ Google Gemini *
                </label>
                <input
                  type="password"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="AIzaSyB-..."
                  className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs text-on-surface font-data-mono outline-none focus:border-secondary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddKeyModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={addingKey}
                  className="px-5 py-2 bg-secondary text-surface-container-lowest rounded font-bold text-xs hover:bg-secondary-fixed-dim transition-colors"
                >
                  {addingKey ? 'Сохранение...' : 'Добавить в пул'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
