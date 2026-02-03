'use client';

import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
import { WorkspaceViewProps } from './types';
import { SourcesPanel } from './components/SourcesPanel';
import { ChatPanel } from './components/ChatPanel';
import { StudioPanel } from './components/StudioPanel';

export function WorkspaceView(props: WorkspaceViewProps) {
  const {
    locale, session, t,
    currentWorkspaceDeck, credits,
    showAddSourceModal, setShowAddSourceModal, workspaceT,
    showPasteTextModal, setShowPasteTextModal, pastedText, setPastedText, fetchSources,
    showSourceViewModal, setShowSourceViewModal, selectedSourceId, setSelectedSourceId, sources, sourceContent, setSourceContent,
    selectedCard, setSelectedCardId, cardT, handleDeleteCard
  } = props;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                {/* 应用图标 */}
                <div className="w-9 h-9 rounded-[8px] bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {/* 牌组名称 */}
                <h1 className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                  {currentWorkspaceDeck && currentWorkspaceDeck !== 'default'
                    ? currentWorkspaceDeck
                    : t('common.appName')}
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
        <SourcesPanel {...props} />
        <ChatPanel {...props} />
        <StudioPanel {...props} />
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
                <button 
                  onClick={props.handleUploadFile}
                  className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {workspaceT('uploadFile')}
                </button>
                <button 
                  onClick={props.handleUploadAudio}
                  className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  上传音频
                </button>
                <button 
                  onClick={props.handlePasteImage}
                  className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  复制的图片
                </button>
              </div>

              {/* 底部状态栏 */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{workspaceT('addSourceToStart')}</span>
                <span>{workspaceT('sourcesCount', { count: sources.length })}</span>
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

      {/* 粘贴文本模态框 */}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">
                {sources.find(s => s.id === selectedSourceId)?.name || '来源内容'}
              </h2>
              <button
                onClick={() => {
                  setShowSourceViewModal(false);
                  setSelectedSourceId(null);
                  setSourceContent('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const selectedSource = sources.find(s => s.id === selectedSourceId);
                const isImage = selectedSource?.type === 'image';
                const isAudio = selectedSource?.type === 'audio';
                const url = selectedSource?.contentUrl || selectedSource?.fileUrl;

                if (isImage && url) {
                  return (
                    <div className="flex justify-center">
                      <img src={url} alt={selectedSource?.name} className="max-w-full h-auto rounded-lg shadow-sm" />
                    </div>
                  );
                } else if (isAudio && url) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12">
                      <audio controls src={url} className="w-full max-w-md" />
                    </div>
                  );
                } else {
                  return (
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 font-mono">
                        {sourceContent}
                      </pre>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 卡片详情模态框 */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div>
                  <div className="flex items-center gap-2 mb-2">
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
                            {selectedCard.tags.map((tag: string, index: number) => (
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
