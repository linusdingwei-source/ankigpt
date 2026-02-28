import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// GET /api/cards/study - 获取待学习的卡片
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

    const { searchParams } = new URL(request.url);
    const deckName = searchParams.get('deck') || undefined;
    const cardType = searchParams.get('type'); // 'word' | 'sentence' | null (all)
    const limit = parseInt(searchParams.get('limit') || '20');

    const now = new Date();

    // 构建查询条件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId,
      category: 'CARD', // 只学习卡片，不学习笔记
      backContent: { not: '' }, // 必须有背面内容
      OR: [
        { nextReviewAt: null }, // 新卡片（从未学习过）
        { nextReviewAt: { lte: now } }, // 到期复习的卡片
      ],
    };

    if (deckName) {
      where.deckName = deckName;
    }

    // 根据类型筛选
    if (cardType === 'word') {
      where.cardType = '单词';
    } else if (cardType === 'sentence') {
      where.cardType = { not: '单词' };
    }

    // 查询待学习的卡片
    // 优先级：新卡片优先，然后是过期时间最早的
    const cards = await prisma.card.findMany({
      where,
      orderBy: [
        { nextReviewAt: 'asc' }, // null 值会排在最前面
        { createdAt: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        frontContent: true,
        backContent: true,
        cardType: true,
        audioUrl: true,
        timestamps: true,
        kanaText: true,
        deckName: true,
        interval: true,
        easeFactor: true,
        reviewCount: true,
        nextReviewAt: true,
        lastReviewedAt: true,
        createdAt: true,
      },
    });

    // 统计待学习卡片数量
    const [newCount, reviewCount] = await Promise.all([
      prisma.card.count({
        where: {
          ...where,
          nextReviewAt: null,
        },
      }),
      prisma.card.count({
        where: {
          ...where,
          nextReviewAt: { lte: now },
        },
      }),
    ]);

    return NextResponse.json(
      successResponse({
        cards,
        stats: {
          new: newCount,
          review: reviewCount,
          total: newCount + reviewCount,
        },
      })
    );
  } catch (error) {
    console.error('Get study cards error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch study cards'),
      { status: 500 }
    );
  }
}
