'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  initialGroups: any[];
}

export function GroupsClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    reward: '$5,000',
    lore: '',
    coverUrl: '',
  });
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGroups([data.group, ...groups]);
      setModalOpen(false);
      setFormData({
        code: '',
        title: '',
        reward: '$5,000',
        lore: '',
        coverUrl: '',
      });
    } catch (e: any) {
      alert(e.message || 'Ошибка создания группы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-section-margin flex justify-between items-end">
        <div>
          <p className="font-label-caps text-label-caps text-secondary mb-2 uppercase tracking-widest text-[11px] font-bold">
            АКТИВНЫЕ РАССЛЕДОВАНИЯ
          </p>
          <h2 className="font-display-case text-display-case text-on-surface">
            Файлы дел и Группы ({groups.length})
          </h2>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-primary-container text-white px-6 py-2.5 rounded text-sm font-semibold hover:bg-primary-container/80 transition-colors flex items-center gap-2 border border-primary-container shadow-lg"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Новое дело / Группа
        </button>
      </div>

      {/* Case Grid (Bento style) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap">
        {groups.map((group) => (
          <article
            key={group.id}
            className="bg-surface-container-low border border-outline-variant rounded-lg flex flex-col overflow-hidden group hover:border-secondary transition-colors duration-300 shadow-xl"
          >
            {/* Card Header (Cover & Title) */}
            <div className="relative h-44 border-b border-outline-variant bg-surface-container-lowest">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity grayscale group-hover:grayscale-0 transition-all duration-500"
                style={{
                  backgroundImage: `url('${
                    group.coverUrl ||
                    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop'
                  }')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent flex flex-col justify-end p-container-padding">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="inline-block px-2 py-1 border border-secondary text-secondary font-label-caps text-[10px] mb-2 bg-surface/50 backdrop-blur-sm font-bold">
                      FILE_ID: {group.code}
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">
                      {group.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-data-mono mt-1">
                      Статус:{' '}
                      <span className="text-secondary font-bold tracking-widest uppercase">
                        {group.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-data-mono text-lg text-secondary font-bold">
                      {group.reward || '$5,000'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-label-caps uppercase">
                      Награда
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lore & Linked Bots */}
            <div className="p-container-padding flex flex-col gap-5 flex-grow">
              {/* Lore / Context */}
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block flex items-center gap-2 text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  Общий лор и контекст группы
                </label>
                <textarea
                  value={group.lore}
                  readOnly
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded text-on-surface text-xs p-3 resize-none font-body-md outline-none leading-relaxed"
                />
              </div>

              {/* Linked Bots */}
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-3 block flex items-center gap-2 text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                  Связанные сущности ({group.bots?.length || 0} ботов)
                </label>
                <div className="flex flex-col gap-2">
                  {group.bots && group.bots.length > 0 ? (
                    group.bots.map((b: any) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2 border border-outline-variant rounded bg-surface-container/50 hover:bg-surface-container transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-surface-container-highest border border-outline flex items-center justify-center overflow-hidden">
                            {b.avatarUrl ? (
                              <img src={b.avatarUrl} alt={b.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-xs">smart_toy</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-on-surface">{b.name}</p>
                            <p className="text-[10px] font-data-mono text-on-surface-variant">
                              Роль: {b.role}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/bots/${b.id}`}
                          className="text-on-surface-variant hover:text-secondary p-1"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-data-mono text-on-surface-variant/70 italic py-2">
                      Ботов в этой группе пока нет. Назначьте группу в настройках бота.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* New Group Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 max-w-xl w-full shadow-2xl relative">
            <h2 className="font-headline-lg text-[22px] text-on-surface mb-4">
              Создать новое дело / группу ботов
            </h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                    Код дела (FILE_ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="742-ALPHA"
                    className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary font-data-mono"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                    Награда / Статус
                  </label>
                  <input
                    type="text"
                    value={formData.reward}
                    onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                    placeholder="$5,000"
                    className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                  Название дела / Заголовок *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Смерть на приёме"
                  className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm text-on-surface outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block font-label-caps text-[11px] text-on-surface-variant uppercase mb-1">
                  Общий лор дела (Наследуется всеми ботами группы) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.lore}
                  onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                  placeholder="Опишите хронологию событий, ключевые факты и тайны этого сценария..."
                  className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs text-on-surface outline-none focus:border-secondary resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-primary-container text-white rounded font-medium text-sm hover:bg-primary-container/80 transition-colors"
                >
                  {loading ? 'Создание...' : 'Создать дело'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
