'use client';

import { useState } from 'react';

interface Props {
  initialBroadcasts: any[];
  groups: any[];
}

export function BroadcastsClient({ initialBroadcasts, groups }: Props) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState(groups[0]?.code || '742-ALPHA');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendBroadcast = async (isInstant: boolean) => {
    if (!message.trim()) {
      alert('Пожалуйста, введите текст сообщения.');
      return;
    }

    setSending(true);
    const targetAudience =
      audienceType === 'ALL'
        ? 'Все Активные Пользователи'
        : audienceType === 'CASE'
        ? `Дело: ${selectedCase}`
        : 'Неактивные Аккаунты';

    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          audience: targetAudience,
          scheduledAt: isInstant ? null : scheduledAt,
          isInstant,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBroadcasts([data.broadcast, ...broadcasts]);
      setMessage('');
      alert(
        isInstant
          ? 'Рассылка успешно инициирована!'
          : 'Рассылка успешно запланирована!'
      );
    } catch (e: any) {
      alert(e.message || 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-section-margin">
      {/* Broadcast Creation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Section */}
        <section className="col-span-1 lg:col-span-8 bg-surface-container-low rounded-lg border border-outline-variant relative overflow-hidden noise-bg shadow-xl">
          <div className="p-6 border-b border-outline-variant/50">
            <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-secondary">edit_document</span>
              Создать Рассылку
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2 uppercase tracking-widest text-[11px] font-bold">
                СОДЕРЖАНИЕ СООБЩЕНИЯ
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Введите текст рассылки здесь..."
                className="w-full bg-surface-container border border-outline-variant focus:border-secondary focus:ring-0 text-on-surface font-body-md rounded p-3 transition-colors resize-y text-xs leading-relaxed outline-none"
              />
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2 uppercase tracking-widest text-[11px] font-bold">
                ПРИЛОЖИТЬ ДОКАЗАТЕЛЬСТВА (ОПЦИОНАЛЬНО)
              </label>
              <div className="border border-dashed border-outline-variant hover:border-secondary rounded p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-container/50">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant mb-2">
                  upload_file
                </span>
                <p className="font-title-md text-title-md text-on-surface text-xs font-semibold mb-1">
                  Нажмите для загрузки или перетащите файл
                </p>
                <p className="font-data-mono text-data-mono text-on-surface-variant text-[11px]">
                  PNG, JPG, GIF до 10MB
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Configuration Sidebar */}
        <section className="col-span-1 lg:col-span-4 space-y-6">
          {/* Audience Selection */}
          <div className="bg-surface-container-low rounded-lg border border-outline-variant p-6 noise-bg shadow-xl">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg">radar</span>
              ЦЕЛЕВАЯ АУДИТОРИЯ
            </h3>
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-3 p-3 rounded border border-outline-variant bg-surface cursor-pointer hover:border-secondary transition-colors">
                <input
                  type="radio"
                  name="audience"
                  checked={audienceType === 'ALL'}
                  onChange={() => setAudienceType('ALL')}
                  className="text-secondary"
                />
                <span className="font-body-md text-on-surface">Все Активные Пользователи</span>
              </label>
              <label className="flex flex-col gap-2 p-3 rounded border border-outline-variant bg-surface cursor-pointer hover:border-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="audience"
                    checked={audienceType === 'CASE'}
                    onChange={() => setAudienceType('CASE')}
                    className="text-secondary"
                  />
                  <span className="font-body-md text-on-surface">Участники Дела</span>
                </div>
                {audienceType === 'CASE' && (
                  <select
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded text-on-surface text-xs py-1.5 px-2 outline-none focus:border-secondary font-data-mono"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.code}>
                        Дело: {g.code} ({g.title})
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="flex items-center gap-3 p-3 rounded border border-outline-variant bg-surface cursor-pointer hover:border-secondary transition-colors">
                <input
                  type="radio"
                  name="audience"
                  checked={audienceType === 'INACTIVE'}
                  onChange={() => setAudienceType('INACTIVE')}
                  className="text-secondary"
                />
                <span className="font-body-md text-on-surface">Неактивные Аккаунты</span>
              </label>
            </div>
          </div>

          {/* Dispatch Controls */}
          <div className="bg-surface-container-low rounded-lg border border-outline-variant p-6 noise-bg shadow-xl">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg">send_time_extension</span>
              ПРОТОКОЛ ОТПРАВКИ
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block font-data-mono text-data-mono text-on-surface-variant mb-1 text-[11px]">
                  Дата/Время отправки
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded focus:border-secondary text-on-surface font-data-mono p-2 text-xs outline-none"
                />
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant border-dashed">
                <button
                  type="button"
                  onClick={() => handleSendBroadcast(false)}
                  disabled={sending || !scheduledAt}
                  className="w-full bg-primary-container text-white font-title-md py-3 px-4 rounded hover:bg-primary-container/90 transition-colors flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-base">schedule</span>
                  Запланировать (Schedule)
                </button>
                <button
                  type="button"
                  onClick={() => handleSendBroadcast(true)}
                  disabled={sending}
                  className="w-full bg-surface-container-highest border border-outline-variant text-on-surface font-title-md py-3 px-4 rounded hover:border-secondary transition-colors flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  {sending ? 'Отправка...' : 'Отправить сейчас (Send Now)'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Broadcasts List */}
      <section className="bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden noise-bg shadow-xl">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-secondary">history</span>
            Недавние Журналы Рассылок
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/50 font-label-caps text-label-caps text-on-surface-variant text-[11px] uppercase tracking-wider">
                <th className="p-4">ID / ВРЕМЯ</th>
                <th className="p-4">ПРЕДПРОСМОТР</th>
                <th className="p-4">АУДИТОРИЯ</th>
                <th className="p-4">СТАТУС</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-data-mono text-data-mono text-xs">
              {broadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-highest/50 transition-colors">
                  <td className="p-4">
                    <span className="text-secondary font-bold block">{b.code}</span>
                    <span className="text-on-surface-variant text-[10px]">
                      {new Date(b.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </td>
                  <td className="p-4 text-on-surface truncate max-w-xs font-body-md text-xs">
                    "{b.message}"
                  </td>
                  <td className="p-4 text-on-surface-variant">{b.audience}</td>
                  <td className="p-4">
                    {b.status === 'DELIVERED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-outline-variant text-secondary text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        ДОСТАВЛЕНО ({b.sentCount})
                      </span>
                    ) : b.status === 'SCHEDULED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-outline-variant text-tertiary text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                        ЗАПЛАНИРОВАНО
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-outline-variant text-error text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-error" />
                        ОШИБКА
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
