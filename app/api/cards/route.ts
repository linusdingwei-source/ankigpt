import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { getUserId } = await import('@/lib/anonymous-user');
    
    // 获取用户 ID（支持登录用户和临时用户）
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deckName = searchParams.get('deck');
    const sourceId = searchParams.get('sourceId');
    const category = searchParams.get('category') || 'WORD'; // WORD, SENTENCE, or NOTE
    const searchQuery = searchParams.get('search'); // 搜索关键词
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    const where: {
      userId: string;
      deckName?: string;
      sourceId?: string;
      category?: string;
      cardType?: string | { not: string };
      OR?: Array<{
        frontContent?: { contains: string; mode: 'insensitive' };
        backContent?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      userId,
    };

    // Filter by category: WORD shows "单词" cardType, SENTENCE shows non-"单词", NOTE uses category field
    if (category === 'NOTE') {
      where.category = 'NOTE';
    } else if (category === 'WORD') {
      where.category = 'CARD';
      where.cardType = '单词';
    } else if (category === 'SENTENCE') {
      where.category = 'CARD';
      where.cardType = { not: '单词' };
    }

    if (deckName) {
      where.deckName = deckName;
    }

    if (sourceId) {
      where.sourceId = sourceId;
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
          sourceId: true,
          pageNumber: true, // PDF page number for page-level association
          category: true,
        },
      }),
      prisma.card.count({ where }),
    ]);

    return NextResponse.json(
      successResponse({
        cards,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    console.error('Get cards error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch cards'),
      { status: 500 }
    );
  }
}

