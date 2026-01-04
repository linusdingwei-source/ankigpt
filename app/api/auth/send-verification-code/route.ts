import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { verifyCaptcha } from '@/lib/captcha';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('[Verification Code] Request received');
  try {
    const body = await request.json();
    console.log('[Verification Code] Request body:', { 
      email: body.email, 
      type: body.type,
      hasCaptcha: !!(body.captchaAnswer && body.captchaQuestion)
    });
    
    const { email, type = 'login', captchaAnswer, captchaQuestion } = body;

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

    console.log('[Verification Code] About to send email:', { email, subject, code });
    
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
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      const errorStack = emailError instanceof Error ? emailError.stack : undefined;
      
      console.error('[Verification Code] Email sending failed:', {
        email,
        error: errorMessage,
        stack: errorStack,
      });
      
      // Return more detailed error message
      return NextResponse.json(
        { 
          error: errorMessage || 'Failed to send verification code',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Verification Code] Error:', {
      error: errorMessage,
      stack: errorStack,
    });
    return NextResponse.json(
      { 
        error: errorMessage || 'Failed to send verification code',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

