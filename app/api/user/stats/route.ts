import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/anonymous-user';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/stats
 * 获取当前用户的统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(null, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'User not authenticated'),
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        createdAt: true,
        isAnonymous: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'User not found'),
        { status: 404 }
      );
    }

    // 获取用户的卡片统计
    const cardStats = await prisma.card.groupBy({
      by: ['deckName'],
      where: { userId },
      _count: { id: true },
    });

    // 获取总卡片数
    const totalCards = await prisma.card.count({
      where: { userId },
    });

    // 获取总牌组数
    const totalDecks = await prisma.deck.count({
      where: { userId },
    });

    // 获取最近创建的卡片（最近7天）
    const recentCards = await prisma.card.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        frontContent: true,
        deckName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 按牌组统计卡片数
    const cardsByDeck = cardStats.map(stat => ({
      deckName: stat.deckName,
      count: stat._count.id,
    }));

    const stats = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        createdAt: user.createdAt,
        isAnonymous: user.isAnonymous,
      },
      cards: {
        total: totalCards,
        byDeck: cardsByDeck,
        recent: recentCards,
      },
      decks: {
        total: totalDecks,
      },
    };

    return NextResponse.json(successResponse(stats));
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, `Failed to get user stats: ${error instanceof Error ? error.message : String(error)}`),
      { status: 500 }
    );
  }
}
