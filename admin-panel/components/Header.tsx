'use client';

interface HeaderProps {
  title?: string;
  badge?: string;
  showSearch?: boolean;
}

export function Header({
  title = 'Реестр Улик',
  badge,
  showSearch = true,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-[280px] w-[calc(100%-280px)] h-16 flex justify-between items-center px-container-padding bg-surface border-b border-outline-variant z-30">
      <div className="flex items-center gap-4">
        <h2 className="font-headline-lg text-headline-lg font-bold text-primary">
          {title}
        </h2>
        {badge && (
          <span className="font-data-mono text-data-mono text-on-surface-variant bg-surface-container px-2 py-1 rounded text-xs border border-outline-variant">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        {showSearch && (
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-secondary transition-colors text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Поиск по реестру..."
              className="bg-surface-container-low border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary/50 rounded-lg text-on-surface font-body-md text-xs pl-9 pr-4 py-1.5 w-64 transition-all outline-none placeholder:text-on-surface-variant/60"
            />
          </div>
        )}

        <div className="flex items-center gap-4 text-on-surface-variant">
          <button
            title="Уведомления"
            className="hover:text-secondary transition-colors relative"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full" />
          </button>
          <button
            title="Поиск дел"
            className="hover:text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              manage_search
            </span>
          </button>
          <button
            title="История"
            className="hover:text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              history
            </span>
          </button>

          <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center text-xs font-data-mono text-on-surface">
            ID
          </div>
        </div>
      </div>
    </header>
  );
}
