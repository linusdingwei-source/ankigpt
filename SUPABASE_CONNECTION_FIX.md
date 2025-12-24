# Supabase 连接修复指南

## 问题：prisma db push 卡住

### 可能的原因

1. **DIRECT_URL 使用了连接池地址**
   - 直接连接不应该使用 `pooler.supabase.com`
   - 应该使用项目特定的直接连接地址

2. **Supabase 连接字符串格式**

### 正确的 Supabase 连接格式

#### 方式 1：使用 Supabase Dashboard 的连接字符串

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入你的项目
3. 点击 **Settings** > **Database**
4. 找到 **Connection string** 部分
5. 选择 **URI** 或 **Connection pooling** 标签

**连接池（用于应用）**：
```
postgresql://postgres.qkvgeuallarmbcfjzkko:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**直接连接（用于迁移）**：
```
postgresql://postgres.qkvgeuallarmbcfjzkko:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

**或者使用非 pooler 地址**（如果 Supabase 提供了）：
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 修复步骤

#### 步骤 1：中断当前命令
按 `Ctrl+C` 停止卡住的命令

#### 步骤 2：检查 Supabase Dashboard

1. 访问 Supabase Dashboard
2. 查看 **Settings** > **Database** > **Connection string**
3. 确认直接连接的完整地址

#### 步骤 3：更新 .env 文件

确保 `.env` 文件包含正确的连接字符串：

```env
# 连接池（应用查询）
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 直接连接（迁移和 db push）
# 选项 A：使用 pooler 的 5432 端口（如果支持）
DIRECT_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# 选项 B：使用非 pooler 地址（从 Supabase Dashboard 获取）
# DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**重要**：
- 密码中的 `@` 必须编码为 `%40`
- 直接连接不要包含 `?pgbouncer=true` 参数
- 如果 Supabase 提供了非 pooler 地址，优先使用那个

#### 步骤 4：测试连接

```bash
# 测试直接连接
psql "postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

如果连接成功，会看到 PostgreSQL 提示符。

#### 步骤 5：重新运行迁移

```bash
# 方式 1：使用 db push（快速，适合开发）
npx prisma db push

# 方式 2：使用 migrate（推荐，适合生产）
npx prisma migrate dev --name init
```

### 替代方案：使用 migrate 代替 db push

如果 `db push` 仍然有问题，使用迁移方式：

```bash
# 1. 创建迁移文件
npx prisma migrate dev --name init

# 2. 应用迁移
npx prisma migrate deploy
```

### 如果仍然卡住

1. **检查网络**：确认可以访问 Supabase
2. **检查防火墙**：确保端口 5432 和 6543 未被阻止
3. **检查 Supabase 状态**：访问 [Supabase Status](https://status.supabase.com)
4. **使用 Supabase CLI**（如果安装了）：
   ```bash
   supabase db push
   ```

### 验证成功

成功时应该看到：

```
✔ Generated Prisma Client
✔ Pushed database schema
```

或

```
✔ Created migration
✔ Applied migration
```

然后可以运行：

```bash
# 查看数据库
npx prisma studio
```

