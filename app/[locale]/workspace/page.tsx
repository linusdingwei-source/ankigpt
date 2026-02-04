'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
import { trackPageViewEvent } from '@/lib/analytics';

type ViewMode = 'source' | 'deck';

interface Deck {
  id: string;
  name: string;
  cardCount?: number;
}

export default function WorkspacePage() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session, status } = useSession();
  
  // Panel states
  const [activeTab, setActiveTab] = useState<'source' | 'chat' | 'studio'>('source');
  const [viewMode, setViewMode] = useState<ViewMode>('source');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  
  // Resizable panel states
  const [leftWidth, setLeftWidth] = useState(320); // Source panel width
  const [rightWidth, setRightWidth] = useState(320); // Studio panel width
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch decks
  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
        const headers = getAnonymousHeaders();
        const res = await fetch('/api/decks', { headers });
        const response = await res.json();
        const data = response.success ? response.data : response;
        if (data?.decks) {
          setDecks(data.decks);
        }
      } catch (err) {
        console.error('Failed to fetch decks:', err);
      }
    };
    fetchDecks();
  }, []);

  // Fetch credits
  useEffect(() => {
    const fetchCredits = async () => {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      try {
        const res = await fetch('/api/user/credits', { headers });
        const response = await res.json();
        const data = response.success ? response.data : response;
        if (data?.credits !== undefined) {
          setCredits(data.credits);
        }
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      }
    };
    fetchCredits();
  }, []);

  // Track page view
  useEffect(() => {
    trackPageViewEvent('WORKSPACE', { locale });
  }, [locale]);

  // Handle left resize (Source panel)
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  };

  // Handle right resize (Studio panel)
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      if (isDraggingLeft) {
        const newWidth = e.clientX - containerRect.left;
        if (newWidth >= 280 && newWidth <= 600) {
          setLeftWidth(newWidth);
        }
      }

      if (isDraggingRight) {
        const newWidth = containerRect.right - e.clientX;
        if (newWidth >= 280 && newWidth <= 600) {
          setRightWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

  const handleRestoreSource = () => {
    setViewMode('source');
    setSelectedDeck(null);
  };

  const handleDeckClick = (deckId: string) => {
    setSelectedDeck(deckId);
    setViewMode('deck');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('common.appName')}
              </h1>
            </Link>
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

      {/* Main Workspace - Resizable 3-panel layout */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left Panel - Source / Deck Browser */}
        <div
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
          style={{ width: `${leftWidth}px` }}
        >
          {/* Panel Header with Restore Button */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {viewMode === 'source' ? t('workspace.source') : t('AnkiCard.myCardsTitle')}
            </h2>
            {viewMode === 'deck' && (
              <button
                onClick={handleRestoreSource}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('workspace.source')}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === 'source' ? (
              <div className="space-y-4">
                {/* Source View */}
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('workspace.addSourceToStart')}
                  </p>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    {t('workspace.addSource')}
                  </button>
                </div>

                {/* Decks Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t('AnkiCard.myCardsTitle')}
                  </h3>
                  {decks.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('AnkiCard.noCardsYet')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {decks.map((deck) => (
                        <button
                          key={deck.id}
                          onClick={() => handleDeckClick(deck.id)}
                          className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {deck.name}
                            </span>
                            {deck.cardCount !== undefined && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {deck.cardCount} {t('AnkiCard.deck')}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Deck Browser View */
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {decks.find(d => d.id === selectedDeck)?.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('AnkiCard.totalCards', { total: decks.find(d => d.id === selectedDeck)?.cardCount || 0 })}
                  </p>
                </div>
                {/* Card list will be loaded here */}
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading cards...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Left Resize Handle */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 dark:hover:bg-indigo-600 cursor-col-resize transition-colors"
          onMouseDown={handleLeftMouseDown}
        />

        {/* Middle Panel - Chat */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('workspace.chat')}
            </h2>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('workspace.addSourceHint')}
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Resize Handle */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 dark:hover:bg-indigo-600 cursor-col-resize transition-colors"
          onMouseDown={handleRightMouseDown}
        />

        {/* Right Panel - Studio */}
        <div
          className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col"
          style={{ width: `${rightWidth}px` }}
        >
          {/* Studio Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('workspace.studio')}
            </h2>
          </div>

          {/* Studio Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎬</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('workspace.studioOutputs')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('workspace.studioOutputsHint')}
              </p>
            </div>

            {/* Studio Options */}
            <div className="space-y-2 mt-6">
              <button className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎧</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('workspace.audioOverview')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Generate audio summary
                    </div>
                  </div>
                </div>
              </button>

              <button className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🧠</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('workspace.mindMap')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Create visual mind map
                    </div>
                  </div>
                </div>
              </button>

              <button className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📝</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('workspace.flashcards')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('workspace.generateAIFlashcards')}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
