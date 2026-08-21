'use client';

import { useState } from 'react';

interface Props {
  initialGroups: any[];
}

export function GroupsClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    lore: '',
    prompt: '',
    starsPrice: 0,
    solutionTruth: '',
    status: 'ACTIVE',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      (g.lore && g.lore.toLowerCase().includes(q)) ||
      g.code.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => {
    setSelectedGroup(null);
    setFormData({
      id: '',
      title: '',
      lore: '',
      prompt: '',
      starsPrice: 0,
      solutionTruth: '',
      status: 'ACTIVE',
    });
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: any) => {
    setSelectedGroup(group);
    setFormData({
      id: group.id,
      title: group.title || '',
      lore: group.lore || '',
      prompt: group.prompt || '',
      starsPrice: group.starsPrice !== undefined ? group.starsPrice : 0,
      solutionTruth: group.solutionTruth || '',
      status: group.status || 'ACTIVE',
    });
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreating(false);
    setSelectedGroup(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Укажите название дела (группы)');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGroups([data.group, ...groups]);
        showToast('Дело (группа) успешно создано!');
      } else {
        const res = await fetch(`/api/groups/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGroups(groups.map((g) => (g.id === formData.id ? { ...g, ...data.group } : g)));
        showToast('Параметры дела успешно сохранены!');
      }
      handleCloseModal();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    if (!confirm(`Удалить группу "${selectedGroup.title}"? Привязанные боты останутся без группы.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      setGroups(groups.filter((g) => g.id !== selectedGroup.id));
      handleCloseModal();
      showToast('Группа удалена.');
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
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
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold flex items-center gap-3">
            Расследования и Дела
          </h2>
          <p className="text-on-surface-variant font-body-base text-body-base">
            Управление детективными делами: стоимость в Telegram Stars, скрытая истина преступления и фабула.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск расследований..."
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
            <span className="material-symbols-outlined text-[18px]">add</span>
            + Создать Дело
          </button>
        </div>
      </div>

      {/* Groups Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-grid-gutter">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant bg-[#242424] border border-[#333333] rounded-xl">
            Дел пока нет. Нажмите «+ Создать Дело» для добавления первой истории.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const botCount = group.bots ? group.bots.length : 0;
            const stars = group.starsPrice || 0;

            return (
              <div
                key={group.id}
                onClick={() => handleOpenEdit(group)}
                className="bg-[#242424] border border-[#333333] rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group cursor-pointer transition-all hover:border-primary-container/60 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] border border-[#333333] flex items-center justify-center text-primary font-mono font-bold text-sm">
                      {group.code.substring(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                        {group.title}
                      </h3>
                      <p className="font-mono-code text-[11px] text-on-surface-variant mt-0.5">
                        {group.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-[#1a1a1a] text-primary font-mono-code text-xs px-2.5 py-1 rounded border border-[#333333]">
                      {botCount} {botCount === 1 ? 'подозреваемый' : 'подозреваемых'}
                    </span>
                    {stars > 0 ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        ⭐ {stars} Stars
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        🎁 Бесплатно
                      </span>
                    )}
                  </div>
                </div>

                {group.lore && (
                  <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                    {group.lore}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-[#333333] flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-mono-code">
                    {group.status === 'ACTIVE' ? '🟢 Активно' : '⚪ В архиве'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(group);
                    }}
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Настроить</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Group Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#333333] rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col modal-animate max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-[#333333]">
              <h3 className="font-title-sm text-base text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">menu_book</span>
                {isCreating ? 'Создать новое Расследование' : `Настройки Дела: ${formData.title}`}
              </h3>
              <button onClick={handleCloseModal} className="text-on-surface-variant hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                    Название Расследования *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Дело №1: Тайна особняка Блэквуд"
                    className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3.5 py-2 text-sm text-white focus:border-primary-container outline-none"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-xs text-amber-300 uppercase mb-1 font-semibold flex items-center gap-1">
                    <span>⭐</span> Цена в Stars
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.starsPrice}
                    onChange={(e) => setFormData({ ...formData, starsPrice: parseInt(e.target.value) || 0 })}
                    placeholder="0 = Бесплатно"
                    className="w-full bg-[#1a1a1a] border border-amber-500/40 rounded px-3.5 py-2 text-sm text-amber-200 font-mono font-bold focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                  Фабула и Вводная информация (Dossier для Главного Бота)
                </label>
                <textarea
                  rows={3}
                  value={formData.lore}
                  onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                  placeholder="20 октября в 23:00 лорд Блэквуд был найден мертвым в своем кабинете..."
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded p-3 text-xs text-white focus:border-primary-container outline-none leading-relaxed resize-y"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-red-400 uppercase mb-1 font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">gavel</span>
                  Скрытая истина дела (для ИИ-судьи при команде /accuse)
                </label>
                <textarea
                  rows={4}
                  value={formData.solutionTruth}
                  onChange={(e) => setFormData({ ...formData, solutionTruth: e.target.value })}
                  placeholder="Убийца — дворецкий Джеймс Спенсер. Мотив: лорд обнаружил поддельные чеки. В 22:45 дворецкий подсыпал яд в бренди..."
                  className="w-full bg-[#1a1a1a] border border-red-500/40 rounded p-3 text-xs text-red-200 font-mono-code focus:border-red-400 outline-none leading-relaxed resize-y"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold">
                    Общий контекст и атмосфера для всех подозреваемых
                  </label>
                  <span className="text-[11px] text-on-surface-variant font-mono-code">
                    Наследуется всеми ботами этого дела
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Действие происходит в Англии, 1920-е годы. Гроза за окном. Все сидят в приемной..."
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded p-3 text-xs text-white font-mono-code focus:border-primary-container outline-none leading-relaxed resize-y"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#333333]">
              <div>
                {!isCreating && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-error hover:underline text-xs font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Удалить Дело
                  </button>
                )}
              </div>
              <div className="flex gap-2">
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
                  {saving ? 'Сохранение...' : 'Сохранить Дело'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
