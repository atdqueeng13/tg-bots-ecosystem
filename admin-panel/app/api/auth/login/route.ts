import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    // 1. Поиск администратора в базе данных (включая созданных с Допуском Ур. 4)
    let authenticatedUser: { login: string; name: string; clearanceLevel: number } | null = null;

    try {
      const dbAdmin = await prisma.admin.findUnique({
        where: { email: inputLogin },
      });

      if (dbAdmin && dbAdmin.passwordHash === inputPass) {
        authenticatedUser = {
          login: dbAdmin.email,
          name: dbAdmin.name,
          clearanceLevel: dbAdmin.clearanceLevel || 4,
        };
      }
    } catch (e) {
      console.error('DB admin check fallback to ENV:', e);
    }

    // 2. Резервная проверка через переменные окружения Vercel
    if (!authenticatedUser) {
      const mainAdminLogin = (process.env.ADMIN_EMAIL || 'lasleywork').toLowerCase();
      const mainAdminPass = process.env.ADMIN_PASSWORD || 'Danyap0l4ndbot615!';

      const partnerLogin = (process.env.SAINTROSE_EMAIL || 'saintrose').toLowerCase();
      const partnerPass = process.env.SAINTROSE_PASSWORD || 'roserose123';

      if (inputLogin === mainAdminLogin && inputPass === mainAdminPass) {
        authenticatedUser = { login: mainAdminLogin, name: 'Главный следователь (Lasley)', clearanceLevel: 4 };
      } else if (inputLogin === partnerLogin && inputPass === partnerPass) {
        authenticatedUser = { login: partnerLogin, name: 'Следователь (SaintRose)', clearanceLevel: 4 };
      }
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
      user: {
        email: authenticatedUser.login,
        name: authenticatedUser.name,
        clearanceLevel: authenticatedUser.clearanceLevel,
        role: 'admin',
      },
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
