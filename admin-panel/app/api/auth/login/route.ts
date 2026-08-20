import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { ensureInitialData } from '@/lib/seed-data';

export async function POST(req: NextRequest) {
  try {
    await ensureInitialData();
    const body = await req.json();
    const { email, password } = body;

    const inputLogin = email ? email.trim().toLowerCase() : '';
    const inputPass = password ? password.trim() : '';

    if (!inputLogin || !inputPass) {
      return NextResponse.json(
        { error: 'Укажите идентификатор оперативника и код доступа.' },
        { status: 400 }
      );
    }

    // Все учетные записи загружаются СТРОГО из переменных окружения Vercel / .env
    const mainAdminLogin = (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase();
    const mainAdminPass = process.env.ADMIN_PASSWORD;

    const partnerLogin = (process.env.SAINTROSE_EMAIL || 'saintrose').toLowerCase();
    const partnerPass = process.env.SAINTROSE_PASSWORD || process.env.ADMIN_PASSWORD_PARTNER || 'roserose123';

    let authenticatedUser: { login: string; name: string } | null = null;

    if (mainAdminPass && inputLogin === mainAdminLogin && inputPass === mainAdminPass) {
      authenticatedUser = { login: mainAdminLogin, name: 'Главный следователь (Lasley)' };
    } else if (partnerPass && inputLogin === partnerLogin && inputPass === partnerPass) {
      authenticatedUser = { login: partnerLogin, name: 'Следователь (SaintRose)' };
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Неверный идентификатор оперативника или код доступа.' },
        { status: 401 }
      );
    }

    const token = await createSession(authenticatedUser.login, authenticatedUser.name);

    const response = NextResponse.json({
      success: true,
      user: { email: authenticatedUser.login, name: authenticatedUser.name, role: 'admin' },
    });

    response.cookies.set('sherlock_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
