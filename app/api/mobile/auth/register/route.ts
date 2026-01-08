import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

// 强制该路由为动态路由，不进行缓存
export const dynamic = 'force-dynamic';

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not configured');
}

/**
 * 生成 JWT token 给移动端
 */
async function generateMobileToken(userId: string, email: string): Promise<string> {
  const token = await encode({
    token: {
      id: userId,
      email,
      sub: userId,
    },
    secret: AUTH_SECRET as string,
    salt: '', // Empty salt for JWT encoding
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  return token;
}

/**
 * PUT /api/mobile/auth/register
 * 移动端注册
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, code } = body;

    if (!email || !password || !code) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Email, password, and verification code are required'),
        { status: 400 }
      );
    }

    // 验证码验证
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
        errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid or expired verification code'),
        { status: 400 }
      );
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'User already exists'),
        { status: 400 }
      );
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        credits: 2, // 新用户初始 credits
      },
    });

    // 删除验证码
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        token: code,
      },
    });

    // 生成移动端 token
    const token = await generateMobileToken(user.id, user.email);

    return NextResponse.json(
      successResponse({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          credits: user.credits,
        },
      })
    );
  } catch (error) {
    console.error('Mobile register error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Registration failed'),
      { status: 500 }
    );
  }
}

