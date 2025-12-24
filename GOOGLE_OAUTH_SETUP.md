# 🔐 Google OAuth 配置指南

本指南将帮助你获取 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 环境变量。

## 📋 前置要求

- 拥有 Google 账号
- 访问 [Google Cloud Console](https://console.cloud.google.com)

## 🚀 详细步骤

### 步骤 1: 创建或选择项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 如果还没有项目，点击页面顶部的项目选择器
3. 点击 **"New Project"**（新建项目）
   - 项目名称：例如 `ankigpt` 或 `japanese-tts`
   - 点击 **"Create"**（创建）
4. 如果已有项目，直接选择即可

### 步骤 2: 启用 Google+ API

1. 在左侧菜单中，点击 **"APIs & Services"**（API 和服务）> **"Library"**（库）
2. 搜索 **"Google+ API"** 或 **"Google Identity"**
3. 点击 **"Google+ API"** 或 **"Google Identity Services API"**
4. 点击 **"Enable"**（启用）按钮

> **注意**：Google 现在推荐使用 **Google Identity Services API**，但 Google+ API 仍然可用。

### 步骤 3: 配置 OAuth 同意屏幕

1. 在左侧菜单中，点击 **"APIs & Services"** > **"OAuth consent screen"**（OAuth 同意屏幕）
2. 选择用户类型：
   - **External**（外部）：适用于公开应用（推荐）
   - **Internal**（内部）：仅适用于 Google Workspace 组织
3. 点击 **"Create"**（创建）
4. 填写应用信息：
   - **App name**（应用名称）：例如 `AnkiGPT` 或 `Japanese TTS`
   - **User support email**（用户支持邮箱）：你的邮箱地址
   - **Developer contact information**（开发者联系信息）：你的邮箱地址
5. 点击 **"Save and Continue"**（保存并继续）
6. 在 **Scopes**（作用域）页面：
   - 点击 **"Add or Remove Scopes"**（添加或删除作用域）
   - 选择以下作用域：
     - `.../auth/userinfo.email`（用户邮箱）
     - `.../auth/userinfo.profile`（用户资料）
   - 点击 **"Update"**（更新）
   - 点击 **"Save and Continue"**（保存并继续）
7. 在 **Test users**（测试用户）页面（如果选择 External）：
   - 可以添加测试用户（可选）
   - 点击 **"Save and Continue"**（保存并继续）
8. 在 **Summary**（摘要）页面：
   - 检查信息是否正确
   - 点击 **"Back to Dashboard"**（返回仪表板）

### 步骤 4: 创建 OAuth 2.0 客户端 ID

1. 在左侧菜单中，点击 **"APIs & Services"** > **"Credentials"**（凭据）
2. 点击页面顶部的 **"+ CREATE CREDENTIALS"**（创建凭据）
3. 选择 **"OAuth client ID"**（OAuth 客户端 ID）
4. 如果提示配置同意屏幕，按照步骤 3 完成配置
5. 选择应用类型：**"Web application"**（Web 应用程序）
6. 填写应用信息：
   - **Name**（名称）：例如 `AnkiGPT Web Client` 或 `Production Client`
7. 配置 **Authorized redirect URIs**（授权的重定向 URI）：
   
   添加以下 URI（根据你的环境）：
   
   **开发环境（本地）**：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   
   **生产环境（Vercel）**：
   ```
   https://ankigpt-kappa.vercel.app/api/auth/callback/google
   ```
   
   或者你的自定义域名：
   ```
   https://yourdomain.com/api/auth/callback/google
   ```
   
   > **提示**：可以添加多个重定向 URI，每行一个

8. 点击 **"Create"**（创建）

### 步骤 5: 获取客户端 ID 和密钥

创建成功后，会弹出一个对话框，显示：

- **Your Client ID**（你的客户端 ID）
  - 格式：`123456789-abcdefghijklmnop.apps.googleusercontent.com`
  - 这就是 `GOOGLE_CLIENT_ID` 的值

- **Your Client Secret**（你的客户端密钥）
  - 格式：`GOCSPX-xxxxxxxxxxxxxxxxxxxxx`
  - 这就是 `GOOGLE_CLIENT_SECRET` 的值

> **⚠️ 重要**：请立即复制并保存这些值！客户端密钥只显示一次，如果丢失需要重新创建。

### 步骤 6: 配置环境变量

#### 在本地 `.env` 文件中：

```env
# Google OAuth
GOOGLE_CLIENT_ID="123456789-abcdefghijklmnop.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
```

#### 在 Vercel 中：

1. 访问你的 Vercel 项目
2. 进入 **Settings**（设置）> **Environment Variables**（环境变量）
3. 添加以下变量：
   - **Key**: `GOOGLE_CLIENT_ID`
   - **Value**: 你的客户端 ID
   - **Environment**: Production, Preview, Development（全选）
4. 添加第二个变量：
   - **Key**: `GOOGLE_CLIENT_SECRET`
   - **Value**: 你的客户端密钥
   - **Environment**: Production, Preview, Development（全选）
5. 点击 **"Save"**（保存）

### 步骤 7: 重新部署（如果已部署）

如果项目已经部署到 Vercel：

1. 在 Vercel Dashboard 中，进入 **Deployments**（部署）
2. 点击最新部署右侧的 **"..."** 菜单
3. 选择 **"Redeploy"**（重新部署）

或者，Vercel 会在你推送代码到 Git 时自动重新部署。

## ✅ 验证配置

### 测试 Google OAuth 登录

1. 访问你的网站登录页面
2. 点击 **"使用 Google 登录"** 按钮
3. 应该会跳转到 Google 登录页面
4. 登录后，应该会重定向回你的网站

### 常见问题排查

#### 问题 1: "redirect_uri_mismatch" 错误

**原因**：重定向 URI 不匹配

**解决方案**：
1. 检查 Google Cloud Console 中配置的重定向 URI
2. 确保 URI 完全匹配（包括协议 `http://` 或 `https://`）
3. 确保没有多余的斜杠或空格

#### 问题 2: "invalid_client" 错误

**原因**：客户端 ID 或密钥错误

**解决方案**：
1. 检查环境变量是否正确设置
2. 确保没有多余的空格或引号
3. 在 Vercel 中，确保环境变量已保存并重新部署

#### 问题 3: OAuth 同意屏幕显示 "未验证的应用"

**原因**：应用处于测试模式

**解决方案**：
1. 在 **OAuth consent screen** 中添加测试用户
2. 或者提交应用进行验证（生产环境需要）

## 📝 生产环境注意事项

### 应用验证（可选）

如果你的应用需要公开使用（非测试用户），需要：

1. 在 **OAuth consent screen** 中点击 **"PUBLISH APP"**（发布应用）
2. 填写完整的应用信息
3. 可能需要提交 Google 审核（取决于请求的作用域）

### 限制和配额

- Google OAuth 有每日请求限制
- 对于测试应用，限制较低
- 生产应用需要验证才能提高限制

## 🔗 相关链接

- [Google Cloud Console](https://console.cloud.google.com)
- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider 文档](https://next-auth.js.org/providers/google)

---

**配置完成后，你的 Google OAuth 登录功能就可以正常工作了！** ✅

