import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ensureInitialData } from '@/lib/seed-data';
import { Header } from '@/components/Header';
import { BotDetailClient } from './bot-detail-client';

export const dynamic = 'force-dynamic';

export default async function BotDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await ensureInitialData();

  const [bot, groups] = await Promise.all([
    prisma.bot.findFirst({
      where: {
        OR: [{ id: params.id }, { botId: params.id }],
      },
      include: {
        group: true,
      },
    }),
    prisma.group.findMany({
      orderBy: { title: 'asc' },
    }),
  ]);

  if (!bot) {
    notFound();
  }

  return (
    <>
      <Header
        title="Реестр улик"
        badge={`ДЕЛО: ${bot.group?.code || 'NO_CASE'}`}
      />
      <main className="flex-grow pt-20 p-container-padding bg-surface-dim dossier-texture flex gap-6 min-h-screen">
        <BotDetailClient initialBot={bot} groups={groups} />
      </main>
    </>
  );
}
