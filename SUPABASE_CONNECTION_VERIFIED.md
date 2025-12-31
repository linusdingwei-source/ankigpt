# Supabase 连接配置（已验证）

## ✅ 已验证的配置

根据 Supabase Dashboard 的配置页面，以下连接字符串已验证可用：

### Transaction Pooler（连接池）

用于应用程序查询（`DATABASE_URL`）：

```
postgresql://postgres.qkvgeuallarmbcfjzkko:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

**完整格式（包含参数）**：
```
postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Direct Connection（直接连接）

用于数据库迁移和 Schema 操作（`DIRECT_URL`）：

根据 Supabase Dashboard，直接连接可能使用：
- 选项 1：使用 pooler 的 5432 端口
- 选项 2：使用非 pooler 地址（如果提供）

**如果 Supabase 提供了直接连接标签页**，使用该标签页显示的连接字符串。

## 📝 .env 文件配置

```env
# Database - Supabase
# Connection pooling (for application queries)
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations and db push)
# 使用 Supabase Dashboard > Connection String > Direct Connection 标签页的值
DIRECT_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

**重要**：
- 密码 `Fydw@715` 中的 `@` 必须编码为 `%40`
- `DIRECT_URL` 不要包含 `?pgbouncer=true` 参数
- 如果 Supabase Dashboard 显示了不同的直接连接地址，使用 Dashboard 显示的值

## 🔍 如何从 Supabase Dashboard 获取正确的连接字符串

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **Database**
4. 找到 **Connection string** 部分
5. 查看不同的标签页：
   - **Connection String** > **Transaction pooler** → 用于 `DATABASE_URL`
   - **Connection String** > **Direct connection** → 用于 `DIRECT_URL`（如果提供）
   - 或者查看 **ORMs** 标签页，选择 Prisma

## ✅ 验证配置

配置完成后，运行：

```bash
# 1. 生成 Prisma Client
npx prisma generate

# 2. 推送数据库 Schema（应该成功）
npx prisma db push
```

如果 `prisma db push` 成功，说明配置正确！

## 🚀 Vercel 环境变量配置

在 Vercel 项目设置中，使用与 `.env` 文件**完全相同**的值：

1. 进入 Vercel Dashboard
2. 选择项目 > **Settings** > **Environment Variables**
3. 添加：

```env
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

**关键**：确保 Vercel 中的值与本地 `.env` 文件中的值**完全一致**。

## 📋 检查清单

- [ ] 本地 `.env` 文件已配置
- [ ] `npx prisma db push` 在本地成功
- [ ] Vercel 环境变量已配置（与 `.env` 相同）
- [ ] 下次部署时，构建日志应显示 `✔ Pushed database schema`

---

**验证时间**：2025-12-31  
**状态**：✅ 本地已验证成功，等待 Vercel 部署验证

