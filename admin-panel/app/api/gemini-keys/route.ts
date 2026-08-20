import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';
import { ensureInitialData } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  try {
    await ensureInitialData();
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await prisma.geminiApiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Mask secret keys for security when displaying in UI
    const maskedKeys = keys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey:
        k.key.length > 8
          ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}`
          : '••••••••',
      status: k.status,
      latencyMs: k.latencyMs,
      requestCount: k.requestCount,
      lastUsedAt: k.lastUsedAt,
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, key } = body;

    if (!key || key.trim() === '') {
      return NextResponse.json(
        { error: 'API ключ обязателен' },
        { status: 400 }
      );
    }

    const newKey = await prisma.geminiApiKey.create({
      data: {
        name: name || 'Gemini Secondary',
        key: key.trim(),
        status: 'ACTIVE',
        latencyMs: 120,
      },
    });

    return NextResponse.json({ success: true, key: newKey });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    await prisma.geminiApiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
