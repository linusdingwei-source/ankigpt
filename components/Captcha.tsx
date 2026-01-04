'use client';

import { useState, useEffect } from 'react';

interface CaptchaProps {
  onVerify: (question: string, answer: string) => void;
  onError?: () => void;
}

export function Captcha({ onVerify, onError }: CaptchaProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const generateNew = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setAnswer('');
    setError('');
  };

  useEffect(() => {
    generateNew();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Captcha] Form submitted:', { num1, num2, answer });
    const correctAnswer = (num1 + num2).toString();
    if (answer.trim() === correctAnswer.trim()) {
      console.log('[Captcha] Answer correct, calling onVerify');
      onVerify(`${num1} + ${num2} = ?`, correctAnswer);
      generateNew();
    } else {
      console.log('[Captcha] Answer incorrect:', { answer, correctAnswer });
      setError('Incorrect answer');
      if (onError) onError();
      generateNew();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {num1} + {num2} = ?
        </span>
        <button
          type="button"
          onClick={generateNew}
          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          title="Refresh captcha"
        >
          ↻
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              console.log('[Captcha] Enter key pressed');
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Enter answer"
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          验证
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

