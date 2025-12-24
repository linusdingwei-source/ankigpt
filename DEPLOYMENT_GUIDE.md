# 🚀 生产环境部署指南

## 📋 部署前检查清单

### ✅ 1. 代码准备

- [ ] 代码已提交到 Git 仓库
- [ ] 所有功能已测试通过
- [ ] 没有硬编码的敏感信息
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 代码已通过 ESLint 检查

### ✅ 2. 数据库配置

- [ ] Supabase 生产数据库已创建
- [ ] 数据库连接字符串已获取
- [ ] 生产环境数据库迁移已完成
- [ ] 数据库备份策略已配置

**操作步骤**：
```bash
# 1. 使用生产环境变量运行迁移
DATABASE_URL="生产环境连接池URL" \
DIRECT_URL="生产环境直接连接URL" \
npx prisma migrate deploy

# 或使用 db push（开发环境）
npx prisma db push
```

### ✅ 3. 环境变量配置

#### 必需的环境变量清单

**数据库**：
```env
DATABASE_URL="生产环境连接池URL"
DIRECT_URL="生产环境直接连接URL"
```

**NextAuth**：
```env
AUTH_SECRET="生产环境密钥（使用 openssl rand -base64 32 生成）"
NEXTAUTH_URL="https://yourdomain.com"
```

**Google OAuth（生产环境）**：
```env
GOOGLE_CLIENT_ID="生产环境客户端ID"
GOOGLE_CLIENT_SECRET="生产环境客户端密钥"
```

**邮件服务（SMTP）**：
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="应用专用密码"
SMTP_FROM="your-email@gmail.com"
```

**Stripe（生产环境）**：
```env
STRIPE_SECRET_KEY="sk_live_..."  # ⚠️ 生产环境密钥
STRIPE_WEBHOOK_SECRET="whsec_..."  # Webhook 签名密钥
STRIPE_PRICE_ID_STARTER="price_..."  # 生产环境价格ID
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_PREMIUM="price_..."
```

**OpenAI TTS**：
```env
OPENAI_API_KEY="sk-..."
```

**SEO 配置**：
```env
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
GOOGLE_SITE_VERIFICATION="your-verification-code"
```

**Google Analytics**：
```env
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### ✅ 4. Stripe 生产环境配置

#### 4.1 创建生产环境产品和价格

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 切换到 **Live mode**（生产模式）
3. 创建三个产品：
   - **Starter**: $5, 5 credits + 2 bonus = 7 credits
   - **Pro**: $20, 20 credits + 10 bonus = 30 credits
   - **Premium**: $100, 100 credits + 50 bonus = 150 credits
4. 复制每个产品的 **Price ID**（格式：`price_xxxxx`）

#### 4.2 配置 Webhook

1. 在 Stripe Dashboard 中，进入 **Developers** > **Webhooks**
2. 点击 **Add endpoint**
3. 输入 Webhook URL：`https://yourdomain.com/api/payment/webhook`
4. 选择要监听的事件：
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `checkout.session.async_payment_failed`
5. 复制 **Signing secret**（格式：`whsec_xxxxx`）

#### 4.3 更新环境变量

在部署平台（如 Vercel）的环境变量中设置：
```env
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_STARTER="price_..."
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_PREMIUM="price_..."
```

### ✅ 5. Google OAuth 生产环境配置

#### 5.1 创建 OAuth 2.0 客户端

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 选择或创建项目
3. 进入 **APIs & Services** > **Credentials**
4. 点击 **Create Credentials** > **OAuth client ID**
5. 选择应用类型：**Web application**
6. 添加授权的重定向 URI：
   - `https://yourdomain.com/api/auth/callback/google`
7. 复制 **Client ID** 和 **Client Secret**

#### 5.2 更新环境变量

```env
GOOGLE_CLIENT_ID="生产环境客户端ID"
GOOGLE_CLIENT_SECRET="生产环境客户端密钥"
```

### ✅ 6. 邮件服务配置

#### 6.1 Gmail 应用专用密码

1. 访问 [Google Account](https://myaccount.google.com)
2. 进入 **Security** > **2-Step Verification**
3. 在底部找到 **App passwords**
4. 生成新的应用专用密码
5. 使用此密码作为 `SMTP_PASSWORD`

#### 6.2 其他邮件服务

如果使用其他邮件服务（如 SendGrid、Resend），更新相应的 SMTP 配置。

### ✅ 7. 域名和 SSL 配置

#### 7.1 购买域名

- 推荐域名注册商：Namecheap, Google Domains, Cloudflare
- 确保域名已正确配置 DNS

#### 7.2 配置 DNS

如果使用 Vercel：
- Vercel 会自动配置 SSL 证书
- 只需在 Vercel 项目设置中添加域名
- 按照 Vercel 提示配置 DNS 记录

### ✅ 8. 部署到 Vercel（推荐）

#### 8.1 准备工作

1. 确保代码已推送到 GitHub/GitLab/Bitbucket
2. 在 [Vercel](https://vercel.com) 注册/登录
3. 连接 Git 仓库

#### 8.2 创建项目

1. 点击 **Add New Project**
2. 选择你的 Git 仓库
3. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`（如果项目在根目录）
   - **Build Command**: `npm run build`（或 `pnpm build`）
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`（或 `pnpm install`）

#### 8.3 配置环境变量

在 Vercel 项目设置中：

1. 进入 **Settings** > **Environment Variables**
2. 添加所有必需的环境变量（见第 3 节）
3. 确保为 **Production**、**Preview**、**Development** 环境分别配置

#### 8.4 配置构建设置

在 `package.json` 中添加构建脚本（如果还没有）：

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

#### 8.5 部署

1. 点击 **Deploy**
2. 等待构建完成
3. 检查部署日志是否有错误

### ✅ 9. 数据库迁移（生产环境）

#### 9.1 使用迁移文件（推荐）

```bash
# 设置生产环境变量
export DATABASE_URL="生产环境连接池URL"
export DIRECT_URL="生产环境直接连接URL"

# 运行迁移
npx prisma migrate deploy
```

#### 9.2 或使用 db push（仅开发环境）

```bash
npx prisma db push
```

### ✅ 10. SEO 配置更新

#### 10.1 更新站点 URL

确保所有 SEO 相关文件使用生产环境 URL：

- `lib/seo.ts` - 检查 `siteUrl` 配置
- `app/[locale]/layout.tsx` - 检查 hreflang 标签
- `app/sitemap.ts` - 检查站点地图 URL

#### 10.2 Google Search Console

1. 访问 [Google Search Console](https://search.google.com/search-console)
2. 添加属性（你的域名）
3. 验证域名所有权
4. 提交站点地图：`https://yourdomain.com/sitemap.xml`

#### 10.3 Google Analytics

1. 在 [Google Analytics](https://analytics.google.com) 创建属性
2. 获取测量 ID（格式：`G-XXXXXXXXXX`）
3. 更新环境变量 `NEXT_PUBLIC_GA_ID`

### ✅ 11. 性能优化

#### 11.1 图片优化

- 使用 Next.js Image 组件
- 配置图片 CDN（如 Cloudinary、ImageKit）

#### 11.2 代码分割

- Next.js 14 自动代码分割
- 确保使用动态导入（`dynamic import`）加载大型组件

#### 11.3 缓存策略

- 配置适当的缓存头
- 使用 Vercel Edge Functions 提高性能

### ✅ 12. 安全配置

#### 12.1 环境变量安全

- ✅ 所有敏感信息使用环境变量
- ✅ 不要提交 `.env` 文件到 Git
- ✅ 使用 Vercel 的环境变量加密存储

#### 12.2 HTTPS

- Vercel 自动提供 HTTPS
- 确保所有 API 调用使用 HTTPS

#### 12.3 CORS 配置

- 在 API 路由中配置适当的 CORS 策略
- 限制允许的源

#### 12.4 Rate Limiting

- 已实现邮箱和 IP 频率限制
- 考虑添加 API 级别的频率限制

### ✅ 13. 监控和日志

#### 13.1 错误监控

推荐服务：
- [Sentry](https://sentry.io) - 错误追踪
- [LogRocket](https://logrocket.com) - 会话重放
- Vercel Analytics - 内置分析

#### 13.2 性能监控

- Vercel Analytics（内置）
- Google Analytics（已配置）
- Web Vitals 监控

#### 13.3 日志

- Vercel 提供内置日志
- 考虑使用外部日志服务（如 Logtail、Datadog）

### ✅ 14. 备份策略

#### 14.1 数据库备份

- Supabase 自动备份（根据计划）
- 定期导出数据库快照
- 配置自动备份计划

#### 14.2 代码备份

- Git 仓库作为代码备份
- 定期创建发布标签

### ✅ 15. 测试清单

#### 15.1 功能测试

- [ ] 用户注册/登录（Google OAuth）
- [ ] 邮箱验证码登录
- [ ] 密码登录
- [ ] 忘记密码功能
- [ ] TTS 音频生成
- [ ] Credit 系统（初始 credits、消费）
- [ ] Stripe 支付流程
- [ ] Webhook 处理
- [ ] 邮件发送

#### 15.2 性能测试

- [ ] 页面加载速度
- [ ] API 响应时间
- [ ] 数据库查询性能

#### 15.3 安全测试

- [ ] 频率限制是否生效
- [ ] 验证码是否正常工作
- [ ] HTTPS 是否正确配置
- [ ] 敏感信息是否泄露

### ✅ 16. 上线后检查

#### 16.1 立即检查

- [ ] 网站是否可以正常访问
- [ ] 所有页面是否正常加载
- [ ] API 是否正常工作
- [ ] 数据库连接是否正常
- [ ] Stripe Webhook 是否正常接收
- [ ] 邮件发送是否正常

#### 16.2 监控

- [ ] 设置错误警报
- [ ] 监控 API 响应时间
- [ ] 监控数据库性能
- [ ] 监控 Stripe 支付成功率

## 🚀 快速部署步骤（Vercel）

### 1. 准备代码

```bash
# 确保代码已提交
git add .
git commit -m "准备生产环境部署"
git push
```

### 2. 在 Vercel 创建项目

1. 登录 [Vercel](https://vercel.com)
2. 点击 **Add New Project**
3. 导入 Git 仓库
4. 配置项目设置

### 3. 配置环境变量

在 Vercel 项目设置中添加所有环境变量（见第 3 节）

### 4. 部署

1. 点击 **Deploy**
2. 等待构建完成
3. 检查部署日志

### 5. 配置域名

1. 在 Vercel 项目设置中添加域名
2. 配置 DNS 记录
3. 等待 SSL 证书自动配置

### 6. 运行数据库迁移

```bash
# 使用生产环境变量
DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
```

### 7. 验证

- 访问网站
- 测试所有功能
- 检查错误日志

## 📝 部署后维护

### 定期任务

- [ ] 监控错误日志
- [ ] 检查数据库性能
- [ ] 更新依赖包
- [ ] 备份数据库
- [ ] 检查安全更新

### 更新部署

```bash
# 1. 更新代码
git add .
git commit -m "更新内容"
git push

# 2. Vercel 自动部署（如果已连接 Git）
# 或手动触发部署
```

## 🆘 故障排查

### 常见问题

1. **构建失败**
   - 检查环境变量是否全部配置
   - 检查 `package.json` 构建脚本
   - 查看 Vercel 构建日志

2. **数据库连接失败**
   - 检查 `DATABASE_URL` 和 `DIRECT_URL`
   - 检查 Supabase 防火墙设置
   - 确认网络连接

3. **Stripe Webhook 失败**
   - 检查 Webhook URL 是否正确
   - 验证 Webhook 签名密钥
   - 查看 Stripe Dashboard 中的 Webhook 日志

4. **邮件发送失败**
   - 检查 SMTP 配置
   - 验证应用专用密码
   - 检查邮件服务限制

## 📚 相关文档

- [Vercel 部署文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Stripe 文档](https://stripe.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Prisma 迁移文档](https://www.prisma.io/docs/guides/migrate)

## ✅ 部署完成检查表

部署完成后，确认以下项目：

- [ ] 网站可以正常访问
- [ ] 所有环境变量已配置
- [ ] 数据库迁移已完成
- [ ] Stripe 支付正常工作
- [ ] Google OAuth 正常工作
- [ ] 邮件发送正常工作
- [ ] SEO 配置正确
- [ ] Google Analytics 正常工作
- [ ] 错误监控已配置
- [ ] 备份策略已实施

---

**祝部署顺利！** 🎉

