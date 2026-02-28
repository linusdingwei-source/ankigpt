/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { WorkspaceViewProps } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function ChatPanel(props: WorkspaceViewProps) {
  const {
    workspaceT,
    messages, chatInput, setChatInput, chatLoading, handleSendMessage,
    handleSaveNote, handleChatFileDrop, handleChatPasteImage, handleGenerateCardsFromText,
    handleSaveInputAsSource, handleRetryFailedItems, sourcesLoading,
    cardLoading, isPdfGenerating, onCancelPdfGeneration,
    isCardGenerating, onCancelCardGeneration, handleClearChatHistory
  } = props;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // Only auto-scroll if user is near bottom or a new message was added
  const scrollToBottom = (force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Only scroll if near bottom, forced, or new message added
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Force scroll when new message is added (message count increased)
    const forceScroll = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    if (!isUserScrollingRef.current) {
      scrollToBottom(forceScroll);
    }
  }, [messages]);

  // Scroll when loading starts (user sent a message)
  useEffect(() => {
    if (chatLoading) {
      scrollToBottom(true);
    }
  }, [chatLoading]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 拖放状态
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // 处理拖放事件
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleChatFileDrop(files);
    }
  }, [handleChatFileDrop]);

  // 处理粘贴事件
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    handleChatPasteImage(e);
  }, [handleChatPasteImage]);

  const preprocessContent = (content: string) => {
    if (!content) return '';
    let result = content.trim();
    
    // Method 1: Try to match complete code fence block
    const completeMatch = result.match(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/i);
    if (completeMatch) {
      return completeMatch[1].trim();
    }
    
    // Method 2: Aggressively strip fence patterns
    result = result.replace(/^```(?:markdown|\w*)?\s*/i, '');
    result = result.replace(/\s*```\s*$/, '');
    
    return result.trim();
  };

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full relative">
      {/* 面板标题 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 z-10">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {workspaceT('chat')}
        </h2>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChatHistory}
              className="text-[10px] px-1.5 py-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="清除历史记录"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">Qwen Plus</span>
        </div>
      </div>

      {/* 聊天消息区域 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
        onScroll={() => {
          const container = messagesContainerRef.current;
          if (!container) return;
          const { scrollTop, scrollHeight, clientHeight } = container;
          // User is considered "scrolling" if not near the bottom
          isUserScrollingRef.current = scrollHeight - scrollTop - clientHeight > 150;
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">开始日文学习对话</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              您可以直接输入日文句子进行分析，或者从左侧选择来源进行批量处理。
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none shadow-sm'
                }`}>
                  {message.role === 'assistant' ? (
                    message.type === 'flashcards' ? (
                      <div className="space-y-3 min-w-[240px]">
                        <div className="flex items-center gap-2 text-xs font-semibold pb-2 border-b border-gray-200 dark:border-gray-600">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          批量生成结果
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center py-1">
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                            <div className="text-lg font-bold text-green-600">{message.data?.successCount}</div>
                            <div className="text-[10px] text-green-700 dark:text-green-400">成功</div>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                            <div className="text-lg font-bold text-red-600">{message.data?.failCount}</div>
                            <div className="text-[10px] text-red-700 dark:text-red-400">失败</div>
                          </div>
                        </div>
                        {/* 成功的卡片 */}
                        {message.data?.cards && message.data.cards.length > 0 && (
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {message.data.cards.map((card: { id: string; frontContent: string }) => (
                              <div 
                                key={card.id}
                                className="text-[11px] p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 truncate"
                              >
                                {card.frontContent}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* 失败的项目 */}
                        {message.data?.failedItems && message.data.failedItems.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[10px] font-medium text-red-600 dark:text-red-400">失败详情:</div>
                              <button
                                onClick={() => handleRetryFailedItems(message.data?.failedItems?.map((item: { text: string; type?: string }) => ({ text: item.text, type: item.type })) || [])}
                                disabled={cardLoading}
                                className={`text-[10px] px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors ${cardLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                重试失败项
                              </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {message.data.failedItems.map((item: { text: string; type?: string; reason: string }, idx: number) => (
                                <div 
                                  key={idx}
                                  className="text-[10px] p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                                >
                                  <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{item.text}</div>
                                  <div className="text-red-500 dark:text-red-400 mt-0.5">原因: {item.reason}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="markdown-content prose dark:prose-invert prose-sm max-w-none overflow-x-auto">
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
                          {preprocessContent(message.content)}
                        </ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <div className="prose dark:prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {preprocessContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  {/* 保存笔记按钮 - 只在分析结果消息上显示 */}
                  {message.role === 'assistant' && (message.type === 'analysis') && (
                    <button
                      onClick={() => {
                        if (message.data?.audioUrl && message.data?.timestamps) {
                          handleSaveNote(message.content, {
                            name: message.data.sourceName,
                            audioUrl: message.data.audioUrl,
                            timestamps: message.data.timestamps,
                          });
                        } else {
                          handleSaveNote(message.content);
                        }
                      }}
                      className="text-[10px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                      title="保存到我的笔记"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      保存笔记
                    </button>
                  )}
                  {/* 生成闪卡按钮 - 在用户消息上显示（需要LLM分析） */}
                  {message.role === 'user' && message.content.trim().length > 0 && (
                    <button
                      onClick={() => handleGenerateCardsFromText(message.content)}
                      disabled={cardLoading}
                      className={`text-[10px] text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-0.5 transition-colors ${cardLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="生成AI闪卡（需要分析）"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {cardLoading ? '生成中...' : '生成闪卡'}
                    </button>
                  )}
                  {/* 生成闪卡按钮 - 在分析结果上显示（跳过LLM分析，直接用已有分析） */}
                  {message.role === 'assistant' && message.type === 'analysis' && message.data?.originalText && (
                    <button
                      onClick={() => handleGenerateCardsFromText(
                        message.data.originalText,
                        { markdown: message.data.markdown, html: message.data.html, kanaText: message.data.kanaText }
                      )}
                      disabled={cardLoading}
                      className={`text-[10px] text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-0.5 transition-colors ${cardLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="生成AI闪卡（使用已有分析）"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {cardLoading ? '生成中...' : '生成闪卡'}
                    </button>
                  )}
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        {/* Standalone cancel buttons when generation in progress but not chatLoading */}
        {!chatLoading && (isPdfGenerating || isCardGenerating) && (
          <div className="flex justify-start mb-2">
            <div className="flex items-center gap-2">
              {isPdfGenerating && (
                <button
                  onClick={onCancelPdfGeneration}
                  className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1.5 shadow-sm"
                  title="取消PDF处理"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消PDF处理
                </button>
              )}
              {isCardGenerating && !isPdfGenerating && (
                <button
                  onClick={onCancelCardGeneration}
                  className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1.5 shadow-sm"
                  title="取消卡片生成"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消卡片生成
                </button>
              )}
            </div>
          </div>
        )}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              {/* Cancel button for PDF processing */}
              {isPdfGenerating && (
                <button
                  onClick={onCancelPdfGeneration}
                  className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                  title="取消PDF处理"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消PDF处理
                </button>
              )}
              {/* Cancel button for card generation */}
              {isCardGenerating && !isPdfGenerating && (
                <button
                  onClick={onCancelCardGeneration}
                  className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                  title="取消卡片生成"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消卡片生成
                </button>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 聊天输入区域 */}
      <div 
        className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className={`relative group transition-all duration-200 ${isDragging ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-2xl' : ''}`}>
          {/* 拖放提示遮罩 */}
          {isDragging && (
            <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border-2 border-dashed border-indigo-400 flex items-center justify-center z-10">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">拖放图片或音频文件</p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">支持 PNG, JPG, MP3, WAV 等格式</p>
              </div>
            </div>
          )}
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            placeholder="输入日文句子或提问... (可粘贴文本、拖放图片/音频)"
            rows={1}
            className="w-full pl-4 pr-24 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-sm transition-all min-h-[48px] max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          {/* 按钮组 */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* 保存为资源按钮 - 当有较长文本时显示 */}
            {chatInput.trim().length >= 5 && (
              <button
                onClick={handleSaveInputAsSource}
                disabled={sourcesLoading}
                className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                title="保存为资源"
              >
                {sourcesLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
              </button>
            )}
            {/* 发送按钮 */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || chatLoading}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              title="发送消息"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2">
          由 Qwen 提供支持 · 粘贴文本后点击绿色按钮保存为资源
        </p>
      </div>
    </div>
  );
}
