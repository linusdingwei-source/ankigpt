import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { id } = await params;

    const card = await prisma.card.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!card) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Card not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse({ card }));
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch card'),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 检查卡片是否存在且属于当前用户
    const existingCard = await prisma.card.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCard) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Card not found'),
        { status: 404 }
      );
    }

    // 更新卡片
    const card = await prisma.card.update({
      where: { id },
      data: {
        frontContent: body.frontContent,
        backContent: body.backContent,
        cardType: body.cardType,
        deckName: body.deckName,
        tags: body.tags,
      },
    });

    return NextResponse.json(successResponse({ card }));
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update card'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { id } = await params;

    // 检查卡片是否存在且属于当前用户
    const existingCard = await prisma.card.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCard) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Card not found'),
        { status: 404 }
      );
    }

    await prisma.card.delete({
      where: { id },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete card'),
      { status: 500 }
    );
  }
}

