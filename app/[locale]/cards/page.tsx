'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSession } from 'next-auth/react';

interface Card {
  id: string;
  frontContent: string;
  backContent: string;
  cardType: string;
  audioUrl?: string;
  deckName: string;
  createdAt: string;
}

export default function CardsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [decks, setDecks] = useState<Array<{ id: string; name: string; cardCount: number }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch('/api/decks');
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
      const params = new URLSearchParams();
      if (selectedDeck) {
        params.append('deck', selectedDeck);
      }
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`/api/cards?${params.toString()}`);
      const data = await res.json();
      
      if (data.cards) {
        setCards(data.cards);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      setError('加载卡片失败');
    } finally {
      setLoading(false);
    }
  }, [selectedDeck, page]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDecks();
      fetchCards();
    }
  }, [status, router, selectedDeck, page, fetchDecks, fetchCards]);

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('确定要删除这张卡片吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCards();
      } else {
        throw new Error('删除失败');
      }
    } catch (err) {
      console.error('Delete card error:', err);
      alert('删除卡片失败');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的卡片</h1>
          <Link
            href="/cards/generate"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            生成新卡片
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              筛选牌组:
            </label>
            <select
              value={selectedDeck}
              onChange={(e) => {
                setSelectedDeck(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">全部</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.name}>
                  {deck.name} ({deck.cardCount})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">还没有卡片</p>
            <Link
              href="/cards/generate"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-block"
            >
              生成第一张卡片
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {card.deckName} • {card.cardType}
                      </span>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(card.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                    >
                      删除
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        正面
                      </h3>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-lg">{card.frontContent}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        背面
                      </h3>
                      <div
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: card.backContent }}
                      />
                    </div>

                    {card.audioUrl && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          发音
                        </h3>
                        <audio controls className="w-full">
                          <source src={card.audioUrl} type="audio/mpeg" />
                          您的浏览器不支持音频播放。
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

