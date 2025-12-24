import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

// 包装 handlers 以添加错误处理和日志
export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    const missingVars: string[] = [];
    if (!process.env.AUTH_SECRET) missingVars.push('AUTH_SECRET');
    if (!process.env.NEXTAUTH_URL) missingVars.push('NEXTAUTH_URL');
    if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
    if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');

    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars.join(', '));
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: `Missing required environment variables: ${missingVars.join(', ')}`,
          missingVars,
        },
        { status: 500 }
      );
    }

    return handlers.GET(request);
  } catch (error) {
    console.error('NextAuth GET Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Authentication error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return handlers.POST(request);
  } catch (error) {
    console.error('NextAuth POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Authentication error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

