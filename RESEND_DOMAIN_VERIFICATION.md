# Resend 域名验证指南

## 🚨 当前问题

你遇到了以下错误：

```
You can only send testing emails to your own email address (linus.dingwei@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains, 
and change the `from` address to an email using this domain.
```

**原因**：Resend 的免费测试账户只能发送邮件到注册时使用的邮箱地址。要发送到其他邮箱，必须验证域名。

---

## ✅ 解决方案

### 方案 1：验证单个邮箱地址（快速，推荐用于开发）

**适用场景**：快速测试，不需要配置 DNS 记录

**步骤**：

1. **登录 Resend Dashboard**
   - 访问 [https://resend.com/dashboard](https://resend.com/dashboard)
   - 登录你的账户

2. **添加单个邮箱地址**
   - 在左侧菜单，点击 **"Domains"**（域名）
   - 点击 **"Add Domain"**（添加域名）
   - 选择 **"Single Email Address"**（单个邮箱地址）
   - 输入你的邮箱地址，例如：
     - `noreply@ankigpt.com`
     - `support@ankigpt.com`
     - 或任何你拥有的邮箱地址
   - 点击 **"Add"**（添加）

3. **验证邮箱**
   - Resend 会发送验证邮件到该邮箱
   - 打开邮箱，点击验证链接
   - 验证完成后，邮箱状态会变为 **"Verified"**（已验证）

4. **更新环境变量**
   - 在 Vercel Dashboard，进入 **Settings** > **Environment Variables**
   - 更新 `RESEND_FROM_EMAIL` 为已验证的邮箱地址
   - 例如：`RESEND_FROM_EMAIL = noreply@ankigpt.com`
   - 点击 **"Save"**

5. **重新部署**
   - 在 Vercel Dashboard，进入 **Deployments**
   - 点击最新的部署，选择 **"Redeploy"**
   - 或推送代码到 Git 触发自动部署

---

### 方案 2：验证整个域名（推荐用于生产环境）

**适用场景**：生产环境，需要发送大量邮件

**步骤**：

1. **登录 Resend Dashboard**
   - 访问 [https://resend.com/dashboard](https://resend.com/dashboard)
   - 登录你的账户

2. **添加域名**
   - 在左侧菜单，点击 **"Domains"**（域名）
   - 点击 **"Add Domain"**（添加域名）
   - 输入你的域名，例如：`ankigpt.com`
   - 点击 **"Add"**（添加）

3. **配置 DNS 记录**
   - Resend 会显示需要添加的 DNS 记录：
     - **SPF 记录**：`v=spf1 include:_spf.resend.com ~all`
     - **DKIM 记录**：Resend 会提供具体的 DKIM 记录（格式类似：`resend._domainkey.ankigpt.com`）
   - 在你的域名 DNS 管理面板（如 Cloudflare、GoDaddy、Namecheap）添加这些记录
   - 记录类型：`TXT`
   - 主机名：按照 Resend 提供的说明填写

4. **等待 DNS 验证**
   - DNS 记录传播通常需要几分钟到几小时
   - 在 Resend Dashboard 中，域名状态会显示为 **"Pending"**（待验证）
   - 验证完成后，状态会变为 **"Verified"**（已验证）

5. **更新环境变量**
   - 在 Vercel Dashboard，进入 **Settings** > **Environment Variables**
   - 更新 `RESEND_FROM_EMAIL` 为使用该域名的邮箱地址
   - 例如：`RESEND_FROM_EMAIL = noreply@ankigpt.com`
   - 点击 **"Save"**

6. **重新部署**
   - 在 Vercel Dashboard，进入 **Deployments**
   - 点击最新的部署，选择 **"Redeploy"**
   - 或推送代码到 Git 触发自动部署

---

## 📋 DNS 记录配置示例

### Cloudflare

1. 登录 Cloudflare Dashboard
2. 选择你的域名
3. 进入 **DNS** > **Records**
4. 点击 **"Add record"**（添加记录）
5. 添加以下记录：

**SPF 记录**：
- **Type**: `TXT`
- **Name**: `@` 或 `ankigpt.com`
- **Content**: `v=spf1 include:_spf.resend.com ~all`
- **TTL**: `Auto`

**DKIM 记录**（Resend 会提供具体值）：
- **Type**: `TXT`
- **Name**: `resend._domainkey` 或 Resend 提供的完整主机名
- **Content**: Resend 提供的 DKIM 值
- **TTL**: `Auto`

### GoDaddy

1. 登录 GoDaddy Dashboard
2. 进入 **My Products** > **DNS**
3. 点击 **"Add"**（添加）
4. 添加 SPF 和 DKIM 记录（类似上述格式）

### Namecheap

1. 登录 Namecheap Dashboard
2. 进入 **Domain List** > **Manage** > **Advanced DNS**
3. 添加 **TXT Record**（类似上述格式）

---

## 🔍 验证配置

### 检查域名状态

1. 在 Resend Dashboard，进入 **Domains**
2. 确认域名/邮箱状态为 **"Verified"**（已验证）

### 测试邮件发送

1. 访问注册页面：`https://ankigpt-kappa.vercel.app/zh/register`
2. 输入任意邮箱地址（不再限制为注册邮箱）
3. 点击发送验证码
4. 检查邮箱是否收到验证码

---

## ⚠️ 注意事项

1. **DNS 传播时间**：
   - DNS 记录传播可能需要几分钟到几小时
   - 如果验证失败，请等待一段时间后重试

2. **邮箱地址格式**：
   - 验证域名后，可以使用该域名下的任意邮箱地址
   - 例如：`noreply@ankigpt.com`、`support@ankigpt.com` 等

3. **免费额度**：
   - Resend 免费账户：3,000 封/月
   - 验证域名不会消耗免费额度

4. **生产环境**：
   - 生产环境**强烈建议**验证整个域名
   - 配置 SPF 和 DKIM 记录可以提高邮件送达率
   - 避免邮件进入垃圾箱

---

## 🆘 需要帮助？

如果遇到问题：

1. **检查 DNS 记录**：
   - 使用 [MXToolbox](https://mxtoolbox.com/) 检查 DNS 记录是否正确
   - 确认记录已正确传播

2. **查看 Resend 文档**：
   - [Resend 域名验证文档](https://resend.com/docs/dashboard/domains/introduction)
   - [Resend 支持](https://resend.com/support)

3. **联系支持**：
   - Resend 支持团队：[support@resend.com](mailto:support@resend.com)

---

**完成验证后，记得更新 Vercel 环境变量并重新部署！**

