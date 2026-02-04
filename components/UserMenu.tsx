'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, Link, usePathname } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

interface UserMenuProps {
  credits?: number | null;
}

export default function UserMenu({ credits }: UserMenuProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 检查是否是管理员
  useEffect(() => {
    const checkAdmin = async () => {
      if (status === 'authenticated' && session?.user) {
        try {
          const res = await fetch('/api/admin/check');
          const data = await res.json();
          if (data.success && data.data?.isAdmin) {
            setIsAdmin(true);
          }
        } catch (err) {
          console.error('Failed to check admin status:', err);
        }
      }
    };
    checkAdmin();
  }, [status, session]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setLoading(true);
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  const handleAdminClick = () => {
    setIsOpen(false);
    router.push('/admin');
  };


  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse"></div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const userInitial = session.user.email?.charAt(0).toUpperCase() || 'U';
  const userEmail = session.user.email || '';
  const userName = session.user.name || userEmail.split('@')[0];

  return (
    <div className="relative" ref={menuRef}>
      {/* 用户头像按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        aria-label="用户菜单"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={userName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          userInitial
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* 用户信息区域 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  userInitial
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Credits 显示 */}
          {credits !== null && (
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Credits</span>
                <span className="text-sm font-semibold text-indigo-600">
                  {credits}
                </span>
              </div>
            </div>
          )}

          {/* 菜单项 */}
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={(e) => {
                setIsOpen(false);
                // 如果已经在 dashboard 页面，滚动到顶部
                if (pathname?.includes('/dashboard')) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  // 也可以选择刷新页面
                  // router.refresh();
                }
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t('dashboard.dashboard')}
            </Link>

            <Link
              href="/workspace"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t('dashboard.workspace')}
            </Link>

            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('dashboard.buyCredits')}
            </Link>

            {isAdmin && (
              <button
                onClick={handleAdminClick}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="flex-1 text-left">{t('dashboard.adminConsole')}</span>
                <span className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-100 rounded">
                  {t('dashboard.admin')}
                </span>
              </button>
            )}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {loading ? t('common.loading') : t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
