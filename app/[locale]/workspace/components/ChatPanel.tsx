'use client';

import { WorkspaceViewProps } from '../types';

export function ChatPanel(props: WorkspaceViewProps) {
  const {
    t, workspaceT, cardT,
    paymentSuccess, setPaymentSuccess,
    preview,
    cardText, setCardText,
    cardLoading, cardError,
    includePronunciation, setIncludePronunciation,
    handleGeneratePreview, handleSaveCard,
    sources, setShowAddSourceModal
  } = props;

  return (
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
        {!preview && !cardText && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {workspaceT('addSourceToStart')}
            </p>
            <button 
              onClick={() => setShowAddSourceModal(true)}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
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
        <span>{workspaceT('sourcesCount', { count: sources.length })}</span>
        <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
