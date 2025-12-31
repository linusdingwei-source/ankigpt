# Vercel 环境变量配置指南（基于 Supabase Dashboard）

## 📋 从 Supabase Dashboard 获取连接字符串

### 步骤

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **Database**
4. 点击 **Connection string** 标签页
5. 查看不同连接方式：

### Connection String 标签页

#### Transaction pooler（连接池）
- **用途**：应用程序查询（`DATABASE_URL`）
- **格式**：`postgresql://postgres.qkvgeuallarmbcfjzkko:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
- **包含参数**：`?pgbouncer=true`

#### Direct connection（直接连接）
- **用途**：数据库迁移和 Schema 操作（`DIRECT_URL`）
- **格式**：查看 Supabase Dashboard 的 **Direct connection** 标签页
- **通常使用**：端口 `5432` 或非 pooler 地址

### ORMs 标签页

如果 Supabase 提供了 **ORMs** 标签页：
1. 选择 **Prisma**
2. 复制显示的连接字符串
3. 分别用于 `DATABASE_URL` 和 `DIRECT_URL`

## 🔧 Vercel 环境变量配置

### 必需的环境变量

在 Vercel Dashboard > Settings > Environment Variables 中添加：

```env
# 数据库连接（从 Supabase Dashboard 复制）
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

**重要**：
- 密码中的 `@` 必须编码为 `%40`
- `DIRECT_URL` 不要包含 `?pgbouncer=true`
- 确保值与本地 `.env` 文件**完全一致**

### 其他必需的环境变量

```env
# DashScope API（用于 LLM 和 TTS）
DASHSCOPE_API_KEY="your-dashscope-api-key"

# NextAuth
AUTH_SECRET="your-auth-secret"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe（如果使用）
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"

# Resend（如果使用）
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="your-email@domain.com"
```

## ✅ 验证配置

### 1. 本地验证

确保本地 `.env` 文件配置正确：

```bash
# 测试数据库连接
npx prisma db push
```

如果成功，说明配置正确。

### 2. Vercel 验证

配置 Vercel 环境变量后：

1. **触发重新部署**：
   - 在 Vercel Dashboard 点击 **Redeploy**
   - 或推送新代码

2. **检查构建日志**：
   - 应该看到 `✔ Pushed database schema`
   - 或 `The database is already in sync`

3. **检查数据库表**：
   - 使用 Supabase Dashboard > Table Editor
   - 应该看到 `Card` 和 `Deck` 表

## 🔍 故障排查

### 问题：构建时仍然无法连接数据库

1. **检查环境变量**：
   - 确认 Vercel 中已添加 `DATABASE_URL` 和 `DIRECT_URL`
   - 确认值与本地 `.env` 文件一致

2. **检查密码编码**：
   - 密码中的 `@` 必须编码为 `%40`
   - 例如：`Fydw@715` → `Fydw%40715`

3. **检查端口**：
   - `DATABASE_URL` 使用端口 `6543`
   - `DIRECT_URL` 使用端口 `5432`（或 Supabase Dashboard 显示的其他端口）

### 问题：本地可以连接，Vercel 无法连接

1. **网络限制**：
   - 某些网络可能阻止数据库连接
   - 尝试使用 Supabase 的 IPv4 兼容连接

2. **环境变量作用域**：
   - 确保环境变量设置为 **Production**、**Preview**、**Development** 所有环境

## 📝 配置检查清单

- [ ] 从 Supabase Dashboard 复制了正确的连接字符串
- [ ] 本地 `.env` 文件已配置
- [ ] 本地 `npx prisma db push` 成功
- [ ] Vercel 环境变量已添加（与 `.env` 相同）
- [ ] 密码中的 `@` 已编码为 `%40`
- [ ] `DIRECT_URL` 不包含 `?pgbouncer=true`
- [ ] 已触发 Vercel 重新部署
- [ ] 构建日志显示数据库操作成功

---

**提示**：如果本地 `prisma db push` 成功，将相同的值复制到 Vercel 环境变量即可！

