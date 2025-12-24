#!/bin/bash

# 本地构建验证脚本

set -e  # 遇到错误立即退出

echo "🧹 清理构建缓存..."
rm -rf .next
rm -rf node_modules/.cache

echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

echo "🔨 运行构建..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 构建成功！"
    echo "✅ 可以安全地部署到 Vercel 了"
    echo ""
    echo "下一步："
    echo "  1. git add ."
    echo "  2. git commit -m 'Fix: Add missing files'"
    echo "  3. git push"
    echo "  4. Vercel 会自动触发部署"
else
    echo ""
    echo "❌ 构建失败，请检查上面的错误信息"
    exit 1
fi

