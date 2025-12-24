import { PrismaClient } from './generated-client/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: 应用查询使用连接池（DATABASE_URL）
// Prisma 7 要求传递 adapter 或 accelerateUrl
// 由于我们使用自定义输出路径，需要显式传递配置
// 使用 accelerateUrl 作为占位符（虽然这不是真正的 Accelerate URL）
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Prisma 7 类型要求：accelerateUrl 和 adapter 互斥
// 我们使用 accelerateUrl，但实际连接会从环境变量读取
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  accelerateUrl: databaseUrl,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

