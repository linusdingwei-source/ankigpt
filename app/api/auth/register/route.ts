import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
// import { initializeUserCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();

    if (!email || !password || !code) {
      return NextResponse.json(
        { error: 'Email, password, and verification code are required' },
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with initial credits
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        credits: 2, // Initial credits for new users
      },
    });

    // Delete verification code
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        token: code,
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, credits: user.credits } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

