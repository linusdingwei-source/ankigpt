import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

// 检查必需的环境变量
const requiredEnvVars = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  // 在 Vercel 上需要信任主机
  trustHost: true,
  // 修复 PKCE cookie 配置
  cookies: {
    pkceCodeVerifier: {
      name: '__Secure-authjs.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // 不设置 domain，让浏览器自动处理
      },
    },
    state: {
      name: '__Secure-authjs.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: '__Secure-authjs.callback_url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: '__Host-authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // 启用调试模式（生产环境可以关闭）
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }

        // Support verification code login
        if (credentials.code) {
          // Check if this is a temporary verification token
          const tempToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: `temp_${credentials.email}`,
              token: credentials.code as string,
              expires: {
                gt: new Date(),
              },
            },
          });

          if (tempToken) {
            // Valid temporary token, allow login and clean up
            await prisma.verificationToken.deleteMany({
              where: {
                identifier: `temp_${credentials.email}`,
                token: credentials.code as string,
              },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            };
          }
          // Invalid or expired token
          return null;
        }

        // Password login
        if (!credentials.password || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Give new users 2 initial credits (for OAuth providers like Google)
      if (user.email && account?.provider === 'google') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { credits: true, createdAt: true },
        });
        
        // If user has 0 credits and was created recently (within last minute), give initial credits
        if (dbUser && dbUser.credits === 0) {
          const isNewUser = new Date().getTime() - dbUser.createdAt.getTime() < 60000;
          if (isNewUser) {
            await prisma.user.update({
              where: { email: user.email },
              data: { credits: 2 },
            });
          }
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      const locales = ['zh', 'en', 'ja'];
      
      // 解析 URL
      let urlObj: URL;
      try {
        urlObj = new URL(url, baseUrl);
      } catch {
        urlObj = new URL(baseUrl);
      }
      
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // 检查是否是错误的路径格式（如 /login/dashboard）
      if (pathParts.length >= 2 && pathParts[0] === 'login' && pathParts[1] === 'dashboard') {
        // 从 callbackUrl cookie 或 URL 参数中尝试获取原始 locale
        // 如果无法获取，使用默认 locale
        return `${baseUrl}/zh/dashboard`;
      }
      
      // 检查路径是否已经包含 locale
      if (pathParts.length > 0 && locales.includes(pathParts[0])) {
        // 路径已经包含 locale，直接返回
        return url.startsWith('http') ? url : `${baseUrl}${url}`;
      }
      
      // 如果路径不包含 locale，需要添加
      if (pathParts.length > 0) {
        // 检查是否是已知的页面
        const knownPages = ['login', 'dashboard', 'register', 'pricing', 'forgot-password'];
        if (knownPages.includes(pathParts[0])) {
          // 从 URL 参数或 cookie 中获取 locale（如果可用）
          // 否则使用默认 locale
          const locale = 'zh'; // 默认使用中文
          return `${baseUrl}/${locale}/${pathParts.join('/')}`;
        }
      }
      
      // 如果是绝对 URL 且在同一域名下，直接返回
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // 如果是相对路径，确保包含 locale
      if (url.startsWith('/')) {
        // 检查是否已经是正确的格式
        if (pathParts.length > 0 && locales.includes(pathParts[0])) {
          return `${baseUrl}${url}`;
        }
        // 添加默认 locale
        return `${baseUrl}/zh${url}`;
      }
      
      // 默认重定向到 dashboard
      return `${baseUrl}/zh/dashboard`;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

