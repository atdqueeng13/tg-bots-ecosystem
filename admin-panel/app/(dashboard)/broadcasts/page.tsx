import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { BroadcastsClient } from './broadcasts-client';

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  await ensureInitialData();

  const [broadcasts, groups] = await Promise.all([
    prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.group.findMany({
      orderBy: { title: 'asc' },
    }),
  ]);

  return (
    <>
      <Header title="Реестр Доказательств" badge="РАССЫЛКИ" />
      <main className="pt-20 p-container-padding min-h-screen">
        <BroadcastsClient initialBroadcasts={broadcasts} groups={groups} />
      </main>
    </>
  );
}
