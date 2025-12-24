# 环境变量配置指南

## 问题诊断

检查脚本显示 `DATABASE_URL` 和 `DIRECT_URL` 都未设置。这意味着 `.env` 文件可能：
1. 不存在
2. 存在但没有这些变量
3. 格式不正确

## 解决方案

### 步骤 1：创建或更新 .env 文件

在项目根目录创建 `.env` 文件（如果不存在），或更新现有文件。

### 步骤 2：复制配置模板

我已经创建了 `.env.example` 文件作为模板。你可以：

```bash
# 复制模板（如果 .env 不存在）
cp .env.example .env

# 或者手动创建 .env 文件
```

### 步骤 3：更新 Supabase 连接字符串

**关键配置** - 必须包含以下两行：

```env
# 连接池（应用查询）
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 直接连接（迁移操作）- ⚠️ 必须使用这个格式
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

**重要区别**：
- `DATABASE_URL`: 使用 `pooler.supabase.com`，用户 `postgres.qkvgeuallarmbcfjzkko`，端口 `6543`
- `DIRECT_URL`: 使用 `db.qkvgeuallarmbcfjzkko.supabase.co`，用户 `postgres`，端口 `5432`

### 步骤 4：验证配置

运行检查脚本：

```bash
node check-env.js
```

应该看到：
```
DATABASE_URL: 已设置
DIRECT_URL: 已设置
  ✅ DIRECT_URL 格式正确
```

### 步骤 5：运行 Prisma 命令

```bash
# 生成 Prisma Client
npx prisma generate

# 推送数据库 Schema
npx prisma db push
```

## 完整 .env 文件示例

参考 `.env.example` 文件，包含所有必需的环境变量。

## 故障排查

### 问题：环境变量仍然未设置

1. **确认文件位置**：`.env` 文件必须在项目根目录（与 `package.json` 同级）
2. **检查文件格式**：确保没有语法错误，每行一个变量
3. **重启终端**：更新 `.env` 后，关闭并重新打开终端
4. **检查 .gitignore**：确保 `.env` 没有被 Git 忽略（这是正常的，但文件必须存在）

### 问题：Prisma 仍然使用连接池

1. **确认 DIRECT_URL 格式**：必须使用 `db.[PROJECT-REF].supabase.co`
2. **检查密码编码**：`@` 必须编码为 `%40`
3. **运行检查脚本**：`node check-env.js` 验证配置

## 下一步

配置完成后：
1. ✅ 运行 `node check-env.js` 验证
2. ✅ 运行 `npx prisma generate`
3. ✅ 运行 `npx prisma db push`

