'use client';

import { useState } from 'react';

interface Props {
  initialBroadcasts: any[];
  activeUsersCount: number;
}

export function BroadcastsClient({ initialBroadcasts, activeUsersCount }: Props) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'INACTIVE'>('ALL');
  const [scheduleType, setScheduleType] = useState<'NOW' | 'SCHEDULE'>('NOW');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleLaunchBroadcast = async () => {
    if (!message.trim()) {
      alert('Введите текст рассылки');
      return;
    }

    if (scheduleType === 'SCHEDULE' && !scheduledDateTime) {
      alert('Укажите дату и время для запланированной рассылки');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mediaUrl,
          audience,
          isInstant: scheduleType === 'NOW',
          scheduledAt: scheduleType === 'SCHEDULE' ? scheduledDateTime : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBroadcasts([data.broadcast, ...broadcasts]);
      setMessage('');
      setMediaUrl('');
      setScheduleType('NOW');
      setScheduledDateTime('');
      setToastMessage('Рассылка успешно создана!');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Ошибка запуска рассылки');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    if (!confirm('Отменить эту запланированную рассылку?')) return;

    try {
      const res = await fetch(`/api/broadcasts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка отмены');
      setBroadcasts(broadcasts.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message || 'Ошибка отмены');
    }
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-background mb-2 font-bold">
            Создать рассылку
          </h1>
          <p className="font-body-base text-body-base text-on-surface-variant">
            Настройте сообщение, аудиторию и время отправки.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              setMessage('');
              setMediaUrl('');
            }}
            className="px-6 py-2.5 rounded border border-[#333333] text-on-surface font-title-sm text-sm hover:bg-surface-container-highest transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleLaunchBroadcast}
            disabled={loading}
            className="px-6 py-2.5 rounded bg-primary-container text-[#1a1a1a] font-title-sm text-sm font-bold hover:bg-primary-fixed-dim transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,191,0,0.15)] disabled:opacity-50 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {loading ? 'Отправка...' : 'Запустить'}
          </button>
        </div>
      </div>

      {/* Form Layout (Bento Grid Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid-gutter">
        {/* Left Column: Content & File */}
        <div className="lg:col-span-2 flex flex-col gap-grid-gutter">
          {/* Message Editor */}
          <div className="bg-[#242424] rounded-lg border border-[#333333] p-6 flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                Текст сообщения
              </label>
              <span className="font-mono-code text-xs text-on-surface-variant/70">
                Markdown поддерживается
              </span>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст рассылки..."
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded p-4 text-on-background font-body-base text-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none resize-y min-h-[180px] transition-colors"
            />

            {/* File Upload / Media URL Area */}
            <div className="mt-2 border-2 border-dashed border-[#333333] hover:border-[#504532] rounded-lg p-5 flex flex-col items-center justify-center gap-3 transition-colors bg-[#1a1a1a]/50">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
              </div>
              <div className="text-center">
                <p className="font-body-base text-sm text-on-surface">
                  <span className="text-primary font-semibold">Вставьте URL медиафайла</span> или ссылку на фото
                </p>
                <p className="font-label-caps text-[11px] text-on-surface-variant mt-0.5">
                  Изображения, баннеры, промо-материалы (до 50MB)
                </p>
              </div>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full max-w-md bg-[#181818] border border-[#333333] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-primary-container font-mono-code"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="flex flex-col gap-grid-gutter">
          {/* Audience Selection */}
          <div className="bg-[#242424] rounded-lg border border-[#333333] p-6 flex flex-col gap-4 shadow-lg">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[16px]">group_add</span>
              Аудитория
            </label>
            <div className="flex flex-col gap-3">
              {/* Radio 1: All users */}
              <div
                onClick={() => setAudience('ALL')}
                className={`w-full border rounded p-4 flex items-center gap-3 transition-all cursor-pointer ${
                  audience === 'ALL'
                    ? 'border-primary-container bg-primary-container/10'
                    : 'border-[#333333] bg-[#1a1a1a] hover:border-outline-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    audience === 'ALL' ? 'border-primary-container' : 'border-[#504532]'
                  }`}
                >
                  {audience === 'ALL' && (
                    <div className="w-2.5 h-2.5 bg-primary-container rounded-full" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-title-sm text-sm text-on-surface font-semibold">
                    Все пользователи
                  </span>
                  <span className="font-label-caps text-xs text-on-surface-variant mt-0.5">
                    Отправка всем получателям ботов
                  </span>
                </div>
              </div>

              {/* Radio 2: Inactive */}
              <div
                onClick={() => setAudience('INACTIVE')}
                className={`w-full border rounded p-4 flex items-center gap-3 transition-all cursor-pointer ${
                  audience === 'INACTIVE'
                    ? 'border-primary-container bg-primary-container/10'
                    : 'border-[#333333] bg-[#1a1a1a] hover:border-outline-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    audience === 'INACTIVE' ? 'border-primary-container' : 'border-[#504532]'
                  }`}
                >
                  {audience === 'INACTIVE' && (
                    <div className="w-2.5 h-2.5 bg-primary-container rounded-full" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-title-sm text-sm text-on-surface font-semibold">
                    Неактивные
                  </span>
                  <span className="font-label-caps text-xs text-on-surface-variant mt-0.5">
                    &gt; 30 дней без активности
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-[#242424] rounded-lg border border-[#333333] p-6 flex flex-col gap-4 shadow-lg">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              Время отправки
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setScheduleType('NOW')}
                className={`w-full border rounded py-3 px-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  scheduleType === 'NOW'
                    ? 'border-primary-container bg-primary-container/10 text-primary'
                    : 'border-[#333333] bg-[#1a1a1a] text-on-surface-variant hover:border-outline-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">flash_on</span>
                <span className="font-title-sm text-sm">Сейчас</span>
              </div>

              <div
                onClick={() => setScheduleType('SCHEDULE')}
                className={`w-full border rounded py-3 px-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  scheduleType === 'SCHEDULE'
                    ? 'border-primary-container bg-primary-container/10 text-primary'
                    : 'border-[#333333] bg-[#1a1a1a] text-on-surface-variant hover:border-outline-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
                <span className="font-title-sm text-sm">Запланировать</span>
              </div>
            </div>

            {scheduleType === 'SCHEDULE' && (
              <div className="pt-2">
                <label className="block font-label-caps text-[11px] text-on-surface-variant mb-1">
                  Дата и время запуска
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-xs text-white outline-none focus:border-primary-container font-mono-code"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Table Section */}
      <div className="mt-8 flex flex-col gap-4">
        <h3 className="font-headline-md text-xl font-bold text-on-surface">
          История рассылок
        </h3>
        <div className="bg-[#242424] rounded-lg border border-[#333333] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#333333]">
                  <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                    Сообщение (фрагмент)
                  </th>
                  <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                    Аудитория
                  </th>
                  <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                    Дата
                  </th>
                  <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                    Статус
                  </th>
                  <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold text-right">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {broadcasts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant text-sm">
                      Рассылок пока нет. Создайте первую рассылку выше.
                    </td>
                  </tr>
                ) : (
                  broadcasts.map((b) => {
                    const isDelivered = b.status === 'DELIVERED';

                    return (
                      <tr key={b.id} className="hover:bg-surface-container-highest transition-colors group">
                        <td className="py-4 px-6 font-body-base text-sm text-on-surface max-w-xs truncate">
                          {b.message}
                        </td>
                        <td className="py-4 px-6 font-body-base text-sm text-on-surface-variant">
                          {b.audience}
                        </td>
                        <td className="py-4 px-6 font-mono-code text-xs text-on-surface-variant">
                          {new Date(b.scheduledAt || b.createdAt).toLocaleDateString('ru-RU')}{' '}
                          {new Date(b.scheduledAt || b.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-6">
                          {isDelivered ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/50">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                              <span className="font-label-caps text-xs text-emerald-400 font-semibold">
                                Успешно ({b.sentCount})
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-900/30 border border-amber-800/50">
                              <span className="material-symbols-outlined text-[12px] text-amber-400">
                                schedule
                              </span>
                              <span className="font-label-caps text-xs text-amber-400 font-semibold">
                                Запланировано
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {!isDelivered ? (
                            <button
                              onClick={() => handleCancelBroadcast(b.id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Отменить"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                          ) : (
                            <button
                              className="text-on-surface-variant hover:text-primary transition-colors p-1"
                              title="Аналитика"
                            >
                              <span className="material-symbols-outlined text-[18px]">analytics</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
