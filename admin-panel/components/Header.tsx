'use client';

interface HeaderProps {
  title?: string;
  badge?: string;
  showSearch?: boolean;
}

export function Header({
  title = '',
  badge,
  showSearch = true,
}: HeaderProps) {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-surface border-b border-[#333333] flex items-center justify-between px-8 z-40">
      <div className="flex items-center gap-3">
        {title && (
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            {title}
          </h2>
        )}
        {badge && (
          <span className="font-mono-code text-[11px] text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded border border-[#333333]">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5 ml-auto">
        {showSearch && (
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Поиск..."
              className="bg-[#1a1a1a] border border-[#333333] focus:border-primary-container rounded text-on-surface text-sm pl-9 pr-3 py-1.5 w-60 outline-none transition-colors placeholder:text-on-surface-variant/60"
            />
          </div>
        )}

        <button
          aria-label="Уведомления"
          className="text-on-surface-variant hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>

        <button
          aria-label="Профиль"
          className="text-on-surface-variant hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[22px]">account_circle</span>
        </button>
      </div>
    </header>
  );
}
