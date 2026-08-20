import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await ensureInitialData();

  const [settings, keys, admins] = await Promise.all([
    prisma.globalSetting.findUnique({
      where: { id: 'global' },
    }),
    prisma.geminiApiKey.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        clearanceLevel: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
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
        <SettingsClient
          initialSettings={settings}
          initialKeys={maskedKeys}
          initialAdmins={admins}
        />
      </main>
    </>
  );
}
