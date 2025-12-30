'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { trackPageViewEvent, trackButtonClick, trackCheckoutStarted } from '@/lib/analytics';

const packages = [
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    credits: 5,
    bonusCredits: 2,
    totalCredits: 7,
    features: ['5 Credits', '+2 Bonus Credits', 'Basic Support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    credits: 20,
    bonusCredits: 10,
    totalCredits: 30,
    features: ['20 Credits', '+10 Bonus Credits', 'Priority Support', 'Best Value'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 100,
    credits: 100,
    bonusCredits: 50,
    totalCredits: 150,
    features: ['100 Credits', '+50 Bonus Credits', 'Priority Support', 'Best for Power Users'],
  },
];

export default function PricingPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // 追踪定价页访问
    trackPageViewEvent('PRICING', { locale });
  }, [locale]);

  const handlePurchase = async (packageId: string) => {
    if (!session) {
      // Redirect to login
      window.location.href = `/${locale}/login`;
      return;
    }

    setLoading(packageId);
    
    // 追踪购买按钮点击
    const selectedPackage = packages.find(p => p.id === packageId);
    if (selectedPackage) {
      trackButtonClick('PURCHASE', 'pricing_page');
      trackCheckoutStarted(packageId, selectedPackage.price);
      
      // 存储套餐信息用于支付成功后的追踪
      sessionStorage.setItem('purchase_package', JSON.stringify({
        packageId,
        price: selectedPackage.price,
        credits: selectedPackage.totalCredits,
      }));
    }

    try {
      const res = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setLoading(null);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Network error');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t('pricing.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 relative ${
                pkg.popular ? 'ring-2 ring-indigo-500 scale-105' : ''
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {t('pricing.popular')}
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {pkg.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${pkg.price}
                  </span>
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-semibold">{pkg.totalCredits} {t('pricing.credits')}</span>
                  {pkg.bonusCredits > 0 && (
                    <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ({pkg.credits} + {pkg.bonusCredits} {t('pricing.bonus')})
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading === pkg.id}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  pkg.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === pkg.id
                  ? t('common.loading')
                  : session
                  ? t('pricing.purchase')
                  : t('pricing.loginToPurchase')}
              </button>
            </div>
          ))}
        </div>

        {!session && (
          <div className="text-center mt-8">
            <p className="text-gray-600 dark:text-gray-400">
              {t('pricing.alreadyHaveAccount')}{' '}
              <Link
                href="/login"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {t('common.login')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

