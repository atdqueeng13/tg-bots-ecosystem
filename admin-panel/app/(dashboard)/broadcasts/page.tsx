import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { BroadcastsClient } from './broadcasts-client';

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  await ensureInitialData();

  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <Header title="Управление рассылками" />
      <main className="pt-20 px-8 pb-16 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto space-y-8">
          <BroadcastsClient initialBroadcasts={broadcasts} activeUsersCount={0} />
        </div>
      </main>
    </>
  );
}
