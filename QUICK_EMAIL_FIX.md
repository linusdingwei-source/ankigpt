# 快速修复邮件发送问题

## 🔴 立即检查事项

### 1. 检查 Vercel 环境变量（最重要！）

在 Vercel Dashboard 中检查环境变量：

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 `ankigpt`
3. 进入 **Settings** > **Environment Variables**
4. **必须设置以下变量：**

```
RESEND_API_KEY=re_你的API密钥
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 2. 获取 Resend API 密钥

1. 访问 [Resend Dashboard](https://resend.com/dashboard)
2. 如果没有账户，先注册（免费）
3. 进入 **API Keys** 页面
4. 点击 **Create API Key**
5. 复制 API 密钥（格式：`re_...`）
6. 在 Vercel 中添加为环境变量

### 3. 使用测试邮箱（最简单）

**开发/测试环境可以使用 Resend 提供的测试邮箱：**
- `RESEND_FROM_EMAIL=onboarding@resend.dev`
- 无需验证域名，可以直接使用

### 4. 重新部署

**重要：** 修改环境变量后，必须重新部署才能生效！

1. 在 Vercel Dashboard 中，进入 **Deployments**
2. 点击最新的部署
3. 点击 **Redeploy** 按钮
4. 或者推送新的代码触发自动部署

### 5. 测试邮件发送

部署完成后：
1. 打开注册页面
2. 填写邮箱、密码
3. 点击"发送验证码"
4. 完成验证码验证（输入答案并点击"验证"）
5. 检查邮箱（包括垃圾邮件文件夹）

## 📋 完整检查清单

- [ ] Vercel 环境变量 `RESEND_API_KEY` 已设置
- [ ] Vercel 环境变量 `RESEND_FROM_EMAIL` 已设置
- [ ] Resend API 密钥状态为 **Active**
- [ ] 环境变量修改后已重新部署
- [ ] 浏览器控制台没有错误
- [ ] Network 标签中有 `/api/auth/send-verification-code` 请求
- [ ] Vercel 日志中有 `[Email]` 相关日志

## 🔍 查看日志

### 浏览器控制台（F12 > Console）
查找以下日志：
- `[SendCodeButton] Button clicked`
- `[SendCodeButton] Showing captcha`
- `[Captcha] Form submitted`
- `[Captcha] Answer correct`
- `[SendCodeButton] Captcha verified`
- `[SendCodeButton] Sending verification code request`
- `[SendCodeButton] Response status: 200`

### Network 标签（F12 > Network）
1. 点击"发送验证码"并完成验证码验证
2. 查找 `/api/auth/send-verification-code` 请求
3. 查看请求状态码：
   - **200** = 成功
   - **400** = 请求错误（检查验证码是否正确）
   - **429** = 速率限制（等待后重试）
   - **500** = 服务器错误（检查 Vercel 日志）

### Vercel 日志
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 > **Logs**
3. 查找包含以下关键字的日志：
   - `[Verification Code]` - API 请求处理
   - `[Email]` - 邮件发送过程
   - `RESEND_API_KEY` - 环境变量检查

## ⚠️ 常见问题

### 问题 1: 环境变量未设置
**症状：** Vercel 日志显示 `RESEND_API_KEY is not set`
**解决：** 在 Vercel Dashboard 中添加环境变量并重新部署

### 问题 2: API 密钥无效
**症状：** Vercel 日志显示 `Invalid API key`
**解决：** 在 Resend Dashboard 中创建新的 API 密钥并更新

### 问题 3: 验证码验证未完成
**症状：** 控制台只显示 `[SendCodeButton] Showing captcha`，没有后续日志
**解决：** 确保输入验证码答案并点击"验证"按钮

### 问题 4: 邮件发送成功但未收到
**症状：** Vercel 日志显示邮件发送成功，但邮箱中没有
**解决：** 
- 检查垃圾邮件文件夹
- 等待 1-2 分钟（可能有延迟）
- 尝试使用不同的邮箱地址

## 🚀 快速设置步骤

1. **注册 Resend 账户**（如果还没有）
   - 访问 https://resend.com
   - 使用 GitHub 或邮箱注册（免费）

2. **获取 API 密钥**
   - 登录 Resend Dashboard
   - 进入 **API Keys** > **Create API Key**
   - 复制密钥（格式：`re_...`）

3. **在 Vercel 中设置环境变量**
   ```
   RESEND_API_KEY=re_你的密钥
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

4. **重新部署**
   - 在 Vercel Dashboard 中点击 **Redeploy**

5. **测试**
   - 打开注册页面
   - 完成验证码验证
   - 检查邮箱

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整日志
2. Network 标签中 `/api/auth/send-verification-code` 请求的详细信息
3. Vercel 日志中的 `[Verification Code]` 和 `[Email]` 相关日志

