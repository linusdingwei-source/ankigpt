'use client';

import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/routing';

export default function PaymentCancelPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-yellow-500 text-5xl mb-4">⚠</div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {t('payment.cancelled')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('payment.cancelledMessage')}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/pricing"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('payment.backToPricing')}
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t('payment.goToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}

