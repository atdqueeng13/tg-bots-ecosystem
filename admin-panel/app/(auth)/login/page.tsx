'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      // Hard redirect to reload session cookie properly
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Login Card */}
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display-lg text-display-lg text-primary-container mb-1 font-bold">
              Sherlock
            </h1>
            <h2 className="font-title-sm text-title-sm text-on-surface-variant font-medium">
              Admin Panel
            </h2>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono-code rounded">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                className="block font-label-caps text-label-caps text-on-surface-variant mb-2 uppercase text-xs"
                htmlFor="email"
              >
                EMAIL / ЛОГИН
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-on-surface-variant flex items-center justify-center pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </span>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lasleywork"
                  required
                  className="w-full bg-[#1a1a1a] border border-[#333333] text-white font-body-base text-sm rounded pl-10 pr-4 py-2.5 transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                className="block font-label-caps text-label-caps text-on-surface-variant mb-2 uppercase text-xs"
                htmlFor="password"
              >
                ПАРОЛЬ
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-on-surface-variant flex items-center justify-center pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#1a1a1a] border border-[#333333] text-white font-body-base text-sm rounded pl-10 pr-10 py-2.5 transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-on-surface-variant hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-[#1a1a1a] font-title-sm text-sm py-3 px-4 rounded font-bold transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(255,191,0,0.15)]"
              >
                <span>{loading ? 'Проверка...' : 'Войти'}</span>
                <span className="material-symbols-outlined text-[18px]">login</span>
              </button>
            </div>
          </form>

          {/* Additional Link */}
          <div className="mt-6 text-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('Используйте логин: lasleywork и пароль: Danyap0l4ndbot615!');
              }}
              className="font-body-base text-xs text-on-surface-variant hover:text-primary-container transition-colors inline-flex items-center gap-1"
            >
              Забыли пароль?
            </a>
          </div>
        </div>

        {/* Footer / Version Info */}
        <div className="mt-6 text-center text-on-surface-variant/50 font-mono-code text-xs">
          v 2.4.1 (Stable)
        </div>
      </div>
    </div>
  );
}
