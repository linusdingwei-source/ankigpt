'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSession } from 'next-auth/react';

export default function CardGeneratePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [text, setText] = useState('');
  const [cardType, setCardType] = useState('问答题（附翻转卡片）');
  const [deckName, setDeckName] = useState('default');
  const [includePronunciation, setIncludePronunciation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    frontContent: string;
    backContent: string;
    audioUrl?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [decks, setDecks] = useState<Array<{ id: string; name: string }>>([]);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits');
      const data = await res.json();
      if (data.credits !== undefined) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch('/api/decks');
      const data = await res.json();
      if (data.decks) {
        setDecks(data.decks);
        if (data.decks.length > 0 && !deckName) {
          setDeckName(data.decks[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch decks:', err);
    }
  }, [deckName]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchCredits();
      fetchDecks();
    }
  }, [status, router, fetchCredits, fetchDecks]);


  const handleGeneratePreview = async () => {
    if (!text.trim()) {
      setError('请输入日文句子');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      // 1. 调用 LLM 分析
      const llmRes = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!llmRes.ok) {
        const errorData = await llmRes.json();
        throw new Error(errorData.error || 'LLM 分析失败');
      }

      const llmData = await llmRes.json();
      if (!llmData.success) {
        throw new Error('LLM 分析失败');
      }

      let audioUrl: string | undefined;

      // 2. 如果需要发音，生成 TTS
      if (includePronunciation) {
        const ttsRes = await fetch('/api/tts/generate-enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            kanaText: llmData.analysis.kanaText,
          }),
        });

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.success && ttsData.audio?.url) {
            audioUrl = ttsData.audio.url;
          }
        }
      }

      setPreview({
        frontContent: text,
        backContent: llmData.analysis.html,
        audioUrl,
      });

      await fetchCredits();
    } catch (err) {
      console.error('Generate preview error:', err);
      setError(err instanceof Error ? err.message : '生成预览失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async () => {
    if (!preview) {
      setError('请先生成预览');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          cardType,
          deckName: deckName.trim() || 'default',
          includePronunciation,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '保存卡片失败');
      }

      const data = await res.json();
      if (data.success) {
        // 跳转到卡片列表
        router.push('/cards');
      } else {
        throw new Error('保存卡片失败');
      }
    } catch (err) {
      console.error('Save card error:', err);
      setError(err instanceof Error ? err.message : '保存卡片失败');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/cards" className="text-indigo-600 hover:underline dark:text-indigo-400">
            ← 返回卡片列表
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            生成 Anki 卡片
          </h1>
          
          {credits !== null && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                剩余 Credits: <span className="font-bold text-indigo-600 dark:text-indigo-400">{credits}</span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                卡片类型
              </label>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={loading}
              >
                <option value="问答题（附翻转卡片）">问答题（附翻转卡片）</option>
                <option value="Basic-b860c">Basic-b860c</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                目标牌组
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                list="deckOptions"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="输入牌组名称..."
                disabled={loading}
              />
              <datalist id="deckOptions">
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                日文句子
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={4}
                placeholder="在此输入日文句子..."
                disabled={loading}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePronunciation"
                checked={includePronunciation}
                onChange={(e) => setIncludePronunciation(e.target.checked)}
                className="mr-2"
                disabled={loading}
              />
              <label htmlFor="includePronunciation" className="text-sm text-gray-700 dark:text-gray-300">
                包含发音
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleGeneratePreview}
                disabled={loading || !text.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '生成中...' : '生成预览'}
              </button>
              {preview && (
                <button
                  onClick={handleSaveCard}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '保存中...' : '保存卡片'}
                </button>
              )}
            </div>
          </div>
        </div>

        {preview && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">预览</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">正面（日文）</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-lg">{preview.frontContent}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">背面（分析）</h3>
                <div 
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.backContent }}
                />
              </div>

              {preview.audioUrl && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">发音</h3>
                  <audio controls className="w-full">
                    <source src={preview.audioUrl} type="audio/mpeg" />
                    您的浏览器不支持音频播放。
                  </audio>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

