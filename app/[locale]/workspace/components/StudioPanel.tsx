/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceViewProps } from '../types';

// 间隔重复学习卡片类型
type StudyCard = {
  id: string;
  frontContent: string;
  backContent: string;
  cardType: string;
  audioUrl?: string;
  kanaText?: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
};

type StudyStats = {
  new: number;
  review: number;
  total: number;
};

// Strip markdown code fence wrappers from content
function preprocessContent(content: string): string {
  if (!content) return '';
  let result = content.trim();
  
  // Method 1: Try to match complete code fence block
  // Pattern: ```markdown<content>``` or ```<content>```
  const completeMatch = result.match(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/i);
  if (completeMatch) {
    return completeMatch[1].trim();
  }
  
  // Method 2: Aggressively strip fence patterns
  // Remove opening fence at start (```markdown or ``` followed by optional language)
  result = result.replace(/^```(?:markdown|\w*)?\s*/i, '');
  // Remove closing fence at end
  result = result.replace(/\s*```\s*$/, '');
  
  return result.trim();
}

export function StudioPanel(props: WorkspaceViewProps) {
  const {
    workspaceT, cardT,     locale,
    isStudioPanelCollapsed, setIsStudioPanelCollapsed,
    activeStudioTab, setActiveStudioTab,
    cards, cardsLoading, cardsError,
    total, totalPages, page, setPage,
    searchQuery, setSearchQuery, debouncedSearchQuery,
    selectedCardId, setSelectedCardId,
    showCardMenuId, setShowCardMenuId,
    selectedSourceId, sources,
    handleGenerateCardsFromSource,
    handleDeleteCard,
    generateCardAudio,
    currentWorkspaceDeck
  } = props;

  const selectedSource = sources.find(s => s.id === selectedSourceId);
  
  // 间隔重复学习状态
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [studyType, setStudyType] = useState<'word' | 'sentence' | 'all'>('all');
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [studyStats, setStudyStats] = useState<StudyStats>({ new: 0, review: 0, total: 0 });
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyCompleted, setStudyCompleted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 获取待学习的卡片
  const fetchStudyCards = useCallback(async () => {
    setStudyLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const params = new URLSearchParams();
      if (currentWorkspaceDeck && currentWorkspaceDeck !== 'default') {
        params.append('deck', currentWorkspaceDeck);
      }
      if (studyType !== 'all') {
        params.append('type', studyType);
      }
      params.append('limit', '50');

      const res = await fetch(`/api/cards/study?${params.toString()}`, { headers });
      const result = await res.json();
      const data = result.data || result; // 兼容包装和非包装响应
      
      if (data.cards) {
        setStudyCards(data.cards);
        setStudyStats(data.stats || { new: 0, review: 0, total: data.cards.length });
        setCurrentStudyIndex(0);
        setShowAnswer(false);
        setStudyCompleted(data.cards.length === 0);
      }
    } catch (err) {
      console.error('Failed to fetch study cards:', err);
    } finally {
      setStudyLoading(false);
    }
  }, [currentWorkspaceDeck, studyType]);

  // 提交复习结果
  const submitReview = async (rating: number) => {
    const currentCard = studyCards[currentStudyIndex];
    if (!currentCard) return;

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      await fetch('/api/cards/review', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: currentCard.id, rating }),
      });

      // 移动到下一张卡片
      if (currentStudyIndex < studyCards.length - 1) {
        setCurrentStudyIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        setStudyCompleted(true);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  // 开始学习时获取卡片
  useEffect(() => {
    if (showStudyModal) {
      fetchStudyCards();
    }
  }, [showStudyModal, fetchStudyCards]);

  // 播放音频
  const playAudio = () => {
    const currentCard = studyCards[currentStudyIndex];
    if (currentCard?.audioUrl && audioRef.current) {
      audioRef.current.src = currentCard.audioUrl;
      audioRef.current.play();
    }
  };

  // 当前学习的卡片
  const currentCard = studyCards[currentStudyIndex];

  if (isStudioPanelCollapsed) {
    return (
      <div className="w-12 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col items-center py-2 border-l border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsStudioPanelCollapsed(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="展开Studio面板"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: props.isStudioPanelCollapsed ? 'auto' : '100%' }} className="flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col h-full min-h-0">
      {/* 面板标题 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {workspaceT('studio')}
        </h2>
        <button 
          onClick={() => setIsStudioPanelCollapsed(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="收起Studio面板"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Studio 输出选项网格 */}
      <div className="flex-shrink-0 p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* 制作闪卡 */}
          <button
            onClick={handleGenerateCardsFromSource}
            disabled={props.cardLoading}
            className={`p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border-2 border-indigo-500 dark:border-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-300 transition-colors text-left ${props.cardLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                {props.cardLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                ) : (
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 truncate">
                  {props.cardLoading ? '生成中...' : '制作'}
                </p>
              </div>
            </div>
          </button>
          
          {/* 学习闪卡 */}
          <button
            onClick={() => setShowStudyModal(true)}
            className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border-2 border-green-500 dark:border-green-400 hover:border-green-600 dark:hover:border-green-300 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 truncate">
                  学习
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 卡片列表（在 Studio 面板底部） */}
      <div className="border-t border-gray-200 dark:border-gray-700 flex flex-col flex-1 min-h-0">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveStudioTab('WORD')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeStudioTab === 'WORD'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            单词
          </button>
          <button
            onClick={() => setActiveStudioTab('SENTENCE')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeStudioTab === 'SENTENCE'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            句子
          </button>
          <button
            onClick={() => setActiveStudioTab('NOTE')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeStudioTab === 'NOTE'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            笔记
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              {activeStudioTab === 'NOTE' ? '我的笔记' : activeStudioTab === 'WORD' ? '单词卡片' : '句子卡片'}
            </h3>
            {total > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {total}
              </span>
            )}
          </div>
          {selectedSource && (
            <div className="mb-2 p-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 truncate">
                  仅显示来自: {selectedSource.name}
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  props.setSelectedSourceId(null);
                }}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
                <input
                  type="text"
            placeholder={activeStudioTab === 'NOTE' ? '搜索笔记内容...' : cardT('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
          />
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
              {debouncedSearchQuery ? cardT('noSearchResults') : (activeStudioTab === 'NOTE' ? '还没有笔记' : cardT('noCardsYet'))}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cards.map((card: any) => (
                    <div
                      key={card.id}
                      onClick={async () => {
                        setSelectedCardId(card.id);
                        // 如果卡片没有音频，自动生成
                        if (!card.audioUrl) {
                          await generateCardAudio(card);
                        }
                      }}
                      className={`group relative w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                        selectedCardId === card.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-600'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
                          {preprocessContent(card.frontContent)}
                        </p>
                        <div className="relative card-menu-container flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCardMenuId(showCardMenuId === card.id ? null : card.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {showCardMenuId === card.id && (
                            <div className="absolute right-0 top-8 z-20 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id);
                                  setShowCardMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {cardT('delete') || '删除'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          {card.pageNumber && (
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                              第 {card.pageNumber} 页
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(card.createdAt).toLocaleDateString(locale)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                      disabled={page === 1}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                  {cardT('previousPage')}
                    </button>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {cardT('pageInfo', { page, totalPages })}
                    </span>
                    <button
                      onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
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
      
      {/* 学习模态框 */}
      {showStudyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  闪卡学习
                </h2>
                {/* 类型选择 */}
                <select
                  value={studyType}
                  onChange={(e) => setStudyType(e.target.value as 'word' | 'sentence' | 'all')}
                  className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">全部</option>
                  <option value="word">单词</option>
                  <option value="sentence">句子</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                {/* 统计 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    新 {studyStats.new}
                  </span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    复习 {studyStats.review}
                  </span>
                </div>
                <button
                  onClick={() => setShowStudyModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              {studyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : studyCompleted ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {studyCards.length === 0 ? '没有待学习的卡片' : '今日学习完成！'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {studyCards.length === 0 ? '请先创建一些卡片' : '明天再来复习吧'}
                  </p>
                </div>
              ) : currentCard ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* 进度 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4 flex-shrink-0">
                    <span>{currentStudyIndex + 1} / {studyCards.length}</span>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {currentCard.cardType}
                    </span>
                  </div>
                              
                  {/* 卡片正面 - 独立滚动 */}
                  <div className="flex-1 min-h-0 overflow-y-auto mb-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 text-center">
                      <p className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
                        {currentCard.frontContent}
                      </p>
                      {currentCard.audioUrl && (
                        <button
                          onClick={playAudio}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                          播放发音
                        </button>
                      )}
                    </div>
                  </div>
                              
                  {/* 显示答案按钮 / 答案内容 */}
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex-shrink-0"
                    >
                      显示答案
                    </button>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      {/* 答案内容 - 独立滚动 */}
                      <div className="flex-1 min-h-0 overflow-y-auto mb-3">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 h-full">
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none h-full overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: preprocessContent(currentCard.backContent) }}
                          />
                        </div>
                      </div>
                                  
                      {/* 评分按钮 - 固定在底部 */}
                      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                        <button
                          onClick={() => submitReview(1)}
                          className="py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <div className="text-lg">重来</div>
                          <div className="text-xs opacity-70">10 分钟</div>
                        </button>
                        <button
                          onClick={() => submitReview(2)}
                          className="py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          <div className="text-lg">困难</div>
                          <div className="text-xs opacity-70">1 天</div>
                        </button>
                        <button
                          onClick={() => submitReview(3)}
                          className="py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <div className="text-lg">记得</div>
                          <div className="text-xs opacity-70">{currentCard.interval <= 1 ? '1 天' : `${Math.round(currentCard.interval * currentCard.easeFactor)}天`}</div>
                        </button>
                        <button
                          onClick={() => submitReview(4)}
                          className="py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <div className="text-lg">简单</div>
                          <div className="text-xs opacity-70">{currentCard.interval <= 1 ? '4 天' : `${Math.round(currentCard.interval * currentCard.easeFactor * 1.3)}天`}</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            
            {/* 隐藏的音频播放器 */}
            <audio ref={audioRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
