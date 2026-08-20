'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  initialBots: any[];
  groups: any[];
}

export function BotsClient({ initialBots, groups }: Props) {
  const [bots, setBots] = useState(initialBots);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    botId: '',
    token: '',
    role: 'Главный персонаж',
    groupId: '',
    model: 'gemini-2.0-flash',
    legend: '',
    character: '',
  });
  const [loading, setLoading] = useState(false);
  const [restartingId, setRestartingId] = useState<string | null>(null);

  const handleToggleActive = async (bot: any) => {
    const updatedStatus = !bot.isActive;
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: updatedStatus,
          status: updatedStatus ? 'ACTIVE' : 'OFFLINE',
        }),
      });
      const data = await res.json();
      if (data.bot) {
        setBots(bots.map((b) => (b.id === bot.id ? { ...b, ...data.bot } : b)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestartBot = async (botId: string) => {
    setRestartingId(botId);
    try {
      await fetch(`/api/bots/${botId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastPing: new Date(), status: 'ACTIVE' }),
      });
      setTimeout(() => {
        setRestartingId(null);
        alert('Бот успешно перезагружен и синхронизирован.');
      }, 500);
    } catch (e) {
      setRestartingId(null);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');

      setBots([data.bot, ...bots]);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        botId: '',
        token: '',
        role: 'Главный персонаж',
        groupId: '',
        model: 'gemini-2.0-flash',
        legend: '',
        character: '',
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-section-margin border-b border-outline-variant pb-4">
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2 text-[11px] uppercase tracking-widest">
            ДИРЕКТОРИЯ / АКТИВНЫЕ АКТИВЫ
          </p>
          <h2 className="font-display-case text-display-case text-on-surface">
            Список Ботов ({bots.length})
          </h2>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded font-title-md text-title-md hover:bg-inverse-primary hover:text-on-primary transition-colors flex items-center shadow-lg gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          + Добавить бота
        </button>
      </div>

      {/* Data Table / List */}
      <div className="bg-surface-container border border-outline-variant rounded-DEFAULT overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-outline-variant bg-surface-container font-label-caps text-label-caps text-on-surface-variant text-[11px] sticky top-0 z-10 uppercase tracking-wider">
          <div className="col-span-1">ID / АВАТАР</div>
          <div className="col-span-3">ОБОЗНАЧЕНИЕ</div>
          <div className="col-span-3">НАЗНАЧЕНИЕ (ДЕЛО/ГРУППА)</div>
          <div className="col-span-2">СТАТУС</div>
          <div className="col-span-2">МОДЕЛЬ / ПАРАМЕТРЫ</div>
          <div className="col-span-1 text-right">ДЕЙСТВИЯ</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-outline-variant">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-surface-container-high transition-colors group"
            >
              <div className="col-span-1 flex justify-center">
                {bot.avatarUrl ? (
                  <img
                    src={bot.avatarUrl}
                    alt={bot.name}
                    className="w-10 h-10 object-cover border border-outline-variant rounded"
                  />
                ) : (
                  <div className="w-10 h-10 border border-outline-variant bg-surface-container-lowest flex items-center justify-center rounded">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">
                      smart_toy
                    </span>
                  </div>
                )}
              </div>

              <div className="col-span-3 flex flex-col justify-center">
                <Link
                  href={`/bots/${bot.id}`}
                  className="font-title-md text-title-md text-on-surface hover:text-secondary transition-colors font-semibold"
                >
                  {bot.name}
                </Link>
                <span className="font-data-mono text-data-mono text-on-surface-variant text-xs mt-1">
                  #{bot.botId} • {bot.role}
                </span>
              </div>

              <div className="col-span-3 flex items-center">
                <span className="material-symbols-outlined text-on-surface-variant mr-2 text-sm">
                  folder
                </span>
                <span className="font-body-md text-body-md text-on-background">
                  {bot.group ? `${bot.group.code}: ${bot.group.title}` : 'Без группы'}
                </span>
              </div>

              <div className="col-span-2 flex items-center">
                {bot.status === 'ACTIVE' && bot.isActive ? (
                  <span className="inline-flex items-center px-2 py-0.5 border border-secondary text-secondary font-label-caps text-[10px] bg-secondary/10 uppercase tracking-widest font-bold">
                    АКТИВЕН
                  </span>
                ) : bot.status === 'ERROR' ? (
                  <span className="inline-flex items-center px-2 py-0.5 border border-error text-error font-label-caps text-[10px] bg-error-container/30 uppercase tracking-widest font-bold">
                    ОШИБКА
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 border border-outline text-outline font-label-caps text-[10px] bg-surface-container-lowest uppercase tracking-widest font-bold">
                    ОФФЛАЙН
                  </span>
                )}
              </div>

              <div className="col-span-2 flex flex-col justify-center">
                <span className="font-data-mono text-xs text-on-surface font-semibold">
                  {bot.model}
                </span>
                <span className="font-data-mono text-[11px] text-on-surface-variant">
                  t={bot.temperature} • {bot.reasoningEnabled ? 'Reasoning ON' : 'Direct'}
                </span>
              </div>

              <div className="col-span-1 flex justify-end items-center space-x-2">
                {/* Active Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(bot)}
                  title={bot.isActive ? 'Отключить бота' : 'Включить бота'}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                    bot.isActive ? 'bg-secondary' : 'bg-surface-container-highest border border-outline-variant'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-surface transition-transform ${
                      bot.isActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>

                {/* Restart Bot Button */}
                <button
                  onClick={() => handleRestartBot(bot.id)}
                  title="Перезагрузить бота"
                  className="text-on-surface-variant hover:text-secondary p-1 border border-transparent hover:border-outline-variant rounded transition-all"
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      restartingId === bot.id ? 'animate-spin text-secondary' : ''
                    }`}
                  >
                    restart_alt
                  </span>
                </button>

                {/* Edit Link */}
                <Link
                  href={`/bots/${bot.id}`}
                  className="text-on-surface-variant hover:text-secondary p-1"
                  title="Настроить промпт и параметры"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Bot Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 max-w-xl w-full shadow-2xl relative">
            <h2 className="font-headline-lg text-[22px] text-on-surface mb-4">
              Добавить нового бота в экосистему
            </h2>
            <form onSubmit={handleCreateBot} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                    Имя персонажа / Обозначение *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Посол Волков"
                    className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                    ID (Опционально)
                  </label>
                  <input
                    type="text"
                    value={formData.botId}
                    onChange={(e) => setFormData({ ...formData, botId: e.target.value })}
                    placeholder="BR-9901"
                    className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                  Токен Telegram от @BotFather *
                </label>
                <input
                  type="password"
                  required
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  placeholder="1234567890:ABCdefGHIjklMNOpqr..."
                  className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface font-data-mono outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                    Роль / Назначение
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Подозреваемый / Информатор"
                    className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                    Дело / Группа с лором
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary"
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

              <div>
                <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                  Публичная легенда (Базовый промпт)
                </label>
                <textarea
                  rows={3}
                  value={formData.legend}
                  onChange={(e) => setFormData({ ...formData, legend: e.target.value })}
                  placeholder="Опишите персонажа, его статус и начальные знания..."
                  className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-primary-container text-white rounded hover:bg-primary-container/80 transition-colors font-medium text-sm"
                >
                  {loading ? 'Создание...' : 'Создать бота'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
