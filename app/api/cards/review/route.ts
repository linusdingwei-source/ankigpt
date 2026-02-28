import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

// SM-2 算法实现
// rating: 1=Again, 2=Hard, 3=Good, 4=Easy
function calculateNextReview(
  rating: number,
  currentInterval: number,
  currentEaseFactor: number,
  reviewCount: number
): { interval: number; easeFactor: number; nextReviewAt: Date } {
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;

  // 更新难度因子
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // 其中 q 是评分 (1-4 映射到 1-5)
  const q = rating + 1; // 转换为 2-5 范围
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  
  // 确保难度因子不低于 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // 计算新间隔
  if (rating === 1) {
    // Again - 重置间隔
    interval = 0;
  } else if (reviewCount === 0 || currentInterval === 0) {
    // 新卡片或重置后的卡片
    if (rating === 2) {
      interval = 1; // Hard: 1天
    } else if (rating === 3) {
      interval = 1; // Good: 1天
    } else {
      interval = 4; // Easy: 4天
    }
  } else if (currentInterval === 1) {
    // 第一次复习后
    if (rating === 2) {
      interval = 1; // Hard: 保持1天
    } else if (rating === 3) {
      interval = 6; // Good: 6天
    } else {
      interval = 6; // Easy: 6天
    }
  } else {
    // 正常复习
    if (rating === 2) {
      interval = Math.max(1, Math.round(currentInterval * 1.2)); // Hard: 增加20%
    } else if (rating === 3) {
      interval = Math.round(currentInterval * easeFactor); // Good: 按难度因子增加
    } else {
      interval = Math.round(currentInterval * easeFactor * 1.3); // Easy: 额外增加30%
    }
  }

  // 计算下次复习时间
  const nextReviewAt = new Date();
  if (interval === 0) {
    // Again: 10分钟后再次复习
    nextReviewAt.setMinutes(nextReviewAt.getMinutes() + 10);
  } else {
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  }

  return { interval, easeFactor, nextReviewAt };
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

    const { cardId, rating } = await request.json();

    if (!cardId || !rating || rating < 1 || rating > 4) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Card ID and valid rating (1-4) are required'),
        { status: 400 }
      );
    }

    // 获取当前卡片
    const card = await prisma.card.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Card not found'),
        { status: 404 }
      );
    }

    // 计算下次复习时间
    const { interval, easeFactor, nextReviewAt } = calculateNextReview(
      rating,
      card.interval,
      card.easeFactor,
      card.reviewCount
    );

    // 更新卡片
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        interval,
        easeFactor,
        nextReviewAt,
        reviewCount: card.reviewCount + 1,
        lastReviewedAt: new Date(),
      },
    });

    return NextResponse.json(
      successResponse({
        card: {
          id: updatedCard.id,
          interval: updatedCard.interval,
          easeFactor: updatedCard.easeFactor,
          nextReviewAt: updatedCard.nextReviewAt,
          reviewCount: updatedCard.reviewCount,
        },
        // 返回预计下次复习的友好描述
        nextReviewDescription: getNextReviewDescription(interval),
      })
    );
  } catch (error) {
    console.error('Review card error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to review card'),
      { status: 500 }
    );
  }
}

function getNextReviewDescription(interval: number): string {
  if (interval === 0) {
    return '10分钟后';
  } else if (interval === 1) {
    return '明天';
  } else if (interval < 7) {
    return `${interval}天后`;
  } else if (interval < 30) {
    return `${Math.round(interval / 7)}周后`;
  } else {
    return `${Math.round(interval / 30)}个月后`;
  }
}
