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
  
  // 处理 API 路由的 CORS
  if (pathname.startsWith('/api/')) {
    // 处理预检请求 (OPTIONS)
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 对于 API 路由，跳过 auth 中间件的授权检查
    // 让各个 API 端点自己处理认证（支持 Bearer Token）
    // 但继续执行以添加 CORS 头
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Anonymous-Id');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // 对于 API 路由，直接返回（不进行国际化处理，也不进行 auth 授权检查）
    return response;
  }
  
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
      // 检查 /zh/dashboard/admin 格式 -> 重定向到 /zh/admin
      if (pathParts[1] === 'dashboard' && pathParts[2] === 'admin') {
        const redirectUrl = new URL(`/${locale}/admin`, req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }
  
  // 检查 /dashboard/login 格式（无 locale）
  if (pathParts.length >= 2 && pathParts[0] === 'dashboard' && pathParts[1] === 'login') {
    const redirectUrl = new URL('/zh/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // 检查 /dashboard/dashboard 格式（无 locale，重复路径）
  if (pathParts.length >= 2 && pathParts[0] === 'dashboard' && pathParts[1] === 'dashboard') {
    const redirectUrl = new URL('/zh/dashboard', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // 检查 /dashboard 格式（无 locale）- 重定向到默认 locale 的 dashboard
  if (pathParts.length === 1 && pathParts[0] === 'dashboard') {
    const redirectUrl = new URL('/zh/dashboard', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // 检查 /dashboard/admin 格式（无 locale）
  if (pathParts.length >= 2 && pathParts[0] === 'dashboard' && pathParts[1] === 'admin') {
    const redirectUrl = new URL('/zh/admin', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Apply internationalization middleware
  return intlMiddleware(req);
});

export const config = {
  // Match all pathnames except for
  // - API routes
  // - _next (internal files)
  // - _vercel (internal files)
  // - Static files (e.g. favicon.ico, logo.png, etc. - anything with a dot)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

