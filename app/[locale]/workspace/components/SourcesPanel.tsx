'use client';

import { WorkspaceViewProps } from '../types';

export function SourcesPanel(props: WorkspaceViewProps) {
  const {
    locale, workspaceT,
    isSourcePanelCollapsed, setIsSourcePanelCollapsed,
    sources, sourcesLoading, setShowAddSourceModal,
    setShowPasteTextModal,
    showSourceMenuId, setShowSourceMenuId,
    editingSourceId, setEditingSourceId,
    editingSourceName, setEditingSourceName,
    fetchSources, 
    setSourceContent, setSelectedSourceId, selectedSourceId,
    handleUploadFile, handleUploadAudio,
    handlePasteImage,
    sourceContent
  } = props;

  // 如果有选中的来源，显示来源内容视图
  if (props.selectedSourceId) {
    const selectedSource = sources.find(s => s.id === props.selectedSourceId);
    
    return (
      <div style={{ width: props.isSourcePanelCollapsed ? 'auto' : '100%' }} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* 面板标题 */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {workspaceT('source')}
          </h2>
          <button 
            onClick={() => setIsSourcePanelCollapsed(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="收起来源面板"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* 来源内容头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white truncate pr-2" title={selectedSource?.name}>
            {selectedSource?.name || '来源内容'}
          </h3>
          <button
            onClick={() => {
              setSelectedSourceId(null);
              setSourceContent('');
            }}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 来源内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose dark:prose-invert max-w-none prose-sm">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
              {sourceContent || '正在加载内容...'}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (isSourcePanelCollapsed) {
    return (
      <div className="w-12 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center py-2">
        <button
          onClick={() => setIsSourcePanelCollapsed(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
          aria-label="展开来源面板"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: props.isSourcePanelCollapsed ? 'auto' : '100%' }} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      {/* 面板标题 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {workspaceT('source')}
        </h2>
        <button 
          onClick={() => setIsSourcePanelCollapsed(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="收起来源面板"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 添加来源按钮 - 已移除，因为下方有快捷操作 */}
      {/* <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
          onClick={() => setShowAddSourceModal(true)}
          className="w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {workspaceT('addSource')}
          </button>
      </div> */}


      {/* 来源操作按钮 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => {
              setShowAddSourceModal(false);
              setShowPasteTextModal(true);
            }}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">{workspaceT('copiedText')}</span>
          </button>

          <button 
            onClick={handleUploadFile}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">{workspaceT('uploadFile')}</span>
          </button>

          <button 
            onClick={handleUploadAudio}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">上传音频</span>
          </button>

          <button 
            onClick={handlePasteImage}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">复制的图片</span>
          </button>
        </div>
      </div>

      {/* 已保存的来源列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {sourcesLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs mt-2">加载中...</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium mb-1">{workspaceT('savedSources')}</p>
            <p className="text-xs">{workspaceT('addSourceHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
              {workspaceT('savedSources')} ({sources.length})
            </p>
            {sources.map((source) => (
              <div
                key={source.id}
                onClick={async () => {
                  if (editingSourceId === source.id) return;
                  try {
                    const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                    const headers = getAnonymousHeaders();
                    setSelectedSourceId(source.id);
                    setSourceContent('');
                    
                    const res = await fetch(`/api/sources/${source.id}`, { headers });
                    const response = await res.json();
                    if (res.ok && response.success) {
                      setSourceContent(response.data.source.content || '');
                      // setShowSourceViewModal(true); // Now we show content in panel, not modal
                    }
                  } catch (error) {
                    console.error('Failed to fetch source content:', error);
                  }
                }}
                className={`group relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer ${selectedSourceId === source.id ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
              >
                {editingSourceId === source.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingSourceName}
                      onChange={(e) => setEditingSourceName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          // 保存重命名
                          try {
                            const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                            const headers = getAnonymousHeaders();
                            const res = await fetch(`/api/sources/${source.id}`, {
                              method: 'PATCH',
                              headers: { ...headers, 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: editingSourceName }),
                            });
                            if (res.ok) {
                              await fetchSources();
                              setEditingSourceId(null);
                              setEditingSourceName('');
                            }
                          } catch (error) {
                            console.error('Failed to rename source:', error);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingSourceId(null);
                          setEditingSourceName('');
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-indigo-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
          <button
                      onClick={async () => {
                        try {
                          const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                          const headers = getAnonymousHeaders();
                          const res = await fetch(`/api/sources/${source.id}`, {
                            method: 'PATCH',
                            headers: { ...headers, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: editingSourceName }),
                          });
                          if (res.ok) {
                            await fetchSources();
                            setEditingSourceId(null);
                            setEditingSourceName('');
                          }
                        } catch (error) {
                          console.error('Failed to rename source:', error);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      ✓
          </button>
          <button
                      onClick={() => {
                        setEditingSourceId(null);
                        setEditingSourceName('');
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      ✕
          </button>
              </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedSourceId === source.id}
                        onChange={() => {}} // Click is handled by the parent div
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {source.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(source.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="relative source-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSourceMenuId(showSourceMenuId === source.id ? null : source.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {showSourceMenuId === source.id && (
                          <div className="absolute right-0 top-8 z-10 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                            <button
                              onClick={async () => {
                                try {
                                  const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                                  const headers = getAnonymousHeaders();
                                  const res = await fetch(`/api/sources/${source.id}`, { headers });
                                  const response = await res.json();
                                  if (res.ok && response.success) {
                                    setSourceContent(response.data.source.content || '');
                                    setSelectedSourceId(source.id);
                                    // setShowSourceViewModal(true);
                                    setShowSourceMenuId(null);
                                  }
                                } catch (error) {
                                  console.error('Failed to fetch source content:', error);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              查看
                            </button>
                            <button
                              onClick={() => {
                                setEditingSourceId(source.id);
                                setEditingSourceName(source.name);
                                setShowSourceMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              重命名
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('确定要删除这个来源吗？')) {
                                  try {
                                    const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                                    const headers = getAnonymousHeaders();
                                    const res = await fetch(`/api/sources/${source.id}`, {
                                      method: 'DELETE',
                                      headers,
                                    });
                                    if (res.ok) {
                                      await fetchSources();
                                      setShowSourceMenuId(null);
                                    }
                                  } catch (error) {
                                    console.error('Failed to delete source:', error);
                                  }
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
