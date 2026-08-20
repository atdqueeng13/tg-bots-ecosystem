import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { GroupsClient } from './groups-client';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  await ensureInitialData();

  const groups = await prisma.group.findMany({
    include: {
      bots: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <Header title="Реестр доказательств" badge="ДЕЛА & ГРУППЫ" />
      <main className="pt-20 px-container-padding pb-20 min-h-screen">
        <GroupsClient initialGroups={groups} />
      </main>
    </>
  );
}
