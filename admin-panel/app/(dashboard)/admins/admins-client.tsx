'use client';

import { useState } from 'react';

interface Props {
  initialAdmins: any[];
}

export function AdminsClient({ initialAdmins }: Props) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    clearanceLevel: 4,
  });

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      alert('Логин и пароль обязательны');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdmins([...admins, data.admin]);
      setModalOpen(false);
      setFormData({ email: '', name: '', password: '', clearanceLevel: 4 });
      setToastMessage('Администратор успешно добавлен!');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Ошибка создания администратора');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (admins.length <= 1) {
      alert('Нельзя удалить единственного администратора в системе!');
      return;
    }

    if (!confirm(`Удалить администратора "${email}"?`)) return;

    try {
      const res = await fetch(`/api/admins?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');

      setAdmins(admins.filter((a) => a.id !== id));
      setToastMessage('Администратор удален.');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const getRoleBadge = (level: number) => {
    if (level >= 4) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#1c1b1b] border border-primary-container/40 text-primary font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
          Суперадминистратор
        </span>
      );
    }
    if (level === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#1c1b1b] border border-cyan-500/40 text-cyan-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Администратор
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#1c1b1b] border border-[#333333] text-on-surface-variant font-semibold">
        Модератор
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface font-bold">
            Администраторы
          </h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            Управление учетными записями администраторов и правами доступа к панели.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-primary-container text-[#1a1a1a] font-bold text-sm px-5 py-2.5 rounded hover:bg-primary-fixed transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,191,0,0.15)] active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          + Добавить администратора
        </button>
      </div>

      {/* Admins Table Card */}
      <div className="bg-[#242424] rounded-lg border border-[#333333] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#333333] bg-[#1a1a1a]">
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                  Логин / Email
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                  Имя
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                  Роль / Права доступа
                </th>
                <th className="py-4 px-6 font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                  Дата добавления
                </th>
                <th className="py-4 px-6 text-right font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-[#2a2a2a] transition-colors group">
                  <td className="py-4 px-6 font-mono-code text-sm text-primary font-semibold">
                    {admin.email}
                  </td>
                  <td className="py-4 px-6 font-body-base text-sm text-on-surface">
                    {admin.name}
                  </td>
                  <td className="py-4 px-6">
                    {getRoleBadge(admin.clearanceLevel || 4)}
                  </td>
                  <td className="py-4 px-6 font-mono-code text-xs text-on-surface-variant">
                    {new Date(admin.createdAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                      className="text-on-surface-variant hover:text-error transition-colors p-1"
                      title="Удалить администратора"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-xl p-6 max-w-md w-full shadow-2xl modal-animate">
            <h3 className="font-title-sm text-base text-on-surface font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">security</span>
              Новый администратор
            </h3>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  Логин / Email *
                </label>
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin_username"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  Имя администратора
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Алексей Иванов"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  Пароль *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white font-mono-code focus:border-primary-container outline-none"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                  Роль
                </label>
                <select
                  value={formData.clearanceLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, clearanceLevel: Number(e.target.value) })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
                >
                  <option value={4}>Суперадминистратор (Полный доступ)</option>
                  <option value={3}>Администратор (Управление ботами и рассылками)</option>
                  <option value={2}>Модератор (Просмотр и аудит логов)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#333333] text-white rounded text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-primary-container text-[#1a1a1a] font-bold rounded text-xs hover:opacity-90"
                >
                  {loading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
