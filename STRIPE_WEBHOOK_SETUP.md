# Stripe Webhook 配置详细指南

## 📋 概述

Webhook 是 Stripe 向你的服务器发送事件通知的方式。当支付成功、失败或其他事件发生时，Stripe 会通过 Webhook 通知你的服务器，以便自动处理（如添加 Credits、创建订单等）。

---

## 🎯 配置步骤

### 步骤 1: 进入 Webhook 配置页面

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 确保你在**测试模式**（沙盒）：
   - 查看页面右上角，应该显示 **"测试模式"** 或 **"Test mode"**
   - 如果显示 **"实时模式"**，点击切换按钮切换到测试模式
3. 在左侧菜单中，点击 **"Developers"**（开发者）
4. 在下拉菜单中，点击 **"Webhooks"**（Webhook）

### 步骤 2: 添加 Webhook 端点

1. 在 Webhook 页面，点击右上角的 **"+ 添加端点"** 或 **"+ Add endpoint"** 按钮

2. **填写端点信息**：
   
   **端点 URL（Endpoint URL）**：
   ```
   https://ankigpt-kappa.vercel.app/api/payment/webhook
   ```
   > ⚠️ **注意**：替换为你的实际 Vercel 部署域名
   
   **描述（Description）**（可选）：
   ```
   AnkiGPT Production Webhook
   ```

3. **选择要监听的事件（Events to send）**：
   
   选择 **"选择事件"** 或 **"Select events"**，然后勾选以下事件：
   
   ✅ **checkout.session.completed**
   - 当支付成功完成时触发
   - 用于添加 Credits 和创建订单
   
   ✅ **payment_intent.payment_failed**
   - 当支付失败时触发
   - 用于记录失败信息
   
   ✅ **checkout.session.async_payment_failed**
   - 当异步支付失败时触发
   - 用于处理延迟支付失败

4. 点击 **"添加端点"** 或 **"Add endpoint"** 按钮

### 步骤 3: 获取 Webhook 签名密钥

1. 端点创建成功后，你会看到端点详情页面

2. **复制签名密钥（Signing secret）**：
   - 在 **"签名密钥"** 或 **"Signing secret"** 部分
   - 点击 **"显示"** 或 **"Reveal"** 按钮
   - 复制 `whsec_...` 开头的完整密钥
   - ⚠️ **重要**：这个密钥只显示一次，请立即保存

3. **保存密钥**：
   - 将密钥添加到 Vercel 环境变量（见下方步骤）

### 步骤 4: 配置 Vercel 环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`ankigpt-kappa`）
3. 进入 **Settings**（设置）> **Environment Variables**（环境变量）

4. **添加 Webhook 签名密钥**：
   
   **变量名（Key）**：
   ```
   STRIPE_WEBHOOK_SECRET
   ```
   
   **变量值（Value）**：
   ```
   whsec_你刚才复制的完整密钥
   ```
   
   **环境（Environment）**：
   - 如果是测试环境：选择 **Preview** 和 **Development**
   - 如果是生产环境：选择 **Production**
   - 或者全选（推荐）

5. 点击 **"Save"**（保存）

### 步骤 5: 重新部署 Vercel

1. 在 Vercel Dashboard，进入 **Deployments**（部署）
2. 找到最新的部署
3. 点击右侧的 **"..."** 菜单
4. 选择 **"Redeploy"**（重新部署）
5. 等待部署完成（通常 1-2 分钟）

---

## 🧪 测试 Webhook

### 方法 1: 使用 Stripe Dashboard 测试

1. 在 Stripe Dashboard，进入 **Developers** > **Webhooks**
2. 点击你刚创建的 Webhook 端点
3. 在右侧，点击 **"发送测试 webhook"** 或 **"Send test webhook"**
4. 选择事件类型：`checkout.session.completed`
5. 点击 **"发送测试 webhook"**
6. 查看响应：
   - ✅ **200 OK**：Webhook 配置成功
   - ❌ **其他状态码**：检查配置和服务器日志

### 方法 2: 进行真实测试支付

1. 访问你的定价页面：`https://ankigpt-kappa.vercel.app/zh/pricing`
2. 选择一个套餐
3. 使用测试卡号完成支付：
   - 卡号：`4242 4242 4242 4242`
   - 过期日期：任意未来日期（如 12/25）
   - CVC：任意 3 位数字（如 123）
   - 邮编：任意邮编（如 12345）
4. 完成支付后，检查：
   - Vercel 日志中是否有 Webhook 请求
   - Credits 是否正确添加到账户
   - 订单是否创建

### 方法 3: 查看 Webhook 日志

1. 在 Stripe Dashboard，进入 **Developers** > **Webhooks**
2. 点击你的 Webhook 端点
3. 在 **"最近尝试"** 或 **"Recent attempts"** 部分，查看：
   - ✅ 成功的请求（绿色）
   - ❌ 失败的请求（红色）
   - 点击单个请求查看详细信息

---

## 🔍 故障排查

### 问题 1: Webhook 返回 401 或 403 错误

**原因**：Webhook 签名验证失败

**解决方案**：
1. 检查 `STRIPE_WEBHOOK_SECRET` 环境变量是否正确设置
2. 确认密钥完整（包括 `whsec_` 前缀）
3. 确认环境变量已重新部署
4. 检查服务器代码中的签名验证逻辑

### 问题 2: Webhook 返回 404 错误

**原因**：Webhook URL 不正确或路由不存在

**解决方案**：
1. 检查 Webhook URL 是否正确：
   ```
   https://ankigpt-kappa.vercel.app/api/payment/webhook
   ```
2. 确认路由文件存在：`app/api/payment/webhook/route.ts`
3. 确认 Vercel 部署成功

### 问题 3: Webhook 未收到事件

**原因**：事件未正确配置或服务器未运行

**解决方案**：
1. 检查 Stripe Dashboard 中是否选择了正确的事件
2. 确认服务器正在运行
3. 检查 Vercel 部署状态
4. 查看 Stripe Dashboard 中的 Webhook 日志

### 问题 4: Webhook 收到事件但 Credits 未添加

**原因**：Webhook 处理逻辑有问题

**解决方案**：
1. 查看 Vercel 日志中的错误信息
2. 检查数据库连接
3. 确认用户 ID 是否正确
4. 检查订单是否已存在（防止重复处理）

---

## 📝 生产环境配置

### 切换到生产环境

1. 在 Stripe Dashboard 右上角，点击 **"切换到实时模式"** 或 **"Switch to live mode"**
2. 重复上述步骤 2-5，但使用：
   - 生产环境的 Webhook URL
   - 生产环境的签名密钥
   - Vercel 的 **Production** 环境变量

### 生产环境检查清单

- [ ] 已切换到 Stripe 实时模式
- [ ] 已创建生产环境 Webhook 端点
- [ ] 已选择正确的事件类型
- [ ] 已复制生产环境签名密钥
- [ ] 已在 Vercel 配置生产环境变量
- [ ] 已重新部署生产环境
- [ ] 已测试生产环境 Webhook

---

## 🔐 安全注意事项

1. **保护签名密钥**：
   - 永远不要将 `STRIPE_WEBHOOK_SECRET` 提交到 Git
   - 只使用环境变量存储
   - 定期轮换密钥

2. **验证签名**：
   - 所有 Webhook 请求都应该验证 Stripe 签名
   - 确保请求来自 Stripe，而不是恶意请求

3. **幂等性处理**：
   - 确保 Webhook 处理是幂等的
   - 防止重复处理同一事件

4. **错误处理**：
   - 记录所有错误
   - 设置监控和警报

---

## 📊 Webhook 事件说明

### checkout.session.completed

**触发时机**：支付成功完成

**处理逻辑**：
1. 验证支付状态
2. 检查订单是否已处理（防止重复）
3. 创建订单记录
4. 添加 Credits 到用户账户（包含赠送的 Credits）

**代码位置**：`app/api/payment/webhook/route.ts`

### payment_intent.payment_failed

**触发时机**：支付失败

**处理逻辑**：
1. 记录错误信息
2. 更新订单状态为 `failed`

### checkout.session.async_payment_failed

**触发时机**：异步支付失败（如银行转账失败）

**处理逻辑**：
1. 更新订单状态为 `failed`
2. 通知用户支付失败

---

## 🔗 相关链接

- [Stripe Webhook 文档](https://stripe.com/docs/webhooks)
- [Stripe Webhook 测试](https://stripe.com/docs/webhooks/test)
- [Vercel 环境变量](https://vercel.com/docs/concepts/projects/environment-variables)
- [Webhook 签名验证](https://stripe.com/docs/webhooks/signatures)

---

## 💡 提示

1. **测试优先**：
   - 始终先在测试环境测试 Webhook
   - 确认所有功能正常后再切换到生产环境

2. **监控日志**：
   - 定期检查 Stripe Dashboard 中的 Webhook 日志
   - 监控 Vercel 日志中的错误

3. **备份密钥**：
   - 将 Webhook 签名密钥保存在安全的地方
   - 如果丢失，需要重新创建 Webhook 端点

4. **版本控制**：
   - 不要将环境变量提交到 Git
   - 使用 `.env.example` 文件作为模板

---

**需要帮助？** 查看 [Stripe Webhook 支持](https://stripe.com/docs/support) 或联系 Stripe 支持团队。

