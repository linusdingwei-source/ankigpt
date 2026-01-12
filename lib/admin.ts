/**
 * 管理员权限检查工具
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { NextRequest } from 'next/server';

/**
 * 检查用户是否为管理员
 * @param userId 用户 ID
 * @returns 是否为管理员
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * 从请求中获取管理员用户 ID（用于 API 路由）
 * @param request NextRequest 对象
 * @returns 管理员用户 ID 或 null
 */
export async function getAdminUserId(request: NextRequest): Promise<string | null> {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return null;
    }
    
    const isUserAdmin = await isAdmin(userId);
    return isUserAdmin ? userId : null;
  } catch (error) {
    console.error('Error getting admin user ID:', error);
    return null;
  }
}

/**
 * 检查当前用户是否为管理员（用于服务器组件）
 * @returns 是否为管理员
 */
export async function checkAdminAccess(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }
    return await isAdmin(session.user.id);
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}
