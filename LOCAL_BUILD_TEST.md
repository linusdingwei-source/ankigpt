# 🧪 本地构建验证指南

在部署到 Vercel 之前，先在本地验证构建是否成功。

## 📋 验证步骤

### 1. 确保所有文件已提交

```bash
# 检查未提交的文件
git status

# 确保以下文件已提交：
# - lib/analytics.ts
# - components/GoogleAnalytics.tsx
# - app/[locale]/HomePageClient.tsx
# - .vercelignore
# - vercel.json
```

### 2. 检查环境变量

确保 `.env` 文件包含所有必需的环境变量（至少要有占位符值）：

```bash
# 检查环境变量文件
cat .env | grep -E "^(DATABASE_URL|DIRECT_URL|AUTH_SECRET|NEXTAUTH_URL)" || echo "需要配置环境变量"
```

**最小配置**（用于构建测试）：
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="test-secret-key-for-build"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="test"
GOOGLE_CLIENT_SECRET="test"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="test"
SMTP_PASSWORD="test"
SMTP_FROM="test@example.com"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_STARTER="price_..."
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_PREMIUM="price_..."
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### 3. 清理构建缓存

```bash
# 删除旧的构建文件
rm -rf .next
rm -rf node_modules/.cache
```

### 4. 运行构建

```bash
# 运行生产构建
npm run build
```

**预期输出**：
- ✅ Prisma Client 生成成功
- ✅ Next.js 构建成功
- ✅ 没有模块找不到的错误
- ✅ 没有 TypeScript 错误

### 5. 检查构建输出

构建成功后，检查：

```bash
# 查看构建输出目录
ls -la .next

# 应该看到：
# - .next/static/ - 静态资源
# - .next/server/ - 服务器端代码
```

### 6. 本地测试生产构建（可选）

```bash
# 启动生产服务器
npm start

# 在浏览器中访问
# http://localhost:3000
```

## 🔍 常见构建错误及解决方案

### 错误 1: Module not found

**错误信息**：
```
Module not found: Can't resolve '@/lib/analytics'
```

**解决方案**：
1. 检查文件是否存在：`ls lib/analytics.ts`
2. 确保文件已提交到 Git：`git status lib/analytics.ts`
3. 如果未提交，运行：`git add lib/analytics.ts && git commit -m "Add analytics.ts"`

### 错误 2: TypeScript 类型错误

**解决方案**：
```bash
# 运行类型检查
npx tsc --noEmit

# 修复所有类型错误
```

### 错误 3: 环境变量缺失

**错误信息**：
```
Error: Missing required environment variable: DATABASE_URL
```

**解决方案**：
1. 确保 `.env` 文件存在
2. 检查所有必需的环境变量都已设置
3. 参考上面的最小配置

### 错误 4: Prisma 错误

**错误信息**：
```
Error: Can't reach database server
```

**解决方案**：
- 构建时不需要真实的数据库连接
- 确保 `DATABASE_URL` 和 `DIRECT_URL` 有值（可以是占位符）
- Prisma Client 生成不依赖数据库连接

## ✅ 构建成功检查清单

构建成功后，确认：

- [ ] 没有模块找不到的错误
- [ ] 没有 TypeScript 错误
- [ ] Prisma Client 生成成功
- [ ] 所有页面编译成功
- [ ] 静态资源生成成功
- [ ] 构建输出在 `.next` 目录中

## 🚀 构建成功后

如果本地构建成功，可以安全地推送到 Vercel：

```bash
# 1. 提交所有更改
git add .
git commit -m "Fix: Add missing files for deployment"
git push

# 2. Vercel 会自动触发部署
# 或手动在 Vercel Dashboard 触发部署
```

## 📝 快速验证脚本

创建一个快速验证脚本 `test-build.sh`：

```bash
#!/bin/bash

echo "🧹 清理构建缓存..."
rm -rf .next
rm -rf node_modules/.cache

echo "📦 检查依赖..."
npm install

echo "🔨 运行构建..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！可以部署到 Vercel 了"
else
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi
```

使用：
```bash
chmod +x test-build.sh
./test-build.sh
```

## 🎯 验证重点

重点关注以下方面：

1. **模块解析** - 确保所有 `@/` 导入都能找到
2. **类型检查** - 没有 TypeScript 错误
3. **环境变量** - 所有必需变量都有值
4. **Prisma** - Client 生成成功
5. **页面编译** - 所有页面都能编译

## 💡 提示

- 本地构建不需要真实的数据库连接
- 可以使用占位符值测试构建
- 构建成功后，Vercel 部署应该也会成功
- 如果本地构建失败，Vercel 也会失败

---

**完成本地验证后，就可以安全地部署到 Vercel 了！** 🚀

