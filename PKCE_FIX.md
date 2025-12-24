# 🔧 PKCE 错误修复指南

## 错误信息

```
[auth][error] InvalidCheck: pkceCodeVerifier value could not be parsed.
```

## 问题原因

这个错误通常由以下原因引起：

1. **Cookie 配置问题**：PKCE code verifier 存储在 cookie 中，但 cookie 设置不正确
2. **NEXTAUTH_URL 配置错误**：URL 不匹配导致 cookie 无法正确设置
3. **跨域问题**：OAuth 回调时 cookie 丢失
4. **Secure Cookie 问题**：在生产环境中需要 HTTPS

## 已应用的修复

### 1. Cookie 配置优化

在 `auth.ts` 中添加了正确的 cookie 配置：

```typescript
cookies: {
  pkceCodeVerifier: {
    name: '__Secure-authjs.pkce.code_verifier',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  // ... 其他 cookie 配置
}
```

### 2. 信任主机配置

添加了 `trustHost: true`，这在 Vercel 等托管平台上很重要：

```typescript
trustHost: true,
```

### 3. 调试模式

在开发环境中启用了调试模式：

```typescript
debug: process.env.NODE_ENV === 'development',
```

## 环境变量检查

确保以下环境变量在 Vercel 中正确设置：

### 必需的环境变量

```env
# NextAuth 配置
AUTH_SECRET="你的密钥（使用 openssl rand -base64 32 生成）"
NEXTAUTH_URL="https://ankigpt-kappa.vercel.app"

# Google OAuth
GOOGLE_CLIENT_ID="你的客户端ID"
GOOGLE_CLIENT_SECRET="你的客户端密钥"

# 数据库
DATABASE_URL="你的数据库URL"
```

### 重要提示

1. **NEXTAUTH_URL** 必须：
   - 使用完整的 URL（包括 `https://`）
   - 与你的实际部署域名完全匹配
   - 不要包含尾部斜杠

2. **AUTH_SECRET** 必须：
   - 至少 32 个字符
   - 在生产环境和开发环境使用不同的值
   - 保持安全，不要泄露

## 验证步骤

### 1. 检查环境变量

在 Vercel Dashboard 中：
- Settings → Environment Variables
- 确保所有变量都已设置
- 确保 `NEXTAUTH_URL` 使用 HTTPS

### 2. 检查 Google OAuth 配置

在 Google Cloud Console 中：
- APIs & Services → Credentials
- 检查 OAuth 2.0 客户端 ID
- 确保重定向 URI 正确：
  ```
  https://ankigpt-kappa.vercel.app/api/auth/callback/google
  ```

### 3. 清除浏览器 Cookie

如果之前测试过，清除浏览器 cookie：
- 打开浏览器开发者工具
- Application/Storage → Cookies
- 删除所有与你的域名相关的 cookie
- 重新测试

### 4. 重新部署

在 Vercel 中：
- Deployments → 最新部署 → "..." → Redeploy

## 本地测试

### 1. 配置本地环境变量

在 `.env` 文件中：

```env
AUTH_SECRET="你的密钥"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="你的客户端ID"
GOOGLE_CLIENT_SECRET="你的客户端密钥"
DATABASE_URL="你的数据库URL"
```

### 2. 在 Google Cloud Console 添加本地重定向 URI

```
http://localhost:3000/api/auth/callback/google
```

### 3. 运行本地服务器

```bash
npm run dev
```

### 4. 测试 OAuth 流程

1. 访问 `http://localhost:3000/zh/login`
2. 点击 "使用 Google 登录"
3. 检查浏览器控制台和终端日志
4. 查看是否有 PKCE 相关错误

## 调试技巧

### 1. 查看详细日志

在开发环境中，NextAuth 会自动输出详细日志。查看：
- 浏览器控制台
- 终端输出
- Vercel 日志（生产环境）

### 2. 检查 Cookie

在浏览器开发者工具中：
- Application → Cookies
- 查找 `__Secure-authjs.pkce.code_verifier`
- 检查 cookie 的：
  - Domain
  - Path
  - Secure 标志
  - SameSite 设置

### 3. 网络请求检查

在浏览器开发者工具中：
- Network 标签
- 查找 `/api/auth/callback/google` 请求
- 检查：
  - Request Headers（特别是 Cookie）
  - Response Headers（Set-Cookie）
  - 状态码

## 常见问题

### Q: 为什么需要 `trustHost: true`？

A: 在 Vercel 等托管平台上，Next.js 可能无法自动检测主机名。`trustHost: true` 告诉 NextAuth 信任请求头中的主机信息。

### Q: Cookie 的 `secure` 选项为什么重要？

A: `secure: true` 确保 cookie 只在 HTTPS 连接中传输，这是生产环境的安全要求。

### Q: 可以禁用 PKCE 吗？

A: 不推荐。PKCE 是 OAuth 2.0 的安全扩展，用于防止授权码拦截攻击。应该修复配置而不是禁用它。

## 如果问题仍然存在

1. **检查 NextAuth.js 版本**：
   ```bash
   npm list next-auth
   ```
   确保使用最新版本。

2. **查看 NextAuth.js 文档**：
   - https://next-auth.js.org/configuration/options#cookies
   - https://errors.authjs.dev#invalidcheck

3. **检查 Vercel 日志**：
   - 查看完整的错误堆栈
   - 检查是否有其他相关错误

4. **尝试清除所有数据**：
   - 清除浏览器 cookie
   - 清除 Vercel 构建缓存
   - 重新部署

---

**修复后，记得提交代码并重新部署到 Vercel！** ✅

