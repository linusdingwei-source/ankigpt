'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
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

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <WorkspacePageContent />
    </Suspense>
  );
}

function WorkspacePageContent() {
  const t = useTranslations();
  const workspaceT = useTranslations('workspace');
  const cardT = useTranslations('AnkiCard');
  const locale = useLocale();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
  // TTS 相关状态
  const [ttsText, setTtsText] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState('');
  
  // 当前工作区牌组（从URL参数或默认值）
  // 使用函数式初始化确保在组件挂载时立即读取URL参数
  const [currentWorkspaceDeck, setCurrentWorkspaceDeck] = useState<string>(() => {
    // 在客户端立即从 window.location 读取，确保初始渲染时就有值
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const deckParam = params.get('deck');
      if (deckParam) {
        return decodeURIComponent(deckParam);
      }
    }
    // 如果 window 不可用，尝试从 searchParams 读取（服务端渲染）
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      return decodeURIComponent(deckParam);
    }
    return 'default';
  });
  
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
  
  // 模态框状态
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showPasteTextModal, setShowPasteTextModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  
  // 来源相关状态
  const [sources, setSources] = useState<Array<{
    id: string;
    name: string;
    type: string;
    contentUrl: string | null;
    fileUrl: string | null;
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showSourceViewModal, setShowSourceViewModal] = useState(false);
  const [sourceContent, setSourceContent] = useState<string>('');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');
  const [showSourceMenuId, setShowSourceMenuId] = useState<string | null>(null);

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
      const response = await res.json();
      // 适配新的统一响应格式
      const data = response.success ? response.data : response;
      if (data?.decks) {
        setDecks(data.decks);
        if (data.decks.length > 0 && !deckName) {
          setDeckName(data.decks[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch decks:', err);
    }
  }, [deckName]);

  // 获取来源列表
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/sources', { headers });
      const response = await res.json();
      const data = response.success ? response.data : response;
      if (data?.sources) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

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
      const response = await res.json();
      
      // 适配新的统一响应格式
      const data = response.success ? response.data : response;
      
      if (data?.cards) {
        setCards(data.cards);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        }
        // 不自动选择第一张卡片，让用户手动点击
        // 只有当之前选中的卡片仍然存在时才保持选中状态
        if (data.cards.length > 0) {
          setSelectedCardId((prevId) => {
            const currentSelectedExists = prevId && data.cards.find((c: Card) => c.id === prevId);
            return currentSelectedExists ? prevId : null;
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

  // 检查 URL 参数中的 deck（同步更新状态）
  useEffect(() => {
    // 优先从 window.location 读取（客户端），确保能获取到最新的URL参数
    let deckParam: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      deckParam = params.get('deck');
    }
    // 如果 window.location 没有，尝试从 searchParams 读取
    if (!deckParam) {
      deckParam = searchParams.get('deck');
    }
    
    if (deckParam && currentWorkspaceDeck === 'default') {
      // 只有在当前还是默认值时才更新，避免覆盖用户手动设置的值
      const decodedDeckName = decodeURIComponent(deckParam);
      setCurrentWorkspaceDeck(decodedDeckName);
      setDeckName(decodedDeckName);
      setSelectedDeck(decodedDeckName);
    } else if (deckParam) {
      // 如果已经有值，也更新一下确保同步
      const decodedDeckName = decodeURIComponent(deckParam);
      if (decodedDeckName !== currentWorkspaceDeck) {
        setCurrentWorkspaceDeck(decodedDeckName);
        setDeckName(decodedDeckName);
        setSelectedDeck(decodedDeckName);
      }
    }
  }, [searchParams, currentWorkspaceDeck]);
  
  // 清除 URL 参数（延迟执行，确保状态已更新且已渲染）
  useEffect(() => {
    if (currentWorkspaceDeck !== 'default' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('deck')) {
        // 延迟清除，确保组件已经渲染完成
        const timer = setTimeout(() => {
          window.history.replaceState({}, '', window.location.pathname);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentWorkspaceDeck]);

  // 初始化时获取来源列表
  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // 点击外部区域关闭来源菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSourceMenuId && !target.closest('.source-menu-container')) {
        setShowSourceMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSourceMenuId]);
  
  // 当牌组列表加载后，如果没有从URL参数获取到牌组，使用第一个牌组或默认值
  useEffect(() => {
    if (decks.length > 0 && currentWorkspaceDeck === 'default' && !searchParams.get('deck')) {
      setCurrentWorkspaceDeck(decks[0].name);
      setDeckName(decks[0].name);
      setSelectedDeck(decks[0].name);
    }
  }, [decks, currentWorkspaceDeck, searchParams]);
  
  // 确保卡片列表始终显示当前工作区牌组的卡片
  useEffect(() => {
    if (currentWorkspaceDeck !== 'default') {
      setSelectedDeck(currentWorkspaceDeck);
    }
  }, [currentWorkspaceDeck]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
      fetchCards();
  }, [fetchCards]);

  const selectedCard = useMemo(() => {
    return cards.find(card => card.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // 自动为卡片生成音频
  const generateCardAudio = useCallback(async (card: Card) => {
    if (!card.frontContent.trim()) {
      return;
    }

    // 如果已经有音频，跳过
    if (card.audioUrl) {
      return;
    }

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: card.frontContent }),
      });

      const response = await res.json();
      const data = response.success ? response.data : response;

      if (res.ok && data?.audio) {
        // 音频生成成功，更新卡片列表（刷新以获取最新数据）
        trackAudioGenerationSuccess(card.frontContent.length);
      }
    } catch (error) {
      console.error('Failed to generate audio for card:', error);
      trackAudioGenerationFailed();
    }
  }, []);

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

      const response = await res.json();
      // 适配新的统一响应格式
      const data = response.success ? response.data : response;
      const errorData = response.success ? null : response.error;

      if (res.ok && data?.audio) {
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
        const errorMsg = errorData?.message || data?.error || 'Failed to generate audio';
        setTtsError(errorMsg);
        if (res.status === 402 && data?.credits !== undefined) {
          setCredits(data.credits);
          trackInsufficientCredits(data.credits);
        } else {
          trackAudioGenerationFailed(errorMsg, data?.credits);
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

      const llmResponse = await llmRes.json();
      // 适配新的统一响应格式
      const llmData = llmResponse.success ? llmResponse.data : llmResponse;
      const llmError = llmResponse.success ? null : llmResponse.error;

      if (!llmRes.ok) {
        throw new Error(llmError?.message || 'LLM 分析失败');
      }

      if (!llmResponse.success) {
        throw new Error(llmError?.message || 'LLM 分析失败');
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
          const ttsResponse = await ttsRes.json();
          // 适配新的统一响应格式
          const ttsData = ttsResponse.success ? ttsResponse.data : ttsResponse;
          if (ttsResponse.success && ttsData?.audio?.url) {
            audioUrl = ttsData.audio.url;
          }
        }
      }

      setPreview({
        frontContent: cardText,
        backContent: llmData?.analysis?.html || llmData?.html || '',
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
          deckName: currentWorkspaceDeck.trim() || deckName.trim() || 'default',
          includePronunciation,
        }),
      });

      const response = await res.json();
      
      if (!res.ok) {
        // 适配新的统一响应格式
        const errorData = response.success ? null : response.error;
        throw new Error(errorData?.message || '保存卡片失败');
      }

      // 适配新的统一响应格式
      if (response.success) {
        await fetchCards();
        setCardText('');
        setPreview(null);
      } else {
        throw new Error(response.error?.message || '保存卡片失败');
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
      const response = await res.json();
      // 适配新的统一响应格式
      const data = response.success ? response.data : response;
      if (data?.credits !== undefined) {
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
          window.history.replaceState({}, '', '/workspace');
          setTimeout(() => setPaymentSuccess(false), 5000);
        }
        trackPageViewEvent('WORKSPACE', { locale });
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                {/* 应用图标 - 参考 NotebookLM 的圆角方形设计 */}
                <div className="w-9 h-9 rounded-[8px] bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {/* 牌组名称 */}
                <h1 className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                  {(() => {
                    // 在渲染时也检查URL参数，确保能获取到最新值
                    if (typeof window !== 'undefined') {
                      const params = new URLSearchParams(window.location.search);
                      const deckParam = params.get('deck');
                      if (deckParam) {
                        return decodeURIComponent(deckParam);
                      }
                    }
                    // 如果URL参数没有，使用状态值
                    return currentWorkspaceDeck && currentWorkspaceDeck !== 'default' 
                      ? currentWorkspaceDeck 
                      : t('common.appName');
                  })()}
              </h1>
            </Link>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {session?.user ? (
                <UserMenu credits={credits} />
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

      {/* 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板：来源（Sources） */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          {/* 面板标题 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {workspaceT('source')}
            </h2>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
          </div>

          {/* 添加来源按钮 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
              onClick={() => setShowAddSourceModal(true)}
              className="w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {workspaceT('addSource')}
              </button>
          </div>

          {/* Deep Research 提示 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">
                  {workspaceT('tryDeepResearch')}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {workspaceT('deepResearchDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* 搜索新来源 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={workspaceT('searchNewSources')}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                {workspaceT('web')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-1">
                {workspaceT('fastResearch')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 已保存的来源列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {sourcesLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-xs mt-2">加载中...</p>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium mb-1">{workspaceT('savedSources')}</p>
                <p className="text-xs">{workspaceT('addSourceHint')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                  {workspaceT('savedSources')} ({sources.length})
                </p>
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="group relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
                  >
                    {editingSourceId === source.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingSourceName}
                          onChange={(e) => setEditingSourceName(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              // 保存重命名
                              try {
                                const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                                const headers = getAnonymousHeaders();
                                const res = await fetch(`/api/sources/${source.id}`, {
                                  method: 'PATCH',
                                  headers: { ...headers, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: editingSourceName }),
                                });
                                if (res.ok) {
                                  await fetchSources();
                                  setEditingSourceId(null);
                                  setEditingSourceName('');
                                }
                              } catch (error) {
                                console.error('Failed to rename source:', error);
                              }
                            } else if (e.key === 'Escape') {
                              setEditingSourceId(null);
                              setEditingSourceName('');
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-indigo-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            try {
                              const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                              const headers = getAnonymousHeaders();
                              const res = await fetch(`/api/sources/${source.id}`, {
                                method: 'PATCH',
                                headers: { ...headers, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: editingSourceName }),
                              });
                              if (res.ok) {
                                await fetchSources();
                                setEditingSourceId(null);
                                setEditingSourceName('');
                              }
                            } catch (error) {
                              console.error('Failed to rename source:', error);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingSourceId(null);
                            setEditingSourceName('');
                          }}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {source.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(source.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div className="relative source-menu-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSourceMenuId(showSourceMenuId === source.id ? null : source.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {showSourceMenuId === source.id && (
                              <div className="absolute right-0 top-8 z-10 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                                <button
                                  onClick={async () => {
                                    try {
                                      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                                      const headers = getAnonymousHeaders();
                                      const res = await fetch(`/api/sources/${source.id}`, { headers });
                                      const response = await res.json();
                                      if (res.ok && response.success) {
                                        setSourceContent(response.data.source.content || '');
                                        setSelectedSourceId(source.id);
                                        setShowSourceViewModal(true);
                                        setShowSourceMenuId(null);
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch source content:', error);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  查看
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSourceId(source.id);
                                    setEditingSourceName(source.name);
                                    setShowSourceMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  重命名
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('确定要删除这个来源吗？')) {
                                      try {
                                        const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                                        const headers = getAnonymousHeaders();
                                        const res = await fetch(`/api/sources/${source.id}`, {
                                          method: 'DELETE',
                                          headers,
                                        });
                                        if (res.ok) {
                                          await fetchSources();
                                          setShowSourceMenuId(null);
                                        }
                                      } catch (error) {
                                        console.error('Failed to delete source:', error);
                                      }
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 中间面板：对话（Chat） */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* 面板标题 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {workspaceT('chat')}
            </h2>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
          {paymentSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded text-sm">
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

            {/* 空状态或内容 */}
            {!preview && !cardText && !ttsText && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {workspaceT('addSourceToStart')}
                </p>
                <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  {workspaceT('uploadSource')}
                </button>
              </div>
            )}

            {/* 卡片生成表单 */}
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {cardT('japaneseTextInput')}
                  </label>
                  <textarea
                  value={cardText}
                  onChange={(e) => setCardText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={4}
                  placeholder={cardT('japaneseTextPlaceholder')}
                  disabled={cardLoading}
                  />
                </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {cardT('selectDeck')}
                    </label>
                    <input
                      type="text"
                    value={currentWorkspaceDeck}
                    onChange={(e) => {
                      setCurrentWorkspaceDeck(e.target.value);
                      setDeckName(e.target.value);
                    }}
                      list="deckOptions"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="输入牌组名称..."
                      disabled={cardLoading}
                    />
                    <datalist id="deckOptions">
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.name} />
                      ))}
                    </datalist>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    当前工作区牌组：{currentWorkspaceDeck}
                  </p>
                  </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    卡片类型
                    </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={cardLoading}
                  >
                    <option value="问答题（附翻转卡片）">问答题（附翻转卡片）</option>
                    <option value="Basic-b860c">Basic-b860c</option>
                  </select>
                </div>
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
                  {cardT('includePronunciation')}
                    </label>
                  </div>

                  {cardError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {cardError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleGeneratePreview}
                      disabled={cardLoading || !cardText.trim()}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                  {cardLoading ? t('common.loading') : cardT('generatePreviewButton')}
                    </button>
                    {preview && (
                      <button
                        onClick={handleSaveCard}
                        disabled={cardLoading}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                    {cardLoading ? t('common.loading') : cardT('saveCardButton')}
                      </button>
                    )}
                  </div>

              {/* TTS 功能 */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('tts.title')}
                </h3>
                <form onSubmit={handleTtsGenerate} className="space-y-2">
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={t('tts.inputPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {ttsText.length}/500
                </div>
                <button
                  type="submit"
                  disabled={ttsLoading || !ttsText.trim()}
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ttsLoading ? t('tts.generating') : t('tts.generate')}
                </button>
              </div>
              </form>

              {ttsError && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs">
                  {ttsError}
                </div>
              )}

              {audioUrl && (
                <div className="mt-3 space-y-2">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <audio controls className="w-full" src={audioUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  <button
                    onClick={handleDownload}
                      className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('tts.download')}
                  </button>
                </div>
              )}
            </div>

              {/* 预览 */}
              {preview && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                    {cardT('cardPreview')}
                  </h3>
            <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {cardT('frontContent')}
                      </h4>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                        <p className="text-sm">{preview.frontContent}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {cardT('backContent')}
                      </h4>
                      <div 
                        className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 prose dark:prose-invert max-w-none prose-sm"
                        dangerouslySetInnerHTML={{ __html: preview.backContent }}
                      />
                    </div>
                    {preview.audioUrl && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {cardT('pronunciationPreview')}
                        </h4>
                        <audio controls className="w-full">
                          <source src={preview.audioUrl} type="audio/mpeg" />
                          {cardT('audioNotSupported')}
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部状态栏 */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{workspaceT('addSourceToStart')}</span>
            <span>{workspaceT('sourcesCount', { count: decks.length })}</span>
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 右侧面板：Studio */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col">
          {/* 面板标题 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {workspaceT('studio')}
                </h2>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Studio 输出选项网格 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {/* 音频概览 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('audioOverview')}
                </p>
              </button>

              {/* 视频概览 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('videoOverview')}
                </p>
              </button>

              {/* 思维导图 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('mindMap')}
                </p>
              </button>

              {/* 报告 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('report')}
                </p>
              </button>

              {/* 闪卡 - 高亮显示 */}
              <button
                onClick={async () => {
                  // 为所有没有音频的卡片自动生成音频
                  const cardsWithoutAudio = cards.filter(card => !card.audioUrl);
                  if (cardsWithoutAudio.length === 0) {
                    return;
                  }
                  
                  // 批量生成音频（限制并发数）
                  const batchSize = 3;
                  for (let i = 0; i < cardsWithoutAudio.length; i += batchSize) {
                    const batch = cardsWithoutAudio.slice(i, i + batchSize);
                    await Promise.all(batch.map(card => generateCardAudio(card)));
                    // 每批之间稍作延迟，避免过载
                    if (i + batchSize < cardsWithoutAudio.length) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                  }
                  
                  // 延迟刷新卡片列表，确保音频已保存
                  setTimeout(() => {
                    fetchCards();
                  }, 2000);
                }}
                className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border-2 border-indigo-500 dark:border-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-300 transition-colors text-left col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                      {workspaceT('generateAIFlashcards')}
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      {workspaceT('flashcards')}
                    </p>
                  </div>
                </div>
              </button>

              {/* 测验 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('quiz')}
                </p>
              </button>

              {/* 信息图 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('infographic')}
                </p>
              </button>

              {/* 演示文稿 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('presentation')}
                </p>
              </button>

              {/* 数据表格 */}
              <button className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left">
                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {workspaceT('dataTable')}
                </p>
              </button>
            </div>

            {/* Studio 输出说明 */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                  <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                    {workspaceT('studioOutputs')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {workspaceT('studioOutputsHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* 添加笔记按钮 */}
            <button className="mt-4 w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {workspaceT('addNote')}
            </button>
          </div>

          {/* 卡片列表（在 Studio 面板底部） */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex flex-col" style={{ maxHeight: '40%' }}>
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                  {cardT('myCardsTitle')}
                </h3>
                {total > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {total}
                  </span>
                )}
              </div>
                    <input
                      type="text"
                placeholder={cardT('searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
              />
              {decks.length > 0 && (
                    <select
                      value={selectedDeck}
                      onChange={(e) => {
                        setSelectedDeck(e.target.value);
                        setPage(1);
                      }}
                  className="w-full mt-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    >
                  <option value="">{cardT('allDecks')}</option>
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.name}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 卡片列表 */}
                <div className="flex-1 overflow-y-auto">
                  {cardsError && (
                    <div className="p-2 m-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                      <p className="text-xs text-red-600 dark:text-red-400">{cardsError}</p>
                    </div>
                  )}
                  {cardsLoading ? (
                    <div className="flex justify-center items-center h-24">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : cards.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  {debouncedSearchQuery ? cardT('noSearchResults') : cardT('noCardsYet')}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cards.map((card) => (
                        <button
                          key={card.id}
                          onClick={async () => {
                            setSelectedCardId(card.id);
                            // 如果卡片没有音频，自动生成
                            if (!card.audioUrl) {
                              await generateCardAudio(card);
                            }
                          }}
                          className={`w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedCardId === card.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-600'
                              : ''
                          }`}
                        >
                      <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                              {card.frontContent}
                            </p>
                      <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {card.deckName}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(card.createdAt).toLocaleDateString(locale)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                      {cardT('previousPage')}
                        </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {cardT('pageInfo', { page, totalPages })}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                      {cardT('nextPage')}
                        </button>
                      </div>
                    </div>
                  )}
            </div>
                  </div>
                </div>
              </div>

      {/* 添加来源模态框 */}
      {showAddSourceModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 标题栏 */}
              <div className="flex justify-between items-center mb-6">
                      <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {workspaceT('generateAudioVideoOverview')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {workspaceT('yourDocument')}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSourceModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 搜索栏 */}
              <div className="mb-6">
                <div className="relative mb-2">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={workspaceT('searchNewSources')}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {workspaceT('web')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-2">
                    {workspaceT('fastResearch')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 拖拽上传区域 */}
              <div className="mb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {workspaceT('orDragFilesHere')}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {workspaceT('uploadFile')}
                </button>
                <button className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {workspaceT('website')}
                </button>
                <button className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {workspaceT('cloudDrive')}
                </button>
                <button 
                  onClick={() => {
                    setShowAddSourceModal(false);
                    setShowPasteTextModal(true);
                  }}
                  className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {workspaceT('copiedText')}
                </button>
              </div>

              {/* 底部状态栏 */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{workspaceT('addSourceToStart')}</span>
                <span>{workspaceT('sourcesCount', { count: 0 })}</span>
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 粘贴文本模态框（对应原来的TTS文本输入） */}
      {showPasteTextModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 标题栏 */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {workspaceT('pasteCopiedText')}
                </h2>
                <button
                  onClick={() => {
                    setShowPasteTextModal(false);
                    setPastedText('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 说明文字 */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {workspaceT('pasteTextInstruction')}
              </p>

              {/* 文本输入框 */}
              <div className="mb-4">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={workspaceT('pasteTextHere')}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={12}
                />
              </div>

              {/* 插入按钮 */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowPasteTextModal(false);
                    setPastedText('');
                  }}
                  className="px-6 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    if (!pastedText.trim()) {
                      return;
                    }
                    
                    try {
                      // 上传并保存为来源
                      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                      const headers = getAnonymousHeaders();
                      
                      // 生成默认名称
                      const defaultName = `粘贴的文字 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
                      
                      const res = await fetch('/api/sources', {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: defaultName,
                          content: pastedText,
                          type: 'text',
                        }),
                      });
                      
                      const response = await res.json();
                      
                      if (res.ok && response.success) {
                        // 成功保存，刷新来源列表
                        await fetchSources();
                        // 将粘贴的文本设置为TTS文本
                        setTtsText(pastedText);
                        setShowPasteTextModal(false);
                        setPastedText('');
                      } else {
                        console.error('Failed to save source:', response.error);
                        alert(response.error?.message || '保存来源失败');
                      }
                    } catch (error) {
                      console.error('Error saving source:', error);
                      alert('保存来源时出错');
                    }
                  }}
                  disabled={!pastedText.trim()}
                  className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {workspaceT('insert')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 查看来源内容模态框 */}
      {showSourceViewModal && selectedSourceId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {sources.find(s => s.id === selectedSourceId)?.name || '来源内容'}
                </h2>
                <button
                  onClick={() => {
                    setShowSourceViewModal(false);
                    setSelectedSourceId(null);
                    setSourceContent('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 font-mono">
                  {sourceContent}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 卡片详情模态框（当选中卡片时显示在中间面板） */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                            {selectedCard.deckName}
                          </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {selectedCard.cardType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(selectedCard.createdAt).toLocaleString(locale)}
                        </p>
                      </div>
                      <button
                  onClick={() => setSelectedCardId(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                      </button>
                    </div>

              <div className="space-y-4">
                      <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {cardT('frontContent')}
                        </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-base text-gray-900 dark:text-white leading-relaxed">
                            {selectedCard.frontContent}
                          </p>
                        </div>
                      </div>

                      <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {cardT('backContent')}
                        </h3>
                        <div
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 prose dark:prose-invert max-w-none prose-sm"
                          dangerouslySetInnerHTML={{ __html: selectedCard.backContent }}
                        />
                      </div>

                      {selectedCard.audioUrl && (
                        <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {cardT('pronunciationPreview')}
                          </h3>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <audio controls className="w-full">
                              <source src={selectedCard.audioUrl} type="audio/mpeg" />
                        {cardT('audioNotSupported')}
                            </audio>
                          </div>
                        </div>
                      )}

                      {selectedCard.tags && selectedCard.tags.length > 0 && (
                        <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            标签
                          </h3>
                    <div className="flex flex-wrap gap-2">
                            {selectedCard.tags.map((tag, index) => (
                              <span
                                key={index}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setSelectedCardId(null)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteCard(selectedCard.id)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {cardT('delete')}
                  </button>
                    </div>
                  </div>
                    </div>
              </div>
            </div>
          )}
    </div>
  );
}

