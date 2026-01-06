import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const decks = await prisma.deck.findMany({
      where: { userId },
      include: {
        _count: {
          select: { cards: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      successResponse({
        decks: decks.map(deck => ({
          id: deck.id,
          name: deck.name,
          cardCount: deck._count.cards,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        })),
      })
    );
  } catch (error) {
    console.error('Get decks error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch decks'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Deck name is required'),
        { status: 400 }
      );
    }
    const deckName = name.trim();

    // 检查牌组是否已存在
    const existingDeck = await prisma.deck.findUnique({
      where: {
        userId_name: {
          userId,
          name: deckName,
        },
      },
    });

    if (existingDeck) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Deck already exists'),
        { status: 409 }
      );
    }

    const deck = await prisma.deck.create({
      data: {
        userId,
        name: deckName,
      },
    });

    return NextResponse.json(successResponse({ deck }));
  } catch (error) {
    console.error('Create deck error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create deck'),
      { status: 500 }
    );
  }
}

