# Vercel 部署迁移配置指南

## 📋 当前状态

✅ **代码已提交到本地 Git**  
⚠️ **等待推送到 GitHub**（网络问题）  
✅ **已更新 build 脚本**：包含 `prisma migrate deploy`

## 🚀 部署步骤

### 1. 推送代码到 GitHub

等网络恢复后，运行：

```bash
git push origin main
```

### 2. 配置 Vercel 环境变量

在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量

```env
# 数据库连接
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"

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

### 3. 自动运行迁移

**已配置**：`package.json` 中的 `build` 脚本已包含 `prisma migrate deploy`

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

这意味着每次部署时，Vercel 会自动：
1. 生成 Prisma Client
2. 运行数据库迁移（创建 Card 和 Deck 表）
3. 构建 Next.js 应用

### 4. 验证部署

部署成功后，检查：

1. **Vercel 构建日志**：
   - 应该看到 `✔ Generated Prisma Client`
   - 应该看到 `✔ Applied migration: add_cards_and_decks`
   - 应该看到 `✔ Compiled successfully`

2. **数据库表**：
   - 使用 Prisma Studio 或 Supabase Dashboard 检查
   - 应该看到 `Card` 和 `Deck` 表

3. **功能测试**：
   - 访问 `/cards/generate` 生成卡片
   - 访问 `/cards` 查看卡片列表

## 🔍 故障排查

### 如果迁移失败

1. **检查环境变量**：
   - 确认 `DIRECT_URL` 已正确配置
   - 确认密码中的 `@` 已编码为 `%40`

2. **检查 Vercel 构建日志**：
   - 查看是否有 Prisma 相关错误
   - 查看是否有数据库连接错误

3. **手动运行迁移**：
   如果自动迁移失败，可以在 Vercel 的部署日志中看到错误信息，然后：
   - 在本地修复问题
   - 重新推送代码

### 如果构建成功但功能不工作

1. **检查 API 路由**：
   - 访问 `/api/cards` 测试 API
   - 检查 Vercel 函数日志

2. **检查数据库连接**：
   - 确认 `DATABASE_URL` 正确
   - 确认数据库服务器可访问

3. **检查 DashScope API**：
   - 确认 `DASHSCOPE_API_KEY` 已配置
   - 测试 LLM 和 TTS API

## 📝 迁移命令说明

### `prisma migrate deploy`

- **用途**：在生产环境运行待执行的迁移
- **特点**：
  - 不会创建新的迁移文件
  - 只运行已存在的迁移
  - 适合 CI/CD 环境

### 与 `prisma migrate dev` 的区别

- `migrate dev`：开发环境，会创建新的迁移文件
- `migrate deploy`：生产环境，只运行已有迁移

## ✅ 预期结果

部署成功后，你应该能够：

1. ✅ 访问 `/cards/generate` 页面
2. ✅ 输入日文句子并生成卡片
3. ✅ 查看卡片列表（`/cards`）
4. ✅ 数据库中有 `Card` 和 `Deck` 表

## 🎯 下一步

1. **等待网络恢复**，然后推送代码
2. **配置 Vercel 环境变量**
3. **触发部署**（推送代码会自动触发）
4. **验证功能**（测试卡片生成）

---

**注意**：如果本地无法连接数据库，在 Vercel 上运行迁移是最佳选择，因为 Vercel 的网络环境通常可以正常访问 Supabase。

