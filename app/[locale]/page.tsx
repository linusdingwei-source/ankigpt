import { generateMetadata as generateSEOMetadata } from '@/lib/seo';
import HomePageClient from './HomePageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const localeTitles: Record<string, string> = {
    zh: '日语文本转语音 - 专业的日语TTS服务',
    en: 'Japanese Text to Speech - Professional Japanese TTS Service',
    ja: '日本語テキスト音声変換 - プロフェッショナルな日本語TTSサービス',
  };

  const localeDescriptions: Record<string, string> = {
    zh: '专业的日语文本转语音服务，支持高质量语音合成。输入日语文本，快速生成自然流畅的语音，支持下载。未登录用户可获得50个免费Credits，注册账户后可获得额外2个Credits。',
    en: 'Professional Japanese text-to-speech service with high-quality voice synthesis. Enter Japanese text and generate natural, fluent speech instantly. Unregistered users get 50 free credits, registered users get an additional 2 credits.',
    ja: '高品質な音声合成をサポートするプロフェッショナルな日本語テキスト音声変換サービス。日本語テキストを入力すると、自然で流暢な音声を即座に生成できます。未ログインユーザーは50クレジット無料、登録ユーザーは追加で2クレジット獲得できます。',
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
  
  return <HomePageClient locale={locale} />;
}
