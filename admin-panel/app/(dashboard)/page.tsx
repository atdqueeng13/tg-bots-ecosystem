import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await ensureInitialData();

  let totalBots = 0;
  let activeBots = 0;
  let requestsToday = 0;
  let requestsMonth = 0;
  let recentLogs: any[] = [];
  let initialKeyRecord: any = null;

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      bCount,
      abCount,
      todayCount,
      monthCount,
      logs,
      keyRecord,
    ] = await Promise.all([
      prisma.bot.count(),
      prisma.bot.count({ where: { status: 'ACTIVE', isActive: true } }),
      prisma.userDialogueLog.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.userDialogueLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.userDialogueLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          bot: true,
        },
      }),
      prisma.geminiApiKey.findFirst({
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    totalBots = bCount;
    activeBots = abCount;
    requestsToday = todayCount;
    requestsMonth = monthCount;
    recentLogs = logs;
    initialKeyRecord = keyRecord;
  } catch (err) {
    console.error('Dashboard data fetch error:', err);
  }

  return (
    <>
      <Header title="Обзор" />
      <main className="pt-20 px-8 pb-12 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto space-y-8">
          <DashboardClient
            totalBots={totalBots}
            activeBots={activeBots}
            requestsToday={requestsToday}
            requestsMonth={requestsMonth}
            recentLogs={recentLogs}
            initialKeyRecord={
              initialKeyRecord
                ? {
                    name: initialKeyRecord.name,
                    provider: initialKeyRecord.provider,
                    status: initialKeyRecord.status,
                    latencyMs: initialKeyRecord.latencyMs,
                  }
                : null
            }
          />
        </div>
      </main>
    </>
  );
}
