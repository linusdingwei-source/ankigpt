# Stripe 支付配置指南

## 1. 创建 Stripe 账户和产品

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 创建三个产品（Products）：
   - **Starter**: $5
   - **Pro**: $20
   - **Premium**: $100

3. 为每个产品创建价格（Prices），记录下每个价格的 ID（格式：`price_xxxxx`）

## 2. 配置环境变量

在 `.env` 文件中添加：

```env
STRIPE_SECRET_KEY="sk_test_..."  # 从 Stripe Dashboard > Developers > API keys 获取
STRIPE_WEBHOOK_SECRET="whsec_..."  # 从 Webhook 配置中获取（见下方）
STRIPE_PRICE_ID_STARTER="price_..."  # Starter 套餐的价格ID
STRIPE_PRICE_ID_PRO="price_..."      # Pro 套餐的价格ID
STRIPE_PRICE_ID_PREMIUM="price_..."  # Premium 套餐的价格ID
```

## 3. 配置 Webhook

### 开发环境（使用 Stripe CLI）

1. 安装 Stripe CLI：
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # 其他系统：https://stripe.com/docs/stripe-cli
   ```

2. 登录 Stripe CLI：
   ```bash
   stripe login
   ```

3. 转发 Webhook 到本地：
   ```bash
   stripe listen --forward-to localhost:3000/api/payment/webhook
   ```

4. 复制显示的 Webhook 签名密钥（`whsec_...`）到 `.env` 文件的 `STRIPE_WEBHOOK_SECRET`

### 生产环境

1. 在 Stripe Dashboard 中：
   - 进入 **Developers** > **Webhooks**
   - 点击 **Add endpoint**
   - 输入你的 Webhook URL：`https://yourdomain.com/api/payment/webhook`

2. 选择要监听的事件：
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `checkout.session.async_payment_failed`

3. 复制 Webhook 签名密钥（`whsec_...`）到生产环境的 `.env` 文件

## 4. 测试支付流程

### 使用测试卡号

Stripe 提供测试卡号用于测试：

- **成功支付**: `4242 4242 4242 4242`
- **支付失败**: `4000 0000 0000 0002`
- **需要3D验证**: `4000 0025 0000 3155`

其他测试卡号：https://stripe.com/docs/testing

### 测试流程

1. 启动开发服务器：`npm run dev`
2. 访问定价页面：`http://localhost:3000/zh/pricing`
3. 选择套餐并点击购买
4. 使用测试卡号完成支付
5. 检查：
   - Webhook 是否收到事件
   - Credits 是否正确添加到账户
   - 订单记录是否创建

## 5. Webhook 事件说明

### checkout.session.completed
- 当支付成功完成时触发
- 系统会：
  1. 验证支付状态
  2. 检查订单是否已处理（防止重复）
  3. 创建订单记录
  4. 添加 Credits 到用户账户（包含赠送）

### payment_intent.payment_failed
- 当支付失败时触发
- 系统会：
  1. 记录错误信息
  2. 更新订单状态为 `failed`

### checkout.session.async_payment_failed
- 当异步支付失败时触发
- 系统会更新订单状态为 `failed`

## 6. 安全注意事项

1. **Webhook 签名验证**：所有 Webhook 请求都会验证 Stripe 签名，确保请求来自 Stripe
2. **幂等性处理**：通过检查订单是否已存在，防止重复处理
3. **用户验证**：在处理 Webhook 时验证用户是否存在
4. **错误日志**：所有错误都会记录到控制台，便于调试

## 7. 故障排查

### Webhook 未收到事件
- 检查 Webhook URL 是否正确
- 确认 Webhook 签名密钥配置正确
- 查看 Stripe Dashboard 中的 Webhook 日志

### Credits 未添加
- 检查 Webhook 是否成功处理
- 查看服务器日志
- 确认订单记录是否创建
- 检查用户 ID 是否正确

### 支付失败未处理
- 确认已监听 `payment_intent.payment_failed` 事件
- 检查错误处理逻辑
- 查看订单状态是否正确更新

## 8. 生产环境检查清单

- [ ] 使用生产环境的 API 密钥（`sk_live_...`）
- [ ] 配置生产环境的 Webhook URL
- [ ] 设置正确的 Webhook 签名密钥
- [ ] 测试所有三个套餐的支付流程
- [ ] 测试支付成功和失败场景
- [ ] 验证 Credits 正确添加
- [ ] 检查订单记录创建
- [ ] 监控 Webhook 日志

