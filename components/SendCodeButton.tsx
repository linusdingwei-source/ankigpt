'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Captcha } from './Captcha';

interface SendCodeButtonProps {
  email: string;
  type?: string;
  onCodeSent: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function SendCodeButton({ email, type = 'login', onCodeSent, onError, disabled }: SendCodeButtonProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCaptchaVerify = (question: string, answer: string) => {
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer);
    setShowCaptcha(false);
    handleSendCode(question, answer);
  };

  const handleSendCode = async (question?: string, answer?: string) => {
    if (!email) {
      onError(t('auth.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          type,
          captchaQuestion: question || captchaQuestion,
          captchaAnswer: answer || captchaAnswer,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onCodeSent();
        setCountdown(60); // 60 second countdown
        setCaptchaQuestion('');
        setCaptchaAnswer('');
      } else {
        if (res.status === 429 && data.waitTime) {
          setCountdown(data.waitTime);
          onError(`${data.error} (${data.waitTime}s)`);
        } else {
          onError(data.error || 'Failed to send code');
          // Regenerate captcha on error
          setShowCaptcha(true);
        }
      }
    } catch {
      onError('Network error');
      setShowCaptcha(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (countdown > 0) return;
    setShowCaptcha(true);
  };

  if (showCaptcha) {
    return (
      <div className="space-y-2">
        <Captcha onVerify={handleCaptchaVerify} onError={() => setShowCaptcha(false)} />
        <button
          type="button"
          onClick={() => setShowCaptcha(false)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading || countdown > 0 || !email}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {loading
        ? t('common.loading')
        : countdown > 0
        ? `${t('auth.sendVerificationCode')} (${countdown}s)`
        : t('auth.sendVerificationCode')}
    </button>
  );
}

