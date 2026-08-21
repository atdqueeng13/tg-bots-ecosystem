import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { BotsClient } from './bots-client';

export const dynamic = 'force-dynamic';

export default async function BotsPage() {
  let bots: any[] = [];
  let groups: any[] = [];
  let defaultModel = 'gemini-3.6-flash';

  try {
    const [bList, gList, globalSetting] = await Promise.all([
      prisma.bot.findMany({
        include: {
          group: true,
        },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.group.findMany({
        orderBy: { title: 'asc' },
      }),
      prisma.globalSetting.findUnique({
        where: { id: 'global' },
      }),
    ]);
    bots = bList;
    groups = gList;
    if (globalSetting?.primaryEngine) {
      defaultModel = globalSetting.primaryEngine;
    }
  } catch (err) {
    console.error('BotsPage fetch error:', err);
  }

  return (
    <>
      <Header title="Боты" />
      <main className="pt-20 px-container-padding pb-10 min-h-screen">
        <BotsClient initialBots={bots} groups={groups} defaultModel={defaultModel} />
      </main>
    </>
  );
}
