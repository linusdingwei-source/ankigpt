# 🔍 Vercel 部署故障排查指南

## 📊 查看详细错误日志

### 方法 1: Vercel Dashboard 日志

1. **访问 Vercel Dashboard**
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 选择你的项目 `ankigpt`

2. **查看实时日志**
   - 点击顶部导航栏的 **"Logs"** 标签
   - 在左侧筛选器中：
     - **Timeline**: 选择时间范围（如 "Last 30 minutes"）
     - **Contains Console Level**: 勾选 "Error"、"Warning"、"Fatal"
   - 点击具体的错误日志条目查看详细信息

3. **查看函数日志**
   - 在日志详情面板中，查看：
     - **Function Invocation**: 函数执行详情
     - **Request ID**: 请求 ID（用于追踪）
     - **Execution Duration**: 执行时间
     - **Messages**: 详细的错误消息

### 方法 2: Vercel CLI 查看日志

```bash
# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 登录 Vercel
vercel login

# 查看实时日志
vercel logs ankigpt --follow

# 查看特定部署的日志
vercel logs ankigpt --deployment <deployment-id>
```

### 方法 3: 在代码中添加详细日志

在 `auth.ts` 中添加错误处理：

```typescript
// 在 auth.ts 文件开头添加
if (!process.env.AUTH_SECRET) {
  console.error('❌ AUTH_SECRET is not set!');
}
if (!process.env.NEXTAUTH_URL) {
  console.error('❌ NEXTAUTH_URL is not set!');
}
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('❌ GOOGLE_CLIENT_ID is not set!');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_SECRET is not set!');
}
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
}
```

## 🔧 常见错误和解决方案

### 错误 1: "Configuration" 错误（500）

**原因**：NextAuth.js 缺少必需的环境变量

**检查清单**：

1. **AUTH_SECRET** 未设置
   ```bash
   # 生成 AUTH_SECRET
   openssl rand -base64 32
   ```

2. **NEXTAUTH_URL** 未设置或设置错误
   ```env
   NEXTAUTH_URL=https://ankigpt-kappa.vercel.app
   ```

3. **GOOGLE_CLIENT_ID** 或 **GOOGLE_CLIENT_SECRET** 未设置

4. **DATABASE_URL** 未设置

**解决方案**：

1. 在 Vercel Dashboard 中：
   - 进入 **Settings** > **Environment Variables**
   - 添加所有必需的环境变量
   - 确保选择正确的环境（Production, Preview, Development）

2. 重新部署：
   - 在 **Deployments** 页面
   - 点击最新部署的 **"..."** 菜单
   - 选择 **"Redeploy"**

### 错误 2: "redirect_uri_mismatch"

**原因**：Google OAuth 重定向 URI 不匹配

**解决方案**：

1. 在 [Google Cloud Console](https://console.cloud.google.com) 中：
   - 进入 **APIs & Services** > **Credentials**
   - 点击你的 OAuth 2.0 客户端 ID
   - 在 **Authorized redirect URIs** 中添加：
     ```
     https://ankigpt-kappa.vercel.app/api/auth/callback/google
     ```
   - 点击 **Save**

2. 等待几分钟让更改生效

### 错误 3: 数据库连接错误

**原因**：`DATABASE_URL` 配置错误或数据库未初始化

**解决方案**：

1. 检查 `DATABASE_URL` 是否正确：
   ```env
   DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

2. 运行数据库迁移：
   ```bash
   # 在本地运行（使用生产环境变量）
   DATABASE_URL="你的生产环境URL" \
   npx prisma db push
   ```

3. 或使用 Vercel 的数据库迁移功能

## 🧪 本地测试

### 步骤 1: 配置本地环境变量

1. **复制 `.env` 文件**（如果还没有）：
   ```bash
   cp .env.example .env
   # 或
   cp env .env
   ```

2. **更新 `.env` 文件**，使用生产环境的值：
   ```env
   # 使用生产环境的数据库（可选，建议使用本地测试数据库）
   DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"

   # NextAuth
   AUTH_SECRET="你的AUTH_SECRET"
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth（使用生产环境的凭据，或创建测试凭据）
   GOOGLE_CLIENT_ID="你的GOOGLE_CLIENT_ID"
   GOOGLE_CLIENT_SECRET="你的GOOGLE_CLIENT_SECRET"

   # 其他环境变量...
   ```

3. **在 Google Cloud Console 中添加本地重定向 URI**：
   ```
   http://localhost:3000/api/auth/callback/google
   ```

### 步骤 2: 运行本地开发服务器

```bash
# 安装依赖（如果还没有）
npm install

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移（如果需要）
npx prisma db push

# 启动开发服务器
npm run dev
```

### 步骤 3: 测试 Google OAuth

1. 访问 `http://localhost:3000/zh/login`（或 `/en/login`、`/ja/login`）
2. 点击 **"使用 Google 登录"** 按钮
3. 应该会跳转到 Google 登录页面
4. 登录后应该重定向回本地应用

### 步骤 4: 检查控制台日志

在终端中查看详细的日志输出，包括：
- 环境变量是否正确加载
- 数据库连接是否成功
- OAuth 流程是否正常

## 📝 环境变量检查清单

在 Vercel 中确保以下环境变量都已设置：

### 必需的环境变量

- [ ] `AUTH_SECRET` - NextAuth 密钥
- [ ] `NEXTAUTH_URL` - 应用 URL（生产环境：`https://ankigpt-kappa.vercel.app`）
- [ ] `DATABASE_URL` - Supabase 连接池 URL
- [ ] `DIRECT_URL` - Supabase 直接连接 URL（用于迁移）
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth 客户端 ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth 客户端密钥

### 可选的环境变量

- [ ] `RESEND_API_KEY` - Resend API 密钥
- [ ] `RESEND_FROM_EMAIL` - 已验证的发件人邮箱
- [ ] `STRIPE_SECRET_KEY` - Stripe 密钥
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe Webhook 密钥
- [ ] `OPENAI_API_KEY` - OpenAI API 密钥

## 🔍 调试技巧

### 1. 添加环境变量检查脚本

创建 `scripts/check-env-production.js`：

```javascript
const requiredVars = [
  'AUTH_SECRET',
  'NEXTAUTH_URL',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

console.log('🔍 Checking environment variables...\n');

let allSet = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allSet = false;
  }
});

if (allSet) {
  console.log('\n✅ All required environment variables are set!');
} else {
  console.log('\n❌ Some environment variables are missing!');
  process.exit(1);
}
```

### 2. 在 API 路由中添加错误处理

在 `app/api/auth/[...nextauth]/route.ts` 中添加：

```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;

// 添加错误处理中间件
export async function GET(request: Request) {
  try {
    return handlers.GET(request);
  } catch (error) {
    console.error('NextAuth Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Authentication error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## 🚀 快速修复步骤

1. **检查 Vercel 环境变量**
   - 进入 Vercel Dashboard > Settings > Environment Variables
   - 确保所有必需变量都已设置

2. **验证 Google OAuth 配置**
   - 检查重定向 URI 是否正确
   - 确保客户端 ID 和密钥正确

3. **重新部署**
   - 在 Vercel Dashboard 中触发重新部署
   - 或推送新的提交到 Git

4. **查看日志**
   - 在 Vercel Dashboard > Logs 中查看详细错误
   - 检查 Function Invocation 详情

5. **本地测试**
   - 在本地配置相同的环境变量
   - 运行 `npm run dev` 测试
   - 检查控制台输出

## 📞 获取帮助

如果问题仍然存在：

1. **查看 Vercel 日志**：获取完整的错误堆栈
2. **检查 NextAuth.js 文档**：https://next-auth.js.org
3. **查看 GitHub Issues**：搜索类似问题

---

**记住**：大多数配置错误都是因为环境变量未正确设置。确保在 Vercel 中配置了所有必需的环境变量！✅

