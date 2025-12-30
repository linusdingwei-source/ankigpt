import { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

type Locale = 'zh' | 'en' | 'ja';

/**
 * Extract locale from request URL or headers
 * @param request NextRequest object
 * @returns Valid locale string (zh, en, or ja)
 */
export function getLocaleFromRequest(request: NextRequest): Locale {
  const locales = routing.locales as readonly Locale[];
  const defaultLocale = routing.defaultLocale as Locale;

  // Try to extract from URL pathname
  const pathname = request.nextUrl.pathname;
  const pathMatch = pathname.match(/^\/(zh|en|ja)/);
  if (pathMatch && locales.includes(pathMatch[1] as Locale)) {
    return pathMatch[1] as Locale;
  }

  // Try to extract from Referer header
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererMatch = refererUrl.pathname.match(/^\/(zh|en|ja)/);
      if (refererMatch && locales.includes(refererMatch[1] as Locale)) {
        return refererMatch[1] as Locale;
      }
    } catch {
      // Invalid referer URL, ignore
    }
  }

  // Try to extract from Origin header
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const pathMatch = originUrl.pathname.match(/^\/(zh|en|ja)/);
      if (pathMatch && locales.includes(pathMatch[1] as Locale)) {
        return pathMatch[1] as Locale;
      }
    } catch {
      // Invalid origin URL, ignore
    }
  }

  // Try to extract from query parameter
  const localeParam = request.nextUrl.searchParams.get('locale');
  if (localeParam && locales.includes(localeParam as Locale)) {
    return localeParam as Locale;
  }

  // Default to default locale
  return defaultLocale;
}

/**
 * Build a localized URL path
 * @param locale Locale string
 * @param path Path without locale prefix (e.g., '/dashboard' or 'dashboard')
 * @returns Localized path (e.g., '/zh/dashboard')
 */
export function buildLocalizedPath(locale: string, path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${locale}/${cleanPath}`;
}

