import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mergeAnonymousUserData, getAnonymousIdFromRequest } from '@/lib/anonymous-user';
import { prisma } from '@/lib/prisma';

/**
 * 合并临时用户数据到正式账号
 * 在用户登录后调用此 API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const realUserId = session.user.id as string;
    
    // 从请求中获取临时用户 ID
    const anonymousId = getAnonymousIdFromRequest(request);
    
    if (!anonymousId) {
      // 没有临时用户数据，无需合并
      return NextResponse.json({ success: true, merged: false });
    }

    // 查找临时用户
    const anonymousUser = await prisma.user.findUnique({
      where: { anonymousId },
      select: { id: true, isAnonymous: true },
    });

    if (!anonymousUser || !anonymousUser.isAnonymous) {
      // 不是临时用户，无需合并
      return NextResponse.json({ success: true, merged: false });
    }

    // 合并数据
    await mergeAnonymousUserData(anonymousUser.id, realUserId);

    return NextResponse.json({ success: true, merged: true });
  } catch (error) {
    console.error('Merge anonymous user error:', error);
    return NextResponse.json(
      { error: 'Failed to merge anonymous user data' },
      { status: 500 }
    );
  }
}

