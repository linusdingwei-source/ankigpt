# 📝 需要提交的重要文件

## 已添加到暂存区

以下文件已添加到 Git 暂存区，需要提交：

- ✅ `lib/analytics.ts` - Google Analytics 追踪工具
- ✅ `components/GoogleAnalytics.tsx` - Google Analytics 组件
- ✅ `app/[locale]/HomePageClient.tsx` - 首页客户端组件
- ✅ `.vercelignore` - Vercel 忽略文件
- ✅ `vercel.json` - Vercel 配置文件

## 提交命令

```bash
git commit -m "Add missing files for Vercel deployment: analytics, GoogleAnalytics component, HomePageClient, and Vercel config"
git push
```

## 其他未提交的文件（可选）

以下文件是文档和工具文件，可以选择性提交：

### 文档文件（可选）
- `DEPLOYMENT_GUIDE.md`
- `DEPLOYMENT_CHECKLIST.md`
- `DEPLOYMENT_FIX.md`
- `SUPABASE_SETUP.md`
- 其他 `.md` 文档文件

### 工具文件（可选）
- `check-env.js` - 环境变量检查脚本

### 不应提交的文件
- `.idea/` - IDE 配置（应该添加到 `.gitignore`）
- `env` - 环境变量文件（应该添加到 `.gitignore`）

## 完整提交步骤

```bash
# 1. 添加所有重要的源代码文件
git add lib/analytics.ts
git add components/GoogleAnalytics.tsx
git add app/[locale]/HomePageClient.tsx
git add .vercelignore
git add vercel.json

# 2. 提交
git commit -m "Add missing files for Vercel deployment"

# 3. 推送到远程
git push

# 4. Vercel 会自动触发新的部署
```

## 验证

提交后，在 Vercel 中：
1. 等待 Git push 完成
2. 检查 Vercel 是否自动触发新部署
3. 查看构建日志，确认没有错误

