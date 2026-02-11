/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useEffect } from 'react';
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
    handleSaveNote
  } = props;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full relative">
      {/* 面板标题 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 z-10">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {workspaceT('chat')}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">Qwen Plus</span>
        </div>
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {message.data?.cards?.map((card: { id: string; frontContent: string }) => (
                            <div 
                              key={card.id}
                              className="text-[11px] p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 truncate"
                            >
                              {card.frontContent}
                            </div>
                          ))}
                        </div>
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
                              return <table className="border-collapse border border-gray-300 dark:border-gray-600 my-2 w-full">{children}</table>;
                            },
                            th({ children }) {
                              return <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800 font-semibold text-left">{children}</th>;
                            },
                            td({ children }) {
                              return <td className="border border-gray-300 dark:border-gray-600 p-2">{children}</td>;
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  {message.role === 'assistant' && (message.type === 'analysis' || message.type === 'chat') && (
                    <button
                      onClick={() => handleSaveNote(message.content)}
                      className="text-[10px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                      title="保存到我的笔记"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      保存笔记
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
        {chatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 聊天输入区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="relative group">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="输入日文句子或提问..."
            rows={1}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-sm transition-all min-h-[48px] max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!chatInput.trim() || chatLoading}
            className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2">
          由 Qwen 提供支持 · 聊天记录将自动保存
        </p>
      </div>
    </div>
  );
}
