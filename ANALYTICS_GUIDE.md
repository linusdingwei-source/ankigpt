# Google Analytics 转化漏斗追踪指南

## 已实现的追踪功能

### 1. 页面访问追踪 ✅
- **首页访问** (`home_view`)
- **登录页访问** (`login_view`)
- **注册页访问** (`register_view`)
- **定价页访问** (`pricing_view`)
- **仪表板访问** (`dashboard_view`)

### 2. 按钮点击追踪 ✅
- **登录按钮** (`login_button_click`)
- **注册按钮** (`register_button_click`)
- **Google登录** (`google_login_click`)
- **邮箱登录** (`email_login_click`)
- **验证码登录** (`code_login_click`)
- **发送验证码** (`send_code_click`)
- **定价按钮** (`pricing_button_click`)
- **购买按钮** (`purchase_button_click`)
- **生成音频按钮** (`generate_audio_click`)

### 3. 购买转化追踪 ✅
- **开始结账** (`checkout_started`) - 包含套餐信息和价格
- **支付成功** (`payment_success`) - 包含交易ID和金额
- **支付失败** (`payment_failed`) - 包含失败原因

### 4. 音频转换成功率追踪 ✅
- **生成开始** (`audio_generation_start`) - 包含文本长度
- **生成成功** (`audio_generation_success`) - 包含剩余Credits
- **生成失败** (`audio_generation_failed`) - 包含失败原因
- **音频下载** (`audio_download`)
- **Credits不足** (`insufficient_credits`) - 包含当前Credits

## 配置步骤

### 1. 创建 Google Analytics 4 属性

1. 访问 [Google Analytics](https://analytics.google.com/)
2. 创建新属性（Property）
3. 选择 "Web" 平台
4. 复制 Measurement ID（格式：`G-XXXXXXXXXX`）

### 2. 配置环境变量

在 `.env` 文件中添加：

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 3. 验证追踪

1. 启动开发服务器：`npm run dev`
2. 访问网站并执行操作
3. 在 Google Analytics 中查看实时数据：
   - 进入 Analytics > Reports > Realtime
   - 应该能看到页面访问和事件

## 转化漏斗分析

### 完整转化漏斗

```
1. 首页访问 (home_view)
   ↓
2. 登录/注册按钮点击 (login_button_click / register_button_click)
   ↓
3. 登录/注册页访问 (login_view / register_view)
   ↓
4. 登录/注册成功 (login_success / registration_success)
   ↓
5. 仪表板访问 (dashboard_view)
   ↓
6. 生成音频点击 (generate_audio_click)
   ↓
7. 音频生成成功 (audio_generation_success)
   ↓
8. 定价页访问 (pricing_view)
   ↓
9. 购买按钮点击 (purchase_button_click)
   ↓
10. 开始结账 (checkout_started)
    ↓
11. 支付成功 (payment_success)
```

### 关键转化指标

#### 注册转化率
```
注册转化率 = (注册成功数 / 首页访问数) × 100%
```

#### 登录转化率
```
登录转化率 = (登录成功数 / 登录页访问数) × 100%
```

#### 音频生成成功率
```
音频生成成功率 = (生成成功数 / 生成开始数) × 100%
```

#### 购买转化率
```
购买转化率 = (支付成功数 / 定价页访问数) × 100%
```

#### 完整转化率（访问到付费）
```
完整转化率 = (支付成功数 / 首页访问数) × 100%
```

## Google Analytics 4 报告设置

### 1. 创建自定义报告

在 GA4 中创建以下报告：

#### 转化漏斗报告
1. 进入 **Explore** > **Funnel exploration**
2. 添加步骤：
   - Step 1: `home_view`
   - Step 2: `login_button_click` OR `register_button_click`
   - Step 3: `login_success` OR `registration_success`
   - Step 4: `dashboard_view`
   - Step 5: `generate_audio_click`
   - Step 6: `audio_generation_success`
   - Step 7: `pricing_view`
   - Step 8: `purchase_button_click`
   - Step 9: `checkout_started`
   - Step 10: `payment_success`

#### 购买转化报告
1. 进入 **Explore** > **Path exploration**
2. 起点：`pricing_view`
3. 终点：`payment_success`

#### 音频生成成功率报告
1. 进入 **Reports** > **Engagement** > **Events**
2. 筛选：
   - `audio_generation_start`
   - `audio_generation_success`
   - `audio_generation_failed`

### 2. 设置转化事件

在 GA4 中标记以下事件为转化：

1. **注册成功** (`registration_success`)
2. **登录成功** (`login_success`)
3. **支付成功** (`payment_success`)
4. **音频生成成功** (`audio_generation_success`)

设置步骤：
1. 进入 **Admin** > **Events**
2. 找到对应事件
3. 点击 "Mark as conversion"

### 3. 创建自定义维度

在 GA4 中创建以下自定义维度：

1. **Package ID** - 用于分析不同套餐的转化
2. **Credits Remaining** - 用于分析Credits对转化的影响
3. **Text Length** - 用于分析文本长度对生成成功率的影响

## 数据分析建议

### 1. 监控关键指标

- **日活跃用户数** (DAU)
- **注册转化率**
- **音频生成成功率**
- **购买转化率**
- **平均订单价值** (AOV)
- **客户生命周期价值** (LTV)

### 2. 识别优化点

- **低转化率页面**：分析哪些页面转化率低，优化内容
- **高流失步骤**：识别漏斗中流失最多的步骤
- **Credits不足影响**：分析Credits不足对转化的影响
- **套餐偏好**：分析哪个套餐最受欢迎

### 3. A/B 测试建议

- 测试不同的定价页面布局
- 测试不同的CTA按钮文案
- 测试不同的套餐展示方式

## 事件列表参考

### 页面访问事件
- `home_view` - 首页访问
- `login_view` - 登录页访问
- `register_view` - 注册页访问
- `pricing_view` - 定价页访问
- `dashboard_view` - 仪表板访问

### 按钮点击事件
- `login_button_click` - 登录按钮
- `register_button_click` - 注册按钮
- `google_login_click` - Google登录
- `email_login_click` - 邮箱登录
- `code_login_click` - 验证码登录
- `send_code_click` - 发送验证码
- `pricing_button_click` - 定价按钮
- `purchase_button_click` - 购买按钮
- `generate_audio_click` - 生成音频按钮

### 转化事件
- `registration_success` - 注册成功
- `login_success` - 登录成功
- `checkout_started` - 开始结账
- `payment_success` - 支付成功
- `payment_failed` - 支付失败

### 音频生成事件
- `audio_generation_start` - 生成开始
- `audio_generation_success` - 生成成功
- `audio_generation_failed` - 生成失败
- `audio_download` - 音频下载
- `insufficient_credits` - Credits不足

## 故障排查

### 问题：事件没有出现在 GA4 中

1. **检查 GA ID 配置**
   - 确认 `NEXT_PUBLIC_GA_ID` 环境变量已设置
   - 确认 ID 格式正确（`G-XXXXXXXXXX`）

2. **检查浏览器控制台**
   - 打开浏览器开发者工具
   - 查看 Console 是否有错误
   - 查看 Network 标签，确认 gtag 请求已发送

3. **使用 GA Debugger**
   - 安装 [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) Chrome 扩展
   - 启用后查看 Network 标签中的 GA 请求

### 问题：转化数据不准确

1. **检查事件参数**
   - 确认所有必要参数都已传递
   - 使用 GA4 的 DebugView 实时查看事件

2. **验证转化标记**
   - 确认转化事件已正确标记
   - 检查转化设置中的条件

## 最佳实践

1. **定期审查数据**
   - 每周查看转化漏斗报告
   - 识别异常和趋势

2. **设置警报**
   - 在 GA4 中设置异常检测警报
   - 监控关键指标的变化

3. **持续优化**
   - 根据数据优化转化流程
   - 测试不同的策略

4. **隐私合规**
   - 确保符合 GDPR、CCPA 等隐私法规
   - 提供隐私政策和 Cookie 同意

