/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { WorkspaceViewProps } from '../types';

export function StudioPanel(props: WorkspaceViewProps) {
  const {
    workspaceT, cardT, locale,
    isStudioPanelCollapsed, setIsStudioPanelCollapsed,
    cards, cardsLoading, cardsError,
    total, totalPages, page, setPage,
    searchQuery, setSearchQuery, debouncedSearchQuery,
    selectedCardId, setSelectedCardId,
    generateCardAudio, fetchCards
  } = props;

  if (isStudioPanelCollapsed) {
    return (
      <div className="w-12 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col items-center py-2 border-l border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsStudioPanelCollapsed(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="展开Studio面板"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 flex flex-col">
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
                  {cards.map((card: any) => (
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
                  <div className="flex items-center justify-end">
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
