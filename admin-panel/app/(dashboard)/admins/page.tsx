import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { AdminsClient } from './admins-client';

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  await ensureInitialData();

  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      clearanceLevel: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <>
      <Header title="Администраторы" />
      <main className="pt-20 px-8 pb-16 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminsClient initialAdmins={admins} />
        </div>
      </main>
    </>
  );
}
