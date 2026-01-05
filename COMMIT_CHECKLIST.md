# 提交前检查清单

## ✅ 提交前必须检查

在提交代码前，请运行以下命令确保代码质量：

### 1. 运行 ESLint 检查
```bash
npm run lint
```

### 2. 运行 TypeScript 类型检查
```bash
npm run type-check
```

### 3. 运行完整检查（推荐）
```bash
npm run check
```

这会同时运行 ESLint 和 TypeScript 类型检查。

## 🔧 自动检查脚本

你也可以使用预提交检查脚本：

```bash
./scripts/pre-commit-check.sh
```

## 📝 提交流程

1. **修改代码**
2. **运行检查**：`npm run check`
3. **修复所有错误**
4. **再次运行检查**确保通过
5. **提交代码**：`git add . && git commit -m "your message"`
6. **推送**：`git push origin main`

## ⚠️ 常见错误

### ESLint 错误
- `'xxx' is defined but never used` - 删除未使用的变量/导入
- `Unexpected any` - 使用具体类型替代 `any`
- `'xxx' is possibly 'null'` - 添加空值检查

### TypeScript 错误
- 类型不匹配 - 检查函数参数和返回值类型
- 缺少属性 - 确保对象包含所有必需属性
- 未定义的变量 - 检查导入和变量声明

## 💡 提示

- 在 VSCode 中，TypeScript 错误会实时显示
- 保存文件时，ESLint 会自动检查（如果配置了）
- 提交前务必运行 `npm run check` 确保没有错误

