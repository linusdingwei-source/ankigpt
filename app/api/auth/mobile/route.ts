import { NextRequest, NextResponse } from 'next/server';
import { auth, signIn } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  return token;
}

/**
 * POST /api/auth/mobile/login
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

/**
 * POST /api/auth/mobile/register
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

/**
 * GET /api/auth/mobile/session
 * 获取当前 session 信息
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Not authenticated'),
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'User not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse({
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
    console.error('Get session error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get session'),
      { status: 500 }
    );
  }
}

