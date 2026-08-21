import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { BotsClient } from './bots-client';

export const dynamic = 'force-dynamic';

export default async function BotsPage() {
  let bots: any[] = [];
  let groups: any[] = [];

  try {
    const [bList, gList] = await Promise.all([
      prisma.bot.findMany({
        include: {
          group: true,
        },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.group.findMany({
        orderBy: { title: 'asc' },
      }),
    ]);
    bots = bList;
    groups = gList;
  } catch (err) {
    console.error('BotsPage fetch error:', err);
  }

  return (
    <>
      <Header title="Боты" />
      <main className="pt-20 px-container-padding pb-10 min-h-screen">
        <BotsClient initialBots={bots} groups={groups} />
      </main>
    </>
  );
}
