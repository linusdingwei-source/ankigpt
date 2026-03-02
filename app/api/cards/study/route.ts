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

    // 构建查询条件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseConditions: any = {
      userId,
      category: 'CARD', // 只学习卡片，不学习笔记
    };

    if (deckName) {
      baseConditions.deckName = deckName;
    }

    // 根据类型筛选
    if (cardType === 'word') {
      baseConditions.cardType = '单词';
    } else if (cardType === 'sentence') {
      baseConditions.NOT = { cardType: '单词' };
    }

    // 查询待学习的卡片
    // 简化查询，只按创建时间排序
    const cards = await prisma.card.findMany({
      where: baseConditions,
      orderBy: [
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
        createdAt: true,
      },
    });

    // 统计待学习卡片数量（简化：所有卡片都是“新”卡片）
    const totalCount = await prisma.card.count({
      where: baseConditions,
    });

    return NextResponse.json(
      successResponse({
        cards,
        stats: {
          new: totalCount,
          review: 0,
          total: totalCount,
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
