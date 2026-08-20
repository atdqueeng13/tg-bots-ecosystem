'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    router.push('/login');
  };

  const navItems = [
    { href: '/', label: 'Дашборд', icon: 'dashboard' },
    { href: '/bots', label: 'Боты', icon: 'folder_shared' },
    { href: '/groups', label: 'Группы', icon: 'groups' },
    { href: '/users', label: 'Пользователи', icon: 'fingerprint' },
    { href: '/broadcasts', label: 'Рассылки', icon: 'record_voice_over' },
    { href: '/settings', label: 'Настройки', icon: 'settings' },
  ];

  return (
    <nav className="fixed h-screen w-[280px] left-0 top-0 border-r border-outline-variant bg-surface-container-low flex flex-col py-gutter z-40">
      {/* Brand Header */}
      <div className="px-container-padding mb-8">
        <h1 className="font-headline-lg text-headline-lg text-primary tracking-tighter">
          Sherlock Admin
        </h1>
        <p className="font-data-mono text-data-mono text-on-surface-variant mt-1 text-xs">
          Дело: 742-ALPHA
        </p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 py-3 transition-colors ${
                isActive
                  ? 'text-secondary font-bold border-l-4 border-secondary pl-4 bg-surface-container-high'
                  : 'text-on-surface-variant font-medium pl-5 hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span className="font-title-md text-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="px-container-padding mt-auto pt-4 border-t border-outline-variant">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-2 text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-title-md text-sm">Выйти</span>
        </button>

        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-outline-variant/40">
          <div className="w-9 h-9 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center text-secondary font-data-mono text-xs">
            SH
          </div>
          <div>
            <p className="font-title-md text-[13px] leading-tight text-on-surface font-semibold">
              Главный следователь
            </p>
            <p className="font-data-mono text-[10px] text-on-surface-variant">
              Уровень: 5 (ADMIN)
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
