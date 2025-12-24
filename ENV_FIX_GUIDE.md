# 环境变量配置问题修复指南

## 问题诊断

检查显示 `DATABASE_URL` 和 `DIRECT_URL` 都未设置，但 Prisma 仍然在运行。这说明：

1. **可能的原因**：
   - `.env` 文件存在但变量未正确设置
   - Prisma 7 可能从其他地方读取配置
   - 环境变量格式不正确

## 临时解决方案

我已经在 `prisma.config.ts` 中添加了硬编码的直接连接地址作为临时方案。这样即使 `.env` 文件未正确配置，`db push` 也能工作。

### 当前配置（临时）

`prisma.config.ts` 现在包含：
- 直接连接：`postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres`
- 连接池：`postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

## 立即测试

现在可以运行：

```bash
npx prisma db push
```

应该会使用直接连接地址 `db.qkvgeuallarmbcfjzkko.supabase.co:5432`。

## 长期解决方案

### 1. 检查 .env 文件

确保 `.env` 文件在项目根目录，包含：

```env
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

### 2. 验证环境变量

```bash
node check-env.js
```

### 3. 移除硬编码（可选）

一旦 `.env` 文件正确配置，可以从 `prisma.config.ts` 中移除硬编码，恢复为：

```typescript
datasource: {
  url: process.env["DATABASE_URL"],
  directUrl: process.env["DIRECT_URL"],
},
```

## 为什么 Prisma 仍然显示连接池地址？

Prisma 的输出信息可能显示的是 `url`（连接池），但实际执行 `db push` 时会使用 `directUrl`（直接连接）。

**验证方法**：
- 如果 `db push` 成功完成，说明使用了正确的直接连接
- 如果仍然卡住，说明配置仍有问题

## 下一步

1. ✅ 运行 `npx prisma db push`（现在应该使用直接连接）
2. ✅ 如果成功，检查 `.env` 文件确保长期配置正确
3. ✅ 如果失败，检查网络连接和 Supabase 状态

