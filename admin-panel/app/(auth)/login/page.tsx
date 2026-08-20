'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка авторизации');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-gutter bg-background relative overflow-hidden">
      {/* Noise background */}
      <div className="fixed inset-0 noise-bg z-0 opacity-40 pointer-events-none" />

      <main className="w-full max-w-[420px] bg-surface border border-outline-variant rounded-lg p-section-margin z-10 flex flex-col relative shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 flex items-center justify-center bg-surface-container-low rounded-lg border border-outline-variant mb-4">
            <span
              className="material-symbols-outlined text-4xl text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person_search
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight text-center">
            Реестр Улик
          </h1>
          <p className="font-label-caps text-label-caps text-secondary mt-2 uppercase tracking-widest text-[11px]">
            Только авторизованный доступ
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-error-container/20 border border-error text-error text-xs font-data-mono rounded">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="relative flex flex-col">
            <label
              className="font-label-caps text-label-caps text-outline mb-2 uppercase tracking-widest text-[11px]"
              htmlFor="email"
            >
              ID Оперативника / Email
            </label>
            <div className="relative flex items-center">
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@registry.gov"
                required
                className="w-full h-12 pl-3 pr-10 font-data-mono text-data-mono text-sm bg-surface-container-low border border-outline-variant text-on-surface rounded-DEFAULT focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
              <span className="material-symbols-outlined absolute right-3 pointer-events-none text-outline text-[20px]">
                fingerprint
              </span>
            </div>
          </div>

          <div className="relative flex flex-col">
            <div className="flex justify-between items-end mb-2">
              <label
                className="font-label-caps text-label-caps text-outline uppercase tracking-widest text-[11px]"
                htmlFor="password"
              >
                Код Доступа
              </label>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 pl-3 pr-10 font-data-mono text-data-mono tracking-widest text-sm bg-surface-container-low border border-outline-variant text-on-surface rounded-DEFAULT focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
              <span className="material-symbols-outlined absolute right-3 pointer-events-none text-outline text-[20px]">
                key
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 h-12 w-full bg-secondary text-surface-container-lowest font-title-md text-title-md font-bold rounded-DEFAULT hover:bg-secondary-fixed-dim transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(245,158,11,0.2)] disabled:opacity-50"
          >
            <span>{loading ? 'ПРОВЕРКА ДОСТУПА...' : 'Войти'}</span>
            <span className="material-symbols-outlined text-[20px]">login</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-outline-variant border-dashed flex justify-between items-center opacity-80">
          <span className="font-data-mono text-data-mono text-[10px] text-outline">
            СИСТЕМА: v2.4.1 (VERCEL)
          </span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-surface-container-highest" />
            <span className="w-2 h-2 rounded-full bg-surface-container-highest" />
          </div>
          <span className="font-data-mono text-data-mono text-[10px] text-secondary uppercase">
            Соединение: Защищено
          </span>
        </div>
      </main>
    </div>
  );
}
