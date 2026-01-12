# GitHub Personal Access Token 更新指南

## 🔍 检查 Token 使用位置

您收到的邮件显示 PAT "ankigpt20" (ID: 3072507764) 将在 6 天后过期。这个 token 可能用于以下场景：

### 1. Vercel GitHub 集成（最可能）

Vercel 连接到 GitHub 仓库时，通常使用 OAuth 应用，但在某些情况下也可能使用 PAT。

**检查步骤**：
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目设置：**Settings** > **Git**
3. 查看 GitHub 集成方式：
   - 如果显示 "Connected via OAuth"，则不需要 PAT
   - 如果显示 "Connected via Personal Access Token"，则需要更新

### 2. GitHub Actions（CI/CD）

检查是否有 `.github/workflows/` 目录：
```bash
ls -la .github/workflows/
```

如果存在 workflow 文件，检查是否使用了 `GITHUB_TOKEN` 环境变量。

### 3. 第三方服务集成

检查以下服务是否集成了 GitHub：
- GitHub Packages
- GitHub Actions
- 其他 CI/CD 工具

## 🔄 更新 Token 的步骤

### 方法 1：重新生成 Token（推荐）

1. **访问 Token 设置页面**：
   - 直接访问邮件中的链接：https://github.com/settings/tokens/3072507764/regenerate
   - 或访问：https://github.com/settings/tokens

2. **重新生成 Token**：
   - 点击 "Regenerate token"
   - 复制新的 token（只显示一次！）

3. **更新使用位置**：

#### 如果用于 Vercel：
1. 登录 Vercel Dashboard
2. 进入项目：**Settings** > **Git**
3. 如果使用 PAT，断开并重新连接：
   - 点击 "Disconnect"
   - 重新连接时，使用新的 token

#### 如果用于环境变量：
检查以下位置的环境变量：
- Vercel 环境变量（Settings > Environment Variables）
- GitHub Secrets（Settings > Secrets and variables > Actions）
- 本地 `.env` 文件（如果使用）

#### 如果用于 GitHub Actions：
1. 进入仓库：**Settings** > **Secrets and variables** > **Actions**
2. 更新名为 `GITHUB_TOKEN` 或类似的 secret

### 方法 2：创建新的 Token（如果旧 token 已过期）

1. **创建新 Token**：
   - 访问：https://github.com/settings/tokens/new
   - 名称：`ankigpt20`（或新名称）
   - 选择相同的权限范围（根据邮件中的 scopes）
   - 过期时间：根据需要设置（建议 90 天或更长）
   - 点击 "Generate token"
   - **立即复制 token**（只显示一次）

2. **更新所有使用位置**（同上）

## 📋 Token 权限范围

根据邮件，您的 token 具有以下权限：
- `admin:enterprise`
- `admin:gpg_key`
- `admin:org`
- `admin:org_hook`
- `admin:public_key`
- `admin:repo_hook`
- `admin:ssh_signing_key`
- `audit_log`
- `codespace`
- `copilot`
- `delete:packages`
- `delete_repo`
- `gist`
- `notifications`
- `project`
- `repo`
- `user`
- `workflow`
- `write:discussion`
- `write:network_configurations`
- `write:packages`

**注意**：如果只是用于 Vercel 部署，通常只需要 `repo` 权限即可。

## ✅ 验证更新

### 1. 检查 Vercel 部署

1. 在 Vercel Dashboard 中触发一次部署
2. 检查部署日志，确认没有认证错误

### 2. 检查 GitHub Actions（如果使用）

1. 推送一个测试 commit
2. 检查 Actions 标签页，确认 workflow 正常运行

### 3. 检查其他集成

根据您使用的服务，验证相关功能是否正常。

## 🚨 如果 Token 已过期

如果 token 已经过期，您可能会看到以下错误：

- **Vercel**：部署失败，提示 "Authentication failed"
- **GitHub Actions**：Workflow 失败，提示 "Token expired"
- **API 调用**：401 Unauthorized

**解决方案**：
1. 按照上述步骤创建新 token
2. 更新所有使用位置
3. 重新触发相关操作

## 📝 最佳实践

1. **使用最小权限**：
   - 如果只用于 Vercel 部署，只授予 `repo` 权限
   - 避免授予不必要的 admin 权限

2. **设置合理的过期时间**：
   - 生产环境：90-180 天
   - 开发环境：30-90 天
   - 定期轮换 token

3. **使用 OAuth 应用（推荐）**：
   - Vercel 支持 OAuth 集成，更安全且无需手动管理 token
   - 在 Vercel 项目设置中切换到 OAuth 连接

4. **记录 Token 使用位置**：
   - 在文档中记录 token 的使用位置
   - 使用密码管理器存储 token（如 1Password、Bitwarden）

## 🔗 相关链接

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [Vercel Git Integration](https://vercel.com/docs/concepts/git)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**提示**：如果您的项目只使用 Vercel 部署，建议切换到 OAuth 集成，这样就不需要手动管理 PAT 了。
