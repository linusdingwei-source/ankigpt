import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: 连接字符串在 prisma.config.ts 中配置
// 如果需要在代码中指定，可以使用 adapter 参数
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // 连接字符串从环境变量读取，已在 prisma.config.ts 中配置
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

