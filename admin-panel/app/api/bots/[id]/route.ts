import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bot = await prisma.bot.findFirst({
      where: {
        OR: [{ id: params.id }, { botId: params.id }],
      },
      include: {
        group: true,
        dialogues: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
    }

    return NextResponse.json({ bot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      role,
      status,
      isActive,
      groupId,
      model,
      temperature,
      reasoningEnabled,
      legend,
      knowledge,
      secrets,
      character,
      triggers,
      avatarUrl,
      token,
    } = body;

    const updatedBot = await prisma.bot.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
        ...(isActive !== undefined && { isActive }),
        ...(groupId !== undefined && { groupId: groupId || null }),
        ...(model !== undefined && { model }),
        ...(temperature !== undefined && { temperature: parseFloat(temperature) }),
        ...(reasoningEnabled !== undefined && { reasoningEnabled: !!reasoningEnabled }),
        ...(legend !== undefined && { legend }),
        ...(knowledge !== undefined && { knowledge }),
        ...(secrets !== undefined && { secrets }),
        ...(character !== undefined && { character }),
        ...(triggers !== undefined && { triggers }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(token !== undefined && { token }),
      },
    });

    return NextResponse.json({ bot: updatedBot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyApiAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.bot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
