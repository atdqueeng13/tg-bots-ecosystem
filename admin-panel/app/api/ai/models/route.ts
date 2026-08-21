import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProvider, fetchAvailableModels } from '@/lib/ai-providers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let apiKey = searchParams.get('key');

    const allKeys = await prisma.geminiApiKey.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const discoveredModelsSet = new Set<string>();

    // 1. Gather stored models from keys in DB
    for (const k of allKeys) {
      if (k.supportedModels) {
        try {
          const parsed = JSON.parse(k.supportedModels);
          if (Array.isArray(parsed)) {
            parsed.forEach((m) => discoveredModelsSet.add(m));
          }
        } catch {}
      }
    }

    // 2. If a specific key is requested, fetch its live models
    if (apiKey) {
      const liveModels = await fetchAvailableModels(apiKey);
      liveModels.forEach((m) => discoveredModelsSet.add(m));
    } else if (allKeys.length > 0 && discoveredModelsSet.size === 0) {
      const primary = allKeys.find((k) => k.isPrimary) || allKeys[0];
      const liveModels = await fetchAvailableModels(primary.key);
      liveModels.forEach((m) => discoveredModelsSet.add(m));
    }

    // 3. Fallback defaults if set is still small
    const standardPresets = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash-8b',
      'gemini-2.0-pro-exp-02-05',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'gpt-4o',
      'gpt-4o-mini',
      'o3-mini',
      'gpt-3.5-turbo',
    ];

    standardPresets.forEach((m) => discoveredModelsSet.add(m));

    return NextResponse.json({
      models: Array.from(discoveredModelsSet),
      provider: apiKey ? detectProvider(apiKey) : 'multi',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        models: [
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-2.0-flash-lite-preview-02-05',
          'gpt-4o',
          'claude-3-5-sonnet-20241022',
        ],
        error: err.message,
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = body.key?.trim() || '';

    const models = await fetchAvailableModels(apiKey);
    return NextResponse.json({
      models,
      provider: detectProvider(apiKey),
      valid: models.length > 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        error: err.message,
        valid: false,
      },
      { status: 200 }
    );
  }
}
