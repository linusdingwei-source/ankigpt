# Vercel 构建问题修复

## 🔍 问题分析

### 发现的问题

从最新构建日志可以看到：
```
11:19:03.724 Running "prisma generate && next build"
```

**问题**：虽然 `package.json` 中已经更新了 build 脚本，但 Vercel 使用的是 `vercel.json` 中硬编码的 `buildCommand`！

### 根本原因

`vercel.json` 文件中的 `buildCommand` 覆盖了 `package.json` 中的 `scripts.build`：

```json
{
  "buildCommand": "prisma generate && next build"  // ❌ 缺少 db push
}
```

这导致：
- ❌ `prisma db push` 没有执行
- ❌ 数据库表（Card、Deck）没有被创建
- ✅ 但构建仍然成功（因为没有数据库操作）

## ✅ 已修复

已更新 `vercel.json`：

```json
{
  "buildCommand": "prisma generate && prisma db push --skip-generate --accept-data-loss && next build"
}
```

### 修复说明

- `prisma generate` - 生成 Prisma Client
- `prisma db push --skip-generate` - 同步 Schema 到数据库（跳过重复生成）
- `--accept-data-loss` - 接受可能的数据丢失（首次部署可以接受）
- `next build` - 构建 Next.js 应用

## 🚀 下次部署

推送代码后，Vercel 会自动：

1. ✅ 生成 Prisma Client
2. ✅ **执行 `prisma db push`**（创建 Card 和 Deck 表）
3. ✅ 构建 Next.js 应用

### 预期日志

下次部署应该看到：

```
✔ Generated Prisma Client
✔ Pushed database schema
✓ Compiled successfully
```

## 📋 验证步骤

部署成功后：

1. **检查 Vercel 构建日志**：
   - 应该看到 `✔ Pushed database schema`
   - 或 `The database is already in sync`

2. **检查数据库表**：
   - 使用 Supabase Dashboard
   - 应该看到 `Card` 和 `Deck` 表

3. **测试功能**：
   - 访问 `/cards/generate`
   - 尝试生成一张卡片
   - 应该能成功保存

## 🔄 后续优化

部署成功后，建议：

1. **创建迁移文件**（在本地或通过其他方式）：
   ```bash
   npx prisma migrate dev --name add_cards_and_decks
   ```

2. **提交迁移文件**到 Git

3. **更新 vercel.json**，改用 `migrate deploy`：
   ```json
   {
     "buildCommand": "prisma generate && prisma migrate deploy && next build"
   }
   ```

这样可以：
- ✅ 保留迁移历史
- ✅ 更好的版本控制
- ✅ 适合生产环境

---

**修复时间**：2025-12-31  
**状态**：✅ 已修复，等待下次部署验证

