# 日语文本转语音 (Japanese Text to Speech)

一个基于 Next.js 14 的多语言日语文本转语音应用，支持中文、英文和日文界面。

## 功能特性

- ✅ Next.js 14 + TypeScript + Tailwind CSS
- ✅ 多语言支持（中文、英文、日文）
- ✅ NextAuth.js 认证系统
- ✅ Google OAuth 一键登录
- ✅ 邮箱验证码登录/注册
- ✅ 密码登录
- ✅ 忘记密码功能
- ✅ Credit 系统：新用户注册获得 2 credits
- ✅ 日语文本转语音（TTS），每次消耗 1 credit
- ✅ Stripe 支付集成，三个套餐（$9/$19/$99）
- ✅ 安全防护：数学验证码、频率限制（邮箱60秒、IP每小时5次）
- ✅ 响应式 UI 设计
- ✅ **完整 SEO 优化**：Meta 标签、Open Graph、Twitter Card、结构化数据、Sitemap、Robots.txt
- ✅ **Google Analytics 转化漏斗追踪**：页面访问、按钮点击、购买转化、音频转换成功率

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **国际化**: next-intl
- **认证**: NextAuth.js v5
- **数据库**: Prisma + PostgreSQL
- **TTS服务**: OpenAI TTS API（可配置其他服务）

## 开始使用

### 1. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件并配置以下变量：

```env
# 数据库 - Supabase
# Connection pooling (for application queries)
DATABASE_URL="postgresql://postgres.qkvgeuallarmbcfjzkko:Fydw%40715@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations)
# 重要：直接连接必须使用 db.[PROJECT-REF].supabase.co，不能使用 pooler 地址
DIRECT_URL="postgresql://postgres:Fydw%40715@db.qkvgeuallarmbcfjzkko.supabase.co:5432/postgres"

# NextAuth
AUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# 邮件服务 (Resend)
RESEND_API_KEY="re_..."  # 从 Resend Dashboard > API Keys 获取
RESEND_FROM_EMAIL="noreply@yourdomain.com"  # 已验证的发件人邮箱

# Stripe 支付
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # 从 Stripe Dashboard > Webhooks 获取
STRIPE_PRICE_ID_STARTER="price_..."  # $5 套餐的价格ID
STRIPE_PRICE_ID_PRO="price_..."      # $20 套餐的价格ID
STRIPE_PRICE_ID_PREMIUM="price_..."  # $100 套餐的价格ID

# OpenAI TTS (可选)
OPENAI_API_KEY="your-openai-api-key"

# SEO 配置
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
GOOGLE_SITE_VERIFICATION="your-google-verification-code"

# Google Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 或使用 Prisma Studio 查看数据库
npx prisma studio
```

### 4. 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
app/
  [locale]/          # 多语言路由
    login/           # 登录页面
    register/        # 注册页面
    forgot-password/ # 忘记密码页面
    dashboard/       # 仪表板（TTS功能）
  api/               # API 路由
    auth/            # 认证相关 API
    tts/             # 文本转语音 API
messages/            # 多语言翻译文件
prisma/              # 数据库 schema
```

## 路由说明

- `/zh` - 中文界面
- `/en` - 英文界面
- `/ja` - 日文界面

每个语言下的路由：
- `/{locale}/login` - 登录
- `/{locale}/register` - 注册
- `/{locale}/forgot-password` - 忘记密码
- `/{locale}/dashboard` - 仪表板（需要登录）
- `/{locale}/pricing` - 定价页面

## Credit 系统

- 新用户注册自动获得 **2 credits**
- 每次生成语音消耗 **1 credit**
- 可通过购买套餐获得更多 credits：
  - Starter: $9 → 10 credits
  - Pro: $19 → 25 credits（推荐）
  - Premium: $99 → 150 credits

## 功能说明

### 认证方式

1. **Google OAuth**: 使用 Google 账号一键登录
2. **邮箱密码**: 使用邮箱和密码登录
3. **邮箱验证码**: 使用邮箱和验证码登录/注册

### Credit 系统

- 新用户注册自动获得 2 credits
- 每次生成语音消耗 1 credit
- Credits 不足时需要购买套餐

### 文本转语音

- 输入日语文本（最多500字符）
- 使用 OpenAI TTS API 生成语音
- 每次生成消耗 1 credit
- 支持下载生成的音频文件

### 支付系统

- 集成 Stripe 支付
- 三个套餐可选（含额外赠送）：
  - Starter ($5): 5 credits + 2 赠送 = 7 credits
  - Pro ($20): 20 credits + 10 赠送 = 30 credits（推荐）
  - Premium ($100): 100 credits + 50 赠送 = 150 credits
- 支付成功后自动添加 credits（包含赠送）
- Webhook 安全验证
- 支付失败/declined 错误处理
- 支付成功/取消页面

### 安全功能

- 数学验证码（防止自动化攻击）
- 邮箱频率限制（60秒内只能发送一次）
- IP 频率限制（每小时最多5次请求）
- 倒计时显示剩余等待时间

## 部署

### Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

### 数据库

推荐使用：
- Vercel Postgres（免费套餐）
- Supabase（免费套餐）
- Railway
- Neon

## SEO 优化

项目已完整实现 SEO 优化，包括：

- ✅ Meta 标签（Title, Description, Keywords）
- ✅ Open Graph 标签（Facebook/LinkedIn 分享）
- ✅ Twitter Card 标签
- ✅ 结构化数据（JSON-LD）：FAQ、Organization、Service、WebSite
- ✅ Hreflang 标签（多语言 SEO）
- ✅ 自动生成 Sitemap.xml
- ✅ Robots.txt 配置
- ✅ 首页 FAQ 部分（提升 SEO 价值）

详细配置请参考 [SEO_GUIDE.md](./SEO_GUIDE.md)

## Google Analytics 转化漏斗追踪

项目已完整实现 Google Analytics 4 追踪，包括：

- ✅ **页面访问追踪**：首页、登录页、注册页、定价页、仪表板
- ✅ **按钮点击追踪**：所有关键按钮的点击事件
- ✅ **购买转化追踪**：开始结账、支付成功、支付失败
- ✅ **音频转换成功率追踪**：生成开始、成功、失败、下载

### 转化漏斗

完整的用户转化路径追踪：
```
首页访问 → 登录/注册 → 仪表板 → 生成音频 → 定价页 → 购买 → 支付成功
```

### 关键指标

- **注册转化率** = (注册成功数 / 首页访问数) × 100%
- **登录转化率** = (登录成功数 / 登录页访问数) × 100%
- **音频生成成功率** = (生成成功数 / 生成开始数) × 100%
- **购买转化率** = (支付成功数 / 定价页访问数) × 100%
- **完整转化率（访问到付费）** = (支付成功数 / 首页访问数) × 100%

详细配置请参考 [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md)

### 快速开始 SEO

1. 设置环境变量 `NEXT_PUBLIC_SITE_URL`
2. 创建 OG 图片：`public/og-image.jpg` (1200x630px)
3. 创建 Logo：`public/logo.png` (512x512px)
4. 提交 sitemap 到 Google Search Console

## 许可证

MIT
