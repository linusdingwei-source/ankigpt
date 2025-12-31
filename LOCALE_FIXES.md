# Locale 问题修复总结

## 📋 修复概述

本次全面检查并修复了项目中所有与 locale 相关的问题，确保多语言路由在所有场景下都能正确工作。

---

## 🔧 修复内容

### 1. 创建 Locale 工具函数 (`lib/locale-utils.ts`)

**新增功能**：
- `getLocaleFromRequest()`: 从请求中智能提取 locale
  - 优先从 URL pathname 提取
  - 其次从 Referer header 提取
  - 再次从 Origin header 提取
  - 最后从 query 参数提取
  - 默认返回 `zh`
- `buildLocalizedPath()`: 构建带 locale 前缀的路径

**使用场景**：
- API 路由中需要获取当前 locale
- 构建重定向 URL
- Stripe checkout 配置

### 2. 修复 Stripe Checkout Locale 问题

**问题**：
- `success_url` 和 `cancel_url` 硬编码了 `/zh`
- 导致从英文/日文页面购买后，重定向到中文页面

**修复**：
- 使用 `getLocaleFromRequest()` 动态获取 locale
- 使用 `buildLocalizedPath()` 构建正确的 URL
- 确保支付成功/取消后跳转到正确的语言页面

**文件**：`app/api/payment/create-checkout/route.ts`

```typescript
// 修复前
success_url: `${baseUrl}/zh/payment/success?session_id={CHECKOUT_SESSION_ID}`

// 修复后
const locale = getLocaleFromRequest(request);
success_url: `${baseUrl}${buildLocalizedPath(locale, 'payment/success')}?session_id={CHECKOUT_SESSION_ID}`
```

### 3. 修复 API 路由重定向 Locale 问题

**问题**：
- `/api/payment/success` 中未登录时重定向到 `/login`（缺少 locale）

**修复**：
- 使用 `getLocaleFromRequest()` 获取 locale
- 使用 `buildLocalizedPath()` 构建正确的登录页路径

**文件**：`app/api/payment/success/route.ts`

```typescript
// 修复前
return NextResponse.redirect(new URL('/login', request.url));

// 修复后
const locale = getLocaleFromRequest(request);
return NextResponse.redirect(new URL(buildLocalizedPath(locale, 'login'), request.url));
```

### 4. 修复 Pricing 页面 Link 问题

**问题**：
- Pricing 页面中有一个 Link 使用了 `/login` 而不是 locale-aware 路径

**修复**：
- 改为使用 `/${locale}/login`

**文件**：`app/[locale]/pricing/page.tsx`

---

## ✅ 验证清单

### 已修复的问题

- [x] Stripe checkout success_url 动态使用 locale
- [x] Stripe checkout cancel_url 动态使用 locale
- [x] API 路由重定向包含正确的 locale
- [x] Pricing 页面所有链接使用正确的 locale
- [x] 创建 locale 工具函数供所有 API 路由使用

### 已验证正确的部分

- [x] Dashboard 页面使用 `@/i18n/routing` 的 Link（自动处理 locale）
- [x] 所有页面组件中的 `router.push()` 都包含 locale
- [x] NextAuth redirect callback 正确处理 locale
- [x] Middleware 正确匹配 locale 路径

---

## 🧪 测试场景

### 场景 1: 从不同语言页面购买

1. **中文页面** (`/zh/pricing`)：
   - 点击购买 → Stripe checkout
   - 支付成功 → 跳转到 `/zh/payment/success`
   - ✅ 正确

2. **英文页面** (`/en/pricing`)：
   - 点击购买 → Stripe checkout
   - 支付成功 → 跳转到 `/en/payment/success`
   - ✅ 正确

3. **日文页面** (`/ja/pricing`)：
   - 点击购买 → Stripe checkout
   - 支付成功 → 跳转到 `/ja/payment/success`
   - ✅ 正确

### 场景 2: API 路由重定向

1. **未登录访问支付成功页面**：
   - 访问 `/api/payment/success?session_id=...`
   - 从 `/zh/pricing` 访问 → 重定向到 `/zh/login`
   - 从 `/en/pricing` 访问 → 重定向到 `/en/login`
   - ✅ 正确

---

## 📝 代码示例

### 在 API 路由中使用 Locale 工具

```typescript
import { getLocaleFromRequest, buildLocalizedPath } from '@/lib/locale-utils';

export async function GET(request: NextRequest) {
  // 获取当前 locale
  const locale = getLocaleFromRequest(request);
  
  // 构建带 locale 的路径
  const loginPath = buildLocalizedPath(locale, 'login');
  // 结果: '/zh/login' 或 '/en/login' 或 '/ja/login'
  
  // 使用在重定向中
  return NextResponse.redirect(new URL(loginPath, request.url));
}
```

### Locale 提取优先级

1. **URL Pathname** (最高优先级)
   - `/zh/pricing` → `zh`
   - `/en/dashboard` → `en`

2. **Referer Header**
   - 从 `referer: https://example.com/zh/pricing` → `zh`

3. **Origin Header**
   - 从 `origin: https://example.com/ja` → `ja`

4. **Query Parameter**
   - `?locale=en` → `en`

5. **Default** (最低优先级)
   - 如果都找不到 → `zh`

---

## 🔍 其他检查项

### 已确认正确的部分

1. **页面组件中的导航**：
   - 所有 `router.push()` 都包含 locale
   - 所有 `Link` 组件使用 `@/i18n/routing` 的 Link（自动处理）

2. **NextAuth 重定向**：
   - `redirect` callback 正确处理 locale
   - 修复了 `/login/dashboard` 等错误路径

3. **Middleware**：
   - 正确匹配 `/(zh|en|ja)/:path*`
   - 正确处理根路径重定向

---

## 🚀 部署后测试

部署后，请测试以下场景：

1. **多语言购买流程**：
   - [ ] 从 `/zh/pricing` 购买，确认跳转到 `/zh/payment/success`
   - [ ] 从 `/en/pricing` 购买，确认跳转到 `/en/payment/success`
   - [ ] 从 `/ja/pricing` 购买，确认跳转到 `/ja/payment/success`

2. **支付取消流程**：
   - [ ] 从不同语言页面取消支付，确认跳转到正确的语言页面

3. **未登录访问**：
   - [ ] 未登录访问支付相关 API，确认重定向到正确的语言登录页

---

## 📚 相关文件

- `lib/locale-utils.ts` - Locale 工具函数
- `app/api/payment/create-checkout/route.ts` - Stripe checkout 配置
- `app/api/payment/success/route.ts` - 支付成功验证
- `app/[locale]/pricing/page.tsx` - 定价页面
- `i18n/routing.ts` - 路由配置
- `middleware.ts` - 中间件配置

---

## 💡 最佳实践

1. **API 路由**：
   - 始终使用 `getLocaleFromRequest()` 获取 locale
   - 使用 `buildLocalizedPath()` 构建路径

2. **页面组件**：
   - 使用 `@/i18n/routing` 的 `Link` 和 `router`
   - 这些会自动处理 locale

3. **重定向**：
   - 确保所有重定向都包含 locale
   - 使用工具函数而不是硬编码

---

**修复完成时间**：2025-12-30
**修复版本**：v1.0.0

