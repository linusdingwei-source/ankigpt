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
  sourceId?: string | null;
  pageNumber?: number | null; // PDF page number for page-level association
  category?: string;
}

interface Source {
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
  url?: string;
  content?: string;
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
    failedItems?: Array<{ text: string; type?: string; reason: string }>;
    // ASR-related properties
    sourceId?: string;
    sourceName?: string;
    audioUrl?: string;
    timestamps?: Array<{ begin_time: number; end_time: number; text: string }>;
    canSaveAsNote?: boolean;
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
  
  // Comparison view for notes
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [comparisonSource, setComparisonSource] = useState<Source | null>(null);
  
  // 通用状态
  const [credits, setCredits] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // 模态框状态
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showPasteTextModal, setShowPasteTextModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  
  // 来源相关状态
  const [sources, setSources] = useState<Source[]>([]);
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
  const [activeStudioTab, setActiveStudioTab] = useState<'WORD' | 'SENTENCE' | 'NOTE'>('WORD');

  const [sourcePanelWidth, setSourcePanelWidth] = useState(320);
  const [studioPanelWidth, setStudioPanelWidth] = useState(360);
  const [isResizingSource, setIsResizingSource] = useState(false);
  const [isResizingStudio, setIsResizingStudio] = useState(false);

  // Chat 相关状态
  const CHAT_STORAGE_KEY = 'ankigpt_chat_history';
  const MAX_STORED_MESSAGES = 100;
  
  // 从 localStorage 加载历史消息
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        return parsed.slice(-MAX_STORED_MESSAGES);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return [];
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // 保存消息到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // 只保存最近的消息
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }, [messages]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, timestamp: Date.now() }].slice(-MAX_STORED_MESSAGES));
  }, []);

  // Resize Handlers
  const startResizingSource = useCallback(() => setIsResizingSource(true), []);
  const startResizingStudio = useCallback(() => setIsResizingStudio(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingSource(false);
    setIsResizingStudio(false);
  }, []);

  // Auto-collapse threshold and layout calculation
  const COLLAPSE_THRESHOLD = 150; // Below this width, auto-collapse self
  const MIN_PANEL_WIDTH = 200; // Minimum visible width when not collapsed
  const MIN_CHAT_WIDTH = 300; // Minimum chat panel width
  const COLLAPSED_PANEL_WIDTH = 48; // Width when collapsed
  
  const getContainerWidth = () => {
    return workspaceLayoutRef.current?.offsetWidth || window.innerWidth;
  };

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      const containerWidth = getContainerWidth();
      
      if (isResizingSource) {
        let newWidth = mouseMoveEvent.clientX;
        if (workspaceLayoutRef.current) {
          const rect = workspaceLayoutRef.current.getBoundingClientRect();
          newWidth = mouseMoveEvent.clientX - rect.left;
        }
        
        // Auto-collapse SourcePanel if dragged below threshold (to the left)
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsSourcePanelCollapsed(true);
          setIsResizingSource(false);
          return;
        }
        
        // Calculate current max width based on StudioPanel state
        const studioWidth = isStudioPanelCollapsed ? COLLAPSED_PANEL_WIDTH : studioPanelWidth;
        const currentMaxWidth = containerWidth - studioWidth - MIN_CHAT_WIDTH - 10;
        
        // If trying to expand beyond current max and StudioPanel is not collapsed, collapse it
        if (newWidth > currentMaxWidth && !isStudioPanelCollapsed) {
          setIsStudioPanelCollapsed(true);
        }
        
        // Recalculate max after potential collapse
        const effectiveStudioWidth = (newWidth > currentMaxWidth || isStudioPanelCollapsed) 
          ? COLLAPSED_PANEL_WIDTH 
          : studioPanelWidth;
        const effectiveMaxWidth = containerWidth - effectiveStudioWidth - MIN_CHAT_WIDTH - 10;
        
        if (newWidth >= MIN_PANEL_WIDTH && newWidth <= effectiveMaxWidth) {
          setSourcePanelWidth(newWidth);
        } else if (newWidth > effectiveMaxWidth) {
          setSourcePanelWidth(effectiveMaxWidth);
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
        
        // Auto-collapse StudioPanel if dragged below threshold (to the right)
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsStudioPanelCollapsed(true);
          setIsResizingStudio(false);
          return;
        }
        
        // Calculate current max width based on SourcePanel state
        const sourceWidth = isSourcePanelCollapsed ? COLLAPSED_PANEL_WIDTH : sourcePanelWidth;
        const currentMaxWidth = containerWidth - sourceWidth - MIN_CHAT_WIDTH - 10;
        
        // If trying to expand beyond current max and SourcePanel is not collapsed, collapse it
        if (newWidth > currentMaxWidth && !isSourcePanelCollapsed) {
          setIsSourcePanelCollapsed(true);
        }
        
        // Recalculate max after potential collapse
        const effectiveSourceWidth = (newWidth > currentMaxWidth || isSourcePanelCollapsed) 
          ? COLLAPSED_PANEL_WIDTH 
          : sourcePanelWidth;
        const effectiveMaxWidth = containerWidth - effectiveSourceWidth - MIN_CHAT_WIDTH - 10;
        
        if (newWidth >= MIN_PANEL_WIDTH && newWidth <= effectiveMaxWidth) {
          setStudioPanelWidth(newWidth);
        } else if (newWidth > effectiveMaxWidth) {
          setStudioPanelWidth(effectiveMaxWidth);
        } else if (newWidth >= COLLAPSE_THRESHOLD && newWidth < MIN_PANEL_WIDTH) {
          setStudioPanelWidth(MIN_PANEL_WIDTH);
        }
      }
    },
    [isResizingSource, isResizingStudio, isSourcePanelCollapsed, isStudioPanelCollapsed, sourcePanelWidth, studioPanelWidth]
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
  const audioFolderInputRef = useRef<HTMLInputElement>(null);
  const workspaceLayoutRef = useRef<HTMLDivElement>(null);
  
    // PDF generation cancellation
    const pdfGenerationCancelledRef = useRef(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    
    // Card generation cancellation
    const cardGenerationCancelledRef = useRef(false);
    const [isCardGenerating, setIsCardGenerating] = useState(false);

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
      // 添加时间戳防止缓存
      const res = await fetch(`/api/sources?_t=${Date.now()}`, { headers });
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

  // Fetch comparison source when comparison view is enabled
  useEffect(() => {
    const fetchComparisonSource = async () => {
      if (!showComparisonView || !selectedCard?.sourceId) {
        setComparisonSource(null);
        return;
      }

      const source = sources.find(s => s.id === selectedCard.sourceId);
      if (!source) {
        setComparisonSource(null);
        return;
      }

      // Check if this is a PDF page note (has pageNumber)
      const isPdfSource = source.type === 'pdf' || 
        (source.type === 'file' && source.mimeType?.includes('pdf')) ||
        source.name?.toLowerCase().endsWith('.pdf');
      
      if (selectedCard.pageNumber && isPdfSource) {
        // Fetch the page image from child sources
        try {
          const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
          const headers = getAnonymousHeaders();
          console.log(`Fetching children for source ${selectedCard.sourceId}, looking for page ${selectedCard.pageNumber}`);
          const childRes = await fetch(`/api/sources/${selectedCard.sourceId}/children`, { headers });
          if (childRes.ok) {
            const childData = await childRes.json();
            console.log(`Children response:`, childData);
            if (childData.success && childData.data?.sources) {
              const pageImage = childData.data.sources.find(
                (child: { pageNumber?: number }) => child.pageNumber === selectedCard.pageNumber
              );
              console.log(`Found page image:`, pageImage);
              if (pageImage) {
                const url = pageImage.fileUrl || pageImage.contentUrl || '';
                setComparisonSource({
                  ...pageImage,
                  url,
                  type: 'image', // Force image type for display
                  name: `${source.name} - 第${selectedCard.pageNumber}页`,
                });
                return;
              }
            }
          } else {
            console.error('Failed to fetch children:', await childRes.text());
          }
        } catch (err) {
          console.error('Failed to fetch page image:', err);
        }
      }

      // Default: use the source directly
      const url = source.fileUrl || source.contentUrl || '';
      setComparisonSource({ ...source, url });
    };

    fetchComparisonSource();
  }, [showComparisonView, selectedCard?.sourceId, selectedCard?.pageNumber, sources]);

  // Reset comparison view when card changes
  useEffect(() => {
    setShowComparisonView(false);
  }, [selectedCardId]);

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
      let targetItems: Array<{ text: string; type: 'SENTENCE' | 'WORD'; pageNumber?: number }> = [];

      // Step 0a: If PDF source, process page by page with vision model
      const isPdfByType = source.type === 'pdf';
      const isPdfByExtension = source.name?.toLowerCase().endsWith('.pdf');
      const isPdfSource = isPdfByType || isPdfByExtension;

      if (isPdfSource && (source.contentUrl || source.fileUrl)) {
        const pdfUrl = source.contentUrl || source.fileUrl;
        const pdfStatusMessageId = `pdf-${Date.now()}`;
        
        // Show initial progress immediately
        setMessages(prev => {
          const progressMsg: ChatMessage = {
            id: pdfStatusMessageId,
            role: 'assistant',
            content: `检测到 PDF 来源: ${source.name}\n正在加载 PDF 文件...（如果文件较大可能需要稍等）`,
            type: 'chat',
            timestamp: Date.now(),
          };
          return [...prev, progressMsg].slice(-50);
        });

        // Import PDF utilities
        const { getPdfInfo, renderPdfPageToImage, uploadImageBlob, clearPdfCache } = await import('@/lib/client/pdf-to-image');
        const { containsJapaneseContent } = await import('@/lib/llm-utils');

        let totalPages = 0;
        
        try {
          // Get PDF info (with retry logic built-in)
          const pdfInfo = await getPdfInfo(pdfUrl);
          totalPages = pdfInfo.pageCount;
        } catch (pdfError) {
          // Update progress message with error
          setMessages(prev => {
            const newMessages = prev.filter(m => m.id !== pdfStatusMessageId);
            const errorMsg: ChatMessage = {
              id: pdfStatusMessageId,
              role: 'assistant',
              content: `PDF 加载失败: ${pdfError instanceof Error ? pdfError.message : '网络错误'}\n\n请检查网络连接并重试。如果问题持续，请尝试重新上传 PDF 文件。`,
              type: 'chat',
              timestamp: Date.now(),
            };
            return [...newMessages, errorMsg].slice(-50);
          });
          setCardLoading(false);
          return;
        }

        // Update progress with page count
        setMessages(prev => {
          const newMessages = prev.filter(m => m.id !== pdfStatusMessageId);
          const progressMsg: ChatMessage = {
            id: pdfStatusMessageId,
            role: 'assistant',
            content: `PDF 共 ${totalPages} 页，检查已有页面图片...`,
            type: 'chat',
            timestamp: Date.now(),
          };
          return [...newMessages, progressMsg].slice(-50);
        });

        // Check for existing page images (child sources)
        const existingPageImages: Map<number, string> = new Map();
        try {
          const childSourcesRes = await fetch(`/api/sources/${selectedSourceId}/children`, { headers });
          if (childSourcesRes.ok) {
            const childData = await childSourcesRes.json();
            if (childData.success && childData.data?.sources) {
              for (const child of childData.data.sources) {
                if (child.pageNumber && (child.fileUrl || child.contentUrl)) {
                  existingPageImages.set(child.pageNumber, child.fileUrl || child.contentUrl);
                }
              }
            }
          }
        } catch {
          console.log('No existing page images found, will create new ones');
        }

        const hasExistingImages = existingPageImages.size > 0;
        if (hasExistingImages) {
          setMessages(prev => {
            const newMessages = prev.filter(m => m.id !== pdfStatusMessageId);
            const progressMsg: ChatMessage = {
              id: pdfStatusMessageId,
              role: 'assistant',
              content: `PDF 共 ${totalPages} 页，已找到 ${existingPageImages.size} 个已处理页面图片，开始处理...`,
              type: 'chat',
              timestamp: Date.now(),
            };
            return [...newMessages, progressMsg].slice(-50);
          });
        } else {
          setMessages(prev => {
            const newMessages = prev.filter(m => m.id !== pdfStatusMessageId);
            const progressMsg: ChatMessage = {
              id: pdfStatusMessageId,
              role: 'assistant',
              content: `PDF 共 ${totalPages} 页，开始逐页处理...`,
              type: 'chat',
              timestamp: Date.now(),
            };
            return [...newMessages, progressMsg].slice(-50);
          });
        }

        // Reset cancellation flag and set generating state
        pdfGenerationCancelledRef.current = false;
        setIsPdfGenerating(true);

        // Track progress
        let processedPages = 0;
        let skippedPages = 0;
        let savedNotes = 0;

        // Update PDF progress
        const updatePdfProgress = (page: number, phase: string, skipped: number) => {
          setMessages(prev => {
            const newMessages = prev.filter(m => m.id !== pdfStatusMessageId);
            const progressMsg: ChatMessage = {
              id: pdfStatusMessageId,
              role: 'assistant',
              content: `正在处理 PDF (第 ${page}/${totalPages} 页)\n阶段: ${phase}\n已保存笔记: ${savedNotes}\n已提取项目: ${targetItems.length}\n跳过页面: ${skipped} (无有效日语内容)`,
              type: 'chat',
              timestamp: Date.now(),
            };
            return [...newMessages, progressMsg].slice(-50);
          });
        };

        // Process each page
        for (let page = 1; page <= totalPages; page++) {
          // Check if cancelled
          if (pdfGenerationCancelledRef.current) {
            setMessages(prev => prev.filter(m => m.id !== pdfStatusMessageId));
            addMessage({
              id: Date.now().toString(),
              role: 'assistant',
              content: `PDF 处理已取消\n已处理页数: ${processedPages}/${totalPages}\n已保存笔记: ${savedNotes}\n已提取项目: ${targetItems.filter(i => i.type === 'WORD').length} 个单词, ${targetItems.filter(i => i.type === 'SENTENCE').length} 个句子`,
              type: 'chat',
            });
            break;
          }
          
          try {
            // Check if we already have this page's image
            let imageUrl = existingPageImages.get(page);
            
            if (imageUrl) {
              // Use existing image - skip render and upload
              updatePdfProgress(page, '使用已有图片', skippedPages);
            } else {
              // Need to render and upload new image
              updatePdfProgress(page, '渲染页面为图片', skippedPages);
              
              // Step 1: Render page to image (use scale 1.5 and JPEG for smaller file size)
              const { blob } = await renderPdfPageToImage(pdfUrl, page, 1.5);
              
              // Step 2: Upload image to storage (associated with PDF source)
              updatePdfProgress(page, '上传页面图片', skippedPages);
              const imageFilename = `${source.name}_page_${page}.jpg`;
              imageUrl = await uploadImageBlob(blob, imageFilename, headers as Record<string, string>, {
                parentSourceId: selectedSourceId!, // Associate with parent PDF
                pageNumber: page,
              });
            }
            
            // Step 3: Parse image with Qwen-VL (using URL)
            updatePdfProgress(page, '解析图片内容', skippedPages);
            const parseRes = await fetch('/api/llm/parse-image', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl }),
            });

            const parseData = await parseRes.json();
            if (!parseRes.ok || !parseData.success) {
              console.warn(`Page ${page} parsing failed:`, parseData.error?.message);
              skippedPages++;
              continue;
            }

            const pageContent = parseData.data.content || '';
            
            // Display LLM interaction for image parsing
            if (parseData.data.llmInteraction) {
              const interaction = parseData.data.llmInteraction;
              addMessage({
                id: `llm-parse-${page}-${Date.now()}`,
                role: 'assistant',
                content: `**📷 图片解析 (Page ${page})**\n\n**输入图片:** ${imageUrl ? `[${source.name}_page_${page}]` : 'base64'}\n\n**提示词:** \`${interaction.prompt}\`\n\n**模型:** ${interaction.model}\n\n**输出:**\n${pageContent.substring(0, 500)}${pageContent.length > 500 ? '...' : ''}`,
                type: 'chat',
              });
            }
            
            // Step 4: Validate Japanese content
            if (!containsJapaneseContent(pageContent)) {
              console.log(`Page ${page} skipped: no valid Japanese content`);
              skippedPages++;
              continue;
            }

            // Step 5: Refine content to extract vocabulary and sentences
            updatePdfProgress(page, '提取单词和句子', skippedPages);
            const refineRes = await fetch('/api/llm/refine-content', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ markdown: pageContent }),
            });

            let vocabulary: string[] = [];
            let sentences: string[] = [];
            
            const refineData = await refineRes.json();
            if (refineRes.ok && refineData.success) {
              // Display LLM interaction for PDF page refinement
              if (refineData.data.llmInteraction) {
                const llm = refineData.data.llmInteraction;
                addMessage({
                  id: `pdf-refine-${page}-${Date.now()}`,
                  role: 'assistant',
                  content: `**🧠 第${page}页 单词/句子提炼**\n\n**模型:** ${llm.model}\n\n**LLM输出:**\n${llm.response?.substring(0, 500) || ''}${(llm.response?.length || 0) > 500 ? '...' : ''}`,
                  type: 'chat',
                });
              }
              
              vocabulary = refineData.data.vocabulary || [];
              sentences = refineData.data.sentences || [];
              
              // Add items with page number
              for (const v of vocabulary) {
                targetItems.push({ text: v, type: 'WORD', pageNumber: page });
              }
              for (const s of sentences) {
                targetItems.push({ text: s, type: 'SENTENCE', pageNumber: page });
              }
            }

            // Step 6: Save page content as NOTE (auto-save with markdown, vocabulary, sentences)
            updatePdfProgress(page, '保存页面笔记', skippedPages);
            const noteContent = [
              pageContent,
              '',
              '',  // Extra blank line to ensure markdown parsing
              vocabulary.length > 0 ? `---\n\n**提取的单词 (${vocabulary.length})**\n\n${vocabulary.map(v => `- ${v}`).join('\n')}` : '',
              '',
              sentences.length > 0 ? `---\n\n**提取的句子 (${sentences.length})**\n\n${sentences.map(s => `- ${s}`).join('\n')}` : '',
            ].filter(Boolean).join('\n');
            
            try {
              const noteRes = await fetch('/api/cards/generate', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: `${source.name} - 第${page}页`,
                  category: 'NOTE',
                  cardType: '笔记',
                  deckName: currentWorkspaceDeck.trim() || 'default',
                  includePronunciation: false,
                  sourceId: selectedSourceId,
                  pageNumber: page,
                  analysis: {
                    html: noteContent,
                  }
                }),
              });
              if (noteRes.ok) {
                savedNotes++;
              }
            } catch (noteErr) {
              console.warn(`Page ${page} note save failed:`, noteErr);
              // Continue even if note save fails
            }

            processedPages++;
            
            // Add delay between pages to avoid rate limiting
            if (page < totalPages) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (err) {
            console.error(`Error processing page ${page}:`, err);
            skippedPages++;
          }
        }

        // Remove progress message
        setMessages(prev => prev.filter(m => m.id !== pdfStatusMessageId));

        // Clear PDF cache to free memory
        clearPdfCache(pdfUrl);

        // Reset generating state
        setIsPdfGenerating(false);

        // If cancelled, check if we should continue with partial results
        if (pdfGenerationCancelledRef.current) {
          if (targetItems.length === 0) {
            setCardLoading(false);
            return;
          }
          // Continue with partial results
        } else {
          // Show PDF processing summary (only if not cancelled)
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `PDF 处理完成\n处理页数: ${processedPages}/${totalPages}\n跳过页数: ${skippedPages}\n保存笔记: ${savedNotes}\n提取项目: ${targetItems.filter(i => i.type === 'WORD').length} 个单词, ${targetItems.filter(i => i.type === 'SENTENCE').length} 个句子`,
            type: 'analysis',
          });
        }

        // Skip to card generation (don't process as image/audio)
        if (targetItems.length > 0) {
          // Continue to card generation below
        } else {
          alert('未能从 PDF 中识别出有效的日文内容');
          setCardLoading(false);
          return;
        }
      }

      // Step 0: If audio source, first convert to text using ASR
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.aiff', '.opus'];
      const isAudioByType = source.type === 'audio';
      const isAudioByExtension = source.name && audioExtensions.some(ext => source.name.toLowerCase().endsWith(ext));
      const isAudioSource = isAudioByType || isAudioByExtension;

      if (isAudioSource && (source.contentUrl || source.fileUrl)) {
        const audioUrl = source.contentUrl || source.fileUrl;
        
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: '检测到音频来源，正在提交 ASR 语音识别任务...',
          type: 'chat',
        });

        // Step 1: Submit ASR task (async)
        const submitRes = await fetch('/api/llm/asr', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrl, languageHints: ['ja'] }),
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok || !submitData.success) {
          throw new Error(submitData.error?.message || 'ASR 任务提交失败');
        }

        const taskId = submitData.data.taskId;
        
        // Update credits after submission
        if (submitData.data.credits !== undefined) {
          setCredits(submitData.data.credits);
        }

        // Step 2: Poll for completion (async)
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `ASR 任务已提交 (ID: ${taskId.slice(0, 8)}...)，正在等待转写结果...`,
          type: 'chat',
        });

        let asrResult: { text?: string; timestamps?: Array<{ begin_time: number; end_time: number; text: string }> } | null = null;
        const maxPolls = 60; // Max 3 minutes (60 * 3s)
        const pollInterval = 3000; // 3 seconds

        for (let poll = 0; poll < maxPolls; poll++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const statusRes = await fetch(`/api/llm/asr?taskId=${taskId}`, {
            headers,
          });
          
          const statusData = await statusRes.json();
          
          if (!statusRes.ok) {
            throw new Error(statusData.error?.message || 'ASR 状态查询失败');
          }
          
          if (statusData.success && statusData.data.status === 'SUCCEEDED') {
            asrResult = {
              text: statusData.data.text,
              timestamps: statusData.data.timestamps || [],
            };
            break;
          } else if (statusData.data.status === 'FAILED') {
            throw new Error(statusData.error?.message || 'ASR 任务失败');
          }
          // Still PENDING or RUNNING, continue polling
        }

        if (!asrResult) {
          throw new Error('ASR 任务超时');
        }

        const transcribedText = asrResult.text || '';
        const timestamps = asrResult.timestamps || [];
        content = transcribedText;
        
        // Format transcription result as markdown
        let transcriptMarkdown = `## 音频转写结果\n\n`;
        transcriptMarkdown += `**来源:** ${source.name}\n\n`;
        transcriptMarkdown += `**转写文本:**\n\n${transcribedText}\n`;
        
        // Add timestamps if available
        if (timestamps.length > 0) {
          transcriptMarkdown += `\n---\n\n<details>\n<summary>时间戳详情 (点击展开)</summary>\n\n`;
          for (const ts of timestamps.slice(0, 50)) { // Limit to first 50 for display
            const startSec = (ts.begin_time / 1000).toFixed(2);
            const endSec = (ts.end_time / 1000).toFixed(2);
            transcriptMarkdown += `- [${startSec}s - ${endSec}s] ${ts.text}\n`;
          }
          if (timestamps.length > 50) {
            transcriptMarkdown += `\n... 和其他 ${timestamps.length - 50} 个时间戳\n`;
          }
          transcriptMarkdown += `\n</details>\n`;
        }
        
        // Display ASR result in chat as markdown (can be saved as note)
        addMessage({
          id: `asr-${Date.now()}`,
          role: 'assistant',
          content: transcriptMarkdown,
          type: 'analysis',
          data: {
            sourceId: selectedSourceId,
            sourceName: source.name,
            audioUrl, // 保存音频URL以便笔记中播放
            timestamps,
            canSaveAsNote: true,
          },
        });

        // Update view content if this source is being viewed
        if (viewingSourceId === selectedSourceId) {
          setSourceContent(transcribedText || '');
        }
      }

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
          
          // Display LLM interaction for image parsing
          if (parseData.data.llmInteraction) {
            const interaction = parseData.data.llmInteraction;
            addMessage({
              id: `llm-img-${Date.now()}`,
              role: 'assistant',
              content: `**📷 图片解析**\n\n**输入图片:** [${source.name}](${imageUrl})\n\n**提示词:** \`${interaction.prompt}\`\n\n**模型:** ${interaction.model}\n\n**输出预览:**\n${(content || '').substring(0, 300)}${(content || '').length > 300 ? '...' : ''}`,
              type: 'chat',
            });
          }
          
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
          const { vocabulary = [], sentences = [], llmInteraction } = refineData.data;
          
          // Display LLM interaction for transparency
          if (llmInteraction) {
            addMessage({
              id: `refine-llm-${Date.now()}`,
              role: 'assistant',
              content: `**🧠 单词/句子提炼 LLM交互**\n\n**模型:** ${llmInteraction.model}\n\n**提示词:**\n${llmInteraction.systemPrompt?.substring(0, 300) || ''}...\n\n**LLM输出:**\n${llmInteraction.response?.substring(0, 800) || ''}${(llmInteraction.response?.length || 0) > 800 ? '...' : ''}`,
              type: 'chat',
            });
          }
          
          targetItems = [
            ...vocabulary.map((v: string) => ({ text: v, type: 'WORD' as const })),
            ...sentences.map((s: string) => ({ text: s, type: 'SENTENCE' as const }))
          ];
          
          // 在对话框中展示提炼结果
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `提炼结果：\n\n**核心单词：**\n${vocabulary.map((v: string) => `- ${v}`).join('\n')}\n\n**练习句子：**\n${sentences.map((s: string) => `- ${s}`).join('\n')}`,
            type: 'analysis',
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
      const failedItems: Array<{ text: string; type?: string; reason: string }> = [];

      // Reset cancellation flag and set generating state
      cardGenerationCancelledRef.current = false;
      setIsCardGenerating(true);

      // 更新进度的函数
      const updateProgress = (current: number, total: number, currentItem: string) => {
        setMessages(prev => {
          const newMessages = prev.filter(m => m.id !== statusMessageId);
          const progressMsg: ChatMessage = {
            id: statusMessageId,
            role: 'assistant',
            content: `正在生成卡片 (${current}/${total})...\n\n当前: ${currentItem}`,
            type: 'chat',
            timestamp: Date.now(),
          };
          return [...newMessages, progressMsg].slice(-50);
        });
      };

      // 带重试的单个卡片生成函数
      const generateSingleCard = async (item: { text: string; type: string; pageNumber?: number }, retries = 2): Promise<{ success: boolean; card?: Card; error?: string }> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            if (attempt > 0) {
              // 重试前等待，指数退避
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
            
            const genRes = await fetch('/api/cards/generate', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
              body: JSON.stringify({
                text: item.text,
                cardType: item.type === 'WORD' ? '单词' : '问答题（附翻转卡片）',
                deckName: currentWorkspaceDeck.trim() || 'default',
                sourceId: selectedSourceId,
                pageNumber: item.pageNumber, // PDF page number for page-level association
                includePronunciation: true,
              }),
              signal: controller.signal,
              keepalive: true,
            });
            
            clearTimeout(timeoutId);

            const genResponse = await genRes.json();
            if (genRes.ok && genResponse.success) {
              // Check if this was from cache (no LLM/TTS calls needed)
              if (genResponse.data.cachedFromExisting) {
                addMessage({
                  id: `cache-hit-${Date.now()}`,
                  role: 'assistant',
                  content: `**♻️ 复用现有卡片数据**\n\n**文本:** ${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}\n\n✅ 已存在相同内容的卡片，跳过LLM分析和TTS生成，直接复用已有数据。`,
                  type: 'chat',
                });
              } else {
                // Display LLM interaction for card generation
                if (genResponse.data.llmInteraction) {
                  const llm = genResponse.data.llmInteraction;
                  addMessage({
                    id: `llm-card-${Date.now()}`,
                    role: 'assistant',
                    content: `**🧠 卡片LLM分析**\n\n**输入:** ${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}\n\n**模型:** ${llm.model}\n\n**System Prompt:** ${llm.systemPrompt.substring(0, 100)}...\n\n**User Prompt:** ${llm.userPrompt.substring(0, 200)}...\n\n**输出:**\n${llm.response.substring(0, 500)}${llm.response.length > 500 ? '...' : ''}`,
                    type: 'chat',
                  });
                }
                // Display TTS interaction
                if (genResponse.data.ttsInteraction) {
                  const tts = genResponse.data.ttsInteraction;
                  addMessage({
                    id: `tts-card-${Date.now()}`,
                    role: 'assistant',
                    content: `**🔊 TTS音频生成**\n\n**输入文本:** ${tts.input.substring(0, 100)}${tts.input.length > 100 ? '...' : ''}\n\n**假名文本:** ${tts.kanaText?.substring(0, 100) || 'N/A'}\n\n**音频URL:** ${tts.audioUrl ? '✅ 已生成' : '❌ 未生成'}`,
                    type: 'chat',
                  });
                }
              }
              return { success: true, card: genResponse.data.card };
            } else {
              const errorMsg = genResponse.error?.message || genResponse.message || `HTTP ${genRes.status}`;
              if (attempt === retries) {
                return { success: false, error: errorMsg };
              }
              // 继续重试
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '网络错误';
            if (attempt === retries) {
              return { success: false, error: errorMsg };
            }
            // 继续重试
          }
        }
        return { success: false, error: '重试失败' };
      };

      for (let i = 0; i < targetItems.length; i++) {
        // Check if cancelled
        if (cardGenerationCancelledRef.current) {
          setMessages(prev => prev.filter(m => m.id !== statusMessageId));
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `卡片生成已取消\n已生成: ${successCount}\n失败: ${failCount}\n未处理: ${targetItems.length - i}`,
            type: 'flashcards',
            data: { successCount, failCount, cards: generatedCards, failedItems },
          });
          break;
        }
        
        const item = targetItems[i];
        
        // 请求节流：每个请求之间添加延迟，避免服务器过载
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests
        }
        
        // 更新进度显示
        updateProgress(i + 1, targetItems.length, item.text.substring(0, 30) + (item.text.length > 30 ? '...' : ''));
        
        const result = await generateSingleCard(item);
        if (result.success && result.card) {
          successCount++;
          generatedCards.push(result.card);
        } else {
          console.error(`第 ${i + 1} 个项目生成失败:`, result.error);
          failCount++;
          failedItems.push({
            text: item.text,
            type: item.type,
            reason: result.error || '未知错误',
          });
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
          data: { successCount, failCount, cards: generatedCards, failedItems },
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
      setIsCardGenerating(false);
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

  const handleUploadAudioFolder = () => {
    audioFolderInputRef.current?.click();
  };

  // Helper: upload a single file to /api/sources with optional custom name
  const uploadSingleFile = async (
    file: File,
    headers: Record<string, string>,
    customName?: string
  ) => {
    const formData = new FormData();
    // If custom name is provided, create a new File with that name
    if (customName) {
      const renamedFile = new File([file], customName, { type: file.type });
      formData.append('file', renamedFile);
    } else {
      formData.append('file', file);
    }

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

  // Handler for audio folder upload
  const onAudioFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      alert('未选择任何文件');
      return;
    }

    // IMPORTANT: Convert FileList to array BEFORE resetting input
    // FileList is a live collection that gets cleared when input is reset
    const files = Array.from(fileList);
    
    // Reset input now that we have a copy of the files
    e.target.value = '';

    // Debug: log all files received
    console.log(`Received ${files.length} files from folder`);
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      console.log(`File ${i}: name=${file.name}, type=${file.type}, path=${relativePath}`);
    }

    // Filter audio files and get folder structure
    const audioFiles: Array<{ file: File; relativePath: string }> = [];
    // Audio file extensions to detect
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.aiff', '.opus'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();
      const isAudioByType = file.type.startsWith('audio/');
      const isAudioByExtension = audioExtensions.some(ext => fileName.endsWith(ext));
      
      if (isAudioByType || isAudioByExtension) {
        // webkitRelativePath contains the full path like "folder/subfolder/file.mp3"
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        audioFiles.push({ file, relativePath });
      }
    }

    if (audioFiles.length === 0) {
      alert(`未找到音频文件。\n共检测到 ${files.length} 个文件，但没有找到支持的音频格式 (.mp3, .wav, .ogg, .m4a 等)。\n请确保文件夹包含音频文件。`);
      return;
    }

    // Sort by relative path to maintain order
    audioFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }));

    setSourcesLoading(true);
    setUploadProgress({ phase: 'uploading', current: 0, total: audioFiles.length });

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders() as Record<string, string>;
      if (headers['Content-Type']) {
        delete headers['Content-Type'];
      }

      for (let i = 0; i < audioFiles.length; i++) {
        const { file, relativePath } = audioFiles[i];
        // Use the relative path as the file name to preserve folder structure
        await uploadSingleFile(file, headers, relativePath);
        setUploadProgress({ 
          phase: 'uploading', 
          current: i + 1, 
          total: audioFiles.length,
          fileName: relativePath 
        });
        console.log(`Uploaded ${i + 1}/${audioFiles.length}: ${relativePath}`);
      }

      await fetchSources();
      setShowAddSourceModal(false);
    } catch (err) {
      console.error('Audio folder upload error:', err);
      alert('上传失败: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

  // 处理聊天输入框的文件拖放（图片/音频）
  const handleChatFileDrop = async (files: File[]) => {
    if (files.length === 0) return;
    
    setSourcesLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders() as Record<string, string>;
      if (headers['Content-Type']) {
        delete headers['Content-Type'];
      }

      let uploadedSourceId: string | null = null;
      
      for (const file of files) {
        // 检查文件类型：只接受图片和音频
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/') || 
          ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.aiff', '.opus']
            .some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isImage && !isAudio) {
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `不支持的文件类型: ${file.name}。请拖入图片或音频文件。`,
            type: 'chat',
          });
          continue;
        }

        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `正在上传${isImage ? '图片' : '音频'}: ${file.name}...`,
          type: 'chat',
        });

        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/sources', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (res.status === 413) {
          throw new Error(`文件太大: ${file.name}。请上传小于50MB的文件。`);
        }

        if (!res.ok) {
          const text = await res.text();
          let errorMsg = '上传失败';
          try {
            const json = JSON.parse(text);
            errorMsg = json.error?.message || errorMsg;
          } catch {
            errorMsg = text || `上传失败 (status ${res.status})`;
          }
          throw new Error(errorMsg);
        }

        const response = await res.json();
        if (response.success) {
          uploadedSourceId = response.data.source.id;
          await fetchSources();
          
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ ${isImage ? '图片' : '音频'}上传成功: ${file.name}。已添加到来源列表。`,
            type: 'chat',
          });
        } else {
          throw new Error(response.error?.message || '上传失败');
        }
      }

      // 自动选中最后上传的文件
      if (uploadedSourceId) {
        setSelectedSourceId(uploadedSourceId);
      }
    } catch (err) {
      console.error('Chat file drop error:', err);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `上传失败: ${err instanceof Error ? err.message : '未知错误'}`,
        type: 'chat',
      });
    } finally {
      setSourcesLoading(false);
    }
  };

  // 处理聊天输入框的粘贴 (Ctrl+V) - 支持图片
  const handleChatPasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // 检查是否有图片
    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        imageItems.push(items[i]);
      }
    }

    // 优先处理图片
    if (imageItems.length > 0) {
      e.preventDefault();
      setSourcesLoading(true);
      try {
        const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
        const headers = getAnonymousHeaders() as Record<string, string>;
        if (headers['Content-Type']) {
          delete headers['Content-Type'];
        }

        for (const item of imageItems) {
          const blob = item.getAsFile();
          if (!blob) continue;

          const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
          
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: '正在上传粘贴的图片...',
            type: 'chat',
          });

          const formData = new FormData();
          formData.append('file', file);
          
          const res = await fetch('/api/sources', {
            method: 'POST',
            headers,
            body: formData,
          });

          if (!res.ok) {
            throw new Error('上传失败');
          }

          const response = await res.json();
          if (response.success) {
            await fetchSources();
            setSelectedSourceId(response.data.source.id);
            
            addMessage({
              id: Date.now().toString(),
              role: 'assistant',
              content: '✅ 图片上传成功，已添加到来源列表。',
              type: 'chat',
            });
          }
        }
      } catch (err) {
        console.error('Paste image error:', err);
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `粘贴图片失败: ${err instanceof Error ? err.message : '未知错误'}`,
          type: 'chat',
        });
      } finally {
        setSourcesLoading(false);
      }
      return;
    }

    // 如果没有图片，让文本正常填充到输入框，用户可以编辑后点击按钮保存
  };

  // 将输入框内容保存为资源
  const handleSaveInputAsSource = async () => {
    const text = chatInput.trim();
    if (!text || text.length < 5) {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: '请输入至少5个字符的内容',
        type: 'chat',
      });
      return;
    }

    setSourcesLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: '正在保存文本为资源...',
        type: 'chat',
      });

      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `粘贴的文字 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
          type: 'text',
          content: text,
        }),
      });

      const response = await res.json();
      if (response.success) {
        const newSourceId = response.data.source.id;
        setChatInput(''); // 清空输入框
        
        // 先设置loading为false，然后获取最新数据
        setSourcesLoading(false);
        await fetchSources();
        
        // 选中新创建的资源
        setSelectedSourceId(newSourceId);
        
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ 文本保存成功 (${text.length}字)，已添加到来源列表。`,
          type: 'chat',
        });
      } else {
        throw new Error(response.error?.message || '保存失败');
      }
    } catch (err) {
      console.error('Save input as source error:', err);
      setSourcesLoading(false);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `保存失败: ${err instanceof Error ? err.message : '未知错误'}`,
        type: 'chat',
      });
    }
  };

  const handleSaveNote = async (content: string, options?: { name?: string; audioUrl?: string; timestamps?: Array<{ begin_time: number; end_time: number; text: string }> }) => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const { name, audioUrl, timestamps } = options || {};
      
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
            html: content,
            // 保存音频URL和时间戳以便在笔记中播放
            audioUrl: audioUrl,
            timestamps: timestamps,
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

  // 从文本内容生成AI闪卡
  // providedAnalysis: 如果提供，则跳过LLM分析步骤，直接用已有的分析结果
  const handleGenerateCardsFromText = async (text: string, providedAnalysis?: { markdown: string; html: string; kanaText: string }) => {
    if (!text.trim()) {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: '请提供有效的文本内容',
        type: 'chat',
      });
      return;
    }

    setCardLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();

      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: providedAnalysis ? '正在生成闪卡...' : '正在分析并生成AI闪卡...',
        type: 'chat',
      });

      // 调用卡片生成API
      // 如果提供了 providedAnalysis，则跳过LLM分析步骤
      const cardRes = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          cardType: '句子卡',
          deckName: currentWorkspaceDeck?.trim() || 'default',
          includePronunciation: true,
          ...(providedAnalysis && { analysis: providedAnalysis }),
        }),
      });

      const cardData = await cardRes.json();
      
      if (!cardRes.ok || !cardData.success) {
        throw new Error(cardData.error?.message || '生成失败');
      }

      await fetchCards();
      await fetchCredits();

      // 显示结果
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ AI闪卡生成成功！`,
        type: 'flashcards',
        data: {
          successCount: 1,
          failCount: 0,
          cards: [{
            id: cardData.data.card.id,
            frontContent: cardData.data.card.frontContent,
          }],
        },
      });

    } catch (err) {
      console.error('Generate cards from text error:', err);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `生成闪卡失败: ${err instanceof Error ? err.message : '未知错误'}`,
        type: 'chat',
      });
    } finally {
      setCardLoading(false);
    }
  };

  // 重试失败的卡片生成
  const handleRetryFailedItems = async (failedItems: Array<{ text: string; type?: string }>) => {
    if (failedItems.length === 0) return;
    
    setCardLoading(true);
    
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      const statusMessageId = Date.now().toString();
      addMessage({
        id: statusMessageId,
        role: 'assistant',
        content: `正在重试 ${failedItems.length} 个失败项目...`,
        type: 'chat',
      });

      let successCount = 0;
      let failCount = 0;
      const generatedCards: Card[] = [];
      const stillFailedItems: Array<{ text: string; type?: string; reason: string }> = [];

      for (let i = 0; i < failedItems.length; i++) {
        const item = failedItems[i];
        
        // 请求节流：重试时增加延迟
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay for retries
        }
        
        // 更新进度
        setMessages(prev => {
          const newMessages = prev.filter(m => m.id !== statusMessageId);
          const progressMsg: ChatMessage = {
            id: statusMessageId,
            role: 'assistant',
            content: `正在重试 (${i + 1}/${failedItems.length})...\n\n当前: ${item.text.substring(0, 30)}${item.text.length > 30 ? '...' : ''}`,
            type: 'chat',
            timestamp: Date.now(),
          };
          return [...newMessages, progressMsg].slice(-50);
        });

        // 重试逻辑，带重试
        let success = false;
        let lastError = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const genRes = await fetch('/api/cards/generate', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
              body: JSON.stringify({
                text: item.text,
                cardType: item.type === 'WORD' ? '单词' : '问答题（附翻转卡片）',
                deckName: currentWorkspaceDeck.trim() || 'default',
                sourceId: selectedSourceId,
                includePronunciation: true,
              }),
              signal: controller.signal,
              keepalive: true,
            });
            
            clearTimeout(timeoutId);

            const genResponse = await genRes.json();
            if (genRes.ok && genResponse.success) {
              // Display LLM interaction for retry
              if (genResponse.data.cachedFromExisting) {
                addMessage({
                  id: `cache-hit-retry-${Date.now()}`,
                  role: 'assistant',
                  content: `**♻️ 复用现有卡片数据**\n\n**文本:** ${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}\n\n✅ 已存在相同内容的卡片，跳过LLM分析和TTS生成，直接复用已有数据。`,
                  type: 'chat',
                });
              } else {
                if (genResponse.data.llmInteraction) {
                  const llm = genResponse.data.llmInteraction;
                  addMessage({
                    id: `llm-retry-${Date.now()}`,
                    role: 'assistant',
                    content: `**🧠 重试LLM分析**\n\n**输入:** ${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}\n\n**模型:** ${llm.model}\n\n**输出:**\n${llm.response.substring(0, 500)}${llm.response.length > 500 ? '...' : ''}`,
                    type: 'chat',
                  });
                }
                if (genResponse.data.ttsInteraction) {
                  const tts = genResponse.data.ttsInteraction;
                  addMessage({
                    id: `tts-retry-${Date.now()}`,
                    role: 'assistant',
                    content: `**🔊 TTS音频生成**\n\n**输入文本:** ${tts.input.substring(0, 100)}${tts.input.length > 100 ? '...' : ''}\n\n**音频URL:** ${tts.audioUrl ? '✅ 已生成' : '❌ 未生成'}`,
                    type: 'chat',
                  });
                }
              }
              success = true;
              successCount++;
              generatedCards.push(genResponse.data.card);
              break;
            } else {
              lastError = genResponse.error?.message || genResponse.message || `HTTP ${genRes.status}`;
            }
          } catch (err) {
            lastError = err instanceof Error ? err.message : '网络错误';
          }
        }
        
        if (!success) {
          failCount++;
          stillFailedItems.push({
            text: item.text,
            type: item.type,
            reason: lastError,
          });
        }
      }

      await fetchCards();
      await fetchCredits();
      
      setMessages(prev => {
        const newMessages = prev.filter(m => m.id !== statusMessageId);
        const resultMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `重试完成！\n成功: ${successCount}\n仍失败: ${failCount}`,
          type: 'flashcards',
          data: { successCount, failCount, cards: generatedCards, failedItems: stillFailedItems },
          timestamp: Date.now(),
        };
        return [...newMessages, resultMsg].slice(-50);
      });
    } catch (err) {
      console.error('Retry error:', err);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `重试失败: ${err instanceof Error ? err.message : '未知错误'}`,
        type: 'chat',
      });
    } finally {
      setCardLoading(false);
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
        // Display LLM interaction for chat analysis
        if (response.data.llmInteraction) {
          const llm = response.data.llmInteraction;
          addMessage({
            id: `llm-chat-${Date.now()}`,
            role: 'assistant',
            content: `**🧠 LLM分析过程**\n\n**输入:** ${content.trim().substring(0, 100)}${content.trim().length > 100 ? '...' : ''}\n\n**模型:** ${llm.model}\n\n**System Prompt:** ${llm.systemPrompt.substring(0, 100)}...\n\n**User Prompt:** ${llm.userPrompt.substring(0, 200)}...`,
            type: 'chat',
          });
        }
        
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.analysis.markdown,
          type: 'analysis',
          data: {
            ...response.data.analysis,
            originalText: content.trim(), // 保存原始文本以便生成闪卡时使用
          },
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
      <input
        type="file"
        ref={audioFolderInputRef}
        className="hidden"
        {...({ webkitdirectory: 'true' } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        onChange={(e) => onAudioFolderChange(e)}
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
      
      isPdfGenerating={isPdfGenerating}
      onCancelPdfGeneration={() => {
        pdfGenerationCancelledRef.current = true;
      }}
      
      isCardGenerating={isCardGenerating}
      onCancelCardGeneration={() => {
        cardGenerationCancelledRef.current = true;
      }}
      
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
      showComparisonView={showComparisonView}
      setShowComparisonView={setShowComparisonView}
      comparisonSource={comparisonSource}
      
      handleGeneratePreview={handleGeneratePreview}
      handleSaveCard={handleSaveCard}
      handleDeleteCard={handleDeleteCard}
      handleGenerateCardsFromSource={handleGenerateCardsFromSource}
      generateCardAudio={generateCardAudio}
      fetchSources={fetchSources}
      fetchCards={fetchCards}
      handleUploadFile={handleUploadFile}
      handleUploadAudio={handleUploadAudio}
      handleUploadAudioFolder={handleUploadAudioFolder}
      handlePasteImage={handlePasteImage}
      handleInsertPastedText={handleInsertPastedText}
      handleChatFileDrop={handleChatFileDrop}
      handleChatPasteImage={handleChatPasteImage}
      handleSaveInputAsSource={handleSaveInputAsSource}
      handleGenerateCardsFromText={handleGenerateCardsFromText}
      handleRetryFailedItems={handleRetryFailedItems}
      handleSaveNote={handleSaveNote}
      
      messages={messages}
      chatInput={chatInput}
      setChatInput={setChatInput}
      chatLoading={chatLoading}
      handleSendMessage={handleSendMessage}
      handleClearChatHistory={() => {
        setMessages([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CHAT_STORAGE_KEY);
        }
      }}
      
      sourcePanelWidth={sourcePanelWidth}
      studioPanelWidth={studioPanelWidth}
      startResizingSource={startResizingSource}
      startResizingStudio={startResizingStudio}
      workspaceLayoutRef={workspaceLayoutRef}
    />
    </>
  );
}
