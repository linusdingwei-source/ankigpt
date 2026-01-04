import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { verifyCaptcha } from '@/lib/captcha';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, type = 'login', captchaAnswer, captchaQuestion } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Verify captcha
    if (!captchaAnswer || !captchaQuestion) {
      return NextResponse.json(
        { error: 'Captcha verification required' },
        { status: 400 }
      );
    }

    // Extract answer from question (format: "X + Y = ?")
    const match = captchaQuestion.match(/(\d+)\s+\+\s+(\d+)/);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid captcha question' },
        { status: 400 }
      );
    }

    const correctAnswer = (parseInt(match[1]) + parseInt(match[2])).toString();
    if (!verifyCaptcha(captchaAnswer, correctAnswer)) {
      return NextResponse.json(
        { error: 'Invalid captcha answer' },
        { status: 400 }
      );
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check email rate limit (60 seconds)
    const emailLimit = await checkRateLimit(email, 'email', 1, 60 * 1000);
    if (!emailLimit.allowed) {
      const waitTime = Math.ceil((emailLimit.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { 
          error: 'Please wait before requesting another code',
          waitTime,
          resetAt: emailLimit.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // Check IP rate limit (5 per hour)
    const ipLimit = await checkRateLimit(ip, 'ip', 5, 60 * 60 * 1000);
    if (!ipLimit.allowed) {
      const waitTime = Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { 
          error: 'Too many requests from this IP. Please try again later',
          waitTime,
          resetAt: ipLimit.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }

    // Generate 6-digit verification code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store verification code in database (expires in 10 minutes)
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: code,
        },
      },
      update: {
        token: code,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      create: {
        identifier: email,
        token: code,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send email
    const subject = type === 'reset' 
      ? 'Password Reset Verification Code'
      : type === 'register'
      ? 'Registration Verification Code'
      : 'Login Verification Code';

    try {
      await sendEmail({
        to: email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${subject}</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 4px;">${code}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      console.log('[Verification Code] Email sent successfully to:', email);
      return NextResponse.json({ success: true });
    } catch (emailError: any) {
      console.error('[Verification Code] Email sending failed:', {
        email,
        error: emailError.message || emailError,
        stack: emailError.stack,
      });
      
      // Return more detailed error message
      return NextResponse.json(
        { 
          error: emailError.message || 'Failed to send verification code',
          details: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Verification Code] Error:', {
      error: error.message || error,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send verification code',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

