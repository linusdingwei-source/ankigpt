# 管理员页面访问问题排查指南

## 问题：无法访问管理员控制台页面

如果您已经将用户设置为管理员但仍然无法访问，请按照以下步骤排查：

## 快速诊断

### 1. 检查诊断 API

访问以下 URL（需要登录）：
```
https://yourdomain.com/api/admin/check
```

**预期响应（管理员）**：
```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "isAdmin": true,
    "user": {
      "id": "user_id",
      "email": "linus.dingwei@gmail.com",
      "role": "admin",
      "isAnonymous": false
    },
    "message": "您是管理员"
  }
}
```

**如果返回 `"isAdmin": false`**：
- 检查数据库中的 `role` 字段
- 确认值为 `"admin"`（小写，带引号）

### 2. 确认数据库设置

#### 使用 Prisma Studio（推荐）

```bash
npx prisma studio
```

1. 打开浏览器访问 `http://localhost:5555`
2. 找到 `User` 表
3. 搜索 `linus.dingwei@gmail.com`
4. 检查 `role` 字段是否为 `admin`

#### 使用 SQL 查询

```sql
SELECT id, email, role, "isAnonymous" 
FROM "User" 
WHERE email = 'linus.dingwei@gmail.com';
```

**确认**：
- `role` 字段应该是 `admin`（不是 `user`）
- `isAnonymous` 应该是 `false`

### 3. 重新登录

**重要**：修改数据库后，必须重新登录才能刷新 NextAuth session。

1. **退出登录**：点击页面右上角的"退出"按钮
2. **清除浏览器缓存**（可选但推荐）：
   - Chrome: 按 `F12` 打开开发者工具
   - 右键点击刷新按钮
   - 选择"清空缓存并硬性重新加载"
3. **重新登录**：使用 `linus.dingwei@gmail.com` 登录
4. **访问管理员页面**：`https://yourdomain.com/zh/admin`

## 常见问题

### 问题 1：数据库 role 字段已设置为 admin，但仍无法访问

**原因**：NextAuth session 缓存了旧的用户信息

**解决方案**：
1. 完全退出登录
2. 清除浏览器 cookies（特别是 `next-auth.session-token`）
3. 重新登录

### 问题 2：API 返回 403 错误

**检查清单**：
- [ ] 确认已登录（检查 `/api/admin/check` 返回 `isAuthenticated: true`）
- [ ] 确认数据库 `role` 字段为 `admin`
- [ ] 确认已重新登录（修改 role 后）
- [ ] 检查浏览器控制台是否有错误

### 问题 3：页面显示"您没有管理员权限"

**诊断步骤**：

1. **打开浏览器开发者工具**（F12）
2. **查看 Network 标签**：
   - 找到 `/api/admin/check` 请求
   - 查看响应内容
   - 确认 `isAdmin` 的值

3. **如果 `isAdmin: false`**：
   ```sql
   -- 再次确认数据库
   SELECT email, role FROM "User" WHERE email = 'linus.dingwei@gmail.com';
   
   -- 如果 role 不是 admin，更新它
   UPDATE "User" SET role = 'admin' WHERE email = 'linus.dingwei@gmail.com';
   ```

4. **退出并重新登录**

### 问题 4：页面一直加载中

**可能原因**：
- API 请求失败
- 数据库连接问题

**解决方案**：
1. 检查浏览器控制台的错误信息
2. 检查 Vercel 日志（如果有部署）
3. 确认数据库连接正常

## 手动设置管理员（SQL）

如果 Prisma Studio 无法使用，可以直接使用 SQL：

```sql
-- 查看当前用户信息
SELECT id, email, role, "isAnonymous", "createdAt" 
FROM "User" 
WHERE email = 'linus.dingwei@gmail.com';

-- 设置为管理员
UPDATE "User" 
SET role = 'admin' 
WHERE email = 'linus.dingwei@gmail.com';

-- 验证更新
SELECT email, role FROM "User" WHERE email = 'linus.dingwei@gmail.com';
```

**重要**：执行 SQL 后，必须重新登录！

## 验证步骤

完成设置后，按以下顺序验证：

1. ✅ **数据库验证**：
   ```sql
   SELECT email, role FROM "User" WHERE email = 'linus.dingwei@gmail.com';
   -- 应该返回 role = 'admin'
   ```

2. ✅ **API 验证**：
   - 访问：`https://yourdomain.com/api/admin/check`
   - 应该返回：`"isAdmin": true`

3. ✅ **页面访问**：
   - 访问：`https://yourdomain.com/zh/admin`
   - 应该显示管理员控制台

## 访问管理员页面的正确 URL

根据您的部署域名，管理员页面 URL 应该是：

- 中文：`https://ankigpt-kappa.vercel.app/zh/admin`
- 英文：`https://ankigpt-kappa.vercel.app/en/admin`
- 日文：`https://ankigpt-kappa.vercel.app/ja/admin`

或者使用您的自定义域名：
- `https://www.nihogogpt.com/zh/admin`

## 如果仍然无法访问

1. **检查 Vercel 部署日志**：
   - 登录 Vercel 控制台
   - 查看最新的部署日志
   - 检查是否有构建错误

2. **检查环境变量**：
   - 确认 `DATABASE_URL` 和 `DIRECT_URL` 已正确配置
   - 确认数据库连接正常

3. **检查 Prisma Client**：
   - 确认 `role` 字段已添加到 schema
   - 确认已运行 `prisma generate`

4. **联系支持**：
   - 提供诊断 API 的响应
   - 提供数据库查询结果
   - 提供浏览器控制台错误（如果有）

## 相关文件

- `app/[locale]/admin/page.tsx` - 管理员页面
- `app/api/admin/check/route.ts` - 管理员权限检查 API
- `app/api/admin/stats/route.ts` - 管理员统计 API
- `lib/admin.ts` - 管理员权限检查工具
