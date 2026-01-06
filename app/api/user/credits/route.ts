import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits, getAnonymousUserCredits } from '@/lib/credits';
import { getAnonymousIdFromRequest, getOrCreateAnonymousUser, getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (userId) {
      // 登录用户或通过 Bearer Token 认证的用户
      const credits = await getCredits(userId);
      return NextResponse.json(successResponse({ credits }));
    }

    // 如果是未登录用户，尝试获取临时用户 ID
    const anonymousId = getAnonymousIdFromRequest(request);
    if (anonymousId) {
      const credits = await getAnonymousUserCredits(anonymousId);
      return NextResponse.json(successResponse({ credits, isAnonymous: true }));
    }

    // 创建新的临时用户
    const { anonymousId: newAnonymousId } = await getOrCreateAnonymousUser();
    const credits = await getAnonymousUserCredits(newAnonymousId);
    return NextResponse.json(successResponse({ credits, isAnonymous: true, anonymousId: newAnonymousId }));
  } catch (error) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get credits'),
      { status: 500 }
    );
  }
}

