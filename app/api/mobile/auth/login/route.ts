import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
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
 * POST /api/mobile/auth/login
 * 移动端登录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, code } = body;

    if (!email) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Email is required'),
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        password: true,
        credits: true,
        isAnonymous: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'User not found'),
        { status: 404 }
      );
    }

    // 验证码登录
    if (code) {
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

      // 创建临时 token 用于 NextAuth
      const tempToken = `verified_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await prisma.verificationToken.create({
        data: {
          identifier: `temp_${email}`,
          token: tempToken,
          expires: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // 删除原始验证码
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
          token: code,
        },
      });

      // 使用 NextAuth signIn
      await signIn('credentials', {
        email,
        code: tempToken,
        redirect: false,
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
    }

    // 密码登录
    if (!password || !user.password) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Password is required'),
        { status: 400 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid password'),
        { status: 401 }
      );
    }

    // 使用 NextAuth signIn
    await signIn('credentials', {
      email,
      password,
      redirect: false,
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
    console.error('Mobile login error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Login failed'),
      { status: 500 }
    );
  }
}

