import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

// 强制动态路由
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/check
 * 检查当前用户是否为管理员（用于诊断）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        successResponse({
          isAuthenticated: false,
          isAdmin: false,
          message: '用户未登录',
        })
      );
    }

    // 获取用户详细信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isAnonymous: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        successResponse({
          isAuthenticated: true,
          isAdmin: false,
          message: '用户不存在',
          userId,
        })
      );
    }

    const isAdmin = user.role === 'admin';

    return NextResponse.json(
      successResponse({
        isAuthenticated: true,
        isAdmin,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isAnonymous: user.isAnonymous,
        },
        message: isAdmin ? '您是管理员' : '您不是管理员',
      })
    );
  } catch (error) {
    console.error('Check admin status error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to check admin status'),
      { status: 500 }
    );
  }
}
