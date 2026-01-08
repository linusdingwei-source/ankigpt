import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

// 强制该路由为动态路由，不进行缓存
export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/auth/session
 * 获取当前 session 信息（支持 Bearer Token 和 Cookie Session）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    // 使用 getUserId 支持 Bearer Token 和 Cookie Session
    const userId = await getUserId(session, request);

    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Not authenticated'),
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'User not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          credits: user.credits,
        },
      })
    );
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get session'),
      { status: 500 }
    );
  }
}

