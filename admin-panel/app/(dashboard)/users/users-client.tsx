'use client';

import { useState } from 'react';

interface Props {
  initialUsers: any[];
}

export function UsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      search === '' ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
      (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
      u.telegramId.includes(search);

    const matchesStatus =
      statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header & Filters */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-display-case text-display-case text-tertiary mb-2">
            Реестр субъектов
          </h2>
          <p className="font-data-mono text-data-mono text-on-surface-variant uppercase tracking-widest text-xs">
            Глобальная база игроков / Журналы доступа ({users.length} субъектов)
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-on-surface-variant text-[11px]">
              Поиск
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Username / ID..."
              className="bg-surface-container-lowest border border-outline-variant text-on-surface font-data-mono text-xs py-1.5 px-3 rounded-none focus:outline-none focus:border-secondary w-44"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-on-surface-variant text-[11px]">
              Статус
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface font-data-mono text-xs py-1.5 px-3 rounded-none focus:outline-none focus:border-secondary w-36"
            >
              <option value="ALL">ВСЕ</option>
              <option value="ACTIVE">АКТИВЕН</option>
              <option value="INACTIVE">НЕАКТИВЕН</option>
              <option value="BLOCKED">ЗАБЛОКИРОВАН</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-highest border-b border-outline-variant">
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                Telegram ID
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                Имя / Псевдоним
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                Регистрация
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                Дела (Владелец)
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right text-[11px]">
                Всего диалогов / tk
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                Последняя активность
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-center text-[11px]">
                Статус
              </th>
              <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]"></th>
            </tr>
          </thead>
          <tbody className="font-data-mono text-data-mono text-on-surface divide-y divide-outline-variant/50 text-xs">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                  Субъекты не найдены.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                let cases: string[] = [];
                try {
                  cases = JSON.parse(u.casesAccessed || '[]');
                } catch {
                  cases = [];
                }

                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-surface-container-high transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 text-secondary font-bold">
                      @{u.username || u.telegramId}
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md font-semibold text-tertiary">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Аноним'}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {new Date(u.firstSeen).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {cases.length > 0 ? (
                          cases.map((c: string, idx: number) => (
                            <span
                              key={idx}
                              className="bg-surface-container-lowest border border-outline-variant px-1.5 py-0.5 rounded-sm text-[10px]"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-on-surface-variant/50 italic text-[10px]">
                            Нет дел
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-primary-fixed-dim font-bold">
                      {u.dialogueCount} msg / {u.tokensUsed} tk
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {new Date(u.lastActive).toLocaleTimeString('ru-RU')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-block border border-tertiary-fixed text-tertiary-fixed px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                          Активен
                        </span>
                      ) : u.status === 'BLOCKED' ? (
                        <span className="inline-block border border-error text-error px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                          Заблокирован
                        </span>
                      ) : (
                        <span className="inline-block border border-outline text-outline px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest">
                          Неактивен
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-on-surface-variant hover:text-secondary">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Dialogues / Logs Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
              <div>
                <h3 className="font-headline-lg text-lg text-on-surface">
                  Досье и логи субъекта: @{selectedUser.username || selectedUser.telegramId}
                </h3>
                <p className="font-data-mono text-xs text-on-surface-variant mt-0.5">
                  Telegram ID: {selectedUser.telegramId} • Сообщений: {selectedUser.dialogueCount} • Токенов: {selectedUser.tokensUsed}
                </p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1">
              <h4 className="font-label-caps text-[11px] text-secondary uppercase tracking-widest font-bold">
                История последних диалогов с ботами
              </h4>
              {selectedUser.dialogues && selectedUser.dialogues.length > 0 ? (
                selectedUser.dialogues.map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3 bg-surface-container border border-outline-variant rounded-lg space-y-2 text-xs font-data-mono"
                  >
                    <div className="flex justify-between text-on-surface-variant text-[10px] pb-1 border-b border-outline-variant/30">
                      <span>Бот: <b className="text-secondary">{d.bot?.name || 'Бот'}</b></span>
                      <span>{new Date(d.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="text-on-surface">
                      <span className="text-outline mr-1">[Юзер]:</span>
                      {d.userMessage}
                    </div>
                    <div className="text-tertiary">
                      <span className="text-secondary mr-1">[Бот]:</span>
                      {d.botResponse}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-data-mono text-on-surface-variant/70 italic py-4">
                  Записей диалогов для этого пользователя пока нет.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2 bg-surface-container-highest text-on-surface rounded font-medium text-xs hover:bg-surface-container-high"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
