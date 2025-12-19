import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const locales = ['zh', 'en', 'ja'];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/login',
    '/register',
    '/pricing',
    '/dashboard',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  locales.forEach(locale => {
    routes.forEach(route => {
      // Skip dashboard for sitemap (requires auth)
      if (route === '/dashboard') return;

      sitemapEntries.push({
        url: `${siteUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
        priority: route === '' ? 1.0 : route === '/pricing' ? 0.9 : 0.8,
        alternates: {
          languages: {
            zh: `${siteUrl}/zh${route}`,
            en: `${siteUrl}/en${route}`,
            ja: `${siteUrl}/ja${route}`,
          },
        },
      });
    });
  });

  return sitemapEntries;
}

