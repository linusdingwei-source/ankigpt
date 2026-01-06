# Vercel 排除 Android App 配置说明

## 问题

提交 Android App 代码到 git 后，Vercel 可能会尝试构建整个项目，包括 `android-app/` 目录。这会导致：
- 构建失败（Vercel 不支持 Android 构建）
- 构建时间增加
- 不必要的资源消耗

## 解决方案

### 1. 使用 .vercelignore 文件

`.vercelignore` 文件用于告诉 Vercel 在构建时忽略某些目录和文件。

已添加：
```
android-app/
```

### 2. Vercel 配置

`vercel.json` 中的配置只针对 Next.js 项目：
- `buildCommand`: 只构建 Next.js
- `installCommand`: 只安装 Node.js 依赖
- `framework`: nextjs

Vercel 不会尝试构建 `android-app/` 目录，因为：
1. `.vercelignore` 已排除该目录
2. Vercel 检测到的是 Next.js 项目（有 `package.json` 和 `next.config.mjs`）
3. `android-app/` 目录中没有 Vercel 支持的框架

## 验证

提交代码后，Vercel 构建日志应该：
- ✅ 只显示 Next.js 构建步骤
- ✅ 不会尝试安装 Android 依赖
- ✅ 不会尝试运行 Gradle 构建
- ✅ 构建时间正常（不受 android-app 影响）

## 注意事项

1. **.vercelignore 优先级**
   - `.vercelignore` 的优先级高于 `.gitignore`
   - 即使文件在 git 中，Vercel 也会忽略

2. **Android App 代码**
   - Android App 代码可以安全地提交到 git
   - 不会影响 Vercel 部署
   - 可以在同一个仓库中管理 Web 和移动端代码

3. **构建命令**
   - Vercel 只会执行 `vercel.json` 中定义的构建命令
   - 不会自动检测 Android 项目

## 相关文件

- `.vercelignore` - Vercel 忽略文件
- `vercel.json` - Vercel 配置
- `.gitignore` - Git 忽略文件（不影响 Vercel）

