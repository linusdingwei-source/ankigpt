'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
import { trackPageViewEvent, trackButtonClick } from '@/lib/analytics';

interface Deck {
  id: string;
  name: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'all' | 'my' | 'featured';

export default function HomePageClient({ locale: _locale }: { locale: string }) {
  const t = useTranslations();
  const routerLocale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  // 获取牌组列表
  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取 Credits
  const fetchCredits = useCallback(async () => {
    try {
      const { getAnonymousHeaders } = await import('@/hooks/useAnonymousUser');
      const headers = getAnonymousHeaders();
      const res = await fetch('/api/user/credits', { headers });
      const response = await res.json();
      const data = response.success ? response.data : response;
      if (data?.credits !== undefined) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
    if (status === 'authenticated') {
      fetchCredits();
    }
    trackPageViewEvent('HOME', { locale: routerLocale });
  }, [fetchDecks, fetchCredits, status, routerLocale]);

  // 处理牌组点击
  const handleDeckClick = (deckName: string) => {
    trackButtonClick('DECK_CLICK', 'home_page');
    router.push(`/workspace?deck=${encodeURIComponent(deckName)}`);
  };

  // 处理创建新牌组
  const handleCreateDeck = () => {
    trackButtonClick('CREATE_DECK', 'home_page');
    router.push('/workspace');
  };

  // 过滤牌组
  const filteredDecks = decks.filter(deck => {
    if (activeTab === 'my') return true;
    if (activeTab === 'all') return true;
    if (activeTab === 'featured') return deck.cardCount > 0; // 精选：有卡片的牌组
    return true;
  });

  // 最近打开的牌组（最近3个）
  const recentDecks = decks.slice(0, 3);
  // 精选牌组（有卡片且按卡片数排序的前3个）
  const featuredDecks = [...decks]
    .filter(deck => deck.cardCount > 0)
    .sort((a, b) => b.cardCount - a.cardCount)
    .slice(0, 3);

  // 生成牌组卡片的背景颜色
  const getDeckColor = (index: number) => {
    const colors = [
      'from-purple-400 to-blue-500',
      'from-orange-300 to-pink-400',
      'from-blue-400 to-cyan-500',
      'from-green-400 to-emerald-500',
      'from-yellow-400 to-orange-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧 Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('common.appName')}
              </h1>
            </Link>

            {/* 右侧控制 */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {session?.user ? (
                <UserMenu credits={credits} />
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t('common.login')}
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {t('common.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 导航标签栏 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'all'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'my'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                我的牌组
              </button>
              <button
                onClick={() => setActiveTab('featured')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'featured'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                精选牌组
              </button>
            </div>

            {/* 右侧控制 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateDeck}
                className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="container mx-auto px-4 py-6">
        {/* 精选牌组区域 */}
        {featuredDecks.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">精选牌组</h2>
              {featuredDecks.length > 3 && (
                <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  查看全部 &gt;
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredDecks.map((deck, deckIndex) => (
                <button
                  key={deck.id}
                  onClick={() => handleDeckClick(deck.name)}
                  className="group relative h-48 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all text-left"
                >
                  {/* 背景渐变 */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getDeckColor(deckIndex)} opacity-90`} />
                  
                  {/* 内容 */}
                  <div className="relative h-full p-4 flex flex-col justify-between text-white">
                    <div>
                      <div className="text-xs font-medium mb-2 opacity-90">我的牌组</div>
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">{deck.name}</h3>
                      <div className="text-xs opacity-75">
                        {new Date(deck.updatedAt).toLocaleDateString('zh-CN')} · {deck.cardCount} 张卡片
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 最近打开的牌组区域 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">最近打开的牌组</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 创建新牌组卡片 */}
            <button
              onClick={handleCreateDeck}
              className="group h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors flex items-center justify-center bg-gray-50 dark:bg-gray-800"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">创建新牌组</p>
              </div>
            </button>

            {/* 最近打开的牌组卡片 */}
            {loading ? (
              <>
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </>
            ) : recentDecks.length > 0 ? (
              recentDecks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => handleDeckClick(deck.name)}
                  className="group h-48 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all bg-white dark:bg-gray-800 p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 实现更多选项菜单
                      }}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deck.cardCount} 张卡片
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">还没有牌组</p>
                <button
                  onClick={handleCreateDeck}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  创建第一个牌组
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 所有牌组列表（当选择"全部"或"我的牌组"时显示） */}
        {activeTab !== 'featured' && filteredDecks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {activeTab === 'all' ? '全部牌组' : '我的牌组'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDecks.map((deck, deckIndex) => (
                <button
                  key={deck.id}
                  onClick={() => handleDeckClick(deck.name)}
                  className="group h-48 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all bg-white dark:bg-gray-800 p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getDeckColor(deckIndex)} flex items-center justify-center flex-shrink-0`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 实现更多选项菜单
                      }}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deck.cardCount} 张卡片 · {new Date(deck.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
