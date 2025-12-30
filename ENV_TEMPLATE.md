# 环境变量配置模板

## Supabase 数据库连接

根据 Supabase Dashboard 的信息，更新你的 `.env` 文件：

```env
# Database - Supabase
# Connection pooling (for application queries) - 连接池用于应用查询
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations) - 直接连接用于数据库迁移
# ⚠️ 重要：必须使用 db.[PROJECT-REF].supabase.co，不能使用 pooler 地址
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

## 关键区别

### DATABASE_URL（连接池）
- **主机**: `aws-1-ap-south-1.pooler.supabase.com`
- **端口**: `6543`
- **用户**: `postgres.qkvgeuallarmbcfjzkko`
- **用途**: 应用程序查询（高并发场景）

### DIRECT_URL（直接连接）
- **主机**: `db.qkvgeuallarmbcfjzkko.supabase.co` ⚠️ **不同！**
- **端口**: `5432`
- **用户**: `postgres` ⚠️ **不同！**
- **用途**: 数据库迁移和 Schema 操作（`prisma db push`, `prisma migrate`）

## 为什么 DIRECT_URL 不同？

1. **主机名不同**：
   - 连接池：`pooler.supabase.com`
   - 直接连接：`db.[PROJECT-REF].supabase.co`

2. **用户名不同**：
   - 连接池：`postgres.[PROJECT-REF]`
   - 直接连接：`postgres`

3. **功能限制**：
   - 连接池不支持 DDL 操作（CREATE TABLE, ALTER TABLE 等）
   - 直接连接支持所有数据库操作

## 验证配置

配置完成后，运行：

```bash
# 1. 生成 Prisma Client
npx prisma generate

# 2. 推送数据库 Schema（现在应该不会卡住了）
npx prisma db push
```

## 其他必需的环境变量

```env
# NextAuth
AUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (Resend)
RESEND_API_KEY="re_..."  # 从 Resend Dashboard > API Keys 获取
RESEND_FROM_EMAIL="noreply@yourdomain.com"  # 已验证的发件人邮箱

# Stripe 支付
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_STARTER="price_..."
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_PREMIUM="price_..."

# OpenAI TTS (可选)
OPENAI_API_KEY="your-openai-api-key"

# SEO 配置
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
GOOGLE_SITE_VERIFICATION="your-google-verification-code"

# Google Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

