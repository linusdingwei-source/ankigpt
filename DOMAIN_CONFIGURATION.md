# 域名配置完成指南

## ✅ 已完成

恭喜！你已经成功：
- ✅ 在 Namecheap 申请了域名 `nihogogpt.com`
- ✅ 在 Resend 验证了域名（状态：Verified）

## 🔧 下一步：更新配置

### 1. 更新 Vercel 环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`ankigpt-kappa`）
3. 进入 **Settings** > **Environment Variables**
4. 找到或添加 `RESEND_FROM_EMAIL` 变量：
   ```
   RESEND_FROM_EMAIL = noreply@nihogogpt.com
   ```
   或者使用更专业的格式：
   ```
   RESEND_FROM_EMAIL = AnkiGPT Team <noreply@nihogogpt.com>
   ```
5. 选择 **Environment**: `Production`, `Preview`, `Development`（全选）
6. 点击 **"Save"**

### 2. 代码已更新

代码已经更新，默认使用 `noreply@nihogogpt.com` 作为发件人地址。

**文件位置**：`lib/email.ts`
```typescript
const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'AnkiGPT Team <noreply@nihogogpt.com>';
```

### 3. 重新部署

**方法 1：推送代码触发自动部署**
```bash
git add .
git commit -m "Update Resend from address to verified domain"
git push origin main
```

**方法 2：在 Vercel Dashboard 手动重新部署**
1. 进入 **Deployments**
2. 点击最新的部署
3. 选择 **"Redeploy"**

### 4. 测试邮件发送

部署完成后：

1. 访问你的网站：`https://ankigpt-kappa.vercel.app/zh/register`
2. 输入任意邮箱地址（不再限制为注册邮箱）
3. 点击"发送验证码"
4. 检查邮箱是否收到验证码
   - 如果没有，检查垃圾邮件文件夹
   - 检查 Vercel 日志确认邮件是否发送成功

---

## 🌐 额外奖励：配置自定义域名

你已经买了域名，不如把网站地址也改成 `nihogogpt.com` 吧！

### 步骤 1：在 Vercel 添加域名

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（`ankigpt-kappa`）
3. 进入 **Settings** > **Domains**
4. 输入 `nihogogpt.com`，点击 **"Add"**
5. Vercel 会显示配置信息：
   - **A Record**: `76.76.21.21`（或类似 IP）
   - **CNAME Record**: `cname.vercel-dns.com`

### 步骤 2：在 Namecheap 配置 DNS

1. 登录 [Namecheap](https://www.namecheap.com/)
2. 进入 **Domain List** > 选择 `nihogogpt.com` > **Manage** > **Advanced DNS**
3. 添加 **A Record**：
   - **Type**: `A Record`
   - **Host**: `@`
   - **Value**: `76.76.21.21`（使用 Vercel 提供的 IP）
   - **TTL**: `Automatic`
   - 点击 **"Save"**
4. 添加 **CNAME Record**：
   - **Type**: `CNAME Record`
   - **Host**: `www`
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: `Automatic`
   - 点击 **"Save"**

### 步骤 3：等待 DNS 传播

- DNS 记录传播通常需要几分钟到几小时
- 可以使用 [whatsmydns.net](https://www.whatsmydns.net/) 检查 DNS 传播状态
- 在 Vercel Dashboard 中，域名状态会显示为 **"Valid Configuration"**

### 步骤 4：访问你的网站

DNS 传播完成后，你可以通过以下地址访问：
- `https://nihogogpt.com`
- `https://www.nihogogpt.com`

---

## 📋 配置检查清单

- [ ] 在 Vercel 更新 `RESEND_FROM_EMAIL` 环境变量
- [ ] 重新部署应用
- [ ] 测试邮件发送功能
- [ ] （可选）在 Vercel 添加自定义域名
- [ ] （可选）在 Namecheap 配置 DNS 记录
- [ ] （可选）等待 DNS 传播并测试访问

---

## 🎉 完成！

配置完成后，你的应用将：
- ✅ 可以发送邮件到任意邮箱地址
- ✅ 使用专业的发件人地址 `noreply@nihogogpt.com`
- ✅ （可选）通过自定义域名 `nihogogpt.com` 访问

**现在去测试邮件发送功能吧！** 🚀

