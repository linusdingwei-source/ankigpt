# Resend 邮件服务配置指南

## 📋 概述

本项目使用 [Resend](https://resend.com/) 作为邮件服务提供商，用于发送：
- 验证码邮件（登录/注册）
- 密码重置邮件
- 其他系统通知邮件

Resend 是一个现代化的邮件服务，提供：
- ✅ 免费额度：3,000 封/月
- ✅ 优秀的送达率
- ✅ 简单的 API
- ✅ 详细的发送统计
- ✅ 域名验证支持

---

## 🚀 快速开始

### 步骤 1: 注册 Resend 账户

1. 访问 [Resend 官网](https://resend.com/)
2. 点击 **"Get Started"**（开始使用）
3. 选择注册方式：
   - 使用 **GitHub** 账户登录（推荐）
   - 或使用 **邮箱** 注册
4. 完成账户设置

### 步骤 2: 获取 API 密钥

1. 登录 [Resend Dashboard](https://resend.com/dashboard)
2. 在左侧菜单，点击 **API Keys**（API 密钥）
3. 点击 **"Create API Key"**（创建 API 密钥）
4. **Name**（名称）：`AnkiGPT Production`
5. **Permission**（权限）：选择 **"Sending access"**（发送权限）
6. 点击 **"Add"**（添加）
7. **复制 API 密钥**（格式：`re_xxxxx...`）
   - ⚠️ **重要**：这个密钥只显示一次，请立即保存

### 步骤 3: 使用测试邮箱（开发环境）

**快速开始**：Resend 提供了测试邮箱 `onboarding@resend.dev`，可以直接使用，无需验证。

在 `.env` 文件中：
```env
RESEND_API_KEY="re_你的API密钥"
RESEND_FROM_EMAIL="onboarding@resend.dev"  # Resend 提供的测试邮箱
```

**验证自定义邮箱**（可选）：
1. 在 Resend Dashboard，进入 **Domains**（域名）
2. 点击 **"Add Domain"**（添加域名）
3. 选择 **"Single Email Address"**（单个邮箱地址）
4. 输入你的邮箱地址（如 `noreply@yourdomain.com`）
5. 点击 **"Add"**（添加）
6. Resend 会发送验证邮件到该邮箱
7. 点击邮件中的验证链接完成验证

> **注意**：开发环境可以使用 `onboarding@resend.dev` 测试邮箱，生产环境建议验证整个域名。

### 步骤 4: 验证域名（生产环境，推荐）

1. 在 Resend Dashboard，进入 **Domains**
2. 点击 **"Add Domain"**（添加域名）
3. 输入你的域名（如 `yourdomain.com`）
4. 点击 **"Add"**（添加）
5. 按照提示添加 DNS 记录：
   - **SPF 记录**：`v=spf1 include:_spf.resend.com ~all`
   - **DKIM 记录**：Resend 会提供具体的 DKIM 记录
   - **DMARC 记录**（可选）：`v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
6. 在域名 DNS 管理面板添加这些记录
7. 等待 DNS 验证完成（通常几分钟到几小时）

### 步骤 5: 配置环境变量

#### 本地开发环境（.env 文件）

在项目根目录的 `.env` 文件中添加：

```env
# Email (Resend)
RESEND_API_KEY="re_你的API密钥"
RESEND_FROM_EMAIL="onboarding@resend.dev"  # 开发环境使用测试邮箱，生产环境使用已验证的邮箱
```

**示例**：
```env
# 开发环境
RESEND_API_KEY="re_AbCdEfGhIjKlMnOpQrStUvWxYz123456"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# 生产环境（验证域名后）
RESEND_API_KEY="re_AbCdEfGhIjKlMnOpQrStUvWxYz123456"
RESEND_FROM_EMAIL="noreply@ankigpt.com"
```

#### Vercel 生产环境

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`ankigpt-kappa`）
3. 进入 **Settings** > **Environment Variables**
4. 添加以下变量：

   ```
   RESEND_API_KEY = re_你的API密钥
   RESEND_FROM_EMAIL = noreply@yourdomain.com
   ```

5. 选择 **Environment**: `Production`, `Preview`, `Development`（全选）
6. 点击 **"Save"**

### 步骤 6: 安装依赖

在项目根目录运行：

```bash
npm install
```

这会自动安装 `resend` 包（已在 `package.json` 中配置）。

### 步骤 7: 重新部署

1. 提交代码到 Git：
   ```bash
   git add .
   git commit -m "Switch to Resend for email service"
   git push origin main
   ```

2. Vercel 会自动重新部署
3. 或手动在 Vercel Dashboard 中重新部署

### 步骤 8: 测试配置

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问注册页面：`http://localhost:3000/zh/register`
3. 输入邮箱地址
4. 点击发送验证码
5. 检查邮箱是否收到验证码

---

## 🔍 验证配置

### 检查 API 密钥

在 Resend Dashboard：
1. 进入 **API Keys**
2. 确认你的 API 密钥状态为 **"Active"**（活跃）

### 检查发件人状态

在 Resend Dashboard：
1. 进入 **Domains**
2. 确认你的邮箱/域名状态为 **"Verified"**（已验证）

### 查看发送日志

在 Resend Dashboard：
1. 进入 **Logs**（日志）
2. 查看邮件发送记录
3. 检查是否有错误或失败

---

## 🧪 测试邮件发送

### 方法 1: 通过应用测试

1. 启动开发服务器：`npm run dev`
2. 访问注册页面：`http://localhost:3000/zh/register`
3. 输入邮箱地址
4. 点击发送验证码
5. 检查邮箱是否收到验证码

### 方法 2: 使用 Node.js 脚本测试

创建测试文件 `test-resend.js`：

```javascript
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: 'your-test-email@gmail.com',  // 替换为你的测试邮箱
      subject: 'Test Email from Resend',
      html: '<h1>This is a test email</h1><p>If you receive this, Resend is configured correctly!</p>',
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data?.id);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEmail();
```

运行测试：
```bash
node test-resend.js
```

---

## 🔍 故障排查

### 问题 1: "Invalid API key" 错误

**原因**：API 密钥不正确或未设置

**解决方案**：
1. 检查 `RESEND_API_KEY` 环境变量是否正确设置
2. 确认密钥完整（包括 `re_` 前缀）
3. 在 Resend Dashboard 中确认密钥状态为 "Active"
4. 尝试重新生成 API 密钥

### 问题 2: "Invalid 'from' email address" 错误

**原因**：发件人邮箱未验证

**解决方案**：
1. 在 Resend Dashboard，进入 **Domains**
2. 确认发件人邮箱/域名已验证
3. 检查 `RESEND_FROM_EMAIL` 环境变量是否正确
4. 如果使用域名，确保 DNS 记录已正确配置

### 问题 3: 邮件进入垃圾箱

**原因**：
- 域名未验证
- SPF/DKIM 记录未配置
- 发送频率过高

**解决方案**：
1. 验证域名并配置 SPF 和 DKIM 记录
2. 降低发送频率
3. 使用已验证的域名发送邮件
4. 检查 Resend Dashboard 中的发送统计

### 问题 4: 邮件未发送

**原因**：
- API 密钥无效
- 发件人未验证
- 达到发送限制

**解决方案**：
1. 检查 Resend Dashboard 中的 **Logs**（日志）
2. 查看错误信息
3. 确认账户未达到免费额度限制
4. 检查 API 密钥权限

---

## 📊 Resend 免费额度

- **免费额度**：3,000 封/月
- **付费计划**：从 $20/月起
- **发送限制**：无每日限制（在月度额度内）

### 监控使用量

在 Resend Dashboard：
1. 进入 **Overview**（概览）
2. 查看当前使用量
3. 设置使用量警报

---

## 🔐 安全注意事项

1. **保护 API 密钥**：
   - 永远不要将 `RESEND_API_KEY` 提交到 Git
   - 只使用环境变量存储
   - 定期轮换密钥

2. **验证域名**：
   - 生产环境必须验证域名
   - 配置 SPF 和 DKIM 记录
   - 提高邮件送达率

3. **限制发送频率**：
   - 实现速率限制
   - 避免被标记为垃圾邮件
   - 监控发送统计

---

## 📝 代码变更说明

### 已更新的文件

1. **`lib/email.ts`**（新建）：
   - 统一的邮件发送函数
   - 使用 Resend SDK

2. **`app/api/auth/send-verification-code/route.ts`**：
   - 移除 `nodemailer` 依赖
   - 使用 `sendEmail` 函数

3. **`app/api/auth/forgot-password/route.ts`**：
   - 移除 `nodemailer` 依赖
   - 使用 `sendEmail` 函数

4. **`package.json`**：
   - 添加 `resend` 依赖

### 环境变量变更

**旧配置（SMTP）**：
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

**新配置（Resend）**：
```env
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

---

## 🔗 相关链接

- [Resend 官网](https://resend.com/)
- [Resend 文档](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)
- [Resend API 参考](https://resend.com/docs/api-reference)

---

## 💡 提示

1. **开发环境**：
   - 可以使用单个邮箱地址验证
   - 不需要配置 DNS 记录

2. **生产环境**：
   - 建议验证整个域名
   - 配置 SPF 和 DKIM 记录
   - 提高邮件送达率

3. **监控**：
   - 定期检查 Resend Dashboard 中的发送统计
   - 设置使用量警报
   - 监控邮件送达率

---

**需要帮助？** 查看 [Resend 支持文档](https://resend.com/docs) 或联系 Resend 支持团队。

