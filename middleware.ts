import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const locales = ['zh', 'en', 'ja'];
  
  // 修复错误的路径格式
  // 例如: /zh/dashboard/login -> /zh/login
  const pathParts = pathname.split('/').filter(Boolean);
  
  if (pathParts.length >= 3) {
    const locale = pathParts[0];
    if (locales.includes(locale)) {
      // 检查 /zh/dashboard/login 格式
      if (pathParts[1] === 'dashboard' && pathParts[2] === 'login') {
        const redirectUrl = new URL(`/${locale}/login`, req.url);
        return NextResponse.redirect(redirectUrl);
      }
      // 检查 /zh/login/dashboard 格式
      if (pathParts[1] === 'login' && pathParts[2] === 'dashboard') {
        const redirectUrl = new URL(`/${locale}/dashboard`, req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }
  
  // 检查 /dashboard/login 格式（无 locale）
  if (pathParts.length >= 2 && pathParts[0] === 'dashboard' && pathParts[1] === 'login') {
    const redirectUrl = new URL('/zh/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Apply internationalization middleware
  return intlMiddleware(req);
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(zh|en|ja)/:path*']
};

