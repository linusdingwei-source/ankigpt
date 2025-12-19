import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signIn } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Verify code
    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      );
    }

    // Store a temporary verification token for the authorize function
    // This allows us to verify that the code was already checked
    const tempToken = `verified_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store temp token in verification table (will be cleaned up after use)
    await prisma.verificationToken.create({
      data: {
        identifier: `temp_${email}`,
        token: tempToken,
        expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    // Delete original verification code
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        token: code,
      },
    });

    // Sign in user with verification code
    // The temp token will be cleaned up in the authorize function
    await signIn('credentials', {
      email,
      code: tempToken, // Pass temp token for verification
      redirect: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

