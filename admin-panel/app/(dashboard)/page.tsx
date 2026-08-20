import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await ensureInitialData();

  let totalBots = 0;
  let activeBots = 0;
  let totalUsers = 0;
  let recentLogs: any[] = [];
  let apiLatency = 124;

  try {
    const [
      bCount,
      abCount,
      uCount,
      logs,
      activeApiKey,
    ] = await Promise.all([
      prisma.bot.count(),
      prisma.bot.count({ where: { status: 'ACTIVE' } }),
      prisma.telegramUser.count(),
      prisma.userDialogueLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          bot: true,
        },
      }),
      prisma.geminiApiKey.findFirst({ where: { status: 'ACTIVE' } }),
    ]);

    totalBots = bCount;
    activeBots = abCount;
    totalUsers = uCount;
    recentLogs = logs;
    if (activeApiKey?.latencyMs) apiLatency = activeApiKey.latencyMs;
  } catch (err) {
    console.error('Dashboard data fetch error:', err);
  }

  return (
    <>
      <Header title="Реестр улик" />
      <main className="pt-[88px] px-container-padding pb-10 min-h-screen">
        <DashboardClient
          totalBots={totalBots}
          activeBots={activeBots}
          totalUsers={totalUsers}
          recentLogs={recentLogs}
          apiLatency={apiLatency}
        />
      </main>
    </>
  );
}
