# Supabase 数据库配置指南

## 已配置的数据库连接

你的 Supabase 项目连接信息已准备好，密码中的 `@` 符号需要 URL 编码为 `%40`。

## 配置步骤

### 1. 更新 .env 文件

在项目根目录的 `.env` 文件中添加或更新以下配置：

```env
# Database - Supabase
# Connection pooling (for application queries) - 使用连接池提高性能
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations) - 直接连接用于数据库迁移
# 重要：直接连接必须使用 db.[PROJECT-REF].supabase.co，不能使用 pooler 地址
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

**重要提示**：
- 密码 `Fydw@715` 中的 `@` 已编码为 `%40`
- `DATABASE_URL` 使用端口 `6543`（连接池）
- `DIRECT_URL` 使用端口 `5432`（直接连接，用于迁移）

### 2. 生成 Prisma Client

```bash
npx prisma generate
```

### 3. 运行数据库迁移

```bash
# 推送到数据库（开发环境推荐）
npx prisma db push

# 或使用迁移文件（生产环境推荐）
npx prisma migrate dev --name init
```

### 4. 验证连接

```bash
# 使用 Prisma Studio 查看数据库
npx prisma studio
```

## 数据库表结构

迁移后将创建以下表：

- **User** - 用户表（包含 credits 字段）
- **Account** - OAuth 账户表
- **Session** - 会话表
- **VerificationToken** - 验证码表
- **PasswordResetToken** - 密码重置令牌表
- **Order** - 订单表
- **RateLimit** - 频率限制表

## Prisma 7 配置说明

**重要**: Prisma 7 要求将连接字符串从 `schema.prisma` 移到 `prisma.config.ts`。

### 已完成的配置

✅ `prisma/schema.prisma` - 已移除 `url` 和 `directUrl`  
✅ `prisma.config.ts` - 已添加连接字符串配置

### 连接说明

### DATABASE_URL（连接池）
- **用途**: 应用程序查询
- **端口**: 6543
- **优势**: 通过连接池提高性能，适合高并发场景
- **限制**: 某些操作（如迁移）不支持
- **配置位置**: `prisma.config.ts` 中的 `datasource.url`

### DIRECT_URL（直接连接）
- **用途**: 数据库迁移和 Schema 操作
- **端口**: 5432
- **优势**: 支持所有数据库操作
- **使用场景**: `prisma migrate`, `prisma db push`
- **配置位置**: `prisma.config.ts` 中的 `datasource.directUrl`

## 故障排查

### 问题：连接失败

1. **检查密码编码**
   - 确保 `@` 已编码为 `%40`
   - 检查是否有其他特殊字符需要编码

2. **检查网络连接**
   - 确认可以访问 Supabase
   - 检查防火墙设置

3. **验证连接字符串**
   ```bash
   # 测试连接
   psql "postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
   ```

### 问题：迁移失败

1. **使用 DIRECT_URL**
   - 确保迁移时使用 `DIRECT_URL`（端口 5432）
   - 连接池不支持某些迁移操作

2. **检查 Prisma Schema**
   - 确认 `directUrl` 已配置在 `datasource` 中

### 问题：连接池错误

1. **切换到直接连接**
   - 临时使用 `DIRECT_URL` 作为 `DATABASE_URL`
   - 完成操作后切换回连接池

## 生产环境配置

### Vercel 部署

在 Vercel 项目设置中添加环境变量：

1. 进入项目 Settings > Environment Variables
2. 添加以下变量：
   - `DATABASE_URL` - 连接池 URL
   - `DIRECT_URL` - 直接连接 URL

### 其他平台

根据部署平台的要求，在环境变量配置中添加上述两个变量。

## 安全建议

1. **不要提交 .env 文件**
   - `.env` 已在 `.gitignore` 中
   - 不要在代码中硬编码密码

2. **使用环境变量**
   - 生产环境使用平台的环境变量配置
   - 不要将敏感信息提交到 Git

3. **定期轮换密码**
   - 在 Supabase Dashboard 中定期更新数据库密码
   - 更新后同步更新环境变量

## 下一步

配置完成后：

1. ✅ 运行 `npx prisma generate`
2. ✅ 运行 `npx prisma db push` 或 `npx prisma migrate dev`
3. ✅ 启动应用：`npm run dev`
4. ✅ 测试注册和登录功能

