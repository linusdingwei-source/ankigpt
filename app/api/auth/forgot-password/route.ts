import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // If code and newPassword are provided, reset password
    if (code && newPassword) {
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

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      // Delete verification code
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
          token: code,
        },
      });

      return NextResponse.json({ success: true });
    }

    // Otherwise, send reset code
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ success: true });
    }

    // Generate 6-digit verification code
    const resetCode = crypto.randomInt(100000, 999999).toString();

    // Store verification code
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: resetCode,
        },
      },
      update: {
        token: resetCode,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      create: {
        identifier: email,
        token: resetCode,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send email
    await sendEmail({
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Verification Code</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 4px;">${resetCode}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

