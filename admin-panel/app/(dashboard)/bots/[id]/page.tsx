import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/Header';
import { BotDetailClient } from './bot-detail-client';

export const dynamic = 'force-dynamic';

export default async function BotDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const bot = await prisma.bot.findFirst({
    where: {
      OR: [{ id: params.id }, { botId: params.id }],
    },
  });

  if (!bot) {
    notFound();
  }

  return (
    <>
      <Header title={`Бот: ${bot.name}`} />
      <main className="pt-20 px-8 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto">
          <BotDetailClient initialBot={bot} />
        </div>
      </main>
    </>
  );
}
