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
    { href: '/hub', label: '⭐ Главный Бот (Хаб)', icon: 'stars' },
    { href: '/bots', label: 'Подозреваемые', icon: 'smart_toy' },
    { href: '/groups', label: 'Расследования (Дела)', icon: 'menu_book' },
    { href: '/users', label: 'Пользователи', icon: 'person' },
    { href: '/broadcasts', label: 'Рассылки', icon: 'campaign' },
    { href: '/admins', label: 'Администраторы', icon: 'security' },
    { href: '/settings', label: 'Настройки', icon: 'settings' },
  ];

  return (
    <nav className="h-screen w-[260px] fixed left-0 top-0 bg-surface-container border-r border-[#333333] flex flex-col py-6 z-50">
      {/* Header / Brand */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#504532] bg-surface-variant flex items-center justify-center text-primary font-bold text-sm">
            SH
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary leading-tight font-bold">
              Sherlock Admin
            </h1>
            <p className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider">
              Management Console
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <ul className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-primary font-semibold border-l-4 border-primary bg-surface-container-high opacity-95'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest border-l-4 border-transparent'
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
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer Profile & Logout */}
      <div className="mt-auto px-4 pt-4 border-t border-[#333333]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-variant border border-[#504532] flex items-center justify-center text-primary text-xs font-mono">
            AD
          </div>
            <div className="font-title-sm text-sm text-on-surface font-semibold leading-tight">Admin</div>
            <div className="text-[10px] text-primary font-mono">Суперадминистратор</div>
        </div>
        <button
          onClick={handleLogout}
          title="Выйти"
          className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded hover:bg-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </nav>
  );
}
