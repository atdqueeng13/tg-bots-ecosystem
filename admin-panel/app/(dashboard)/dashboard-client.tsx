'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  totalBots: number;
  activeBots: number;
  requestsToday: number;
  requestsMonth: number;
  recentLogs: any[];
  initialKeyRecord?: {
    name: string;
    provider: string;
    status: string;
    latencyMs: number;
  } | null;
}

export function DashboardClient({
  totalBots,
  activeBots,
  requestsToday,
  requestsMonth,
  recentLogs,
  initialKeyRecord,
}: Props) {
  const [restarting, setRestarting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const inactiveBots = Math.max(0, totalBots - activeBots);

  // Live API Health Status
  const [apiHealth, setApiHealth] = useState<{
    status: 'ONLINE' | 'RATE_LIMITED' | 'ERROR' | 'NOT_CONFIGURED' | 'CHECKING';
    provider: string;
    latencyMs: number;
    message: string;
    keyName: string | null;
  }>({
    status: initialKeyRecord?.status === 'ACTIVE' ? 'ONLINE' : 'CHECKING',
    provider: initialKeyRecord?.provider ? initialKeyRecord.provider.toUpperCase() : 'ИИ API',
    latencyMs: initialKeyRecord?.latencyMs || 0,
    message: 'Проверка соединения...',
    keyName: initialKeyRecord?.name || null,
  });

  const checkApiHealth = async () => {
    setApiHealth((prev) => ({ ...prev, status: 'CHECKING', message: 'Тестирование API...' }));
    try {
      const res = await fetch('/api/ai/health');
      const data = await res.json();
      setApiHealth({
        status: data.status || 'ERROR',
        provider: data.provider || 'API',
        latencyMs: data.latencyMs || 0,
        message: data.message || '',
        keyName: data.keyName || null,
      });
    } catch {
      setApiHealth({
        status: 'ERROR',
        provider: 'API',
        latencyMs: 0,
        message: 'Не удалось подключиться к серверу',
        keyName: null,
      });
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const handleRestartAll = async () => {
    if (!confirm('Вы действительно хотите перезапустить всех активных ботов?')) {
      return;
    }

    setRestarting(true);
    try {
      const res = await fetch('/api/bots/restart-all', { method: 'POST' });
      const data = await res.json();
      setToastMessage(data.message || 'Все боты успешно перезапущены!');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (e: any) {
      alert(e?.message || 'Ошибка при перезапуске ботов');
    } finally {
      setRestarting(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#242424] border border-primary-container text-primary font-mono-code text-xs px-4 py-3 rounded shadow-2xl flex items-center gap-2 modal-animate">
          <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">
            Панель управления
          </h2>
          <p className="text-on-surface-variant font-body-base text-body-base">
            Сводка производительности, активности ботов и реального статуса ИИ API.
          </p>
        </div>
        <button
          onClick={handleRestartAll}
          disabled={restarting}
          className="bg-primary-container text-[#1a1a1a] font-title-sm text-sm px-6 py-2.5 rounded font-bold hover:opacity-90 transition-opacity flex items-center active:scale-95 shadow-[0_0_15px_rgba(255,191,0,0.15)] disabled:opacity-50"
        >
          <span
            className={`material-symbols-outlined mr-2 text-[18px] ${restarting ? 'animate-spin' : ''}`}
          >
            restart_alt
          </span>
          {restarting ? 'Перезапуск...' : 'Перезапустить все боты'}
        </button>
      </div>

      {/* Metrics Bento Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-grid-gutter">
        {/* Metric 1: Всего ботов */}
        <div className="bg-[#242424] p-6 rounded-lg border border-[#333333] flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
              Всего ботов
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">smart_toy</span>
          </div>
          <div className="font-display-lg text-2xl text-on-surface mb-2 font-bold font-mono-code">
            {totalBots}
          </div>
          <div className="flex items-center space-x-4 font-mono-code text-xs">
            <div className="flex items-center text-on-surface">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              {activeBots} активных
            </div>
            <div className="flex items-center text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              {inactiveBots} отключено
            </div>
          </div>
        </div>

        {/* Metric 2: Реальный Статус ИИ API */}
        <div className="bg-[#242424] p-6 rounded-lg border border-[#333333] flex flex-col justify-between shadow-lg relative">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
              Статус ИИ API
            </span>
            <button
              type="button"
              onClick={checkApiHealth}
              title="Проверить соединение с API"
              className="text-on-surface-variant hover:text-white transition-colors"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  apiHealth.status === 'CHECKING' ? 'animate-spin text-primary' : ''
                }`}
              >
                refresh
              </span>
            </button>
          </div>

          <div className="font-display-lg text-xl text-on-surface mb-2 font-bold truncate">
            {apiHealth.provider}
          </div>

          <div className="flex flex-col gap-1">
            {apiHealth.status === 'ONLINE' && (
              <div className="flex items-center font-mono-code text-xs text-emerald-400">
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Подключен ({apiHealth.latencyMs} ms)
              </div>
            )}

            {apiHealth.status === 'RATE_LIMITED' && (
              <div className="flex items-center font-mono-code text-xs text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
                Лимит квоты (429)
              </div>
            )}

            {apiHealth.status === 'ERROR' && (
              <div className="flex items-center font-mono-code text-xs text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400 mr-2" />
                Ошибка ключа / API
              </div>
            )}

            {apiHealth.status === 'NOT_CONFIGURED' && (
              <div className="flex items-center font-mono-code text-xs text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-[#666666] mr-2" />
                Ключ не настроен
              </div>
            )}

            {apiHealth.status === 'CHECKING' && (
              <div className="flex items-center font-mono-code text-xs text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2" />
                Проверка API...
              </div>
            )}

            {(apiHealth.status === 'ERROR' || apiHealth.status === 'NOT_CONFIGURED') && (
              <Link
                href="/settings"
                className="text-[11px] text-primary hover:underline font-medium mt-1 flex items-center gap-1"
              >
                Настроить в Настройках →
              </Link>
            )}
          </div>
        </div>

        {/* Metric 3: Запросов за сегодня */}
        <div className="bg-[#242424] p-6 rounded-lg border border-[#333333] flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
              Запросов сегодня
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">today</span>
          </div>
          <div className="font-display-lg text-2xl text-on-surface mb-2 font-bold font-mono-code">
            {requestsToday.toLocaleString()}
          </div>
          <div className="flex items-center font-mono-code text-xs text-primary">
            <span className="material-symbols-outlined text-[16px] mr-1">bolt</span>
            Суточная активность
          </div>
        </div>

        {/* Metric 4: Запросов за месяц */}
        <div className="bg-[#242424] p-6 rounded-lg border border-[#333333] flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
              Диалогов за месяц
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chat</span>
          </div>
          <div className="font-display-lg text-2xl text-on-surface mb-2 font-bold font-mono-code">
            {requestsMonth.toLocaleString()}
          </div>
          <div className="flex items-center font-mono-code text-xs text-on-surface-variant">
            Суммарный объем генераций
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-[#242424] rounded-lg border border-[#333333] overflow-hidden mt-8 shadow-xl">
        <div className="px-6 py-4 border-b border-[#333333] flex justify-between items-center bg-[#1a1a1a]">
          <h3 className="font-title-sm text-sm text-on-surface font-semibold">
            Журнал активности ботов
          </h3>
          <span className="text-xs text-on-surface-variant font-mono-code">
            Реальные диалоги из базы
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#333333] bg-[#1a1a1a]/60">
                <th className="px-6 py-3 font-label-caps text-xs text-on-surface-variant uppercase">
                  Время
                </th>
                <th className="px-6 py-3 font-label-caps text-xs text-on-surface-variant uppercase">
                  Бот
                </th>
                <th className="px-6 py-3 font-label-caps text-xs text-on-surface-variant uppercase">
                  Сообщение
                </th>
                <th className="px-6 py-3 font-label-caps text-xs text-on-surface-variant uppercase text-right">
                  Токены
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333] text-xs">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                    Записей активности пока нет. При диалогах с ботами они отобразятся здесь.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => {
                  const time = new Date(log.createdAt).toLocaleTimeString('ru-RU');
                  return (
                    <tr key={log.id} className="hover:bg-[#2c2c2c] transition-colors">
                      <td className="px-6 py-3.5 font-mono-code text-on-surface-variant">
                        {time}
                      </td>
                      <td className="px-6 py-3.5 text-white font-medium">
                        {log.bot?.name || 'Бот'}
                      </td>
                      <td className="px-6 py-3.5 text-on-surface max-w-md truncate">
                        {log.userMessage}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono-code text-primary">
                        {log.tokens} tk
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
