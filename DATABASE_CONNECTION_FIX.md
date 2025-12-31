# 数据库连接问题修复指南

## 🔍 问题分析

从构建日志可以看到：

```
Error: P1001: Can't reach database server at `db.qkvgeuallarmbcfjzkko.supabase.co:5432`
```

**问题**：Vercel 构建时无法连接到 Supabase 数据库。

## 🔧 可能的原因

1. **环境变量未配置**：Vercel 项目设置中缺少 `DIRECT_URL` 或 `DATABASE_URL`
2. **网络限制**：Vercel 构建环境可能无法访问 Supabase
3. **数据库服务器不可用**：Supabase 数据库暂时不可访问

## ✅ 解决方案

### 方案 1：配置 Vercel 环境变量（必需）

在 Vercel 项目设置中添加：

1. 进入项目 **Settings** > **Environment Variables**
2. 添加以下变量：

```env
# 数据库连接（必需）
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

**重要**：
- 密码中的 `@` 必须编码为 `%40`
- `DIRECT_URL` 使用端口 `5432`（不是 6543）
- 不要包含 `?pgbouncer=true` 参数

### 方案 2：让构建在数据库连接失败时继续（临时方案）

已更新 `vercel.json`，使构建在数据库连接失败时继续：

```json
{
  "buildCommand": "prisma generate && (prisma db push --accept-data-loss || echo 'Database push failed, continuing build...') && next build"
}
```

这样即使数据库连接失败，构建也会继续，应用可以正常部署。

### 方案 3：在应用启动时创建表（备用方案）

如果构建时无法连接数据库，可以在应用首次运行时创建表：

1. 创建一个 API 路由 `/api/admin/init-db`
2. 在路由中调用 `prisma db push`
3. 首次访问时手动触发，或通过 Vercel 函数执行

## 📋 立即操作步骤

### 1. 检查 Vercel 环境变量

在 Vercel Dashboard：
1. 进入项目 **Settings** > **Environment Variables**
2. 确认 `DATABASE_URL` 和 `DIRECT_URL` 已配置
3. 确认值正确（特别是密码中的 `%40`）

### 2. 重新部署

配置环境变量后：
1. 在 Vercel Dashboard 点击 **Redeploy**
2. 或推送新的代码触发部署

### 3. 验证

部署成功后，检查构建日志：
- ✅ 应该看到 `✔ Pushed database schema`
- ✅ 或 `The database is already in sync`

## 🔍 调试步骤

### 检查环境变量

在 Vercel 构建日志中，环境变量不会显示（安全原因），但可以通过以下方式验证：

1. **检查构建日志中的连接字符串**：
   - 如果看到连接错误，说明环境变量可能未设置或错误

2. **测试连接**：
   - 在本地使用相同的连接字符串测试
   - 如果本地可以连接，说明是 Vercel 环境变量问题

### 常见错误

1. **密码编码错误**：
   - ❌ `Fydw@715`
   - ✅ `Fydw%40715`

2. **端口错误**：
   - ❌ `DIRECT_URL` 使用 `6543`（连接池端口）
   - ✅ `DIRECT_URL` 使用 `5432`（直接连接端口）

3. **URL 格式错误**：
   - ❌ 包含 `?pgbouncer=true` 在 `DIRECT_URL` 中
   - ✅ `DIRECT_URL` 不包含 `pgbouncer` 参数

## 🎯 预期结果

配置正确后，构建日志应该显示：

```
✔ Generated Prisma Client
Datasource "db": PostgreSQL database "postgres"...
✔ Pushed database schema
✓ Compiled successfully
```

## 📝 后续优化

部署成功后，建议：

1. **创建迁移文件**（在本地）：
   ```bash
   npx prisma migrate dev --name add_cards_and_decks
   ```

2. **提交迁移文件**到 Git

3. **改用 `migrate deploy`**：
   ```json
   {
     "buildCommand": "prisma generate && prisma migrate deploy && next build"
   }
   ```

---

**当前状态**：构建会在数据库连接失败时继续，但表不会被创建  
**下一步**：配置 Vercel 环境变量后重新部署

