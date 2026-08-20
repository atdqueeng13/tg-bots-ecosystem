import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await ensureInitialData();

  const [
    totalBots,
    activeBots,
    totalUsers,
    recentLogs,
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

  return (
    <>
      <Header title="Реестр улик" />
      <main className="pt-[88px] px-container-padding pb-10 min-h-screen">
        <DashboardClient
          totalBots={totalBots}
          activeBots={activeBots}
          totalUsers={totalUsers}
          recentLogs={recentLogs}
          apiLatency={activeApiKey?.latencyMs || 124}
        />
      </main>
    </>
  );
}
