import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { UsersClient } from './users-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  let users: any[] = [];

  try {
    users = await prisma.telegramUser.findMany({
      include: {
        dialogues: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { bot: true },
        },
      },
      orderBy: { lastActive: 'desc' },
    });
  } catch (err) {
    console.error('UsersPage fetch error:', err);
  }

  return (
    <>
      <Header title="Пользователи" />
      <main className="pt-20 px-container-padding pb-10 min-h-screen">
        <UsersClient initialUsers={users} />
      </main>
    </>
  );
}
