# 管理员功能设置指南

## 功能概述

已实现以下功能：

1. ✅ **Google Analytics 增强**：添加了更多事件追踪（卡片生成、管理员访问等）
2. ✅ **管理员权限系统**：数据库添加了 `role` 字段
3. ✅ **管理员统计 API**：`/api/admin/stats` 提供完整的系统统计数据
4. ✅ **管理员控制台页面**：`/[locale]/admin` 提供可视化的管理界面

## 数据库迁移

### 1. 运行迁移

Schema 已更新，添加了 `role` 字段到 `User` 模型。运行以下命令应用更改：

```bash
npx prisma db push
```

或使用迁移方式（推荐用于生产环境）：

```bash
npx prisma migrate dev --name add_admin_role
```

### 2. 生成 Prisma Client

```bash
npx prisma generate
```

## 设置管理员账户

### 方法 1：通过数据库直接设置（推荐）

1. 连接到数据库（使用 Prisma Studio 或数据库客户端）

```bash
npx prisma studio
```

2. 找到要设置为管理员的用户记录
3. 将 `role` 字段从 `"user"` 改为 `"admin"`

### 方法 2：通过 SQL 命令

```sql
-- 将指定邮箱的用户设置为管理员
UPDATE "User" SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

### 方法 3：创建新的管理员用户（通过注册后修改）

1. 正常注册一个新账户
2. 使用上述方法 1 或 2 将该用户的 `role` 设置为 `"admin"`

## 访问管理员页面

1. 使用管理员账户登录
2. 访问：`https://yourdomain.com/[locale]/admin`
   - 例如：`https://yourdomain.com/zh/admin`
   - 例如：`https://yourdomain.com/en/admin`

## 管理员页面功能

### 概览标签页
- 总用户数（注册用户 + 匿名用户）
- 总卡片数
- 总订单数
- 总收入（USD 和 CNY）

### 用户标签页
- 最近注册的用户列表
- 卡片数 Top 10 用户
- Credits Top 10 用户

### 订单标签页
- 最近的订单列表
- 订单详情（用户、金额、Credits、状态、时间）

### 趋势标签页
- 每日用户注册趋势
- 每日卡片创建趋势
- 每日订单趋势（包含收入）

### 时间范围选择
- 支持选择 7 天、30 天、90 天、一年
- 可随时刷新数据

## Google Analytics 增强

### 新增事件追踪

1. **卡片生成事件**：
   - `card_generation_start` - 卡片生成开始
   - `card_generation_success` - 卡片生成成功
   - `card_generation_failed` - 卡片生成失败
   - `card_view` - 卡片查看
   - `card_download` - 卡片下载

2. **管理员事件**：
   - `admin_view` - 管理员页面访问
   - `admin_action` - 管理员操作

3. **用户属性设置**：
   - `setUserProperties()` - 设置用户属性用于用户识别

### 使用方法

在代码中使用新的追踪函数：

```typescript
import { 
  trackCardGenerationStart,
  trackCardGenerationSuccess,
  trackCardView,
  trackAdminAction,
  setUserProperties 
} from '@/lib/analytics';

// 卡片生成
trackCardGenerationStart(textLength);
trackCardGenerationSuccess(textLength, creditsRemaining);

// 卡片查看
trackCardView(cardId);

// 管理员操作
trackAdminAction('view_stats', { days: 30 });

// 设置用户属性
setUserProperties(userId, { plan: 'premium' });
```

## API 端点

### GET /api/admin/stats

获取系统统计数据（仅管理员可访问）

**查询参数**：
- `days` (可选): 时间范围，默认 30 天

**响应示例**：
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1000,
      "totalAnonymousUsers": 500,
      "totalRegisteredUsers": 500,
      "totalCards": 5000,
      "totalDecks": 200,
      "totalOrders": 50,
      "totalRevenue": 50000,
      "totalRevenueUSD": "500.00"
    },
    "recent": {
      "recentUsers": [...],
      "recentOrders": [...]
    },
    "trends": {
      "usersByDay": [...],
      "cardsByDay": [...],
      "ordersByDay": [...]
    },
    "topUsers": {
      "byCards": [...],
      "byCredits": [...]
    }
  }
}
```

## 安全注意事项

1. **权限检查**：所有管理员 API 都会检查用户角色
2. **访问控制**：非管理员用户访问 `/api/admin/stats` 会返回 403 错误
3. **页面保护**：管理员页面会检查用户权限，非管理员会被重定向到仪表板

## 故障排查

### 问题：无法访问管理员页面

1. **检查用户角色**：
   ```sql
   SELECT email, role FROM "User" WHERE email = 'your-email@example.com';
   ```

2. **确认已登录**：确保使用管理员账户登录

3. **检查控制台错误**：打开浏览器开发者工具查看是否有错误

### 问题：API 返回 403 错误

- 确认用户的 `role` 字段为 `"admin"`（不是 `"user"`）
- 确认已正确登录
- 检查 `lib/admin.ts` 中的权限检查逻辑

### 问题：统计数据不准确

- 检查数据库连接是否正常
- 确认时间范围参数正确
- 查看服务器日志是否有错误

## 下一步

1. ✅ 运行数据库迁移
2. ✅ 设置管理员账户
3. ✅ 访问管理员页面测试功能
4. ✅ 在 Google Analytics 中查看新的事件追踪

## 相关文件

- `prisma/schema.prisma` - 数据库 Schema（已添加 `role` 字段）
- `lib/admin.ts` - 管理员权限检查工具
- `app/api/admin/stats/route.ts` - 管理员统计 API
- `app/[locale]/admin/page.tsx` - 管理员页面 UI
- `lib/analytics.ts` - Google Analytics 追踪工具（已增强）
