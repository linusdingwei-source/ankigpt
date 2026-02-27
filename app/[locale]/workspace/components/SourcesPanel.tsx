'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { WorkspaceViewProps } from '../types';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sourceCount: number;
  createdAt: string;
}

// Parse "filename (Part X of Y).pdf" pattern
function parseSplitPart(name: string): { baseName: string; partNum: number; totalParts: number } | null {
  const match = name.match(/^(.+?)\s*\(Part\s+(\d+)\s+of\s+(\d+)\)\.pdf$/i);
  if (match) {
    return {
      baseName: match[1].trim(),
      partNum: parseInt(match[2], 10),
      totalParts: parseInt(match[3], 10),
    };
  }
  return null;
}

export function SourcesPanel(props: WorkspaceViewProps) {
  const {
    locale, workspaceT,
    isSourcePanelCollapsed, setIsSourcePanelCollapsed,
    sources, sourcesLoading, uploadProgress, setShowAddSourceModal,
    showPasteTextModal, setShowPasteTextModal,
    pastedText, setPastedText,
    showSourceMenuId, setShowSourceMenuId,
    editingSourceId, setEditingSourceId,
    editingSourceName, setEditingSourceName,
    fetchSources, 
    setSourceContent, setSelectedSourceId, selectedSourceId,
    viewingSourceId, setViewingSourceId,
    handleUploadFile, handleUploadAudio, handleUploadAudioFolder,
    handlePasteImage, handleInsertPastedText,
    sourceContent
  } = props;

  // Track which folders are expanded
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Folder management state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [_movingSourceId, setMovingSourceId] = useState<string | null>(null);

  // Delete source confirmation dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    sourceId: string;
    sourceName: string;
    cardCount: number;
  } | null>(null);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/folders', { headers });
      const response = await res.json();
      if (response.success) {
        setFolders(response.data.folders);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Create folder handler
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        await fetchFolders();
        setShowCreateFolderModal(false);
        setNewFolderName('');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  // Delete folder handler
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('确定要删除这个目录吗？目录下的资源将移动到根目录。')) return;
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await fetchFolders();
        await fetchSources();
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  // Move source to folder handler
  const handleMoveSource = async (sourceId: string, folderId: string | null) => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        await fetchSources();
        await fetchFolders();
        setMovingSourceId(null);
        setShowSourceMenuId(null);
      }
    } catch (error) {
      console.error('Failed to move source:', error);
    }
  };

  // Delete source handler - check for associated cards first
  const handleDeleteSource = async (sourceId: string) => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      
      // First, check if there are associated cards
      const checkRes = await fetch(`/api/sources/${sourceId}?checkOnly=true`, {
        method: 'DELETE',
        headers,
      });
      const checkData = await checkRes.json();
      
      if (checkRes.ok && checkData.success) {
        const { cardCount, sourceName } = checkData.data;
        
        if (cardCount > 0) {
          // Show confirmation dialog
          setDeleteConfirmation({
            show: true,
            sourceId,
            sourceName,
            cardCount,
          });
        } else {
          // No cards, delete directly
          if (confirm('确定要删除这个来源吗？')) {
            await performDeleteSource(sourceId, false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check source:', error);
    }
  };

  // Perform the actual deletion
  const performDeleteSource = async (sourceId: string, deleteCards: boolean) => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch(`/api/sources/${sourceId}?deleteCards=${deleteCards}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await fetchSources();
        setShowSourceMenuId(null);
        setDeleteConfirmation(null);
      }
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  // Group sources: split PDFs, audio folders, and user-created folders
  const { groupedSources, folderSources, rootSources } = useMemo(() => {
    const groups: Map<string, { sources: typeof sources; totalParts: number; isAudioFolder?: boolean }> = new Map();
    const ungrouped: typeof sources = [];
    const byFolder: Map<string, typeof sources> = new Map(); // Sources by folder ID
    const root: typeof sources = []; // Sources without folder

    for (const source of sources) {
      // First, separate by user-created folder
      const srcWithFolder = source as typeof source & { folderId?: string | null };
      
      // Check for split PDF pattern
      const parsed = parseSplitPart(source.name);
      
      // Check for audio folder pattern (folder/filename.mp3)
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.aiff', '.opus'];
      const isAudioByType = source.type === 'audio';
      const isAudioByExtension = audioExtensions.some(ext => source.name.toLowerCase().endsWith(ext));
      const isAudio = isAudioByType || isAudioByExtension;
      
      if (parsed && parsed.totalParts > 1) {
        const existing = groups.get(parsed.baseName);
        if (existing) {
          existing.sources.push({ ...source, _partNum: parsed.partNum });
        } else {
          groups.set(parsed.baseName, {
            sources: [{ ...source, _partNum: parsed.partNum }],
            totalParts: parsed.totalParts,
          });
        }
      } else if (isAudio && source.name.includes('/')) {
        const folderPath = source.name.substring(0, source.name.lastIndexOf('/'));
        const fileName = source.name.substring(source.name.lastIndexOf('/') + 1);
        const existing = groups.get(folderPath);
        if (existing) {
          existing.sources.push({ ...source, _fileName: fileName });
        } else {
          groups.set(folderPath, {
            sources: [{ ...source, _fileName: fileName }],
            totalParts: 0,
            isAudioFolder: true,
          });
        }
      } else if (srcWithFolder.folderId) {
        // Source belongs to a user-created folder
        const existing = byFolder.get(srcWithFolder.folderId);
        if (existing) {
          existing.push(source);
        } else {
          byFolder.set(srcWithFolder.folderId, [source]);
        }
      } else {
        ungrouped.push(source);
        root.push(source);
      }
    }

    // Sort each group and finalize
    const sortedGroups: Array<{ baseName: string; sources: typeof sources; totalParts: number; isAudioFolder?: boolean }> = [];
    groups.forEach((group, baseName) => {
      if (group.isAudioFolder) {
        group.sources.sort((a: { _fileName?: string }, b: { _fileName?: string }) => 
          (a._fileName || '').localeCompare(b._fileName || '', undefined, { numeric: true })
        );
        group.totalParts = group.sources.length;
      } else {
        group.sources.sort((a: { _partNum?: number }, b: { _partNum?: number }) => 
          (a._partNum || 0) - (b._partNum || 0)
        );
      }
      sortedGroups.push({ baseName, ...group });
    });

    sortedGroups.sort((a, b) => 
      new Date(b.sources[0]?.createdAt || 0).getTime() - new Date(a.sources[0]?.createdAt || 0).getTime()
    );

    // Convert folder map to object
    const folderSourcesObj: Record<string, typeof sources> = {};
    byFolder.forEach((srcs, folderId) => {
      folderSourcesObj[folderId] = srcs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return { groupedSources: sortedGroups, folderSources: folderSourcesObj, rootSources: root };
  }, [sources]);

  const toggleFolder = (baseName: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(baseName)) {
        next.delete(baseName);
      } else {
        next.add(baseName);
      }
      return next;
    });
  };

  // 粘贴文字视图
  if (showPasteTextModal) {
    return (
      <div style={{ width: props.isSourcePanelCollapsed ? 'auto' : '100%' }} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {workspaceT('pasteCopiedText')}
          </h2>
          <button 
            onClick={() => setShowPasteTextModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {workspaceT('pasteTextInstruction')}
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={workspaceT('pasteTextHere')}
            className="flex-1 w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowPasteTextModal(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {workspaceT('cancel')}
            </button>
            <button
              onClick={handleInsertPastedText}
              disabled={!pastedText.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {workspaceT('insert')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果有正在查看的来源，显示来源内容视图
  if (props.viewingSourceId) {
    const selectedSource = sources.find(s => s.id === props.viewingSourceId);
    const url = selectedSource?.contentUrl || selectedSource?.fileUrl;
    
    return (
      <div style={{ width: props.isSourcePanelCollapsed ? 'auto' : '100%' }} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full min-h-0">
        {/* 紧凑头部：文件名 + 工具按钮 + 关闭按钮 */}
        <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <h3 className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate" title={selectedSource?.name}>
            {selectedSource?.name || '来源内容'}
          </h3>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="新窗口打开"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {url && (
            <a
              href={url}
              download={selectedSource?.name}
              className="flex-shrink-0 p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="下载"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
          <button
            onClick={() => {
              setViewingSourceId(null);
              setSourceContent('');
            }}
            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 来源内容 - 填充剩余空间 */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {(() => {
            const isImage = selectedSource?.type === 'image';
            const isAudio = selectedSource?.type === 'audio';
            const isPdf = selectedSource?.mimeType === 'application/pdf' || selectedSource?.name?.toLowerCase().endsWith('.pdf');

            if (isImage && url) {
              const fullUrl = url.startsWith('http') ? url : url.startsWith('//') ? `https:${url}` : url;
              
              return (
                <div className="flex-1 min-h-0 overflow-auto p-2">
                  <img 
                    src={fullUrl} 
                    alt={selectedSource?.name} 
                    referrerPolicy="no-referrer"
                    className="max-w-full rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      console.error('Image failed to load:', fullUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const errorSibling = target.nextElementSibling as HTMLElement;
                      if (errorSibling) errorSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500">
                    <svg className="w-12 h-12 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">图片加载失败</p>
                  </div>
                </div>
              );
            } else if (isAudio && url) {
              return (
                <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                  <audio controls src={url} className="w-full max-w-md" />
                </div>
              );
            } else if (isPdf && url) {
              return (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <iframe
                    src={url}
                    className="w-full h-full border-0"
                    title={selectedSource?.name || 'PDF Viewer'}
                  />
                </div>
              );
            } else {
              // 文本内容
              return (
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    {sourceContent || '正在加载内容...'}
                  </pre>
                </div>
              );
            }
          })()}
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
    <div style={{ width: props.isSourcePanelCollapsed ? 'auto' : '100%' }} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col min-h-0 h-full">
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
        <div className="grid grid-cols-3 gap-2">
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
            onClick={handleUploadAudioFolder}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">音频文件夹</span>
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

          <button 
            onClick={() => setShowCreateFolderModal(true)}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">创建目录</span>
          </button>
        </div>
      </div>

      {/* 创建目录弹窗 */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">创建新目录</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="目录名称"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowCreateFolderModal(false); setNewFolderName(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除来源确认弹窗 */}
      {deleteConfirmation?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">删除确认</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              来源 <span className="font-medium text-gray-900 dark:text-white">&ldquo;{deleteConfirmation.sourceName}&rdquo;</span> 关联了 <span className="font-bold text-indigo-600">{deleteConfirmation.cardCount}</span> 张卡片。
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">请选择删除方式：</p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => performDeleteSource(deleteConfirmation.sourceId, false)}
                className="w-full px-4 py-3 text-left text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">仅删除来源</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">保留卡片，卡片将不再关联此来源</div>
              </button>
              <button
                onClick={() => performDeleteSource(deleteConfirmation.sourceId, true)}
                className="w-full px-4 py-3 text-left text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <div className="font-medium text-red-600 dark:text-red-400">删除来源和关联卡片</div>
                <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">同时删除 {deleteConfirmation.cardCount} 张卡片（不可恢复）</div>
              </button>
            </div>
            <button
              onClick={() => setDeleteConfirmation(null)}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 已保存的来源列表 */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {sourcesLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            {uploadProgress.phase === 'splitting' ? (
              <>
                <p className="text-xs mt-2 font-medium text-indigo-600 dark:text-indigo-400">正在分割PDF...</p>
                <p className="text-xs mt-1 text-gray-400 truncate px-2">{uploadProgress.fileName}</p>
              </>
            ) : uploadProgress.phase === 'uploading' && uploadProgress.total > 1 ? (
              <>
                <p className="text-xs mt-2 font-medium text-indigo-600 dark:text-indigo-400">
                  上传中 {uploadProgress.current}/{uploadProgress.total}
                </p>
                <div className="mt-2 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs mt-1 text-gray-400 truncate px-2">{uploadProgress.fileName}</p>
              </>
            ) : (
              <p className="text-xs mt-2">加载中...</p>
            )}
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

            {/* Grouped (split PDF and audio folder) sources as folders */}
            {groupedSources.map((group) => (
              <div key={group.baseName} className="mb-2">
                {/* Folder header */}
                <div
                  onClick={() => toggleFolder(group.baseName)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 ${group.isAudioFolder ? 'text-violet-500' : 'text-yellow-500'} transition-transform ${expandedFolders.has(group.baseName) ? 'rotate-90' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {group.isAudioFolder ? (
                    <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  )}
                  <span 
                    className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 cursor-help"
                    title={`${group.baseName} (${group.sources.length} ${group.isAudioFolder ? '音频' : 'parts'})`}
                  >
                    {group.baseName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {group.sources.length} {group.isAudioFolder ? '首' : '份'}
                  </span>
                </div>

                {/* Expanded folder contents */}
                {expandedFolders.has(group.baseName) && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                    {group.sources.map((source: typeof sources[0] & { _partNum?: number; _fileName?: string }) => {
                      // Display file name for audio folders, or full name for PDFs
                      const displayName = source._fileName || source.name;
                      const isAudio = source.type === 'audio';
                      return (
                        <div
                          key={source.id}
                onClick={async () => {
                  if (editingSourceId === source.id) return;
                  try {
                    const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                    const headers = getAnonymousHeaders();
                    // 点击整个项目：同时选中(打勾)并查看内容
                    setSelectedSourceId(source.id);
                    setViewingSourceId(source.id);
                    setSourceContent('');
                    
                    const res = await fetch(`/api/sources/${source.id}`, { headers });
                    const response = await res.json();
                    if (res.ok && response.success) {
                      setSourceContent(response.data.source.content || '');
                    }
                  } catch (error) {
                    console.error('Failed to fetch source content:', error);
                  }
                }}
                className={`group relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer ${viewingSourceId === source.id ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
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
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止冒泡，不触发查看内容
                          setSelectedSourceId(selectedSourceId === source.id ? null : source.id);
                        }}
                        onChange={() => {}} // 逻辑在 onClick 中
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {isAudio ? (
                        <svg className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-help"
                          title={source.name}
                        >
                          {displayName}
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
                                    setViewingSourceId(source.id);
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
                            {/* Move to folder submenu */}
                            <div className="relative group/move">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-between"
                              >
                                <span className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  移动到
                                </span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <div className="absolute right-full top-0 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 hidden group-hover/move:block before:content-[''] before:absolute before:top-0 before:left-full before:w-4 before:h-full">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMoveSource(source.id, null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  根目录
                                </button>
                                {folders.map(folder => (
                                  <button
                                    key={folder.id}
                                    onClick={(e) => { e.stopPropagation(); handleMoveSource(source.id, folder.id); }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                                  >
                                    {folder.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSource(source.id); }}
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
                    );
                  })}
                  </div>
                )}
              </div>
            ))}

            {/* User-created folders */}
            {folders.map((folder) => (
              <div key={folder.id} className="mb-2">
                {/* Folder header */}
                <div
                  onClick={() => toggleFolder(`folder-${folder.id}`)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors group"
                >
                  <svg 
                    className={`w-4 h-4 text-indigo-500 transition-transform ${expandedFolders.has(`folder-${folder.id}`) ? 'rotate-90' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span 
                    className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1"
                    title={folder.name}
                  >
                    {folder.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {folderSources[folder.id]?.length || 0} 个
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除目录"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Folder contents */}
                {expandedFolders.has(`folder-${folder.id}`) && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-indigo-200 dark:border-indigo-800 pl-2">
                    {(folderSources[folder.id] || []).length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 py-2 italic">空目录</p>
                    ) : (
                      (folderSources[folder.id] || []).map((source) => (
                        <div
                          key={source.id}
                          onClick={async () => {
                            if (editingSourceId === source.id) return;
                            try {
                              const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                              const headers = getAnonymousHeaders();
                              setSelectedSourceId(source.id);
                              setViewingSourceId(source.id);
                              setSourceContent('');
                              const res = await fetch(`/api/sources/${source.id}`, { headers });
                              const response = await res.json();
                              if (res.ok && response.success) {
                                setSourceContent(response.data.source.content || '');
                              }
                            } catch (error) {
                              console.error('Failed to fetch source content:', error);
                            }
                          }}
                          className={`group relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer ${viewingSourceId === source.id ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1 flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={selectedSourceId === source.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSourceId(selectedSourceId === source.id ? null : source.id);
                                }}
                                onChange={() => {}}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                              />
                            </div>
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={source.name}>
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
                                    <div className="relative group/move">
                                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-between">
                                        <span className="flex items-center gap-2">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                          </svg>
                                          移动到
                                        </span>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </button>
                                      <div className="absolute right-full top-0 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 hidden group-hover/move:block before:content-[''] before:absolute before:top-0 before:left-full before:w-4 before:h-full">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleMoveSource(source.id, null); }}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          根目录
                                        </button>
                                        {folders.filter(f => f.id !== folder.id).map(f => (
                                          <button
                                            key={f.id}
                                            onClick={(e) => { e.stopPropagation(); handleMoveSource(source.id, f.id); }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                                          >
                                            {f.name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSource(source.id); }}
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
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Ungrouped (root) sources */}
            {rootSources.map((source) => (
              <div
                key={source.id}
                onClick={async () => {
                  if (editingSourceId === source.id) return;
                  try {
                    const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
                    const headers = getAnonymousHeaders();
                    setSelectedSourceId(source.id);
                    setViewingSourceId(source.id);
                    setSourceContent('');
                    
                    const res = await fetch(`/api/sources/${source.id}`, { headers });
                    const response = await res.json();
                    if (res.ok && response.success) {
                      setSourceContent(response.data.source.content || '');
                    }
                  } catch (error) {
                    console.error('Failed to fetch source content:', error);
                  }
                }}
                className={`group relative p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer ${viewingSourceId === source.id ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedSourceId === source.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSourceId(selectedSourceId === source.id ? null : source.id);
                      }}
                      onChange={() => {}}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-help"
                        title={source.name}
                      >
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
                                  setViewingSourceId(source.id);
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
                          <div className="relative group/move">
                            <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-between">
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                移动到
                              </span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <div className="absolute right-full top-0 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 hidden group-hover/move:block before:content-[''] before:absolute before:top-0 before:left-full before:w-4 before:h-full">
                              {folders.map(folder => (
                                <button
                                  key={folder.id}
                                  onClick={(e) => { e.stopPropagation(); handleMoveSource(source.id, folder.id); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                                >
                                  {folder.name}
                                </button>
                              ))}
                              {folders.length === 0 && (
                                <p className="px-4 py-2 text-xs text-gray-400 italic">暂无目录</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSource(source.id); }}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
