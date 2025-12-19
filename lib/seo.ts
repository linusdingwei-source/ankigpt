import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const siteName = '日语文本转语音 | Japanese Text to Speech';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  locale?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    locale = 'zh',
    path = '',
    image = `${siteUrl}/og-image.jpg`,
    type = 'website',
    noindex = false,
  } = config;

  const fullTitle = `${title} | ${siteName}`;
  const url = `${siteUrl}${path}`;
  const keywordsString = keywords.length > 0 ? keywords.join(', ') : '日语文本转语音, Japanese text to speech, 日语TTS, 文本转语音, 日语语音合成';

  // Generate alternate language URLs
  const alternateLanguages: Record<string, string> = {
    'zh': `${siteUrl}/zh${path}`,
    'en': `${siteUrl}/en${path}`,
    'ja': `${siteUrl}/ja${path}`,
  };

  return {
    title: fullTitle,
    description,
    keywords: keywordsString,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    robots: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    openGraph: {
      type,
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
      url,
      title: fullTitle,
      description,
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      alternateLocale: Object.keys(alternateLanguages).filter(l => l !== locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@yourtwitterhandle', // 替换为你的Twitter账号
    },
    alternates: {
      canonical: url,
      languages: alternateLanguages,
    },
    metadataBase: new URL(siteUrl),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION, // 在.env中添加
      // yandex: process.env.YANDEX_VERIFICATION,
      // bing: process.env.BING_VERIFICATION,
    },
  };
}

export function generateHreflangTags(path: string = '') {
  const locales = ['zh', 'en', 'ja'];
  return locales.map(locale => ({
    hreflang: locale,
    href: `${siteUrl}/${locale}${path}`,
  }));
}

