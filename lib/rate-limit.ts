import { prisma } from './prisma';

export async function checkRateLimit(
  key: string,
  type: 'email' | 'ip',
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  // Clean up expired entries
  await prisma.rateLimit.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  // Find or create rate limit entry
  const rateLimit = await prisma.rateLimit.upsert({
    where: {
      key_type: {
        key,
        type,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      key,
      type,
      count: 1,
      expiresAt,
    },
  });

  // Check if limit exceeded
  if (rateLimit.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: rateLimit.expiresAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - rateLimit.count,
    resetAt: rateLimit.expiresAt,
  };
}

