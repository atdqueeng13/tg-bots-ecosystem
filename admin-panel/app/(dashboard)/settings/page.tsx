import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await ensureInitialData();

  const [settings, keys] = await Promise.all([
    prisma.globalSetting.findUnique({
      where: { id: 'global' },
    }),
    prisma.geminiApiKey.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const maskedKeys = keys.map((k) => ({
    id: k.id,
    name: k.name,
    maskedKey:
      k.key.length > 8
        ? `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}`
        : '••••••••',
    status: k.status,
    latencyMs: k.latencyMs,
  }));

  return (
    <>
      <Header title="Реестр Улик" badge="ГЛОБАЛЬНАЯ КОНФИГУРАЦИЯ" />
      <main className="pt-20 p-container-padding min-h-screen">
        <SettingsClient initialSettings={settings} initialKeys={maskedKeys} />
      </main>
    </>
  );
}
