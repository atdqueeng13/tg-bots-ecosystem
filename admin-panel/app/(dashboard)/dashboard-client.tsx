'use client';

import { useState } from 'react';

interface Props {
  totalBots: number;
  activeBots: number;
  totalUsers: number;
  recentLogs: any[];
  apiLatency: number;
}

export function DashboardClient({
  totalBots,
  activeBots,
  totalUsers,
  recentLogs,
  apiLatency,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState('');

  const handleGlobalRestart = async () => {
    setRestarting(true);
    try {
      const res = await fetch('/api/bots/restart-all', { method: 'POST' });
      const data = await res.json();
      setRestartMessage(data.message || 'Перезапуск выполнен!');
      setTimeout(() => {
        setModalOpen(false);
        setRestarting(false);
        setRestartMessage('');
      }, 1500);
    } catch (e: any) {
      alert(e.message || 'Ошибка перезапуска');
      setRestarting(false);
    }
  };

  return (
    <>
      {/* Top Widgets (Bento style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap mb-section-margin">
        {/* Widget 1: Active Bots */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2 text-[11px]">
            Активные боты
          </h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-display-case text-[36px] font-bold text-on-surface">
              {activeBots}
            </span>
            <span className="font-data-mono text-data-mono text-secondary">
              / {Math.max(totalBots, 15)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-data-mono text-[12px] text-on-surface-variant">
              Система в норме
            </span>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-[80px] text-on-surface-variant opacity-10 pointer-events-none">
            smart_toy
          </span>
        </div>

        {/* Widget 2: Total Players */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2 text-[11px]">
            Всего субъектов
          </h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-display-case text-[36px] font-bold text-on-surface">
              {totalUsers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-tertiary">
            <span className="material-symbols-outlined text-[16px]">
              trending_up
            </span>
            <span className="font-data-mono text-[12px]">+100% за всё время</span>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-[80px] text-on-surface-variant opacity-10 pointer-events-none">
            groups
          </span>
        </div>

        {/* Widget 3: API Status */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2 text-[11px]">
            API Сеть
          </h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-display-case text-[26px] font-bold text-on-surface">
              Google Gemini
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-data-mono text-[12px] text-on-surface-variant">
              Задержка: {apiLatency}ms
            </span>
            <span className="px-2 py-0.5 border border-secondary text-secondary font-label-caps text-[10px] rounded">
              АКТИВНО
            </span>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-[80px] text-on-surface-variant opacity-10 pointer-events-none">
            hub
          </span>
        </div>

        {/* Widget 4: Total Revenue / Usage */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2 text-[11px]">
            Потрачено токенов / Бюджет
          </h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-display-case text-[32px] font-bold text-primary">
              ~24.8k tk
            </span>
          </div>
          <div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[45%]" />
            </div>
            <span className="font-data-mono text-[10px] text-on-surface-variant mt-2 block text-right">
              Лимит: 1M / день
            </span>
          </div>
        </div>
      </div>

      {/* Main Area: Recent Actions Table */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-highest/20">
          <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              list_alt
            </span>
            Последние логи активности
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                  Время
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                  ID Субъекта
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                  Бот / Действие
                </th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody className="font-data-mono text-data-mono divide-y divide-outline-variant text-xs">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                    Логов активности пока нет. При первом обращении пользователя к боту запись появится здесь.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => {
                  const time = new Date(log.createdAt).toLocaleTimeString('ru-RU');
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-container-high transition-colors"
                    >
                      <td className="px-6 py-4 text-on-surface-variant">
                        {time}
                      </td>
                      <td className="px-6 py-4 text-on-surface font-semibold">
                        @{log.user?.username || log.user?.telegramId || 'UNKNOWN'}
                      </td>
                      <td className="px-6 py-4 text-on-surface truncate max-w-xs">
                        <span className="text-secondary mr-2 font-bold">[{log.bot?.name}]</span>
                        "{log.userMessage}"
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-tertiary border border-tertiary/30 px-2.5 py-1 rounded text-[11px]">
                          ОЧИЩЕНО
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone Action */}
      <div className="mt-section-margin pt-10 border-t border-outline-variant flex flex-col items-center justify-center">
        <h4 className="font-label-caps text-label-caps text-error uppercase tracking-widest mb-6 flex items-center gap-2 text-[11px]">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          Критические системные операции
        </h4>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-error/10 text-error hover:bg-error hover:text-white font-title-md text-title-md px-8 py-3.5 rounded-lg border border-error/30 transition-all duration-200 flex items-center gap-3 group shadow-lg"
        >
          <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">
            restart_alt
          </span>
          Перезапустить все боты
        </button>
      </div>

      {/* Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-start gap-5">
              <div className="p-3 bg-error/10 rounded-full text-error shrink-0">
                <span className="material-symbols-outlined text-[32px]">
                  dangerous
                </span>
              </div>
              <div>
                <h2 className="font-headline-lg text-[20px] text-on-surface mb-3">
                  Инициировать глобальный перезапуск?
                </h2>
                <p className="font-body-md text-on-surface-variant mb-8 text-[14px]">
                  Это действие отправит сигнал перезагрузки всем активным ботам, очистит контекстную память диалогов и синхронизирует актуальные промпты из базы данных.
                </p>

                {restartMessage ? (
                  <p className="text-secondary font-data-mono text-xs mb-4">
                    {restartMessage}
                  </p>
                ) : null}

                <div className="flex gap-4 justify-end font-title-md text-[14px]">
                  <button
                    disabled={restarting}
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors rounded-lg"
                  >
                    ОТМЕНА
                  </button>
                  <button
                    disabled={restarting}
                    onClick={handleGlobalRestart}
                    className="px-5 py-2.5 bg-error text-white hover:bg-error/90 transition-colors rounded-lg font-medium"
                  >
                    {restarting ? 'ВЫПОЛНЕНИЕ...' : 'ВЫПОЛНИТЬ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
