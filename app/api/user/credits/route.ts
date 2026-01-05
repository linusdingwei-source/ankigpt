import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits, getAnonymousUserCredits } from '@/lib/credits';
import { getAnonymousIdFromRequest, getOrCreateAnonymousUser } from '@/lib/anonymous-user';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // 如果是登录用户，返回登录用户的 credits
    if (session?.user) {
      const userId = session.user.id as string;
      const credits = await getCredits(userId);
      return NextResponse.json({ credits });
    }

    // 如果是未登录用户，尝试获取临时用户 ID
    const anonymousId = getAnonymousIdFromRequest(request);
    if (anonymousId) {
      const credits = await getAnonymousUserCredits(anonymousId);
      return NextResponse.json({ credits, isAnonymous: true });
    }

    // 创建新的临时用户
    const { anonymousId: newAnonymousId } = await getOrCreateAnonymousUser();
    const credits = await getAnonymousUserCredits(newAnonymousId);
    return NextResponse.json({ credits, isAnonymous: true, anonymousId: newAnonymousId });
  } catch (error) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      { error: 'Failed to get credits' },
      { status: 500 }
    );
  }
}

