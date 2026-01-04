'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { SendCodeButton } from '@/components/SendCodeButton';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { trackPageViewEvent, trackButtonClick, trackLoginSuccess } from '@/lib/analytics';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 追踪登录页访问
    trackPageViewEvent('LOGIN', { locale });
    
    // 检查是否已经登录，如果是则重定向到 dashboard
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user) {
          router.push(`/${locale}/dashboard`);
        }
      } catch (error) {
        // 忽略错误，继续显示登录页面
        console.error('Failed to check session:', error);
      }
    };
    
    // 延迟检查，避免与 OAuth 回调冲突
    const timer = setTimeout(checkSession, 1000);
    return () => clearTimeout(timer);
  }, [locale, router]);

  const handleCodeSent = () => {
    setCodeSent(true);
    trackButtonClick('SEND_CODE', 'login_page');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid email or password');
      } else {
        trackLoginSuccess('email');
        router.push(`/${locale}/dashboard`);
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        trackLoginSuccess('code');
        router.push(`/${locale}/dashboard`);
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    trackButtonClick('GOOGLE_LOGIN', 'login_page');
    await signIn('google', { callbackUrl: `/${locale}/dashboard` });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          {t('auth.loginTitle')}
        </h1>

        <div className="mb-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {t('auth.loginWithGoogle')}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
              {t('common.or')}
            </span>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setLoginMethod('password');
              setCodeSent(false);
              trackButtonClick('EMAIL_LOGIN', 'login_page');
            }}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              loginMethod === 'password'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('auth.loginWithEmail')}
          </button>
          <button
            onClick={() => {
              setLoginMethod('code');
              trackButtonClick('CODE_LOGIN', 'login_page');
            }}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              loginMethod === 'code'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('auth.verificationCode')}
          </button>
        </div>

        {loginMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('common.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('common.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('common.login')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('common.email')}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <SendCodeButton
                  email={email}
                  type="login"
                  onCodeSent={handleCodeSent}
                  onError={setError}
                  disabled={codeSent}
                />
              </div>
            </div>
            {codeSent && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('auth.verificationCode')}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !codeSent}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('common.login')}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {t('auth.forgotPassword')}
          </Link>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link
              href={`/${locale}/register`}
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

