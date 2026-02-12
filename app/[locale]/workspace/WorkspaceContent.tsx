'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  trackPageViewEvent,
  trackAudioGenerationSuccess,
  trackAudioGenerationFailed,
} from '@/lib/analytics';
import { WorkspaceView } from './WorkspaceView';

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

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'chat' | 'analysis' | 'flashcards';
  data?: {
    markdown?: string;
    html?: string;
    kanaText?: string;
    successCount?: number;
    failCount?: number;
    cards?: Array<{ id: string; frontContent: string }>;
  };
  timestamp: number;
};

export function WorkspacePageContent() {
  const t = useTranslations();
  const workspaceT = useTranslations('workspace');
  const cardT = useTranslations('AnkiCard');
  const locale = useLocale();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
  // 当前工作区牌组（从URL参数或默认值）
  const [currentWorkspaceDeck, setCurrentWorkspaceDeck] = useState<string>('default');

  useEffect(() => {
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      setCurrentWorkspaceDeck(decodeURIComponent(deckParam));
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlDeck = params.get('deck');
      if (urlDeck) {
        setCurrentWorkspaceDeck(decodeURIComponent(urlDeck));
      }
    }
  }, [searchParams]);

  // 卡片生成相关状态
  const [cardText, setCardText] = useState('');
  // 卡片类型固定为"问答题（附翻转卡片）"
  const cardType = '问答题（附翻转卡片）';
  const [includePronunciation, setIncludePronunciation] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [preview, setPreview] = useState<{
    frontContent: string;
    backContent: string;
    audioUrl?: string;
  } | null>(null);
  const [cardError, setCardError] = useState('');
  
  // 卡片列表相关状态
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCardMenuId, setShowCardMenuId] = useState<string | null>(null);
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
  // Upload progress for chunked PDF uploads
  const [uploadProgress, setUploadProgress] = useState<{
    phase: 'splitting' | 'uploading' | null;
    current: number;
    total: number;
    fileName?: string;
  }>({ phase: null, current: 0, total: 0 });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [showSourceViewModal, setShowSourceViewModal] = useState(false);
  const [sourceContent, setSourceContent] = useState<string>('');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');
  const [showSourceMenuId, setShowSourceMenuId] = useState<string | null>(null);
  
  // 面板收起/展开状态
  const [isSourcePanelCollapsed, setIsSourcePanelCollapsed] = useState(false);
  const [isStudioPanelCollapsed, setIsStudioPanelCollapsed] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<'CARD' | 'NOTE'>('CARD');

  const [sourcePanelWidth, setSourcePanelWidth] = useState(320);
  const [studioPanelWidth, setStudioPanelWidth] = useState(360);
  const [isResizingSource, setIsResizingSource] = useState(false);
  const [isResizingStudio, setIsResizingStudio] = useState(false);

  // Chat 相关状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, timestamp: Date.now() }].slice(-50));
  }, []);

  // Resize Handlers
  const startResizingSource = useCallback(() => setIsResizingSource(true), []);
  const startResizingStudio = useCallback(() => setIsResizingStudio(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingSource(false);
    setIsResizingStudio(false);
  }, []);

  // Auto-collapse threshold and max width calculation
  const COLLAPSE_THRESHOLD = 150; // Below this width, auto-collapse
  const MIN_PANEL_WIDTH = 200; // Minimum visible width when not collapsed
  const getMaxPanelWidth = () => {
    if (workspaceLayoutRef.current) {
      // Max is 50% of container, minus some space for the chat panel
      return Math.min(workspaceLayoutRef.current.offsetWidth * 0.45, 800);
    }
    return 600;
  };

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizingSource) {
        let newWidth = mouseMoveEvent.clientX;
        if (workspaceLayoutRef.current) {
          const rect = workspaceLayoutRef.current.getBoundingClientRect();
          newWidth = mouseMoveEvent.clientX - rect.left;
        }
        
        // Auto-collapse if dragged below threshold
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsSourcePanelCollapsed(true);
          setIsResizingSource(false);
          return;
        }
        
        const maxWidth = getMaxPanelWidth();
        if (newWidth >= MIN_PANEL_WIDTH && newWidth <= maxWidth) {
          setSourcePanelWidth(newWidth);
        } else if (newWidth > maxWidth) {
          setSourcePanelWidth(maxWidth);
        } else if (newWidth >= COLLAPSE_THRESHOLD && newWidth < MIN_PANEL_WIDTH) {
          setSourcePanelWidth(MIN_PANEL_WIDTH);
        }
      }
      if (isResizingStudio) {
        let newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (workspaceLayoutRef.current) {
          const rect = workspaceLayoutRef.current.getBoundingClientRect();
          newWidth = rect.right - mouseMoveEvent.clientX;
        }
        
        // Auto-collapse if dragged below threshold
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsStudioPanelCollapsed(true);
          setIsResizingStudio(false);
          return;
        }
        
        const maxWidth = getMaxPanelWidth();
        if (newWidth >= MIN_PANEL_WIDTH && newWidth <= maxWidth) {
          setStudioPanelWidth(newWidth);
        } else if (newWidth > maxWidth) {
          setStudioPanelWidth(maxWidth);
        } else if (newWidth >= COLLAPSE_THRESHOLD && newWidth < MIN_PANEL_WIDTH) {
          setStudioPanelWidth(MIN_PANEL_WIDTH);
        }
      }
    },
    [isResizingSource, isResizingStudio]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const workspaceLayoutRef = useRef<HTMLDivElement>(null);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);


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
      // 工作区只显示当前工作区牌组的卡片
      if (currentWorkspaceDeck && currentWorkspaceDeck !== 'default') {
        params.append('deck', currentWorkspaceDeck);
      }
      if (selectedSourceId) {
        params.append('sourceId', selectedSourceId);
      }
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      params.append('page', page.toString());
      params.append('limit', '50');
      params.append('category', activeStudioTab);

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
  }, [currentWorkspaceDeck, selectedSourceId, activeStudioTab, page, debouncedSearchQuery, cardT]);

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
    } else if (deckParam) {
      // 如果已经有值，也更新一下确保同步
      const decodedDeckName = decodeURIComponent(deckParam);
      if (decodedDeckName !== currentWorkspaceDeck) {
        setCurrentWorkspaceDeck(decodedDeckName);
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

  // 点击外部区域关闭卡片菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCardMenuId && !target.closest('.card-menu-container')) {
        setShowCardMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCardMenuId]);

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
        const creditsRemaining = data.credits !== undefined ? data.credits : (credits ?? 0);
        trackAudioGenerationSuccess(card.frontContent.length, creditsRemaining);
          if (data.credits !== undefined) {
            setCredits(data.credits);
        }
      }
    } catch (error) {
      console.error('Failed to generate audio for card:', error);
      trackAudioGenerationFailed('network_error', credits ?? undefined);
    }
  }, [credits]);


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
          deckName: currentWorkspaceDeck.trim() || 'default',
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

  // 批量从来源生成卡片
  const handleGenerateCardsFromSource = async () => {
    if (!selectedSourceId) {
      alert('请先选择一个来源');
      return;
    }

    setCardLoading(true);
    setCardError('');

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();

      // 获取选中来源的最新内容
      const res = await fetch(`/api/sources/${selectedSourceId}`, { headers });
      const response = await res.json();
      
      if (!res.ok || !response.success || !response.data?.source) {
        throw new Error('未能获取到来源内容');
      }

      const source = response.data.source;
      let content = source.content;
      let targetItems: Array<{ text: string; type: 'SENTENCE' | 'WORD' }> = [];

      // 步骤 1: 如果是图片，先进行 OCR / 文档解析
      if (source.type === 'image' && (source.contentUrl || source.fileUrl)) {
        const imageUrl = source.contentUrl || source.fileUrl;
        
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: '检测到图片来源，正在使用 Qwen3-VL 进行文档解析...',
          type: 'chat',
        });

        const parseRes = await fetch('/api/llm/parse-image', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        const parseData = await parseRes.json();
        if (parseRes.ok && parseData.success) {
          content = parseData.data.content;
          
          // 在对话框中展示解析出的 Markdown 内容
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: content || '',
            type: 'analysis',
          });

          // 更新视图内容
          if (viewingSourceId === selectedSourceId) {
            setSourceContent(content || '');
          }
        } else {
          throw new Error(parseData.error?.message || '图片解析失败');
        }
      }

      // 步骤 2: 文本提炼与知识点例句生成 (针对文档类内容)
      if (content && content.length > 50) {
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: '正在提炼文档中的核心单词和练习句子...',
          type: 'chat',
        });

        const refineRes = await fetch('/api/llm/refine-content', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: content }),
        });

        const refineData = await refineRes.json();
        if (refineRes.ok && refineData.success) {
          const { vocabulary = [], sentences = [] } = refineData.data;
          
          targetItems = [
            ...vocabulary.map((v: string) => ({ text: v, type: 'WORD' as const })),
            ...sentences.map((s: string) => ({ text: s, type: 'SENTENCE' as const }))
          ];
          
          // 在对话框中展示提炼结果
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `提炼结果：\n\n**核心单词：**\n${vocabulary.map((v: string) => `- ${v}`).join('\n')}\n\n**练习句子：**\n${sentences.map((s: string) => `- ${s}`).join('\n')}`,
            type: 'chat',
          });
        } else {
          console.warn('Refinement failed, falling back to direct split');
        }
      }

      // 步骤 3: 确定最终要生成卡片的列表
      if (targetItems.length === 0) {
        const { splitJapaneseSentences } = await import('@/lib/llm-utils');
        const sentences = splitJapaneseSentences(content || '');
        targetItems = sentences.map(s => ({ text: s, type: 'SENTENCE' as const }));
      }

      if (targetItems.length === 0) {
        alert('未能从来源中识别出有效的日文内容');
        setCardLoading(false);
        return;
      }

      if (!confirm(`识别出 ${targetItems.filter(i => i.type === 'WORD').length} 个单词和 ${targetItems.filter(i => i.type === 'SENTENCE').length} 个句子，是否开始批量生成卡片？`)) {
        setCardLoading(false);
        return;
      }

      // 在对话框中添加一个提示消息
      const statusMessageId = Date.now().toString();
      addMessage({
        id: statusMessageId,
        role: 'assistant',
        content: `正在生成 ${targetItems.length} 张卡片...`,
        type: 'chat',
      });

      let successCount = 0;
      let failCount = 0;
      const generatedCards: Card[] = [];

      for (let i = 0; i < targetItems.length; i++) {
        const item = targetItems[i];
        
        try {
          const genRes = await fetch('/api/cards/generate', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: item.text,
              cardType: item.type === 'WORD' ? '单词' : '问答题（附翻转卡片）',
              deckName: currentWorkspaceDeck.trim() || 'default',
              sourceId: selectedSourceId,
              includePronunciation: true,
            }),
          });

          const genResponse = await genRes.json();
          if (genRes.ok && genResponse.success) {
            successCount++;
            generatedCards.push(genResponse.data.card);
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`第 ${i + 1} 个项目生成失败:`, err);
          failCount++;
        }
      }

      await fetchCards();
      await fetchCredits();
      
      // 更新对话框中的消息，显示结果
      setMessages(prev => {
        const newMessages = prev.filter(m => m.id !== statusMessageId);
        const resultMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `批量生成完成！\n成功: ${successCount}\n失败: ${failCount}`,
          type: 'flashcards',
          data: { successCount, failCount, cards: generatedCards },
          timestamp: Date.now(),
        };
        return [...newMessages, resultMsg].slice(-50);
      });
      
    } catch (err) {
      console.error('Batch generation error:', err);
      // alert(err instanceof Error ? err.message : '批量生成失败');
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `操作失败: ${err instanceof Error ? err.message : '未知错误'}`,
        type: 'chat',
      });
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

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAudio = () => {
    audioInputRef.current?.click();
  };

  // Helper: upload a single file to /api/sources
  const uploadSingleFile = async (
    file: File,
    headers: Record<string, string>
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/sources', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.status === 413) {
      throw new Error(`File "${file.name}" is too large. Please upload a file smaller than 50MB.`);
    }

    if (!res.ok) {
      const text = await res.text();
      let errorMsg = 'Upload failed';
      try {
        const json = JSON.parse(text);
        errorMsg = json.error?.message || errorMsg;
      } catch {
        errorMsg = text || `Upload failed (status ${res.status})`;
      }
      throw new Error(errorMsg);
    }

    const response = await res.json();
    if (!response.success) {
      throw new Error(response.error?.message || 'Upload failed');
    }
    return response;
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    setSourcesLoading(true);
    setUploadProgress({ phase: null, current: 0, total: 0 });
    
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders() as Record<string, string>;
      if (headers['Content-Type']) {
        delete headers['Content-Type'];
      }

      // Check if this is a large PDF that needs splitting
      const { needsPdfSplit, splitPdfFile } = await import('@/lib/client/pdf-split');
      if (needsPdfSplit(file)) {
        // Show splitting phase
        setUploadProgress({ phase: 'splitting', current: 0, total: 0, fileName: file.name });
        
        const chunks = await splitPdfFile(file);
        
        // Show uploading phase with progress
        setUploadProgress({ phase: 'uploading', current: 0, total: chunks.length, fileName: file.name });
        
        for (let i = 0; i < chunks.length; i++) {
          await uploadSingleFile(chunks[i].file, headers);
          setUploadProgress({ phase: 'uploading', current: i + 1, total: chunks.length, fileName: file.name });
          console.log(`Uploaded part ${i + 1}/${chunks.length}: ${chunks[i].file.name}`);
        }
      } else {
        setUploadProgress({ phase: 'uploading', current: 0, total: 1, fileName: file.name });
        await uploadSingleFile(file, headers);
        setUploadProgress({ phase: 'uploading', current: 1, total: 1, fileName: file.name });
      }

      await fetchSources();
      setShowAddSourceModal(false);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSourcesLoading(false);
      setUploadProgress({ phase: null, current: 0, total: 0 });
    }
  };

  const handlePasteImage = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], `pasted_image_${Date.now()}.png`, { type });
            
            setSourcesLoading(true);
            const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
            const headers = getAnonymousHeaders() as Record<string, string>;
            // 当发送 FormData 时，不需要手动设置 Content-Type
            if (headers['Content-Type']) {
              delete headers['Content-Type'];
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/sources', {
              method: 'POST',
              headers,
              body: formData,
            });

            if (res.status === 413) {
              throw new Error('File is too large. Please upload a file smaller than 50MB.');
            }

            if (!res.ok) {
              const text = await res.text();
              let errorMsg = 'Upload failed';
              try {
                const json = JSON.parse(text);
                errorMsg = json.error?.message || errorMsg;
              } catch {
                errorMsg = text || `Upload failed (status ${res.status})`;
              }
              throw new Error(errorMsg);
            }

            const response = await res.json();
            if (response.success) {
              await fetchSources();
              setShowAddSourceModal(false);
              return;
            } else {
              throw new Error(response.error?.message || 'Upload failed');
            }
          }
        }
      }
      alert('No image found in clipboard');
    } catch (err) {
      console.error('Paste image error:', err);
      alert('Failed to paste image: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSourcesLoading(false);
    }
  };

  const handleInsertPastedText = async () => {
    if (!pastedText.trim()) return;

    setSourcesLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pastedText.trim().substring(0, 20) + (pastedText.trim().length > 20 ? '...' : ''),
          type: 'text',
          content: pastedText.trim(),
        }),
      });

      const response = await res.json();
      if (response.success) {
        await fetchSources();
        setShowPasteTextModal(false);
        setPastedText('');
      } else {
        throw new Error(response.error?.message || 'Save failed');
      }
    } catch (err) {
      console.error('Save text error:', err);
      alert('Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSourcesLoading(false);
    }
  };

  const handleSaveNote = async (content: string, name?: string) => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: name || content.substring(0, 30).replace(/\n/g, ' ') + (content.length > 30 ? '...' : ''),
          category: 'NOTE',
          cardType: '笔记',
          deckName: currentWorkspaceDeck.trim() || 'default',
          includePronunciation: false,
          sourceId: selectedSourceId,
          // 把笔记内容存放在 backContent 中
          analysis: {
            html: content, // 这里直接存原始内容，渲染时由于 ChatPanel 已经支持 Markdown，可能需要调整
          }
        }),
      });

      const response = await res.json();
      if (response.success) {
        if (activeStudioTab === 'NOTE') {
          await fetchCards();
        }
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: '已成功保存到我的笔记',
          type: 'chat',
        });
      } else {
        throw new Error(response.error?.message || 'Save failed');
      }
    } catch (err) {
      console.error('Save note error:', err);
      alert('保存笔记失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleSendMessage = async (text?: string) => {
    const content = text || chatInput;
    if (!content.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage].slice(-50));
    setChatInput('');
    setChatLoading(true);

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const res = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content.trim() }),
      });

      const response = await res.json();
      if (response.success) {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.analysis.markdown,
          type: 'analysis',
          data: response.data.analysis,
        });
        await fetchCredits();
      } else {
        throw new Error(response.error?.message || 'Chat failed');
      }
    } catch (err) {
      console.error('Chat error:', err);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，出错了: ${err instanceof Error ? err.message : '未知错误'}`,
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => onFileChange(e)}
      />
      <input
        type="file"
        ref={audioInputRef}
        className="hidden"
        accept="audio/*"
        onChange={(e) => onFileChange(e)}
      />
      <WorkspaceView
        locale={locale}
        session={session}
      t={t}
      workspaceT={workspaceT}
      cardT={cardT}
      
      currentWorkspaceDeck={currentWorkspaceDeck}
      credits={credits}
      paymentSuccess={paymentSuccess}
      setPaymentSuccess={setPaymentSuccess}
      
      isSourcePanelCollapsed={isSourcePanelCollapsed}
      setIsSourcePanelCollapsed={setIsSourcePanelCollapsed}
      isStudioPanelCollapsed={isStudioPanelCollapsed}
      setIsStudioPanelCollapsed={setIsStudioPanelCollapsed}
      activeStudioTab={activeStudioTab}
      setActiveStudioTab={setActiveStudioTab}
      
      sources={sources}
      sourcesLoading={sourcesLoading}
      uploadProgress={uploadProgress}
      showAddSourceModal={showAddSourceModal}
      setShowAddSourceModal={setShowAddSourceModal}
      showPasteTextModal={showPasteTextModal}
      setShowPasteTextModal={setShowPasteTextModal}
      pastedText={pastedText}
      setPastedText={setPastedText}
      showSourceViewModal={showSourceViewModal}
      setShowSourceViewModal={setShowSourceViewModal}
      selectedSourceId={selectedSourceId}
      setSelectedSourceId={setSelectedSourceId}
      viewingSourceId={viewingSourceId}
      setViewingSourceId={setViewingSourceId}
      sourceContent={sourceContent}
      setSourceContent={setSourceContent}
      editingSourceId={editingSourceId}
      setEditingSourceId={setEditingSourceId}
      editingSourceName={editingSourceName}
      setEditingSourceName={setEditingSourceName}
      showSourceMenuId={showSourceMenuId}
      setShowSourceMenuId={setShowSourceMenuId}
      
      preview={preview}
      setPreview={setPreview}
      cardText={cardText}
      setCardText={setCardText}
      cardLoading={cardLoading}
      cardError={cardError}
      includePronunciation={includePronunciation}
      setIncludePronunciation={setIncludePronunciation}
      
      cards={cards}
      cardsLoading={cardsLoading}
      cardsError={cardsError}
      total={total}
      totalPages={totalPages}
      page={page}
      setPage={setPage}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      debouncedSearchQuery={debouncedSearchQuery}
      selectedCardId={selectedCardId}
      setSelectedCardId={setSelectedCardId}
      selectedCard={selectedCard}
      showCardMenuId={showCardMenuId}
      setShowCardMenuId={setShowCardMenuId}
      
      handleGeneratePreview={handleGeneratePreview}
      handleSaveCard={handleSaveCard}
      handleDeleteCard={handleDeleteCard}
      handleGenerateCardsFromSource={handleGenerateCardsFromSource}
      generateCardAudio={generateCardAudio}
      fetchSources={fetchSources}
      fetchCards={fetchCards}
      handleUploadFile={handleUploadFile}
      handleUploadAudio={handleUploadAudio}
      handlePasteImage={handlePasteImage}
      handleInsertPastedText={handleInsertPastedText}
      handleSaveNote={handleSaveNote}
      
      messages={messages}
      chatInput={chatInput}
      setChatInput={setChatInput}
      chatLoading={chatLoading}
      handleSendMessage={handleSendMessage}
      
      sourcePanelWidth={sourcePanelWidth}
      studioPanelWidth={studioPanelWidth}
      startResizingSource={startResizingSource}
      startResizingStudio={startResizingStudio}
      workspaceLayoutRef={workspaceLayoutRef}
    />
    </>
  );
}
