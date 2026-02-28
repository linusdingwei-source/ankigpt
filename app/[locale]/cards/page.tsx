'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Card {
  id: string;
  frontContent: string;
  backContent: string;
  cardType: string;
  audioUrl?: string;
  audioFilename?: string;
  timestamps?: Array<{ text: string; begin_time: number; end_time: number }> | null;
  deckName: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CardsPage() {
  const t = useTranslations('AnkiCard');

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [decks, setDecks] = useState<Array<{ id: string; name: string; cardCount?: number }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // 重命名牌组状态
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckName, setEditingDeckName] = useState('');

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // 搜索时重置到第一页
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDecks = useCallback(async () => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/decks', { headers });
      const data = await res.json();
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Failed to fetch decks:', err);
    }
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const params = new URLSearchParams();
      if (selectedDeck) {
        params.append('deck', selectedDeck);
      }
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      params.append('page', page.toString());
      params.append('limit', '50'); // 增加每页数量以便在侧边栏显示更多卡片

      const res = await fetch(`/api/cards?${params.toString()}`, { headers });
      const data = await res.json();
      
      if (data.cards) {
        setCards(data.cards);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        }
        // 如果当前选中的卡片不在列表中，自动选择第一张
        if (data.cards.length > 0) {
          const currentSelectedExists = selectedCardId && data.cards.find((c: Card) => c.id === selectedCardId);
          if (!currentSelectedExists) {
            setSelectedCardId(data.cards[0].id);
          }
        } else {
          setSelectedCardId(null);
        }
      }
    } catch {
      setError(t('fetchCardsFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedDeck, page, debouncedSearchQuery, selectedCardId, t]);

  // 重命名牌组
  const handleRenameDeck = async (deckId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/decks', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: deckId, newName: newName.trim() }),
      });
      
      if (res.ok) {
        const oldDeck = decks.find(d => d.id === deckId);
        // 如果当前选中的牌组是被重命名的牌组，更新选中值
        if (oldDeck && selectedDeck === oldDeck.name) {
          setSelectedDeck(newName.trim());
        }
        await fetchDecks();
        await fetchCards();
      } else {
        const data = await res.json();
        setError(data.message || '重命名失败');
      }
    } catch (err) {
      console.error('Failed to rename deck:', err);
      setError('重命名失败');
    } finally {
      setEditingDeckId(null);
      setEditingDeckName('');
    }
  };

  useEffect(() => {
    // 无论是否登录都获取数据
    fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    // 无论是否登录都获取卡片
    fetchCards();
  }, [fetchCards]);

  const selectedCard = useMemo(() => {
    return cards.find(card => card.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm(t('confirmDeleteMessage', { frontContent: selectedCard?.frontContent || '' }))) {
      return;
    }

    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        // 如果删除的是当前选中的卡片，选择下一张或上一张
        if (cardId === selectedCardId) {
          const currentIndex = cards.findIndex(c => c.id === cardId);
          if (currentIndex > 0) {
            setSelectedCardId(cards[currentIndex - 1].id);
          } else if (cards.length > 1) {
            setSelectedCardId(cards[1].id);
          } else {
            setSelectedCardId(null);
          }
        }
        // 重新获取卡片列表
        await fetchCards();
      } else {
        throw new Error('删除失败');
      }
    } catch (err) {
      console.error('Delete card error:', err);
      alert(t('deleteCardFailed'));
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 移除登录检查，允许未登录用户使用

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* 顶部导航栏 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('myCardsTitle')}
            </h1>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                href="/cards/generate"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('generateNewCardButton')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* 左侧边栏 - 卡片列表 */}
          <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
            {/* 搜索和筛选区域 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
              {/* 搜索框 */}
              <div>
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t('clearSearch')}
                  </button>
                )}
              </div>

              {/* 牌组筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('filterByDeck')}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedDeck}
                    onChange={(e) => {
                      setSelectedDeck(e.target.value);
                      setPage(1);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">{t('allDecks')}</option>
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.name}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                  {/* 重命名按钮 - 仅当选中牌组时显示 */}
                  {selectedDeck && (
                    <button
                      onClick={() => {
                        const deck = decks.find(d => d.name === selectedDeck);
                        if (deck) {
                          setEditingDeckId(deck.id);
                          setEditingDeckName(deck.name);
                        }
                      }}
                      className="px-3 py-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="重命名牌组"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* 统计信息 */}
              {total > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('totalCards', { total })}
                </div>
              )}
            </div>

            {/* 卡片列表 */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : cards.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {debouncedSearchQuery ? t('noSearchResults') : t('noCardsYet')}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedCardId === card.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600'
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
                          {card.frontContent}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {card.deckName}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(card.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t('previousPage')}
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pageInfo', { page, totalPages })}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t('nextPage')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧主内容区 - 卡片详情 */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
            {selectedCard ? (
              <div className="p-6">
                {/* 卡片头部 */}
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                        {selectedCard.deckName}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {selectedCard.cardType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(selectedCard.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCard(selectedCard.id)}
                    className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                  >
                    {t('delete')}
                  </button>
                </div>

                {/* 卡片内容 */}
                <div className="space-y-6">
                  {/* 正面内容 */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                      {t('frontContent')}
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-xl text-gray-900 dark:text-white leading-relaxed">
                        {selectedCard.frontContent}
                      </p>
                    </div>
                  </div>

                  {/* 背面内容 */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                      {t('backContent')}
                    </h3>
                    <div
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedCard.backContent }}
                    />
                  </div>

                  {/* 音频 */}
                  {selectedCard.audioUrl && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        {t('pronunciationPreview')}
                      </h3>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <audio controls className="w-full">
                          <source src={selectedCard.audioUrl} type="audio/mpeg" />
                          {t('audioNotSupported')}
                        </audio>
                      </div>
                    </div>
                  )}

                  {/* 标签 */}
                  {selectedCard.tags && selectedCard.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        标签
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCard.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-12">
                <div className="text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                    {t('noCardSelected')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {t('selectCard')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 重命名牌组模态框 */}
      {editingDeckId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              重命名牌组
            </h3>
            <input
              type="text"
              value={editingDeckName}
              onChange={(e) => setEditingDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameDeck(editingDeckId, editingDeckName);
                } else if (e.key === 'Escape') {
                  setEditingDeckId(null);
                  setEditingDeckName('');
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
              placeholder="输入新的牌组名称..."
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingDeckId(null);
                  setEditingDeckName('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleRenameDeck(editingDeckId, editingDeckName)}
                disabled={!editingDeckName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
