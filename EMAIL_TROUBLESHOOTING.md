# 邮件发送问题排查指南

如果点击"发送验证码"后没有收到邮件，请按照以下步骤排查：

## 🔍 快速检查清单

### 1. 检查环境变量配置

在 Vercel Dashboard 中检查以下环境变量是否已正确设置：

- ✅ `RESEND_API_KEY` - Resend API 密钥（格式：`re_...`）
- ✅ `RESEND_FROM_EMAIL` - 发件人邮箱地址

**检查步骤：**
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 `ankigpt`
3. 进入 **Settings** > **Environment Variables**
4. 确认上述两个变量已设置且值正确

### 2. 检查 Resend API 密钥

1. 登录 [Resend Dashboard](https://resend.com/dashboard)
2. 进入 **API Keys** 页面
3. 确认 API 密钥状态为 **Active**
4. 如果密钥被禁用或删除，需要创建新的密钥

### 3. 检查发件人邮箱

**开发环境：**
- 可以使用 `onboarding@resend.dev`（Resend 提供的测试邮箱）
- 无需验证，可以直接使用

**生产环境：**
- 必须使用已验证的邮箱地址
- 在 Resend Dashboard > **Domains** 中验证域名
- 确保 `RESEND_FROM_EMAIL` 使用已验证的邮箱

### 4. 查看 Vercel 日志

1. 在 Vercel Dashboard 中，进入 **Logs** 页面
2. 筛选最近的日志
3. 查找包含 `[Email]` 或 `[Verification Code]` 的日志
4. 检查是否有错误信息

**常见错误信息：**

```
[Email] Configuration error: RESEND_API_KEY is not set
```
→ **解决方案**：在 Vercel 环境变量中添加 `RESEND_API_KEY`

```
[Email] Resend API error: Invalid API key
```
→ **解决方案**：检查 API 密钥是否正确，是否已激活

```
[Email] Resend API error: Domain not verified
```
→ **解决方案**：验证发件人邮箱的域名，或使用 `onboarding@resend.dev`

### 5. 检查收件箱

- ✅ 检查**垃圾邮件/垃圾箱**
- ✅ 检查**促销邮件**文件夹（Gmail）
- ✅ 等待 1-2 分钟（邮件可能延迟）
- ✅ 检查邮箱是否设置了过滤规则

### 6. 测试邮件发送

可以使用以下方法测试邮件服务是否正常工作：

#### 方法 1: 使用 Resend Dashboard

1. 登录 [Resend Dashboard](https://resend.com/dashboard)
2. 进入 **Logs** 页面
3. 查看最近的邮件发送记录
4. 检查是否有发送失败的记录

#### 方法 2: 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 标签
3. 点击"发送验证码"按钮
4. 查看控制台中的错误信息

#### 方法 3: 检查网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 点击"发送验证码"按钮
4. 查找 `/api/auth/send-verification-code` 请求
5. 查看响应内容，检查错误信息

## 🛠️ 常见问题解决方案

### 问题 1: "RESEND_API_KEY is not set"

**原因**：环境变量未配置

**解决方案**：
1. 在 Vercel Dashboard 中添加 `RESEND_API_KEY`
2. 从 Resend Dashboard 获取 API 密钥
3. 重新部署应用

### 问题 2: "Invalid API key"

**原因**：API 密钥无效或已过期

**解决方案**：
1. 在 Resend Dashboard 中创建新的 API 密钥
2. 更新 Vercel 环境变量
3. 重新部署应用

### 问题 3: "Domain not verified"

**原因**：发件人邮箱的域名未验证

**解决方案**：
1. 在 Resend Dashboard > **Domains** 中验证域名
2. 或使用 `onboarding@resend.dev` 作为临时解决方案
3. 更新 `RESEND_FROM_EMAIL` 环境变量

### 问题 4: 邮件发送成功但未收到

**可能原因**：
- 邮件被标记为垃圾邮件
- 邮箱设置了过滤规则
- 邮件延迟

**解决方案**：
1. 检查垃圾邮件文件夹
2. 检查邮箱过滤规则
3. 等待几分钟后重试
4. 尝试使用不同的邮箱地址测试

### 问题 5: 速率限制错误

**错误信息**：`Please wait before requesting another code`

**原因**：发送频率过高

**解决方案**：
- 等待 60 秒后重试
- 系统会自动限制发送频率以防止滥用

## 📝 配置示例

### Vercel 环境变量配置

```
RESEND_API_KEY=re_AbCdEfGhIjKlMnOpQrStUvWxYz123456
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 生产环境配置

```
RESEND_API_KEY=re_你的生产环境API密钥
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## 🔗 相关文档

- [Resend 设置指南](./RESEND_SETUP.md)
- [Vercel 环境变量设置](./VERCEL_ENV_SETUP.md)
- [Resend Dashboard](https://resend.com/dashboard)
- [Resend 文档](https://resend.com/docs)

## 📞 获取帮助

如果以上步骤都无法解决问题：

1. 查看 Vercel 日志中的详细错误信息
2. 检查 Resend Dashboard 中的发送日志
3. 确认所有环境变量已正确配置
4. 尝试使用 `onboarding@resend.dev` 作为发件人邮箱进行测试

