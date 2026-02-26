/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { WorkspaceViewProps } from '../types';

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
    generateCardAudio
  } = props;

  const selectedSource = sources.find(s => s.id === selectedSourceId);

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
          {/* 闪卡 - 高亮显示 */}
                  <button
            onClick={handleGenerateCardsFromSource}
            disabled={props.cardLoading}
            className={`p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border-2 border-indigo-500 dark:border-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-300 transition-colors text-left col-span-2 ${props.cardLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                {props.cardLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                ) : (
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                  {props.cardLoading ? '正在批量生成...' : workspaceT('generateAIFlashcards')}
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  {workspaceT('flashcards')}
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
    </div>
  );
}
