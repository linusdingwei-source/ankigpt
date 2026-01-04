'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      onError(t('auth.emailRequired'));
      return;
    }

    // 生成简单的数学验证码（用于后端验证，但不显示给用户）
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const captchaQuestion = `${num1} + ${num2} = ?`;
    const captchaAnswer = (num1 + num2).toString();

    const requestBody = { 
      email, 
      type,
      captchaQuestion,
      captchaAnswer,
    };
    
    console.log('[SendCodeButton] Sending verification code request:', {
      email,
      type,
      hasCaptcha: !!(requestBody.captchaQuestion && requestBody.captchaAnswer),
    });

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[SendCodeButton] Response status:', res.status, res.statusText);
      const data = await res.json();
      console.log('[SendCodeButton] Response data:', data);

      if (res.ok) {
        onCodeSent();
        setCountdown(60); // 60 second countdown
      } else {
        if (res.status === 429 && data.waitTime) {
          setCountdown(data.waitTime);
          onError(`${data.error} (${data.waitTime}s)`);
        } else {
          // Show detailed error message
          const errorMessage = data.error || 'Failed to send code';
          const details = data.details ? `: ${data.details}` : '';
          onError(`${errorMessage}${details}`);
          console.error('[SendCodeButton] Error response:', data);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Please check your connection';
      console.error('[SendCodeButton] Network error:', err);
      onError(`Network error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    console.log('[SendCodeButton] Button clicked:', { 
      email, 
      disabled, 
      loading, 
      countdown,
      showCaptcha 
    });
    if (countdown > 0) {
      console.log('[SendCodeButton] Countdown active, ignoring click');
      return;
    }
    if (disabled) {
      console.log('[SendCodeButton] Button disabled, ignoring click');
      onError('Please fill in all required fields first');
      return;
    }
    // 直接发送验证码，不需要数学验证码
    console.log('[SendCodeButton] Sending verification code directly');
    await handleSendCode();
  };

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

