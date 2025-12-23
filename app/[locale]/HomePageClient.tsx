'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { trackPageViewEvent, trackButtonClick } from '@/lib/analytics';

interface HomePageClientProps {
  locale: string;
  faqs: Array<{ question: string; answer: string }>;
}

export function HomePageClient({ locale, faqs }: HomePageClientProps) {
  const t = useTranslations();

  useEffect(() => {
    // 追踪首页访问
    trackPageViewEvent('HOME', { locale });
  }, [locale]);

  const handleButtonClick = (buttonName: string) => {
    trackButtonClick(buttonName, 'home_page');
  };

  return (
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
              onClick={() => handleButtonClick('LOGIN')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t('common.login')}
            </Link>
            <Link
              href={`/${locale}/register`}
              onClick={() => handleButtonClick('REGISTER')}
              className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {t('common.register')}
            </Link>
            <Link
              href={`/${locale}/pricing`}
              onClick={() => handleButtonClick('PRICING')}
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
  );
}

