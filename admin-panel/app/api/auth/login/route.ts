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

    // List of authorized admin accounts
    const accounts = [
      {
        login: (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase(),
        password: process.env.ADMIN_PASSWORD || 'Danyap0l4ndbot615!',
        name: 'Главный следователь (Lasley)',
      },
      {
        login: 'saintrose',
        password: 'roserose123',
        name: 'Следователь (SaintRose)',
      },
      {
        login: 'admin@registry.gov',
        password: process.env.ADMIN_PASSWORD || 'Danyap0l4ndbot615!',
        name: 'Главный следователь',
      },
    ];

    const matchedAccount = accounts.find(
      (acc) =>
        (acc.login === inputLogin || (inputLogin === 'admin' && acc.login === 'lasleywork')) &&
        acc.password === inputPass
    );

    if (!matchedAccount) {
      return NextResponse.json(
        { error: 'Неверный идентификатор оперативника или код доступа.' },
        { status: 401 }
      );
    }

    const token = await createSession(matchedAccount.login, matchedAccount.name);

    const response = NextResponse.json({
      success: true,
      user: { email: matchedAccount.login, name: matchedAccount.name, role: 'admin' },
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
