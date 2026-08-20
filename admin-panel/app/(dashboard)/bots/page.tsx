import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { BotsClient } from './bots-client';

export const dynamic = 'force-dynamic';

export default async function BotsPage() {
  await ensureInitialData();

  const [bots, groups] = await Promise.all([
    prisma.bot.findMany({
      include: {
        group: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.group.findMany({
      orderBy: { title: 'asc' },
    }),
  ]);

  return (
    <>
      <Header title="Реестр Улик" badge="АКТИВЫ" />
      <main className="pt-20 px-container-padding pb-10 min-h-screen">
        <BotsClient initialBots={bots} groups={groups} />
      </main>
    </>
  );
}
