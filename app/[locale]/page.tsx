import { redirect } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import Link from 'next/link';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';
import { generateServiceStructuredData, generateFAQStructuredData } from '@/lib/structured-data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await import(`@/messages/${locale}.json`).then(m => m.default);

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
  const session = await auth();
  const t = await getTranslations();

  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  }

  // FAQ data for structured data
  const faqs = [
    {
      question: locale === 'zh' 
        ? '如何使用日语文本转语音服务？'
        : locale === 'ja'
        ? '日本語テキスト音声変換サービスはどのように使用しますか？'
        : 'How to use Japanese text-to-speech service?',
      answer: locale === 'zh'
        ? '注册账户后，您将获得2个免费Credits。在仪表板中输入日语文本，点击生成即可获得语音文件，每次生成消耗1个Credit。'
        : locale === 'ja'
        ? 'アカウントを登録すると、2つの無料クレジットが付与されます。ダッシュボードで日本語テキストを入力し、生成をクリックすると音声ファイルが取得できます。各生成には1クレジット消費されます。'
        : 'After registering an account, you will receive 2 free credits. Enter Japanese text in the dashboard and click generate to get the audio file. Each generation consumes 1 credit.',
    },
    {
      question: locale === 'zh'
        ? '如何购买更多Credits？'
        : locale === 'ja'
        ? 'より多くのクレジットを購入するにはどうすればよいですか？'
        : 'How to purchase more credits?',
      answer: locale === 'zh'
        ? '访问定价页面，选择适合的套餐。Starter套餐$5可获得7 Credits，Pro套餐$20可获得30 Credits，Premium套餐$100可获得150 Credits。所有套餐都包含额外赠送的Credits。'
        : locale === 'ja'
        ? '価格ページにアクセスし、適切なプランを選択してください。Starterプランは$5で7クレジット、Proプランは$20で30クレジット、Premiumプランは$100で150クレジットを獲得できます。すべてのプランには追加のボーナスクレジットが含まれています。'
        : 'Visit the pricing page and choose a suitable package. Starter package $5 gets 7 credits, Pro package $20 gets 30 credits, Premium package $100 gets 150 credits. All packages include bonus credits.',
    },
    {
      question: locale === 'zh'
        ? '支持哪些支付方式？'
        : locale === 'ja'
        ? 'どのような支払い方法がサポートされていますか？'
        : 'What payment methods are supported?',
      answer: locale === 'zh'
        ? '我们使用Stripe安全支付系统，支持所有主流信用卡和借记卡，包括Visa、Mastercard、American Express等。'
        : locale === 'ja'
        ? 'Stripeセキュア決済システムを使用しており、Visa、Mastercard、American Expressなどの主要なクレジットカードとデビットカードをサポートしています。'
        : 'We use Stripe secure payment system, supporting all major credit and debit cards including Visa, Mastercard, American Express, etc.',
    },
  ];

  const faqStructuredData = generateFAQStructuredData(faqs);
  const serviceStructuredData = generateServiceStructuredData(
    t('tts.title'),
    t('tts.description'),
    siteUrl
  );

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceStructuredData),
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              {t('tts.title')}
            </h1>
            <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
              {t('tts.description')}
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href={`/${locale}/login`}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('common.login')}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                {t('common.register')}
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('pricing.title')}
              </Link>
            </div>

            {/* FAQ Section for SEO */}
            <div className="mt-16 text-left max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">
                {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'Frequently Asked Questions'}
              </h2>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
