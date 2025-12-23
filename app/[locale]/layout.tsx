import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/providers';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';
import { generateWebSiteStructuredData, generateOrganizationStructuredData } from '@/lib/structured-data';
import '../globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const siteName = '日语文本转语音 | Japanese Text to Speech';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  const localeNames: Record<string, string> = {
    zh: '日语文本转语音 - 专业的日语TTS服务',
    en: 'Japanese Text to Speech - Professional Japanese TTS Service',
    ja: '日本語テキスト音声変換 - プロフェッショナルな日本語TTSサービス',
  };

  const localeDescriptions: Record<string, string> = {
    zh: '专业的日语文本转语音服务，支持高质量语音合成。输入日语文本，快速生成自然流畅的语音，支持下载。新用户注册即送2 Credits，购买套餐享受更多优惠。',
    en: 'Professional Japanese text-to-speech service with high-quality voice synthesis. Enter Japanese text and generate natural, fluent speech instantly. New users get 2 free credits. Purchase packages for more credits.',
    ja: '高品質な音声合成をサポートするプロフェッショナルな日本語テキスト音声変換サービス。日本語テキストを入力すると、自然で流暢な音声を即座に生成できます。新規ユーザーは2クレジット無料。パッケージを購入してより多くのクレジットを獲得できます。',
  };

  return generateSEOMetadata({
    title: localeNames[locale] || localeNames.zh,
    description: localeDescriptions[locale] || localeDescriptions.zh,
    keywords: [
      '日语文本转语音',
      'Japanese text to speech',
      '日语TTS',
      '文本转语音',
      '语音合成',
      'remove sora watermark',
      '日语语音生成',
      'Japanese TTS',
      'text to speech Japanese',
    ],
    locale,
    path: '',
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Generate structured data
  const websiteStructuredData = generateWebSiteStructuredData(siteUrl, siteName);
  const organizationStructuredData = generateOrganizationStructuredData({
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
  });

  return (
    <html lang={locale}>
      <head>
        {/* Hreflang tags for multilingual SEO */}
        <link rel="alternate" hrefLang="zh" href={`${siteUrl}/zh`} />
        <link rel="alternate" hrefLang="en" href={`${siteUrl}/en`} />
        <link rel="alternate" hrefLang="ja" href={`${siteUrl}/ja`} />
        <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/zh`} />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        <Providers>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}

