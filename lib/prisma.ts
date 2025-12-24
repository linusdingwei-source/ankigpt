import { PrismaClient } from './generated-client/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: 应用查询使用连接池（DATABASE_URL）
// 使用 @prisma/adapter-pg 来创建 adapter
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// 创建 PostgreSQL connection pool
const pool = new Pool({ connectionString: databaseUrl })
const adapter = new PrismaPg(pool)

// Prisma 7 要求使用 adapter 或 accelerateUrl
// 我们使用 adapter 来连接 PostgreSQL
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

