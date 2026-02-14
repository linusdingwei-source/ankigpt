/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
import { WorkspaceViewProps } from './types';
import { SourcesPanel } from './components/SourcesPanel';
import { ChatPanel } from './components/ChatPanel';
import { StudioPanel } from './components/StudioPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function WorkspaceView(props: WorkspaceViewProps) {
  const {
    locale, session, t,
    currentWorkspaceDeck, credits,
    showSourceViewModal, setShowSourceViewModal, selectedSourceId, setSelectedSourceId, sources, sourceContent, setSourceContent,
    selectedCard, setSelectedCardId, cardT, handleDeleteCard
  } = props;

  const preprocessContent = (content: string) => {
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
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
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
                    ? (
                      <span className="flex items-center gap-2">
                        <span className="opacity-60 font-normal text-sm">{t('common.appName')}</span>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <span>{currentWorkspaceDeck}</span>
                      </span>
                    )
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

      {/* 三栏布局 - Resizable */}
      <div ref={props.workspaceLayoutRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Sources */}
        <div 
          style={{ width: props.isSourcePanelCollapsed ? '48px' : `${props.sourcePanelWidth}px` }} 
          className="flex-shrink-0 flex flex-col min-w-0"
        >
          <SourcesPanel {...props} />
        </div>

        {/* Left Resize Handle - 放置在 Sources 和 Chat 之间 */}
        {!props.isSourcePanelCollapsed && (
          <div
            className="w-1.5 flex-shrink-0 bg-transparent hover:bg-indigo-500/30 cursor-col-resize flex items-center justify-center transition-colors group z-10"
            onMouseDown={props.startResizingSource}
            title="拖动调整来源面板宽度"
          >
            <div className="w-[1px] h-full bg-gray-200 dark:bg-gray-700 group-hover:bg-indigo-500" />
            <div className="absolute w-0.5 h-8 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0 group-hover:opacity-100" />
          </div>
        )}

        {/* Middle Panel - Chat */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ChatPanel {...props} />
        </div>

        {/* Right Resize Handle - 放置在 Chat 和 Studio 之间 */}
        {!props.isStudioPanelCollapsed && (
          <div
            className="w-1.5 flex-shrink-0 bg-transparent hover:bg-indigo-500/30 cursor-col-resize flex items-center justify-center transition-colors group z-10"
            onMouseDown={props.startResizingStudio}
            title="拖动调整 Studio 面板宽度"
          >
            <div className="w-[1px] h-full bg-gray-200 dark:bg-gray-700 group-hover:bg-indigo-500" />
            <div className="absolute w-0.5 h-8 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0 group-hover:opacity-100" />
          </div>
        )}

        {/* Right Panel - Studio */}
        <div 
          style={{ width: props.isStudioPanelCollapsed ? '48px' : `${props.studioPanelWidth}px` }} 
          className="flex-shrink-0 flex flex-col min-w-0"
        >
          <StudioPanel {...props} />
        </div>
      </div>

      {/* Modals integrated into SourcesPanel - no longer need these separate modals for source/paste */}
      {/* However, SourcesPanel only displays them inside itself. If we want them to overlay ONLY when prompted
          and stay within the left panel, we need SourcesPanel to handle the rendering logic.
          Currently SourcesPanel takes showAddSourceModal props but doesn't render the add UI inside itself yet.
          The user requested "Modal box directly reuses the space of the source component".
          I will remove these modals from here and move the JSX to SourcesPanel.tsx in the next step.
      */}
      
      {/* 卡片详情模态框 */}
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
                            {preprocessContent(selectedCard.frontContent)}
                          </p>
                        </div>
                      </div>

                      <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {selectedCard.category === 'NOTE' ? '内容' : cardT('backContent')}
                        </h3>
                        <div
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 prose dark:prose-invert max-w-none prose-sm"
                        >
                    {selectedCard.category === 'NOTE' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                        components={{
                          code({ node: _node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md my-2"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={`${className} bg-gray-200 dark:bg-gray-600 px-1 rounded`} {...props}>
                                {children}
                              </code>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="border-collapse w-full text-left text-sm">{children}</table>
                              </div>
                            );
                          },
                          th({ children }) {
                            return <th className="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 font-bold text-gray-900 dark:text-white">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="border-b border-gray-200 dark:border-gray-700 p-3 text-gray-700 dark:text-gray-300">{children}</td>;
                          },
                          h1({ children }) {
                            return <h1 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-4 mt-6 pb-2 border-b border-indigo-100 dark:border-indigo-900/50">{children}</h1>;
                          },
                          h2({ children }) {
                            return <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-5 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              {children}
                            </h2>;
                          },
                          h3({ children }) {
                            return <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 mt-4">{children}</h3>;
                          },
                          hr() {
                            return <hr className="my-6 border-gray-200 dark:border-gray-700" />;
                          },
                          blockquote({ children }) {
                            return <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic bg-indigo-50/50 dark:bg-indigo-900/20 my-4 rounded-r-lg">{children}</blockquote>;
                          }
                        }}
                      >
                        {preprocessContent(selectedCard.backContent)}
                      </ReactMarkdown>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: preprocessContent(selectedCard.backContent) }} />
                    )}
                  </div>
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
