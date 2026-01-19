'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/UserMenu';
import { trackPageViewEvent } from '@/lib/analytics';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalAnonymousUsers: number;
    totalRegisteredUsers: number;
    totalCards: number;
    totalDecks: number;
    totalOrders: number;
    totalRevenue: number;
    totalRevenueUSD: string;
  };
  recent: {
    recentUsers: Array<{
      id: string;
      email: string;
      name: string | null;
      credits: number;
      createdAt: string;
    }>;
    recentOrders: Array<{
      id: string;
      userId: string;
      userEmail: string;
      userName: string | null;
      amount: number;
      amountUSD: string;
      credits: number;
      status: string;
      createdAt: string;
    }>;
  };
  trends: {
    usersByDay: Array<{ date: string; count: number }>;
    cardsByDay: Array<{ date: string; count: number }>;
    ordersByDay: Array<{ date: string; count: number; revenue: number; revenueUSD: string }>;
  };
  topUsers: {
    byCards: Array<{ id: string; email: string; name: string | null; cardCount: number }>;
    byCredits: Array<{ id: string; email: string; name: string | null; credits: number }>;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const locale = useLocale();
  const { data: session, status } = useSession();
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'trends'>('overview');

  // 追踪页面访问
  useEffect(() => {
    trackPageViewEvent('admin');
  }, []);

  // 检查管理员权限
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 检查管理员权限
  const checkAdminAccess = async () => {
    try {
      const res = await fetch('/api/admin/check');
      const response = await res.json();
      
      if (response.success && response.data) {
        if (!response.data.isAdmin) {
          const role = response.data.user?.role || '未知';
          setError(`您没有管理员权限。当前角色：${role}。请确认数据库中的 role 字段已设置为 "admin" 并重新登录。`);
          setTimeout(() => {
            router.push('/dashboard');
          }, 5000);
          return false;
        }
        // 是管理员，清除任何之前的错误
        setError('');
        return true;
      }
      // API 返回失败
      setError('无法验证管理员权限。请稍后重试。');
      return false;
    } catch (err) {
      console.error('Check admin access error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`检查管理员权限时出错：${errorMessage}`);
      return false;
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 先检查管理员权限
      console.log('[Admin] Checking admin access...');
      const hasAccess = await checkAdminAccess();
      console.log('[Admin] Admin access result:', hasAccess);
      
      if (!hasAccess) {
        // checkAdminAccess 已经设置了错误消息
        console.log('[Admin] Access denied, error:', error);
        setLoading(false);
        return;
      }
      
      console.log('[Admin] Fetching stats...');
      const res = await fetch(`/api/admin/stats?days=${days}`);
      const response = await res.json();
      
      console.log('[Admin] Stats API response:', { status: res.status, ok: res.ok, response });
      
      if (!res.ok) {
        if (res.status === 403) {
          // 再次检查权限，可能是 session 问题
          const checkRes = await fetch('/api/admin/check');
          const checkData = await checkRes.json();
          console.log('[Admin] Re-check result:', checkData);
          
          if (checkData.success && checkData.data?.isAdmin) {
            setError('权限验证失败，但诊断显示您是管理员。请刷新页面重试。');
          } else {
            setError('您没有管理员权限。请确认您的账户已设置为管理员，并重新登录。');
          }
          setTimeout(() => {
            router.push('/dashboard');
          }, 5000);
          return;
        }
        const errorMsg = response.error || response.message || 'Failed to fetch stats';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      
      if (response.success) {
        console.log('[Admin] Stats loaded successfully');
        setStats(response.data);
      } else {
        const errorMsg = response.error || response.message || 'Failed to fetch stats';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
    } catch (err) {
      console.error('[Admin] Fetch stats error:', err);
      const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
      setError(`加载统计数据失败：${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, days]);


  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">访问被拒绝</h2>
          <p className="text-red-600 mb-4 whitespace-pre-wrap">{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</p>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p>如果您刚刚设置了管理员权限，请：</p>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>退出登录</li>
              <li>重新登录</li>
              <li>再次访问管理员页面</li>
            </ol>
          </div>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              返回仪表板
            </button>
            <button
              onClick={async () => {
                const { signOut } = await import('next-auth/react');
                await signOut({ callbackUrl: `/${locale}/login` });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              退出并重新登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">管理员控制台</h1>
              <span className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded">
                管理员
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              {session?.user && <UserMenu />}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 时间范围选择 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">时间范围：</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>最近7天</option>
              <option value={30}>最近30天</option>
              <option value={90}>最近90天</option>
              <option value={365}>最近一年</option>
            </select>
            <button
              onClick={fetchStats}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              刷新
            </button>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {(['overview', 'users', 'orders', 'trends'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' && '概览'}
                {tab === 'users' && '用户'}
                {tab === 'orders' && '订单'}
                {tab === 'trends' && '趋势'}
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {/* 概览标签页 */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总用户数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.overview.totalUsers.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      注册: {stats.overview.totalRegisteredUsers} | 匿名: {stats.overview.totalAnonymousUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总卡片数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.overview.totalCards.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">牌组: {stats.overview.totalDecks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总订单数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.overview.totalOrders.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总收入</p>
                    <p className="text-2xl font-semibold text-gray-900">${stats.overview.totalRevenueUSD}</p>
                    <p className="text-xs text-gray-500 mt-1">¥{(parseFloat(stats.overview.totalRevenueUSD) * 7.2).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 用户标签页 */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">最近注册的用户</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.recent.recentUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.credits}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">卡片数 Top 10</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">卡片数</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.topUsers.byCards.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.cardCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Credits Top 10</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.topUsers.byCredits.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.credits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 订单标签页 */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">最近的订单</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recent.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.userEmail}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.amountUSD}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.credits}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 趋势标签页 */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">每日用户注册趋势</h2>
                <div className="h-64 overflow-x-auto">
                  <div className="min-w-full">
                    {stats.trends.usersByDay.length > 0 ? (
                      <div className="space-y-2">
                        {stats.trends.usersByDay.map((item) => (
                          <div key={item.date} className="flex items-center">
                            <div className="w-24 text-sm text-gray-600">{item.date}</div>
                            <div className="flex-1 ml-4">
                              <div className="bg-blue-100 rounded h-6 flex items-center" style={{ width: `${(item.count / Math.max(...stats.trends.usersByDay.map(d => d.count))) * 100}%` }}>
                                <span className="ml-2 text-xs text-blue-800">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">每日卡片创建趋势</h2>
                <div className="h-64 overflow-x-auto">
                  <div className="min-w-full">
                    {stats.trends.cardsByDay.length > 0 ? (
                      <div className="space-y-2">
                        {stats.trends.cardsByDay.map((item) => (
                          <div key={item.date} className="flex items-center">
                            <div className="w-24 text-sm text-gray-600">{item.date}</div>
                            <div className="flex-1 ml-4">
                              <div className="bg-green-100 rounded h-6 flex items-center" style={{ width: `${(item.count / Math.max(...stats.trends.cardsByDay.map(d => d.count), 1)) * 100}%` }}>
                                <span className="ml-2 text-xs text-green-800">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">每日订单趋势</h2>
                <div className="h-64 overflow-x-auto">
                  <div className="min-w-full">
                    {stats.trends.ordersByDay.length > 0 ? (
                      <div className="space-y-2">
                        {stats.trends.ordersByDay.map((item) => (
                          <div key={item.date} className="flex items-center">
                            <div className="w-24 text-sm text-gray-600">{item.date}</div>
                            <div className="flex-1 ml-4">
                              <div className="bg-purple-100 rounded h-6 flex items-center justify-between px-2" style={{ width: `${(item.count / Math.max(...stats.trends.ordersByDay.map(d => d.count), 1)) * 100}%` }}>
                                <span className="text-xs text-purple-800">{item.count} 单</span>
                                <span className="text-xs text-purple-600">${item.revenueUSD}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
