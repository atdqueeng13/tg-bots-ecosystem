import { prisma } from '@/lib/prisma';
import { HubClient } from './hub-client';

export const dynamic = 'force-dynamic';

export default async function HubPage() {
  let hubBot: any = null;
  let cases: any[] = [];

  try {
    hubBot = await prisma.bot.findFirst({
      where: { isMainHub: true },
    });

    if (!hubBot) {
      hubBot = await prisma.bot.create({
        data: {
          botId: 'hub_main',
          name: 'Детективное Бюро (Главный Хаб)',
          role: 'Шеф Бюро / Архивариус',
          token: process.env.MAIN_BOT_TOKEN || '1234567890:DEMO_HUB_TOKEN',
          isMainHub: true,
          model: 'gemini-3.6-flash',
          prompt: `Ты — Шеф Детективного Бюро Скотланд-Ярда и Главный Архивариус.
Твоя задача — помогать сыщикам, напоминать об их открытых делах, презентовать новые расследования дня и оценивать финальные обвинения (/accuse).`,
          onboardingSteps: JSON.stringify([
            {
              id: 'step_1',
              stepIndex: 0,
              text: `🕵️‍♂️ *Добро пожаловать в Детективное Бюро Скотланд-Ярда!*\n\nВы приняты на службу в качестве младшего инспектора. Здесь расследуются самые загадочные и громкие преступления Лондона.`,
              delaySeconds: 0,
              mediaUrl: '',
              buttonText: 'Получить инструкции 📜',
            },
            {
              id: 'step_2',
              stepIndex: 1,
              text: `📋 *Как проходит расследование:*\n\n1️⃣ Вы выбираете доступное Дело из архива.\n2️⃣ Получаете досье и доступ к личным контактам всех подозреваемых.\n3️⃣ Допрашиваете каждого персонажа по очереди. Помните: невиновные скрывают свои тайны, а убийца — паникует и выдумывает нелепую ложь!`,
              delaySeconds: 2,
              mediaUrl: '',
              buttonText: 'Понятно, что дальше? 🔍',
            },
            {
              id: 'step_3',
              stepIndex: 2,
              text: `⚖️ *Вынесение вердикта:*\n\nКогда у вас сложится картина преступления, используйте команду */accuse* в этом боте, укажите имя преступника и мотив. Суд оценит вашу логику по 10-балльной шкале!\n\nИспользуйте команду */cases*, чтобы в любой момент открыть список расследований.`,
              delaySeconds: 2,
              mediaUrl: '',
              buttonText: '📂 Открыть архив Дел',
            },
          ]),
        },
      });
    }

    cases = await prisma.group.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, title: true, code: true, starsPrice: true },
    });
  } catch (err) {
    console.error('HubPage fetch error:', err);
    if (!hubBot) {
      hubBot = {
        name: 'Детективное Бюро (Главный Хаб)',
        role: 'Шеф Бюро / Архивариус',
        isMainHub: true,
        model: 'gemini-3.6-flash',
        onboardingSteps: '[]',
      };
    }
  }

  return <HubClient initialHubBot={hubBot} cases={cases} />;
}
