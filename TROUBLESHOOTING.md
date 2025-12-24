# 故障排查指南

## Prisma db push 卡住问题

### 问题现象
运行 `npx prisma db push` 时，命令显示已连接到数据库但卡住不动。

### 原因
`prisma db push` 需要直接数据库连接来执行 DDL 操作，但可能正在使用连接池（端口 6543），连接池不支持某些 Schema 操作。

### 解决方案

#### 方案 1：检查 DIRECT_URL 配置（推荐）

确保 `.env` 文件中的 `DIRECT_URL` 配置正确：

```env
# 直接连接（用于迁移和 db push）
DIRECT_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

**注意**：
- 使用端口 `5432`（不是 6543）
- 密码中的 `@` 编码为 `%40`
- 不要包含 `?pgbouncer=true` 参数

#### 方案 2：使用 prisma migrate（推荐用于生产环境）

```bash
# 中断当前命令（Ctrl+C）
# 然后使用迁移方式
npx prisma migrate dev --name init
```

#### 方案 3：临时使用直接连接

如果 `db push` 仍然卡住，可以临时修改 `prisma.config.ts`：

```typescript
datasource: {
  url: process.env["DIRECT_URL"],  // 临时使用直接连接
  directUrl: process.env["DIRECT_URL"],
},
```

完成后再改回：

```typescript
datasource: {
  url: process.env["DATABASE_URL"],  // 连接池用于应用
  directUrl: process.env["DIRECT_URL"],  // 直接连接用于迁移
},
```

#### 方案 4：检查网络连接

```bash
# 测试直接连接
psql "postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

如果连接成功，说明网络和凭据都没问题。

### 验证步骤

1. **中断当前命令**：按 `Ctrl+C`
2. **检查环境变量**：确认 `.env` 文件中的 `DIRECT_URL` 正确
3. **重新运行**：
   ```bash
   npx prisma db push
   ```
   或
   ```bash
   npx prisma migrate dev --name init
   ```

### 预期输出

成功时应该看到类似输出：

```
✔ Generated Prisma Client
✔ Pushed database schema
```

或

```
✔ Created migration
✔ Applied migration
```

