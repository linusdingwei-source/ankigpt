'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/routing';
import { signOut, useSession } from 'next-auth/react';
import {
  trackPageViewEvent,
  trackButtonClick,
  trackAudioGenerationStart,
  trackAudioGenerationSuccess,
  trackAudioGenerationFailed,
  trackAudioDownload,
  trackInsufficientCredits,
} from '@/lib/analytics';

export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const { data: session, status } = useSession();
  
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${locale}/login`);
    } else if (status === 'authenticated' && session) {
      // Check for payment success parameter
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('payment') === 'success') {
        setPaymentSuccess(true);
        // Remove parameter from URL
        window.history.replaceState({}, '', `/${locale}/dashboard`);
        // Hide success message after 5 seconds
        setTimeout(() => setPaymentSuccess(false), 5000);
      }

      // Fetch credits
      fetch('/api/user/credits')
        .then(res => res.json())
        .then(data => {
          if (data.credits !== undefined) {
            setCredits(data.credits);
          }
        })
        .catch(err => console.error('Failed to fetch credits:', err));

      // 追踪仪表板访问
      trackPageViewEvent('DASHBOARD', { locale });
    }
  }, [status, router, locale, session]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    if (text.length > 500) {
      setError(t('tts.maxLength'));
      return;
    }

    setLoading(true);
    setError('');
    setAudioUrl(null);

    // 追踪音频生成开始
    trackAudioGenerationStart(text.length);
    trackButtonClick('GENERATE_AUDIO', 'dashboard');

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (res.ok && data.audio) {
        // Convert base64 to blob URL
        try {
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          // Update credits if returned
          if (data.credits !== undefined) {
            setCredits(data.credits);
            // 追踪音频生成成功
            trackAudioGenerationSuccess(text.length, data.credits);
          }
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Failed to process audio data');
        }
      } else {
        const errorMsg = data.error || 'Failed to generate audio';
        setError(errorMsg);
        // If insufficient credits, update credits display
        if (res.status === 402 && data.credits !== undefined) {
          setCredits(data.credits);
          trackInsufficientCredits(data.credits);
        } else {
          // 追踪音频生成失败
          trackAudioGenerationFailed(errorMsg, data.credits);
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      // 追踪音频下载
      trackAudioDownload();
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `japanese-tts-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('common.appName')}
            </h1>
            <div className="flex items-center gap-4">
              {credits !== null && (
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    {t('dashboard.credits')}: {credits}
                  </span>
                </div>
              )}
              <Link
                href="/pricing"
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('dashboard.buyCredits')}
              </Link>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </div>
              <button
                onClick={async () => {
                  await signOut({ 
                    callbackUrl: `/${locale}/login`,
                    redirect: true 
                  });
                }}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 功能导航 */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('dashboard.features')}
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                {t('dashboard.textToSpeech')}
              </Link>
              <Link
                href="/cards/generate"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                {t('dashboard.generateCard')}
              </Link>
              <Link
                href="/cards"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t('dashboard.viewCards')}
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          {paymentSuccess && (
            <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('payment.successMessage')}</span>
                </div>
                <button
                  onClick={() => setPaymentSuccess(false)}
                  className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('tts.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('tts.description')}
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('tts.inputPlaceholder')}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  maxLength={500}
                  placeholder={t('tts.inputPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                />
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {text.length}/500 {t('tts.maxLength')}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('tts.generating') : t('tts.generate')}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {error}
                {error.includes('Insufficient credits') && (
                  <div className="mt-2">
                    <Link
                      href="/pricing"
                      className="text-indigo-600 hover:underline dark:text-indigo-400 font-semibold"
                    >
                      {t('dashboard.buyCreditsNow')} →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {audioUrl && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <audio controls className="w-full" src={audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {t('tts.download')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

