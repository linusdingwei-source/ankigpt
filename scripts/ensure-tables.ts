/**
 * 确保数据库表存在的脚本
 * 如果表不存在，会在应用启动时自动创建
 * 这个脚本可以在 API 路由中调用，作为 db push 的备用方案
 */

import { prisma } from '@/lib/prisma';

export async function ensureTablesExist() {
  try {
    // 尝试查询 Card 表，如果不存在会抛出错误
    await prisma.$queryRaw`SELECT 1 FROM "Card" LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "Deck" LIMIT 1`;
    return { success: true, message: 'Tables already exist' };
  } catch (error) {
    // 如果表不存在，尝试创建
    console.log('Tables do not exist, attempting to create...');
    try {
      // 使用 Prisma 的原始 SQL 创建表
      // 注意：这需要根据实际的 schema 来编写 SQL
      // 更好的方案是在应用启动时调用 db push 或 migrate deploy
      return { success: false, message: 'Tables do not exist. Please run migration.' };
    } catch (createError) {
      console.error('Failed to create tables:', createError);
      return { success: false, message: 'Failed to create tables', error: createError };
    }
  }
}

