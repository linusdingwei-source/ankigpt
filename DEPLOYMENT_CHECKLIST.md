# 📋 部署检查清单

## 🎯 部署前必须完成

### 代码准备
- [ ] 代码已提交到 Git 仓库
- [ ] 所有功能已测试
- [ ] 没有硬编码的敏感信息
- [ ] `.env` 已添加到 `.gitignore`

### 环境变量配置（生产环境）

#### 数据库
- [ ] `DATABASE_URL` - Supabase 连接池 URL
- [ ] `DIRECT_URL` - Supabase 直接连接 URL

#### NextAuth
- [ ] `AUTH_SECRET` - 生产环境密钥（32 字符以上）
- [ ] `NEXTAUTH_URL` - 生产环境 URL（https://yourdomain.com）

#### Google OAuth
- [ ] `GOOGLE_CLIENT_ID` - 生产环境客户端 ID
- [ ] `GOOGLE_CLIENT_SECRET` - 生产环境客户端密钥
- [ ] Google OAuth 重定向 URI 已配置

#### 邮件服务
- [ ] `RESEND_API_KEY` - Resend API 密钥
- [ ] `RESEND_FROM_EMAIL` - 已验证的发件人邮箱

#### Stripe（生产环境）
- [ ] `STRIPE_SECRET_KEY` - 生产环境密钥（sk_live_...）
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook 签名密钥
- [ ] `STRIPE_PRICE_ID_STARTER` - Starter 套餐价格 ID
- [ ] `STRIPE_PRICE_ID_PRO` - Pro 套餐价格 ID
- [ ] `STRIPE_PRICE_ID_PREMIUM` - Premium 套餐价格 ID
- [ ] Stripe Webhook 已配置（生产环境 URL）
- [ ] Stripe 产品已创建（生产环境）

#### OpenAI TTS
- [ ] `OPENAI_API_KEY` - OpenAI API 密钥

#### SEO
- [ ] `NEXT_PUBLIC_SITE_URL` - 生产环境 URL
- [ ] `GOOGLE_SITE_VERIFICATION` - Google 验证码

#### Google Analytics
- [ ] `NEXT_PUBLIC_GA_ID` - Google Analytics 测量 ID

### 数据库
- [ ] Supabase 生产数据库已创建
- [ ] 数据库连接字符串已获取
- [ ] 生产环境数据库迁移计划已准备

### 第三方服务配置

#### Stripe
- [ ] 切换到 Live mode
- [ ] 创建三个产品（Starter, Pro, Premium）
- [ ] 配置 Webhook endpoint
- [ ] 测试支付流程

#### Google OAuth
- [ ] 创建 OAuth 2.0 客户端
- [ ] 配置授权重定向 URI
- [ ] 测试 OAuth 登录

#### 邮件服务
- [ ] 配置 SMTP 服务器
- [ ] 测试邮件发送功能

### 域名和 SSL
- [ ] 域名已购买
- [ ] DNS 配置已准备
- [ ] SSL 证书配置计划（Vercel 自动）

## 🚀 部署步骤

### Vercel 部署
- [ ] 在 Vercel 创建项目
- [ ] 连接 Git 仓库
- [ ] 配置项目设置
- [ ] 添加所有环境变量
- [ ] 触发首次部署
- [ ] 检查构建日志

### 数据库迁移
- [ ] 运行生产环境数据库迁移
- [ ] 验证所有表已创建
- [ ] 测试数据库连接

### 域名配置
- [ ] 在 Vercel 添加域名
- [ ] 配置 DNS 记录
- [ ] 等待 SSL 证书生效
- [ ] 测试 HTTPS 访问

## ✅ 部署后验证

### 功能测试
- [ ] 网站可以正常访问
- [ ] 用户注册功能正常
- [ ] Google OAuth 登录正常
- [ ] 邮箱验证码登录正常
- [ ] TTS 音频生成正常
- [ ] Credit 系统正常
- [ ] Stripe 支付流程正常
- [ ] Webhook 接收正常
- [ ] 邮件发送正常

### SEO 验证
- [ ] 提交站点地图到 Google Search Console
- [ ] 验证 Google Analytics 正常工作
- [ ] 检查 meta 标签是否正确
- [ ] 测试 Open Graph 和 Twitter Card

### 性能检查
- [ ] 页面加载速度正常
- [ ] API 响应时间正常
- [ ] 数据库查询性能正常

### 安全检查
- [ ] HTTPS 正常工作
- [ ] 频率限制生效
- [ ] 验证码正常工作
- [ ] 敏感信息未泄露

## 📊 监控配置

- [ ] 错误监控已配置（Sentry/LogRocket）
- [ ] 性能监控已配置
- [ ] 日志收集已配置
- [ ] 警报规则已设置

## 🔄 持续维护

- [ ] 定期备份数据库
- [ ] 监控错误日志
- [ ] 更新依赖包
- [ ] 检查安全更新
- [ ] 性能优化

---

**完成所有检查项后，项目即可上线！** ✅

