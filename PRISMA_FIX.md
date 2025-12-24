# Prisma db push 修复方案

## 问题

Prisma 仍然显示使用连接池地址，导致 `db push` 卡住。

## 临时解决方案

我已经临时修改了 `prisma.config.ts`，将 `url` 也设置为直接连接地址。这样可以确保 `db push` 使用正确的连接。

### 当前配置（临时）

```typescript
datasource: {
  url: DIRECT_URL,  // 临时使用直接连接
  directUrl: DIRECT_URL,
},
```

## 立即测试

现在运行：

```bash
npx prisma db push
```

应该会：
- ✅ 使用直接连接 `db.qkvgeuallarmbcfjzkko.supabase.co:5432`
- ✅ 不再卡住
- ✅ 成功推送数据库 Schema

## 完成 db push 后的恢复步骤

一旦 `db push` 成功完成，需要恢复配置以使用连接池进行应用查询：

### 1. 更新 prisma.config.ts

```typescript
datasource: {
  url: DATABASE_URL,  // 连接池用于应用查询
  directUrl: DIRECT_URL,  // 直接连接用于迁移
},
```

### 2. 更新 .env 文件

确保 `.env` 文件包含：

```env
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

### 3. 验证

```bash
# 验证环境变量
node check-env.js

# 测试应用连接（使用连接池）
npm run dev
```

## 为什么需要这样做？

Prisma 7 在某些情况下可能不会自动使用 `directUrl` 进行 `db push` 操作。临时将 `url` 也设置为直接连接可以确保操作成功。

## 长期解决方案

一旦数据库 Schema 推送成功，恢复使用连接池配置，这样可以：
- ✅ 提高应用查询性能（连接池）
- ✅ 迁移操作使用直接连接（`directUrl`）

