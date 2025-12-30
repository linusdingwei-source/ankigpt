# Stripe API 密钥申请和配置完整指南

## 📋 目录
1. [创建 Stripe 账户](#1-创建-stripe-账户)
2. [获取 API 密钥](#2-获取-api-密钥)
3. [创建产品和价格](#3-创建产品和价格)
4. [配置环境变量](#4-配置环境变量)
5. [配置 Webhook（生产环境）](#5-配置-webhook生产环境)
6. [测试配置](#6-测试配置)
7. [常见问题](#7-常见问题)

---

## 1. 创建 Stripe 账户

### 步骤 1.1: 注册 Stripe 账户

1. 访问 [Stripe 官网](https://stripe.com/)
2. 点击右上角 **"Sign in"** 或 **"Start now"**
3. 选择 **"Create account"**（创建账户）
4. 填写注册信息：
   - 邮箱地址
   - 密码
   - 国家/地区（选择你的业务所在国家）

### 步骤 1.2: 激活账户

1. 检查邮箱，点击验证链接
2. 登录 Stripe Dashboard
3. 完成账户设置：
   - 填写业务信息（公司名称、地址等）
   - 添加银行账户信息（用于接收付款）
   - 完成身份验证（根据地区要求）

> **注意**：测试环境不需要完整的账户验证，但生产环境需要完成所有验证步骤。

---

## 2. 获取 API 密钥

### 步骤 2.1: 进入 API 密钥页面

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 在左侧菜单中，点击 **"Developers"**（开发者）
3. 在下拉菜单中选择 **"API keys"**（API 密钥）

### 步骤 2.2: 获取测试密钥（开发环境）

在 API keys 页面，你会看到：

- **Publishable key**（可发布密钥）：`pk_test_...`
  - 用于前端，可以公开
  - 本项目中**不需要**（我们使用服务器端支付）

- **Secret key**（密钥）：`sk_test_...`
  - ⚠️ **保密**，不要泄露
  - 点击 **"Reveal test key"**（显示测试密钥）查看完整密钥
  - 复制这个密钥，稍后用于环境变量

### 步骤 2.3: 获取生产密钥（生产环境）

1. 在 API keys 页面顶部，找到 **"Viewing test data"**（查看测试数据）开关
2. 点击切换到 **"Viewing live data"**（查看生产数据）
3. 现在会显示生产环境的密钥：
   - **Secret key**：`sk_live_...`
   - 同样点击 **"Reveal live key"** 查看完整密钥
   - 复制这个密钥用于生产环境

> **⚠️ 重要提示**：
> - 测试密钥以 `sk_test_` 开头
> - 生产密钥以 `sk_live_` 开头
> - 生产密钥只能用于生产环境，不要用于测试

---

## 3. 创建产品和价格

### 步骤 3.1: 创建产品

1. 在 Stripe Dashboard 左侧菜单，点击 **"Products"**（产品）
2. 点击右上角 **"+ Add product"**（添加产品）

### 步骤 3.2: 创建 Starter 套餐

1. **Product name**（产品名称）：`Starter`
2. **Description**（描述）：`5 Credits + 2 Bonus Credits = 7 Total Credits`
3. **Pricing model**（定价模式）：选择 **"Standard pricing"**（标准定价）
4. **Price**（价格）：输入 `5`，选择货币（如 `USD`）
5. **Billing period**（计费周期）：选择 **"One time"**（一次性）
6. 点击 **"Save product"**（保存产品）
7. 在创建成功后，记录下 **Price ID**（价格 ID），格式为 `price_xxxxx`

### 步骤 3.3: 创建 Pro 套餐

重复步骤 3.2，但使用以下信息：
- **Product name**：`Pro`
- **Description**：`20 Credits + 10 Bonus Credits = 30 Total Credits`
- **Price**：`20`
- 记录 **Price ID**

### 步骤 3.4: 创建 Premium 套餐

重复步骤 3.2，但使用以下信息：
- **Product name**：`Premium`
- **Description**：`100 Credits + 50 Bonus Credits = 150 Total Credits`
- **Price**：`100`
- 记录 **Price ID**

### 步骤 3.5: 查看所有价格 ID

1. 在 Products 页面，点击每个产品
2. 在价格部分，找到 **Price ID**（格式：`price_xxxxx`）
3. 记录下三个价格 ID：
   - Starter: `price_xxxxx`
   - Pro: `price_xxxxx`
   - Premium: `price_xxxxx`

---

## 4. 配置环境变量

### 步骤 4.1: 本地开发环境（.env 文件）

在项目根目录的 `.env` 文件中添加：

```env
# Stripe 测试环境配置
STRIPE_SECRET_KEY="sk_test_你的测试密钥"
STRIPE_WEBHOOK_SECRET="whsec_你的webhook密钥"  # 见下方 Webhook 配置
STRIPE_PRICE_ID_STARTER="price_你的starter价格ID"
STRIPE_PRICE_ID_PRO="price_你的pro价格ID"
STRIPE_PRICE_ID_PREMIUM="price_你的premium价格ID"
```

### 步骤 4.2: Vercel 生产环境配置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`ankigpt-kappa`）
3. 进入 **Settings**（设置）> **Environment Variables**（环境变量）
4. 添加以下变量：

   **测试环境变量（用于 Preview 和 Development）：**
   ```
   STRIPE_SECRET_KEY = sk_test_你的测试密钥
   STRIPE_WEBHOOK_SECRET = whsec_你的测试webhook密钥
   STRIPE_PRICE_ID_STARTER = price_你的测试starter价格ID
   STRIPE_PRICE_ID_PRO = price_你的测试pro价格ID
   STRIPE_PRICE_ID_PREMIUM = price_你的测试premium价格ID
   ```
   - 选择 **Environment**: `Preview`, `Development`

   **生产环境变量（用于 Production）：**
   ```
   STRIPE_SECRET_KEY = sk_live_你的生产密钥
   STRIPE_WEBHOOK_SECRET = whsec_你的生产webhook密钥
   STRIPE_PRICE_ID_STARTER = price_你的生产starter价格ID
   STRIPE_PRICE_ID_PRO = price_你的生产pro价格ID
   STRIPE_PRICE_ID_PREMIUM = price_你的生产premium价格ID
   ```
   - 选择 **Environment**: `Production`

5. 点击 **"Save"**（保存）

> **⚠️ 重要**：
> - 确保测试和生产环境使用不同的密钥和价格 ID
> - 生产环境必须使用 `sk_live_` 开头的密钥
> - 保存后需要重新部署才能生效

---

## 5. 配置 Webhook（生产环境）

### 步骤 5.1: 开发环境 Webhook（使用 Stripe CLI）

如果你在本地开发，可以使用 Stripe CLI 转发 Webhook：

1. **安装 Stripe CLI**：
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (使用 Chocolatey)
   choco install stripe
   
   # Linux
   # 参考：https://stripe.com/docs/stripe-cli
   ```

2. **登录 Stripe CLI**：
   ```bash
   stripe login
   ```

3. **转发 Webhook**：
   ```bash
   stripe listen --forward-to localhost:3000/api/payment/webhook
   ```

4. **复制 Webhook 签名密钥**：
   - CLI 会显示一个 `whsec_...` 开头的密钥
   - 复制这个密钥到 `.env` 文件的 `STRIPE_WEBHOOK_SECRET`

### 步骤 5.2: 生产环境 Webhook（Vercel）

1. 在 Stripe Dashboard，进入 **Developers** > **Webhooks**
2. 点击右上角 **"+ Add endpoint"**（添加端点）
3. **Endpoint URL**（端点 URL）：
   ```
   https://ankigpt-kappa.vercel.app/api/payment/webhook
   ```
   （替换为你的实际域名）
4. **Description**（描述）：`Production Webhook`
5. **Events to send**（要发送的事件）：
   - 选择 **"Select events"**（选择事件）
   - 勾选以下事件：
     - ✅ `checkout.session.completed`
     - ✅ `payment_intent.payment_failed`
     - ✅ `checkout.session.async_payment_failed`
6. 点击 **"Add endpoint"**（添加端点）
7. 创建成功后，点击端点查看详情
8. **复制 Signing secret**（签名密钥）：
   - 点击 **"Reveal"**（显示）按钮
   - 复制 `whsec_...` 开头的密钥
   - 添加到 Vercel 环境变量 `STRIPE_WEBHOOK_SECRET`

### 步骤 5.3: 测试环境 Webhook（可选）

如果需要为测试环境单独配置 Webhook：

1. 在 Stripe Dashboard，确保切换到 **"Viewing test data"**
2. 重复步骤 5.2，但使用测试环境的 URL
3. 使用测试环境的 Webhook 签名密钥

---

## 6. 测试配置

### 步骤 6.1: 本地测试

1. **启动开发服务器**：
   ```bash
   npm run dev
   ```

2. **测试支付流程**：
   - 访问 `http://localhost:3000/zh/pricing`
   - 选择一个套餐
   - 使用测试卡号：`4242 4242 4242 4242`
   - 任意未来日期、任意 CVC
   - 完成支付

3. **检查结果**：
   - 支付应该成功
   - Credits 应该添加到账户
   - 订单应该创建

### 步骤 6.2: 生产环境测试

1. **重新部署 Vercel**：
   - 在 Vercel Dashboard，进入 **Deployments**
   - 点击最新部署的 **"..."** 菜单
   - 选择 **"Redeploy"**

2. **测试支付流程**：
   - 访问生产环境定价页面
   - 使用测试卡号完成支付
   - 检查 Credits 是否正确添加

### 步骤 6.3: 测试卡号

Stripe 提供以下测试卡号：

| 卡号 | 用途 |
|------|------|
| `4242 4242 4242 4242` | 成功支付 |
| `4000 0000 0000 0002` | 支付失败 |
| `4000 0025 0000 3155` | 需要 3D 验证 |

更多测试卡号：https://stripe.com/docs/testing

---

## 7. 常见问题

### Q1: 如何区分测试和生产环境？

- **测试环境**：
  - API 密钥：`sk_test_...`
  - 价格 ID：在测试模式下创建
  - 不会产生真实费用

- **生产环境**：
  - API 密钥：`sk_live_...`
  - 价格 ID：在生产模式下创建
  - 会产生真实费用

### Q2: 为什么 API 密钥无效？

可能的原因：
1. 密钥格式错误（缺少 `sk_test_` 或 `sk_live_` 前缀）
2. 密钥被撤销或过期
3. 使用了错误的密钥类型（测试/生产）
4. 环境变量未正确设置

**解决方案**：
- 检查密钥是否完整复制（包括前缀）
- 确认在 Stripe Dashboard 中密钥状态为 "Active"
- 确认环境变量已正确设置并重新部署

### Q3: Webhook 未收到事件？

可能的原因：
1. Webhook URL 配置错误
2. Webhook 签名密钥不匹配
3. 服务器未运行或无法访问

**解决方案**：
- 检查 Stripe Dashboard 中的 Webhook 日志
- 确认 Webhook URL 可访问
- 验证签名密钥是否正确

### Q4: 如何查看支付日志？

1. 在 Stripe Dashboard，进入 **Payments**（支付）
2. 查看所有支付记录
3. 点击单个支付查看详情

### Q5: 如何退款？

1. 在 Stripe Dashboard，进入 **Payments**
2. 找到要退款的支付
3. 点击 **"Refund"**（退款）
4. 选择退款金额
5. 确认退款

---

## 📝 检查清单

在开始使用 Stripe 支付前，请确认：

### 开发环境
- [ ] Stripe 账户已创建
- [ ] 测试 API 密钥已获取（`sk_test_...`）
- [ ] 三个产品已创建（Starter, Pro, Premium）
- [ ] 三个价格 ID 已记录
- [ ] `.env` 文件已配置所有 Stripe 变量
- [ ] Stripe CLI 已安装（可选，用于本地 Webhook）
- [ ] 本地测试支付成功

### 生产环境
- [ ] 生产 API 密钥已获取（`sk_live_...`）
- [ ] 生产环境产品已创建
- [ ] 生产环境价格 ID 已记录
- [ ] Vercel 环境变量已配置（Production）
- [ ] Webhook 端点已配置
- [ ] Webhook 签名密钥已添加到 Vercel
- [ ] 生产环境已重新部署
- [ ] 生产环境测试支付成功

---

## 🔗 相关链接

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe API 文档](https://stripe.com/docs/api)
- [Stripe 测试卡号](https://stripe.com/docs/testing)
- [Stripe CLI 文档](https://stripe.com/docs/stripe-cli)
- [Vercel 环境变量配置](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 💡 提示

1. **安全**：
   - 永远不要将 API 密钥提交到 Git
   - 使用环境变量存储密钥
   - 定期轮换密钥

2. **测试**：
   - 始终先在测试环境测试
   - 使用测试卡号验证流程
   - 确认所有功能正常后再切换到生产环境

3. **监控**：
   - 定期检查 Stripe Dashboard 中的支付日志
   - 监控 Webhook 事件
   - 设置支付失败警报

---

**需要帮助？** 查看 [Stripe 支持文档](https://stripe.com/docs/support) 或联系 Stripe 支持团队。

