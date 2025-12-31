'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { trackPaymentSuccess } from '@/lib/analytics';

export default function PaymentSuccessPage() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setError('No session ID found');
      setLoading(false);
      return;
    }

    // Verify payment and redirect to dashboard
    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/payment/success?session_id=${sessionId}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          // Payment verified successfully
          // Get package info from session storage or URL params
          const packageInfo = sessionStorage.getItem('purchase_package');
          if (packageInfo) {
            try {
              const { packageId, price, credits } = JSON.parse(packageInfo);
              trackPaymentSuccess(packageId, price, credits, sessionId);
              sessionStorage.removeItem('purchase_package');
            } catch (e) {
              console.error('Failed to parse package info:', e);
            }
          }
          
          setLoading(false);
          
          // Redirect to dashboard after 2 seconds
          // Use router.push with path only, router will automatically add locale
          setTimeout(() => {
            router.push('/dashboard?payment=success');
          }, 2000);
        } else {
          setError(data.error || data.message || 'Payment verification failed');
          setLoading(false);
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setError('Network error');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('payment.verifying')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            {t('payment.error')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('payment.backToPricing')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {t('payment.success')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('payment.successMessage')}
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {t('payment.goToDashboard')}
        </Link>
      </div>
    </div>
  );
}

