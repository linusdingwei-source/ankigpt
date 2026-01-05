'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/routing';
import { signOut, useSession } from 'next-auth/react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  trackPageViewEvent,
  trackButtonClick,
  trackAudioGenerationStart,
  trackAudioGenerationSuccess,
  trackAudioGenerationFailed,
  trackAudioDownload,
  trackInsufficientCredits,
} from '@/lib/analytics';

interface Card {
  id: string;
  frontContent: string;
  backContent: string;
  cardType: string;
  audioUrl?: string;
  audioFilename?: string;
  timestamps?: Array<{ text: string; begin_time: number; end_time: number }> | null;
  deckName: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

type TabType = 'tts' | 'generate' | 'cards';

export default function DashboardPage() {
  const t = useTranslations();
  const cardT = useTranslations('AnkiCard');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const { data: session, status } = useSession();
  
  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabType>('tts');
  
  // TTS 相关状态
  const [ttsText, setTtsText] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState('');
  
  // 卡片生成相关状态
  const [cardText, setCardText] = useState('');
  const [cardType, setCardType] = useState('问答题（附翻转卡片）');
  const [deckName, setDeckName] = useState('default');
  const [includePronunciation, setIncludePronunciation] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [preview, setPreview] = useState<{
    frontContent: string;
    backContent: string;
    audioUrl?: string;
  } | null>(null);
  const [cardError, setCardError] = useState('');
  const [decks, setDecks] = useState<Array<{ id: string; name: string; cardCount?: number }>>([]);
  
  // 卡片列表相关状态
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // 通用状态
  const [credits, setCredits] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 获取牌组列表
  const fetchDecks = useCallback(async () => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/decks', { headers });
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

  // 获取卡片列表
  const fetchCards = useCallback(async () => {
    setCardsLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const params = new URLSearchParams();
      if (selectedDeck) {
        params.append('deck', selectedDeck);
      }
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      params.append('page', page.toString());
      params.append('limit', '50');

      const res = await fetch(`/api/cards?${params.toString()}`, { headers });
      const data = await res.json();
      
      if (data.cards) {
        setCards(data.cards);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        }
        if (data.cards.length > 0) {
          setSelectedCardId((prevId) => {
            const currentSelectedExists = prevId && data.cards.find((c: Card) => c.id === prevId);
            return currentSelectedExists ? prevId : data.cards[0].id;
          });
        } else {
          setSelectedCardId(null);
        }
      }
    } catch {
      setCardsError(cardT('fetchCardsFailed'));
    } finally {
      setCardsLoading(false);
    }
  }, [selectedDeck, page, debouncedSearchQuery, cardT]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    if (activeTab === 'cards') {
      fetchCards();
    }
  }, [activeTab, fetchCards]);

  const selectedCard = useMemo(() => {
    return cards.find(card => card.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // TTS 生成处理
  const handleTtsGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ttsText.trim()) {
      setTtsError('Please enter some text');
      return;
    }

    if (ttsText.length > 500) {
      setTtsError(t('tts.maxLength'));
      return;
    }

    setTtsLoading(true);
    setTtsError('');
    setAudioUrl(null);

    trackAudioGenerationStart(ttsText.length);
    trackButtonClick('GENERATE_AUDIO', 'dashboard');

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: ttsText }),
      });

      const data = await res.json();

      if (res.ok && data.audio) {
        try {
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          if (data.credits !== undefined) {
            setCredits(data.credits);
            trackAudioGenerationSuccess(ttsText.length, data.credits);
          }
        } catch (err) {
          console.error('Error processing audio:', err);
          setTtsError('Failed to process audio data');
        }
      } else {
        const errorMsg = data.error || 'Failed to generate audio';
        setTtsError(errorMsg);
        if (res.status === 402 && data.credits !== undefined) {
          setCredits(data.credits);
          trackInsufficientCredits(data.credits);
        } else {
          trackAudioGenerationFailed(errorMsg, data.credits);
        }
      }
    } catch {
      setTtsError('Network error');
    } finally {
      setTtsLoading(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      trackAudioDownload();
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `japanese-tts-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 卡片生成预览
  const handleGeneratePreview = async () => {
    if (!cardText.trim()) {
      setCardError('请输入日文句子');
      return;
    }

    setCardLoading(true);
    setCardError('');
    setPreview(null);

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const llmRes = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cardText }),
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

      if (includePronunciation) {
        const ttsRes = await fetch('/api/tts/generate-enhanced', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cardText,
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
        frontContent: cardText,
        backContent: llmData.analysis.html,
        audioUrl,
      });

      await fetchCredits();
    } catch (err) {
      console.error('Generate preview error:', err);
      setCardError(err instanceof Error ? err.message : '生成预览失败');
    } finally {
      setCardLoading(false);
    }
  };

  // 保存卡片
  const handleSaveCard = async () => {
    if (!preview) {
      setCardError('请先生成预览');
      return;
    }

    setCardLoading(true);
    setCardError('');

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cardText,
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
        setActiveTab('cards');
        await fetchCards();
        setCardText('');
        setPreview(null);
      } else {
        throw new Error('保存卡片失败');
      }
    } catch (err) {
      console.error('Save card error:', err);
      setCardError(err instanceof Error ? err.message : '保存卡片失败');
    } finally {
      setCardLoading(false);
    }
  };

  // 删除卡片
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm(cardT('confirmDeleteMessage', { frontContent: selectedCard?.frontContent || '' }))) {
      return;
    }

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        if (cardId === selectedCardId) {
          const currentIndex = cards.findIndex(c => c.id === cardId);
          if (currentIndex > 0) {
            setSelectedCardId(cards[currentIndex - 1].id);
          } else if (cards.length > 1) {
            setSelectedCardId(cards[1].id);
          } else {
            setSelectedCardId(null);
          }
        }
        await fetchCards();
      } else {
        throw new Error('删除失败');
      }
    } catch (err) {
      console.error('Delete card error:', err);
      alert(cardT('deleteCardFailed'));
    }
  };

  const fetchCredits = useCallback(async () => {
    const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
    const headers = getAnonymousHeaders();
    try {
      const res = await fetch('/api/user/credits', { headers });
      const data = await res.json();
      if (data.credits !== undefined) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  }, []);

  useEffect(() => {
    const initDashboard = async () => {
      await fetchCredits();
      if (status === 'authenticated' && session && typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('payment') === 'success') {
          setPaymentSuccess(true);
          window.history.replaceState({}, '', `/${locale}/dashboard`);
          setTimeout(() => setPaymentSuccess(false), 5000);
        }
        trackPageViewEvent('DASHBOARD', { locale });
      }
    };
    initDashboard();
  }, [status, locale, session, fetchCredits]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
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
              <LanguageSwitcher />
              {session?.user ? (
                <>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {session.user.email}
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
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('common.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Tab 导航栏 */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('tts')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'tts'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {t('dashboard.textToSpeech')}
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'generate'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {t('dashboard.generateCard')}
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'cards'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {t('dashboard.viewCards')}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
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

          {/* Tab 1: 文本转语音 */}
          {activeTab === 'tts' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                {t('tts.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('tts.description')}
              </p>

              <form onSubmit={handleTtsGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('tts.inputPlaceholder')}
                  </label>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    rows={6}
                    maxLength={500}
                    placeholder={t('tts.inputPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {ttsText.length}/500 {t('tts.maxLength')}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ttsLoading || !ttsText.trim()}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ttsLoading ? t('tts.generating') : t('tts.generate')}
                </button>
              </form>

              {ttsError && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {ttsError}
                  {ttsError.includes('Insufficient credits') && (
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
          )}

          {/* Tab 2: 生成新卡片 */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  生成 Anki 卡片
                </h2>
                
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
                      disabled={cardLoading}
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
                      disabled={cardLoading}
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
                      value={cardText}
                      onChange={(e) => setCardText(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={4}
                      placeholder="在此输入日文句子..."
                      disabled={cardLoading}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includePronunciation"
                      checked={includePronunciation}
                      onChange={(e) => setIncludePronunciation(e.target.checked)}
                      className="mr-2"
                      disabled={cardLoading}
                    />
                    <label htmlFor="includePronunciation" className="text-sm text-gray-700 dark:text-gray-300">
                      包含发音
                    </label>
                  </div>

                  {cardError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{cardError}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleGeneratePreview}
                      disabled={cardLoading || !cardText.trim()}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cardLoading ? '生成中...' : '生成预览'}
                    </button>
                    {preview && (
                      <button
                        onClick={handleSaveCard}
                        disabled={cardLoading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cardLoading ? '保存中...' : '保存卡片'}
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
          )}

          {/* Tab 3: 查看卡片列表 */}
          {activeTab === 'cards' && (
            <div className="flex gap-6 h-[calc(100vh-300px)]">
              {/* 左侧边栏 - 卡片列表 */}
              <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
                {/* 搜索和筛选区域 */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder={t('AnkiCard.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {t('AnkiCard.clearSearch')}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('AnkiCard.filterByDeck')}
                    </label>
                    <select
                      value={selectedDeck}
                      onChange={(e) => {
                        setSelectedDeck(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{t('AnkiCard.allDecks')}</option>
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.name}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {total > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('AnkiCard.totalCards', { total })}
                    </div>
                  )}
                </div>

                {/* 卡片列表 */}
                <div className="flex-1 overflow-y-auto">
                  {cardsError && (
                    <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{cardsError}</p>
                    </div>
                  )}
                  {cardsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : cards.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {debouncedSearchQuery ? t('AnkiCard.noSearchResults') : t('AnkiCard.noCardsYet')}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => setSelectedCardId(card.id)}
                          className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedCardId === card.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600'
                              : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
                              {card.frontContent}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {card.deckName}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(card.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {t('AnkiCard.previousPage')}
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('AnkiCard.pageInfo', { page, totalPages })}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {t('AnkiCard.nextPage')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧主内容区 - 卡片详情 */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
                {selectedCard ? (
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                            {selectedCard.deckName}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {selectedCard.cardType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(selectedCard.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCard(selectedCard.id)}
                        className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                      >
                        {t('AnkiCard.delete')}
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                          {t('AnkiCard.frontContent')}
                        </h3>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-xl text-gray-900 dark:text-white leading-relaxed">
                            {selectedCard.frontContent}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                          {t('AnkiCard.backContent')}
                        </h3>
                        <div
                          className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedCard.backContent }}
                        />
                      </div>

                      {selectedCard.audioUrl && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                            {t('AnkiCard.pronunciationPreview')}
                          </h3>
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <audio controls className="w-full">
                              <source src={selectedCard.audioUrl} type="audio/mpeg" />
                              {t('AnkiCard.audioNotSupported')}
                            </audio>
                          </div>
                        </div>
                      )}

                      {selectedCard.tags && selectedCard.tags.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                            标签
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedCard.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-12">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                        {t('AnkiCard.noCardSelected')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {t('AnkiCard.selectCard')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

