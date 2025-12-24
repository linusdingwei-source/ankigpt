# 快速修复：prisma db push 卡住问题

## 问题
Prisma 仍然显示使用连接池地址 `aws-1-ap-south-1.pooler.supabase.com:6543`，导致 `db push` 卡住。

## 立即修复步骤

### 1. 中断当前命令
按 `Ctrl+C` 停止卡住的命令

### 2. 更新 .env 文件

打开 `.env` 文件，确保 `DIRECT_URL` 使用正确的主机名和用户名：

```env
# 连接池（应用查询）
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 直接连接（迁移操作）- ⚠️ 必须使用这个格式
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

**关键点**：
- ✅ 主机：`db.qkvgeuallarmbcfjzkko.supabase.co`（不是 pooler 地址）
- ✅ 用户：`postgres`（不是 `postgres.qkvgeuallarmbcfjzkko`）
- ✅ 端口：`5432`
- ✅ 密码：`Fydw%40715`（@ 编码为 %40）

### 3. 验证环境变量已加载

```bash
# 检查环境变量（如果支持）
echo $DIRECT_URL
```

或者直接运行：

```bash
# 重新运行 db push
npx prisma db push
```

### 4. 如果仍然卡住

如果更新 `.env` 后仍然卡住，可以临时修改 `prisma.config.ts`，强制使用直接连接：

```typescript
datasource: {
  url: process.env["DIRECT_URL"],  // 临时使用直接连接
  directUrl: process.env["DIRECT_URL"],
},
```

**注意**：完成 `db push` 后，记得改回：

```typescript
datasource: {
  url: process.env["DATABASE_URL"],  // 连接池用于应用
  directUrl: process.env["DIRECT_URL"],  // 直接连接用于迁移
},
```

### 5. 验证成功

成功时应该看到：

```
✔ Generated Prisma Client
✔ Pushed database schema
```

然后可以运行：

```bash
# 查看数据库
npx prisma studio
```

## 常见问题

### Q: 为什么 Prisma 仍然显示连接池地址？

A: 可能的原因：
1. `.env` 文件中的 `DIRECT_URL` 还没有更新
2. 需要重启终端或重新加载环境变量
3. Prisma 缓存了旧的配置

**解决**：
- 确认 `.env` 文件已保存
- 关闭并重新打开终端
- 或者临时修改 `prisma.config.ts` 强制使用直接连接

### Q: 如何确认 DIRECT_URL 是否正确？

A: 从 Supabase Dashboard 获取：
1. 登录 Supabase Dashboard
2. Settings > Database > Connection string
3. 选择 "Direct connection"
4. 复制完整的 URI（格式：`postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`）

