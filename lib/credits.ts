import { prisma } from './prisma';

const INITIAL_CREDITS = 2;
const TTS_COST = 1;

export async function initializeUserCredits(userId: string) {
  // Check if user already has credits (not a new user)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, createdAt: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Only give initial credits if user was just created (within last minute)
  // and has 0 credits
  const isNewUser = 
    user.credits === 0 &&
    new Date().getTime() - user.createdAt.getTime() < 60000; // 1 minute

  if (isNewUser) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: INITIAL_CREDITS },
    });
    return INITIAL_CREDITS;
  }

  return user.credits;
}

export async function consumeCredits(userId: string, amount: number = TTS_COST): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user || user.credits < amount) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        decrement: amount,
      },
    },
  });

  return true;
}

export async function addCredits(userId: string, amount: number) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: amount,
      },
    },
  });
}

export async function getCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return user?.credits || 0;
}

