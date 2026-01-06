import { prisma } from './prisma';
import { randomUUID } from 'crypto';
import { decode } from 'next-auth/jwt';

const ANONYMOUS_INITIAL_CREDITS = 50;

/**
 * 获取或创建临时用户
 * @param anonymousId 临时用户 ID（从 localStorage/cookie 获取）
 * @returns 用户 ID 和 anonymousId
 */
export async function getOrCreateAnonymousUser(anonymousId?: string): Promise<{ userId: string; anonymousId: string }> {
  // 如果提供了 anonymousId，尝试查找现有用户
  if (anonymousId) {
    const existingUser = await prisma.user.findUnique({
      where: { anonymousId },
      select: { id: true },
    });
    
    if (existingUser) {
      return { userId: existingUser.id, anonymousId };
    }
  }

  // 创建新的临时用户
  const newAnonymousId = anonymousId || randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `anonymous_${newAnonymousId}@temp.local`,
      name: 'Guest User',
      isAnonymous: true,
      anonymousId: newAnonymousId,
      credits: ANONYMOUS_INITIAL_CREDITS,
    },
  });

  return { userId: user.id, anonymousId: newAnonymousId };
}

/**
 * 从请求中获取临时用户 ID
 * @param request NextRequest 对象
 * @returns 临时用户 ID 或 null
 */
export function getAnonymousIdFromRequest(request: Request): string | null {
  // 从请求头中获取
  const anonymousIdHeader = request.headers.get('x-anonymous-id');
  if (anonymousIdHeader) {
    return anonymousIdHeader;
  }

  // 从 cookie 中获取
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies['anonymous-id']) {
      return cookies['anonymous-id'];
    }
  }

  return null;
}

/**
 * 合并临时用户数据到正式账号
 * @param anonymousUserId 临时用户 ID
 * @param realUserId 正式用户 ID
 */
export async function mergeAnonymousUserData(anonymousUserId: string, realUserId: string): Promise<void> {
  const anonymousUser = await prisma.user.findUnique({
    where: { id: anonymousUserId },
    include: {
      cards: true,
      decks: true,
    },
  });

  if (!anonymousUser || !anonymousUser.isAnonymous) {
    return; // 不是临时用户，无需合并
  }

  // 合并 credits
  if (anonymousUser.credits > 0) {
    await prisma.user.update({
      where: { id: realUserId },
      data: {
        credits: {
          increment: anonymousUser.credits,
        },
      },
    });
  }

  // 合并 decks（如果名称不冲突）
  for (const deck of anonymousUser.decks) {
    const existingDeck = await prisma.deck.findUnique({
      where: {
        userId_name: {
          userId: realUserId,
          name: deck.name,
        },
      },
    });

    if (existingDeck) {
      // 如果牌组已存在，将卡片移动到现有牌组
      await prisma.card.updateMany({
        where: {
          userId: anonymousUserId,
          deckName: deck.name,
        },
        data: {
          userId: realUserId,
          deckId: existingDeck.id,
        },
      });
    } else {
      // 创建新牌组并移动卡片
      const newDeck = await prisma.deck.create({
        data: {
          userId: realUserId,
          name: deck.name,
        },
      });

      await prisma.card.updateMany({
        where: {
          userId: anonymousUserId,
          deckName: deck.name,
        },
        data: {
          userId: realUserId,
          deckId: newDeck.id,
        },
      });
    }
  }

  // 合并没有牌组的卡片
  await prisma.card.updateMany({
    where: {
      userId: anonymousUserId,
      deckId: null,
    },
    data: {
      userId: realUserId,
    },
  });

  // 删除临时用户
  await prisma.user.delete({
    where: { id: anonymousUserId },
  });
}

/**
 * 从 Bearer Token 中获取用户 ID
 * @param token JWT token
 * @returns 用户 ID 或 null
 */
async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const AUTH_SECRET = process.env.AUTH_SECRET;
    if (!AUTH_SECRET) {
      return null;
    }

    const decoded = await decode({
      token,
      secret: AUTH_SECRET,
    });

    if (decoded && decoded.id) {
      return decoded.id as string;
    }

    return null;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * 从请求中获取 Bearer Token
 * @param request Request 对象
 * @returns token 或 null
 */
export function getBearerTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * 获取用户 ID（支持登录用户、Bearer Token 和临时用户）
 * @param session NextAuth session
 * @param request NextRequest 对象
 * @returns 用户 ID 或 null
 */
export async function getUserId(
  session: { user?: { id?: string } } | null, 
  request: Request
): Promise<string | null> {
  // 如果是登录用户（通过 cookie），直接返回
  if (session?.user?.id) {
    return session.user.id as string;
  }

  // 尝试从 Bearer Token 获取用户 ID
  const bearerToken = getBearerTokenFromRequest(request);
  if (bearerToken) {
    const userId = await getUserIdFromToken(bearerToken);
    if (userId) {
      return userId;
    }
  }

  // 尝试获取临时用户 ID
  const anonymousId = getAnonymousIdFromRequest(request);
  if (anonymousId) {
    try {
      const { userId } = await getOrCreateAnonymousUser(anonymousId);
      return userId;
    } catch (error) {
      console.error('Failed to get or create anonymous user:', error);
      return null;
    }
  }

  return null;
}

