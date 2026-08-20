import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncToFirebaseRTDB } from '@/lib/firebase';
import { ensureInitialData } from '@/lib/seed-data';

export async function GET() {
  try {
    await ensureInitialData();
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        clearanceLevel: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ admins });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInitialData();
    const body = await req.json();
    const { email, name, password, clearanceLevel = 4 } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email/Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.admin.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Администратор с таким логином уже существует' },
        { status: 400 }
      );
    }

    const newAdmin = await prisma.admin.create({
      data: {
        email: cleanEmail,
        name: name?.trim() || 'Оперативник Допуска Ур. 4',
        passwordHash: password.trim(),
        clearanceLevel: Number(clearanceLevel) || 4,
        role: 'ADMIN',
      },
    });

    // Mirror to Firebase Realtime Database
    await syncToFirebaseRTDB(`admins/${newAdmin.id}`, {
      id: newAdmin.id,
      email: newAdmin.email,
      name: newAdmin.name,
      clearanceLevel: newAdmin.clearanceLevel,
      role: newAdmin.role,
      createdAt: newAdmin.createdAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        clearanceLevel: newAdmin.clearanceLevel,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    await prisma.admin.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
