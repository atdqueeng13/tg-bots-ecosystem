import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  let settings: any = null;
  let keys: any[] = [];
  let bots: any[] = [];

  try {
    const [sRecord, kList, bList] = await Promise.all([
      prisma.globalSetting.findUnique({
        where: { id: 'global' },
      }),
      prisma.geminiApiKey.findMany({
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.bot.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);
    settings = sRecord;
    keys = kList;
    bots = bList;
  } catch (err) {
    console.error('SettingsPage fetch error:', err);
  }

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
      provider: k.provider || 'gemini',
      maskedKey:
        k.key.length > 8
          ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}`
          : '••••••••',
      status: k.status,
      isPrimary: k.isPrimary,
      latencyMs: k.latencyMs,
      requestCount: k.requestCount,
      supportedModels: models,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    };
  });

  return (
    <>
      <Header title="Настройки" />
      <main className="pt-20 px-8 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto space-y-8">
          <SettingsClient
            initialSettings={settings}
            initialKeys={parsedKeys}
            bots={bots}
          />
        </div>
      </main>
    </>
  );
}
