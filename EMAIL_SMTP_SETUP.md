# 邮件服务配置完整指南

## 📋 概述

本项目使用 **Resend** 作为邮件服务提供商，用于发送：
- 发送验证码（登录/注册）
- 发送密码重置码
- 其他系统通知邮件

> **注意**：本项目已切换到 Resend，不再使用 SMTP。如需配置 Resend，请查看 [RESEND_SETUP.md](./RESEND_SETUP.md)。

---

## 📧 历史文档（已弃用）

以下内容为历史参考，项目现在使用 Resend。如需使用其他 SMTP 服务，可以参考以下配置。

---

## 🎯 方案选择

### 方案 1: Gmail SMTP（推荐用于开发/小规模）

**优点**：
- ✅ 免费（个人账户）
- ✅ 设置简单
- ✅ 适合开发和测试

**缺点**：
- ❌ 每日发送限制（约 500 封/天）
- ❌ 需要启用"不够安全的应用"或使用应用专用密码
- ❌ 不适合大规模生产环境

### 方案 2: SendGrid（推荐用于生产环境）

**优点**：
- ✅ 免费额度：100 封/天
- ✅ 付费计划：高发送量
- ✅ 专业邮件服务
- ✅ 良好的送达率
- ✅ 详细的发送统计

**缺点**：
- ❌ 需要注册账户
- ❌ 需要验证域名（生产环境）

### 方案 3: Resend（推荐用于现代应用）

**优点**：
- ✅ 免费额度：3,000 封/月
- ✅ 现代化 API
- ✅ 优秀的开发者体验
- ✅ 良好的送达率
- ✅ 简单的配置

**缺点**：
- ❌ 需要注册账户
- ❌ 需要验证域名（生产环境）

---

## 📧 方案 1: Gmail SMTP 配置

### 步骤 1: 准备 Gmail 账户

1. 确保你有一个 Gmail 账户
2. 如果还没有，访问 [Gmail](https://gmail.com) 注册

### 步骤 2: 启用两步验证

1. 登录你的 Google 账户
2. 访问 [Google 账户安全设置](https://myaccount.google.com/security)
3. 在 **"登录 Google"** 部分，找到 **"两步验证"**
4. 点击 **"开始使用"** 并完成设置
5. 启用两步验证（这是生成应用专用密码的前提）

### 步骤 3: 生成应用专用密码

1. 在 [Google 账户安全设置](https://myaccount.google.com/security) 页面
2. 在 **"登录 Google"** 部分，找到 **"应用专用密码"**
3. 点击 **"应用专用密码"**
4. 选择应用：**"邮件"**
5. 选择设备：**"其他（自定义名称）"**
6. 输入名称：`AnkiGPT SMTP`
7. 点击 **"生成"**
8. **复制生成的 16 位密码**（格式：`xxxx xxxx xxxx xxxx`）
   - ⚠️ **重要**：这个密码只显示一次，请立即保存
   - 注意：复制时去掉空格，使用完整密码

### 步骤 4: 配置环境变量

#### 本地开发环境（.env 文件）

在项目根目录的 `.env` 文件中添加：

```env
# Email (SMTP) - Gmail
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"  # 应用专用密码（去掉空格）
SMTP_FROM="your-email@gmail.com"
```

**示例**：
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="myapp@gmail.com"
SMTP_PASSWORD="abcd efgh ijkl mnop"  # 实际使用时去掉空格
SMTP_FROM="myapp@gmail.com"
```

#### Vercel 生产环境

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`ankigpt-kappa`）
3. 进入 **Settings** > **Environment Variables**
4. 添加以下变量：

   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = your-email@gmail.com
   SMTP_PASSWORD = xxxx xxxx xxxx xxxx  # 应用专用密码（去掉空格）
   SMTP_FROM = your-email@gmail.com
   ```

5. 选择 **Environment**: `Production`, `Preview`, `Development`（全选）
6. 点击 **"Save"**

### 步骤 5: 测试配置

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问注册页面：`http://localhost:3000/zh/register`
3. 输入邮箱地址
4. 点击发送验证码
5. 检查邮箱是否收到验证码

---

## 📧 方案 2: SendGrid SMTP 配置

### 步骤 1: 注册 SendGrid 账户

1. 访问 [SendGrid 官网](https://sendgrid.com/)
2. 点击 **"Start for free"**（免费开始）
3. 填写注册信息：
   - 邮箱地址
   - 密码
   - 公司名称（可选）
4. 验证邮箱地址
5. 完成账户设置

### 步骤 2: 创建 API 密钥

1. 登录 [SendGrid Dashboard](https://app.sendgrid.com/)
2. 在左侧菜单，点击 **Settings** > **API Keys**
3. 点击 **"Create API Key"**（创建 API 密钥）
4. **API Key Name**（密钥名称）：`AnkiGPT SMTP`
5. **API Key Permissions**（权限）：
   - 选择 **"Full Access"**（完整访问）或
   - 选择 **"Restricted Access"**（受限访问）> **"Mail Send"** > **"Full Access"**
6. 点击 **"Create & View"**（创建并查看）
7. **复制 API 密钥**（格式：`SG.xxxxx...`）
   - ⚠️ **重要**：这个密钥只显示一次，请立即保存

### 步骤 3: 配置环境变量

#### 本地开发环境（.env 文件）

```env
# Email (SMTP) - SendGrid
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"  # 固定值，不要修改
SMTP_PASSWORD="SG.你的API密钥"  # 刚才复制的 API 密钥
SMTP_FROM="noreply@yourdomain.com"  # 你的发件人邮箱
```

#### Vercel 生产环境

在 Vercel Dashboard 中添加：

```
SMTP_HOST = smtp.sendgrid.net
SMTP_PORT = 587
SMTP_USER = apikey
SMTP_PASSWORD = SG.你的API密钥
SMTP_FROM = noreply@yourdomain.com
```

### 步骤 4: 验证发件人（生产环境）

1. 在 SendGrid Dashboard，进入 **Settings** > **Sender Authentication**
2. 选择 **"Single Sender Verification"**（单个发件人验证）
3. 点击 **"Create a Sender"**（创建发件人）
4. 填写发件人信息：
   - **From Email Address**：你的邮箱地址
   - **From Name**：你的名称
   - **Reply To**：回复邮箱
5. 验证邮箱地址（SendGrid 会发送验证邮件）
6. 点击邮件中的验证链接

---

## 📧 方案 3: Resend SMTP 配置

### 步骤 1: 注册 Resend 账户

1. 访问 [Resend 官网](https://resend.com/)
2. 点击 **"Get Started"**（开始使用）
3. 使用 GitHub 或邮箱注册
4. 验证邮箱地址
5. 完成账户设置

### 步骤 2: 获取 API 密钥

1. 登录 [Resend Dashboard](https://resend.com/dashboard)
2. 在左侧菜单，点击 **API Keys**
3. 点击 **"Create API Key"**（创建 API 密钥）
4. **Name**（名称）：`AnkiGPT SMTP`
5. **Permission**（权限）：选择 **"Sending access"**（发送权限）
6. 点击 **"Add"**（添加）
7. **复制 API 密钥**（格式：`re_xxxxx...`）
   - ⚠️ **重要**：这个密钥只显示一次，请立即保存

### 步骤 3: 配置环境变量

#### 本地开发环境（.env 文件）

```env
# Email (SMTP) - Resend
SMTP_HOST="smtp.resend.com"
SMTP_PORT="587"
SMTP_USER="resend"  # 固定值，不要修改
SMTP_PASSWORD="re_你的API密钥"  # 刚才复制的 API 密钥
SMTP_FROM="noreply@yourdomain.com"  # 你的发件人邮箱
```

#### Vercel 生产环境

在 Vercel Dashboard 中添加：

```
SMTP_HOST = smtp.resend.com
SMTP_PORT = 587
SMTP_USER = resend
SMTP_PASSWORD = re_你的API密钥
SMTP_FROM = noreply@yourdomain.com
```

### 步骤 4: 验证域名（生产环境）

1. 在 Resend Dashboard，进入 **Domains**
2. 点击 **"Add Domain"**（添加域名）
3. 输入你的域名（如 `yourdomain.com`）
4. 按照提示添加 DNS 记录：
   - SPF 记录
   - DKIM 记录
   - DMARC 记录（可选）
5. 等待 DNS 验证完成（通常几分钟到几小时）

---

## 🔧 其他 SMTP 服务配置

### Outlook/Hotmail

```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"
SMTP_PASSWORD="your-password"
SMTP_FROM="your-email@outlook.com"
```

### Yahoo Mail

```env
SMTP_HOST="smtp.mail.yahoo.com"
SMTP_PORT="587"
SMTP_USER="your-email@yahoo.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="your-email@yahoo.com"
```

### 自定义 SMTP 服务器

```env
SMTP_HOST="smtp.yourdomain.com"
SMTP_PORT="587"  # 或 465 (SSL) 或 25
SMTP_USER="your-username"
SMTP_PASSWORD="your-password"
SMTP_FROM="noreply@yourdomain.com"
```

---

## 🧪 测试邮件配置

### 方法 1: 通过应用测试

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问注册页面：`http://localhost:3000/zh/register`
3. 输入邮箱地址
4. 点击发送验证码
5. 检查邮箱是否收到验证码

### 方法 2: 使用 Node.js 脚本测试

创建测试文件 `test-email.js`：

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'your-test-email@gmail.com',  // 替换为你的测试邮箱
      subject: 'Test Email',
      html: '<h1>This is a test email</h1><p>If you receive this, SMTP is configured correctly!</p>',
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmail();
```

运行测试：
```bash
node test-email.js
```

---

## 🔍 故障排查

### 问题 1: Gmail "应用专用密码" 选项不可见

**原因**：未启用两步验证

**解决方案**：
1. 先启用两步验证（见步骤 2）
2. 然后才能生成应用专用密码

### 问题 2: "Invalid login" 或 "Authentication failed"

**原因**：
- 密码错误
- 使用了普通密码而不是应用专用密码
- 账户被锁定

**解决方案**：
1. 确认使用应用专用密码（Gmail）
2. 确认密码完整且正确
3. 检查账户是否被锁定
4. 尝试重新生成应用专用密码

### 问题 3: "Connection timeout" 或 "Connection refused"

**原因**：
- SMTP 服务器地址错误
- 端口被防火墙阻止
- 网络问题

**解决方案**：
1. 检查 SMTP_HOST 和 SMTP_PORT 是否正确
2. 尝试使用不同的端口（587, 465, 25）
3. 检查防火墙设置

### 问题 4: 邮件进入垃圾箱

**原因**：
- 发件人未验证
- SPF/DKIM 记录未配置
- 发送频率过高

**解决方案**：
1. 验证发件人邮箱（SendGrid/Resend）
2. 配置 SPF 和 DKIM 记录
3. 降低发送频率
4. 使用专业的邮件服务（SendGrid/Resend）

### 问题 5: 每日发送限制

**原因**：
- Gmail 有每日发送限制（约 500 封/天）

**解决方案**：
1. 切换到专业邮件服务（SendGrid/Resend）
2. 使用多个 Gmail 账户轮换
3. 升级到 Google Workspace

---

## 📊 服务对比

| 服务 | 免费额度 | 付费起价 | 送达率 | 推荐场景 |
|------|---------|---------|--------|----------|
| Gmail | 500 封/天 | - | 中等 | 开发/测试 |
| SendGrid | 100 封/天 | $15/月 | 高 | 生产环境 |
| Resend | 3,000 封/月 | $20/月 | 高 | 现代应用 |

---

## 🔐 安全注意事项

1. **保护密码**：
   - 永远不要将 SMTP 密码提交到 Git
   - 只使用环境变量存储
   - 定期轮换密码

2. **使用应用专用密码**：
   - Gmail 必须使用应用专用密码
   - 不要使用账户密码

3. **限制发送频率**：
   - 实现速率限制
   - 避免被标记为垃圾邮件

4. **验证发件人**：
   - 生产环境必须验证域名
   - 配置 SPF 和 DKIM 记录

---

## 📝 检查清单

### Gmail SMTP
- [ ] Gmail 账户已创建
- [ ] 两步验证已启用
- [ ] 应用专用密码已生成
- [ ] 环境变量已配置
- [ ] 测试邮件发送成功

### SendGrid
- [ ] SendGrid 账户已注册
- [ ] API 密钥已创建
- [ ] 环境变量已配置
- [ ] 发件人已验证（生产环境）
- [ ] 测试邮件发送成功

### Resend
- [ ] Resend 账户已注册
- [ ] API 密钥已创建
- [ ] 环境变量已配置
- [ ] 域名已验证（生产环境）
- [ ] 测试邮件发送成功

---

## 🔗 相关链接

- [Gmail 应用专用密码](https://support.google.com/accounts/answer/185833)
- [SendGrid 文档](https://docs.sendgrid.com/)
- [Resend 文档](https://resend.com/docs)
- [Nodemailer 文档](https://nodemailer.com/)

---

## 💡 推荐方案

### 开发环境
- 使用 **Gmail SMTP**（免费、简单）

### 生产环境
- 小规模（< 1000 封/天）：**SendGrid** 免费版
- 中等规模（1000-10000 封/天）：**Resend** 或 **SendGrid** 付费版
- 大规模（> 10000 封/天）：**SendGrid** 或 **AWS SES**

---

**需要帮助？** 查看各服务的官方文档或联系支持团队。

