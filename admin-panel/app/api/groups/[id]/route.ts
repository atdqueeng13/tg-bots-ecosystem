import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        bots: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Группа не найдена' }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, lore, prompt, coverUrl, status, solutionTruth, isGuiltyBotId, starsPrice, winText, loseText, accusationAliases } = body;

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Группа не найдена' }, { status: 404 });
    }

    const updated = await prisma.group.update({
      where: { id: group.id },
      data: {
        ...(title !== undefined && { title }),
        ...(lore !== undefined && { lore }),
        ...(prompt !== undefined && { prompt }),
        ...(solutionTruth !== undefined && { solutionTruth }),
        ...(winText !== undefined && { winText }),
        ...(loseText !== undefined && { loseText }),
        ...(accusationAliases !== undefined && {
          accusationAliases: typeof accusationAliases === 'object' ? JSON.stringify(accusationAliases) : accusationAliases,
        }),
        ...(isGuiltyBotId !== undefined && { isGuiltyBotId }),
        ...(starsPrice !== undefined && { starsPrice: Number(starsPrice) }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(status !== undefined && { status }),
      },
      include: {
        bots: true,
      },
    });

    return NextResponse.json({ success: true, group: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Группа не найдена' }, { status: 404 });
    }

    // Unlink bots before deleting group
    await prisma.bot.updateMany({
      where: { groupId: group.id },
      data: { groupId: null },
    });

    await prisma.group.delete({
      where: { id: group.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
