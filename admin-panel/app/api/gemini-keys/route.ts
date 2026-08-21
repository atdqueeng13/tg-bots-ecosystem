import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';
import { ensureInitialData } from '@/lib/seed-data';
import { detectProvider, fetchAvailableModels } from '@/lib/ai-providers';

export async function GET(req: NextRequest) {
  try {
    await ensureInitialData();
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await prisma.geminiApiKey.findMany({
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    const parsedKeys = keys.map((k) => {
      let models: string[] = [];
      try {
        models = JSON.parse(k.supportedModels || '[]');
      } catch {
        models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      }

      return {
        id: k.id,
        name: k.name,
        key: k.key,
        provider: k.provider || detectProvider(k.key),
        maskedKey:
          k.key.length > 8
            ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}`
            : '••••••••',
        status: k.status,
        isPrimary: k.isPrimary,
        latencyMs: k.latencyMs,
        requestCount: k.requestCount,
        supportedModels: models,
        lastUsedAt: k.lastUsedAt,
      };
    });

    return NextResponse.json({ keys: parsedKeys });
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
      return NextResponse.json({ error: 'API ключ обязателен' }, { status: 400 });
    }

    const trimmedKey = key.trim();
    const provider = detectProvider(trimmedKey);
    let supportedModels: string[] = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let status = 'ACTIVE';
    let latencyMs = 120;

    const startTime = Date.now();
    try {
      const fetched = await fetchAvailableModels(trimmedKey);
      latencyMs = Date.now() - startTime;
      if (fetched.length > 0) {
        supportedModels = fetched;
        status = 'ACTIVE';
      }
    } catch {
      status = 'ERROR';
    }

    const count = await prisma.geminiApiKey.count();

    const newKey = await prisma.geminiApiKey.create({
      data: {
        name: name || `${provider.toUpperCase()} Key #${count + 1}`,
        key: trimmedKey,
        provider,
        status,
        isPrimary: count === 0,
        latencyMs,
        supportedModels: JSON.stringify(supportedModels),
      },
    });

    return NextResponse.json({ success: true, key: newKey });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, setPrimary, status, name, testKey } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    if (setPrimary) {
      await prisma.geminiApiKey.updateMany({
        data: { isPrimary: false },
      });
      const updated = await prisma.geminiApiKey.update({
        where: { id },
        data: { isPrimary: true, status: 'ACTIVE' },
      });
      return NextResponse.json({ success: true, key: updated });
    }

    if (testKey) {
      const existing = await prisma.geminiApiKey.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: 'Ключ не найден' }, { status: 404 });

      let keyStatus = 'ACTIVE';
      const startTime = Date.now();
      const models = await fetchAvailableModels(existing.key);
      const latencyMs = Date.now() - startTime;
      const provider = detectProvider(existing.key);

      const updated = await prisma.geminiApiKey.update({
        where: { id },
        data: {
          status: keyStatus,
          provider,
          latencyMs,
          supportedModels: JSON.stringify(models),
        },
      });

      return NextResponse.json({ success: true, key: updated, models });
    }

    const updated = await prisma.geminiApiKey.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(name && { name }),
      },
    });

    return NextResponse.json({ success: true, key: updated });
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
