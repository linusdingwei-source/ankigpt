#!/bin/bash

# 提交前检查脚本
# 检查 TypeScript 类型和 ESLint 错误

set -e

echo "🔍 Running pre-commit checks..."

# 检查 ESLint
echo "📝 Checking ESLint..."
npm run lint || {
  echo "❌ ESLint check failed. Please fix the errors before committing."
  exit 1
}

# 检查 TypeScript 类型（跳过库检查，因为可能没有数据库连接）
echo "📘 Checking TypeScript types..."
npx tsc --noEmit --skipLibCheck || {
  echo "❌ TypeScript type check failed. Please fix the errors before committing."
  exit 1
}

echo "✅ All checks passed!"
exit 0

