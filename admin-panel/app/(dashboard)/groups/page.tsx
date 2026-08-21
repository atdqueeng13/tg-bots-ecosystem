import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { GroupsClient } from './groups-client';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  let groups: any[] = [];

  try {
    groups = await prisma.group.findMany({
      include: {
        bots: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('GroupsPage fetch error:', err);
  }

  return (
    <>
      <Header title="Группы" />
      <main className="pt-20 px-container-padding pb-10 min-h-screen">
        <GroupsClient initialGroups={groups} />
      </main>
    </>
  );
}
