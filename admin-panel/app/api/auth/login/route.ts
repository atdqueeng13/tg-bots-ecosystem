import { NextRequest, NextResponse } from 'next/server';
import { createSession, getExpectedAdminCredentials } from '@/lib/auth';
import { ensureInitialData } from '@/lib/seed-data';

export async function POST(req: NextRequest) {
  try {
    await ensureInitialData();
    const body = await req.json();
    const { email, password } = body;

    const expected = getExpectedAdminCredentials();

    // Check credentials against ENV or default
    const isEmailMatch =
      email &&
      (email.trim().toLowerCase() === expected.email.trim().toLowerCase() ||
        email.trim() === 'admin' ||
        email.trim() === 'agent');

    const isPasswordMatch = password && password === expected.password;

    if (!isEmailMatch || !isPasswordMatch) {
      return NextResponse.json(
        { error: 'Неверный идентификатор оперативника или код доступа.' },
        { status: 401 }
      );
    }

    const token = await createSession(expected.email, 'Главный следователь');

    const response = NextResponse.json({
      success: true,
      user: { email: expected.email, role: 'admin' },
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
