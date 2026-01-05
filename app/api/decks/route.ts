import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    return NextResponse.json({
      decks: decks.map(deck => ({
        id: deck.id,
        name: deck.name,
        cardCount: deck._count.cards,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get decks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch decks' },
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Deck name is required' },
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
        { error: 'Deck already exists' },
        { status: 409 }
      );
    }

    const deck = await prisma.deck.create({
      data: {
        userId,
        name: deckName,
      },
    });

    return NextResponse.json({ deck });
  } catch (error) {
    console.error('Create deck error:', error);
    return NextResponse.json(
      { error: 'Failed to create deck' },
      { status: 500 }
    );
  }
}

