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

    const settings = await prisma.globalSetting.findUnique({
      where: { id: 'global' },
    });

    return NextResponse.json({ settings });
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
    const { systemPrompt, primaryEngine, autoFallback } = body;

    const updated = await prisma.globalSetting.upsert({
      where: { id: 'global' },
      update: {
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(primaryEngine !== undefined && { primaryEngine }),
        ...(autoFallback !== undefined && { autoFallback }),
      },
      create: {
        id: 'global',
        systemPrompt: systemPrompt || '',
        primaryEngine: primaryEngine || 'gemini-2.0-flash',
        autoFallback: autoFallback !== undefined ? autoFallback : true,
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
