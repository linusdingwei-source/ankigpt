import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserId } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { auth } from '@/auth';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

// 强制动态路由
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * 获取系统统计数据（仅管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const adminUserId = await getAdminUserId(request);
    if (!adminUserId) {
      // 添加调试信息
      const session = await auth();
      const userId = await getUserId(session, request);
      console.log('[Admin Stats] Permission check failed:', {
        hasSession: !!session,
        userId,
        adminUserId,
      });
      
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Admin access required. Please ensure your account role is set to "admin" and you have logged in again.'),
        { status: 403 }
      );
    }
    
    console.log('[Admin Stats] Access granted for user:', adminUserId);

    // 获取时间范围参数（可选，默认最近30天）
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 并行获取所有统计数据
    const [
      totalUsers,
      totalAnonymousUsers,
      totalRegisteredUsers,
      totalCards,
      totalDecks,
      totalOrders,
      totalRevenue,
      recentUsers,
      recentOrders,
      usersByDay,
      cardsByDay,
      ordersByDay,
      topUsersByCards,
      topUsersByCredits,
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      
      // 匿名用户数
      prisma.user.count({
        where: { isAnonymous: true },
      }),
      
      // 注册用户数
      prisma.user.count({
        where: { isAnonymous: false },
      }),
      
      // 总卡片数
      prisma.card.count(),
      
      // 总牌组数
      prisma.deck.count(),
      
      // 总订单数
      prisma.order.count({
        where: {
          status: 'completed',
        },
      }),
      
      // 总收入（分）
      prisma.order.aggregate({
        where: {
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
      }),
      
      // 最近注册的用户（最近7天）
      prisma.user.findMany({
        where: {
          isAnonymous: false,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // 最近的订单
      prisma.order.findMany({
        where: {
          status: 'completed',
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // 每日用户注册数（最近30天）
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::bigint as count
        FROM "User"
        WHERE "createdAt" >= ${startDate}
          AND "isAnonymous" = false
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      // 每日卡片创建数（最近30天）
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::bigint as count
        FROM "Card"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      // 每日订单数（最近30天）
      prisma.$queryRaw<Array<{ date: Date; count: bigint; revenue: bigint }>>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::bigint as count,
          COALESCE(SUM(amount), 0)::bigint as revenue
        FROM "Order"
        WHERE "createdAt" >= ${startDate}
          AND status = 'completed'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      // 卡片数最多的用户（Top 10）
      prisma.user.findMany({
        where: {
          isAnonymous: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          _count: {
            select: { cards: true },
          },
        },
        orderBy: {
          cards: {
            _count: 'desc',
          },
        },
        take: 10,
      }),
      
      // Credits 最多的用户（Top 10）
      prisma.user.findMany({
        where: {
          isAnonymous: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
        },
        orderBy: {
          credits: 'desc',
        },
        take: 10,
      }),
    ]);

    // 格式化数据
    const stats = {
      overview: {
        totalUsers,
        totalAnonymousUsers,
        totalRegisteredUsers,
        totalCards,
        totalDecks,
        totalOrders,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalRevenueUSD: ((totalRevenue._sum.amount || 0) / 100).toFixed(2),
      },
      recent: {
        recentUsers: recentUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
          createdAt: user.createdAt.toISOString(),
        })),
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          userId: order.userId,
          userEmail: order.user.email,
          userName: order.user.name,
          amount: order.amount,
          amountUSD: (order.amount / 100).toFixed(2),
          credits: order.credits,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        })),
      },
      trends: {
        usersByDay: usersByDay.map(item => ({
          date: item.date.toISOString().split('T')[0],
          count: Number(item.count),
        })),
        cardsByDay: cardsByDay.map(item => ({
          date: item.date.toISOString().split('T')[0],
          count: Number(item.count),
        })),
        ordersByDay: ordersByDay.map(item => ({
          date: item.date.toISOString().split('T')[0],
          count: Number(item.count),
          revenue: Number(item.revenue),
          revenueUSD: (Number(item.revenue) / 100).toFixed(2),
        })),
      },
      topUsers: {
        byCards: topUsersByCards.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          cardCount: user._count.cards,
        })),
        byCredits: topUsersByCredits.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
        })),
      },
    };

    return NextResponse.json(successResponse(stats));
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get admin stats'),
      { status: 500 }
    );
  }
}
