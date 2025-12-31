# 数据库迁移问题排查

## 问题

运行 `npx prisma migrate dev --name add_cards_and_decks` 时出现连接错误：
```
Error: P1001: Can't reach database server at `db.qkvgeuallarmbcfjzkko.supabase.co:5432`
```

## 可能的原因

1. **网络连接问题**：无法访问 Supabase 数据库服务器
2. **环境变量未设置**：`DIRECT_URL` 或 `DATABASE_URL` 未正确配置
3. **防火墙限制**：本地网络可能阻止了数据库连接
4. **数据库服务器暂时不可用**

## 解决方案

### 方案 1：检查环境变量（推荐）

确保 `.env` 文件中包含正确的数据库连接字符串：

```env
# 连接池（用于应用查询）
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 直接连接（用于迁移）
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

**重要**：
- 密码中的 `@` 必须编码为 `%40`
- `DIRECT_URL` 使用端口 `5432`（不是 6543）
- 不要包含 `?pgbouncer=true` 参数

### 方案 2：使用 db push（开发环境）

如果迁移命令无法连接，可以暂时使用 `db push`：

```bash
npx prisma db push
```

**注意**：`db push` 会直接修改数据库结构，不会创建迁移文件。适合开发环境快速迭代。

### 方案 3：稍后运行迁移

如果当前无法连接数据库，可以：

1. **先生成 Prisma Client**（不连接数据库）：
   ```bash
   npx prisma generate
   ```

2. **代码可以正常使用**，只是数据库表还没有创建

3. **稍后网络恢复后运行迁移**：
   ```bash
   npx prisma migrate dev --name add_cards_and_decks
   ```

### 方案 4：检查网络连接

测试数据库连接：

```bash
# 测试直接连接
psql "postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"
```

如果 `psql` 也无法连接，可能是：
- 网络防火墙阻止了连接
- 需要使用 VPN
- Supabase 项目可能暂停或删除

### 方案 5：在 Vercel 上运行迁移

如果本地无法连接，可以在 Vercel 部署时自动运行迁移：

1. 在 Vercel 项目设置中添加环境变量
2. 在 `package.json` 的 `build` 脚本中包含迁移：
   ```json
   {
     "scripts": {
       "build": "prisma generate && prisma migrate deploy && next build"
     }
   }
   ```

3. 部署时会自动运行迁移

## 当前状态

✅ **代码已完成**：所有 API 和 UI 代码都已实现  
✅ **Schema 已更新**：`prisma/schema.prisma` 已包含 Card 和 Deck 模型  
⚠️ **迁移待运行**：需要数据库连接后才能运行迁移

## 建议

1. **先检查网络**：确认能否访问 Supabase
2. **检查环境变量**：确认 `.env` 文件配置正确
3. **如果无法连接**：可以先使用代码，稍后再运行迁移
4. **生产环境**：在 Vercel 部署时自动运行迁移

## 验证步骤

迁移成功后，应该能看到：

1. **新的数据库表**：
   - `Card` 表
   - `Deck` 表

2. **Prisma Client 已更新**：包含新的模型类型

3. **可以创建卡片**：通过 `/cards/generate` 页面测试

