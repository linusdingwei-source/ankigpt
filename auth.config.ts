import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      
      // Check if pathname matches dashboard pattern (with locale)
      const isOnDashboard = /^\/(zh|en|ja)\/dashboard/.test(pathname) || pathname.startsWith('/dashboard');
      
      // Check if pathname matches auth pages (with locale)
      const isOnAuth = /^\/(zh|en|ja)\/(login|register|forgot-password)/.test(pathname) || 
                       pathname.startsWith('/login') || 
                       pathname.startsWith('/register') ||
                       pathname.startsWith('/forgot-password');
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        // Extract locale from pathname or use default
        const localeMatch = pathname.match(/^\/(zh|en|ja)/);
        const locale = localeMatch ? localeMatch[1] : 'zh';
        return Response.redirect(new URL(`/${locale}/login`, nextUrl));
      } else if (isOnAuth) {
        if (isLoggedIn) {
          // Extract locale from pathname or use default
          const localeMatch = pathname.match(/^\/(zh|en|ja)/);
          const locale = localeMatch ? localeMatch[1] : 'zh';
          return Response.redirect(new URL(`/${locale}/dashboard`, nextUrl));
        }
        return true;
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;

