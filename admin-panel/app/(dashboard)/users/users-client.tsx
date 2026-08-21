'use client';

import { useState } from 'react';

interface Props {
  initialUsers: any[];
}

export function UsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    telegramId: '',
    username: '',
    firstName: '',
    lastName: '',
    status: 'ACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.firstName && u.firstName.toLowerCase().includes(q)) ||
      u.telegramId.includes(q)
    );
  });

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormData({
      id: '',
      telegramId: '',
      username: '',
      firstName: '',
      lastName: '',
      status: 'ACTIVE',
    });
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      id: user.id,
      telegramId: user.telegramId || '',
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      status: user.status || 'ACTIVE',
    });
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreating(false);
    setSelectedUser(null);
  };

  const handleSave = async () => {
    if (!formData.telegramId.trim()) {
      alert('Укажите Telegram ID пользователя');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers([data.user, ...users]);
        showToast('Пользователь добавлен!');
      } else {
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers(users.map((u) => (u.id === formData.id ? { ...u, ...data.user } : u)));
        showToast('Данные пользователя обновлены!');
      }
      handleCloseModal();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (user: any) => {
    const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
      showToast(newStatus === 'BLOCKED' ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления статуса');
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">
            Пользователи Telegram
          </h2>
          <p className="text-on-surface-variant font-body-base text-body-base">
            Реестр контактов, взаимодействовавших с ботами платформы.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск пользователей..."
              className="bg-[#1a1a1a] border border-[#333333] text-on-surface rounded px-4 py-2 pl-9 w-64 focus:border-primary-container focus:outline-none transition-colors text-sm"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
          </div>
          <button
            onClick={handleOpenCreate}
            className="bg-primary-container text-[#1a1a1a] font-bold px-6 py-2 rounded flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(255,191,0,0.15)] active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            + Добавить контакт
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#242424] rounded-xl border border-[#333333] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#333333]">
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                  Пользователь
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                  Telegram ID
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                  Статус
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                  Диалогов / Токенов
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                  Последняя активность
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase font-semibold text-right">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333] text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant">
                    Пользователей пока нет в базе.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isBlocked = user.status === 'BLOCKED';

                  return (
                    <tr key={user.id} className="hover:bg-[#2c2c2c] transition-colors">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#333333] flex items-center justify-center text-primary font-mono font-bold text-xs">
                          {user.firstName ? user.firstName.substring(0, 2).toUpperCase() : 'TG'}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {user.firstName || ''} {user.lastName || ''}
                          </div>
                          <div className="text-on-surface-variant text-[11px]">
                            {user.username ? `@${user.username}` : 'Без username'}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono-code text-on-surface-variant">
                        {user.telegramId}
                      </td>
                      <td className="py-4 px-6">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-red-950/40 border border-red-500/40 text-red-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Заблокирован
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono-code text-on-surface-variant">
                        {user.dialogueCount} диалогов • {user.tokensUsed} tk
                      </td>
                      <td className="py-4 px-6 font-mono-code text-on-surface-variant">
                        {new Date(user.lastActive).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(user)}
                            className={`p-1.5 rounded transition-colors text-xs font-semibold ${
                              isBlocked
                                ? 'text-emerald-400 hover:bg-emerald-950/30'
                                : 'text-red-400 hover:bg-red-950/30'
                            }`}
                            title={isBlocked ? 'Разблокировать' : 'Заблокировать'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isBlocked ? 'lock_open' : 'block'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded text-on-surface-variant hover:text-white hover:bg-[#1a1a1a] transition-colors"
                            title="Редактировать"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-xl max-w-md w-full p-6 shadow-2xl modal-animate">
            <h3 className="font-title-sm text-base text-on-surface font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              {isCreating ? 'Добавить контакт' : 'Редактировать контакт'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                  Telegram ID *
                </label>
                <input
                  type="text"
                  value={formData.telegramId}
                  onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                  placeholder="1029384756"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3.5 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace('@', '') })}
                  placeholder="alex_tg"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3.5 py-2 text-sm text-white focus:border-primary-container outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Алексей"
                    className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder=""
                    className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-5 mt-4 border-t border-[#333333]">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-[#333333] text-white rounded text-xs"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary-container text-[#1a1a1a] font-bold rounded text-xs hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
