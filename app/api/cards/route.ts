import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deckName = searchParams.get('deck');
    const searchQuery = searchParams.get('search'); // 搜索关键词
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    const userId = session.user.id as string;

    const where: {
      userId: string;
      deckName?: string;
      OR?: Array<{
        frontContent?: { contains: string; mode: 'insensitive' };
        backContent?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      userId,
    };

    if (deckName) {
      where.deckName = deckName;
    }

    // 添加搜索功能：搜索正面和背面内容
    if (searchQuery && searchQuery.trim()) {
      where.OR = [
        {
          frontContent: {
            contains: searchQuery.trim(),
            mode: 'insensitive',
          },
        },
        {
          backContent: {
            contains: searchQuery.trim(),
            mode: 'insensitive',
          },
        },
      ];
    }

    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          frontContent: true,
          backContent: true,
          cardType: true,
          audioUrl: true,
          audioFilename: true,
          timestamps: true,
          kanaText: true,
          deckName: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.card.count({ where }),
    ]);

    return NextResponse.json({
      cards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get cards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

