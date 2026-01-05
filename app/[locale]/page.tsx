import { redirect } from '@/i18n/routing';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const localeTitles: Record<string, string> = {
    zh: '日语文本转语音 - 专业的日语TTS服务',
    en: 'Japanese Text to Speech - Professional Japanese TTS Service',
    ja: '日本語テキスト音声変換 - プロフェッショナルな日本語TTSサービス',
  };

  const localeDescriptions: Record<string, string> = {
    zh: '专业的日语文本转语音服务，支持高质量语音合成。输入日语文本，快速生成自然流畅的语音，支持下载。新用户注册即送2 Credits，购买套餐享受更多优惠。',
    en: 'Professional Japanese text-to-speech service with high-quality voice synthesis. Enter Japanese text and generate natural, fluent speech instantly. New users get 2 free credits. Purchase packages for more credits.',
    ja: '高品質な音声合成をサポートするプロフェッショナルな日本語テキスト音声変換サービス。日本語テキストを入力すると、自然で流暢な音声を即座に生成できます。新規ユーザーは2クレジット無料。',
  };

  return generateSEOMetadata({
    title: localeTitles[locale] || localeTitles.zh,
    description: localeDescriptions[locale] || localeDescriptions.zh,
    keywords: [
      '日语文本转语音',
      'Japanese text to speech',
      '日语TTS',
      'remove sora watermark',
      '文本转语音',
      '语音合成',
      '日语语音生成',
    ],
    locale,
    path: `/${locale}`,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // 直接重定向到 dashboard（试用页面）
  redirect({ href: '/dashboard', locale });
}
