# 转化漏斗分析 - 从访问到付费

## 完整转化漏斗

```
┌─────────────────────────────────────────────────────────────┐
│  1. 首页访问 (home_view)                                    │
│     ↓                                                        │
│  2. 登录/注册按钮点击 (login_button_click / register_...)  │
│     ↓                                                        │
│  3. 登录/注册页访问 (login_view / register_view)            │
│     ↓                                                        │
│  4. 登录/注册成功 (login_success / registration_success)     │
│     ↓                                                        │
│  5. 仪表板访问 (dashboard_view)                             │
│     ↓                                                        │
│  6. 生成音频点击 (generate_audio_click)                     │
│     ↓                                                        │
│  7. 音频生成成功 (audio_generation_success)                 │
│     ↓                                                        │
│  8. 定价页访问 (pricing_view)                               │
│     ↓                                                        │
│  9. 购买按钮点击 (purchase_button_click)                    │
│     ↓                                                        │
│  10. 开始结账 (checkout_started)                            │
│     ↓                                                        │
│  11. 支付成功 (payment_success) ✅                          │
└─────────────────────────────────────────────────────────────┘
```

## 关键转化指标

### 1. 注册转化率
```
注册转化率 = (注册成功数 / 首页访问数) × 100%
```
**目标**: > 5%

### 2. 登录转化率
```
登录转化率 = (登录成功数 / 登录页访问数) × 100%
```
**目标**: > 60%

### 3. 音频生成成功率
```
音频生成成功率 = (生成成功数 / 生成开始数) × 100%
```
**目标**: > 95%

### 4. 购买转化率
```
购买转化率 = (支付成功数 / 定价页访问数) × 100%
```
**目标**: > 10%

### 5. 完整转化率（访问到付费）
```
完整转化率 = (支付成功数 / 首页访问数) × 100%
```
**目标**: > 1%

## 追踪的事件列表

### 页面访问事件
| 事件名 | 说明 | 位置 |
|--------|------|------|
| `home_view` | 首页访问 | 首页 |
| `login_view` | 登录页访问 | 登录页 |
| `register_view` | 注册页访问 | 注册页 |
| `pricing_view` | 定价页访问 | 定价页 |
| `dashboard_view` | 仪表板访问 | 仪表板 |

### 按钮点击事件
| 事件名 | 说明 | 位置 |
|--------|------|------|
| `login_button_click` | 登录按钮点击 | 首页 |
| `register_button_click` | 注册按钮点击 | 首页 |
| `google_login_click` | Google登录点击 | 登录/注册页 |
| `email_login_click` | 邮箱登录点击 | 登录页 |
| `code_login_click` | 验证码登录点击 | 登录页 |
| `send_code_click` | 发送验证码点击 | 登录/注册页 |
| `pricing_button_click` | 定价按钮点击 | 首页 |
| `purchase_button_click` | 购买按钮点击 | 定价页 |
| `generate_audio_click` | 生成音频点击 | 仪表板 |

### 转化事件
| 事件名 | 说明 | 触发条件 |
|--------|------|----------|
| `registration_success` | 注册成功 | 用户成功注册 |
| `login_success` | 登录成功 | 用户成功登录 |
| `checkout_started` | 开始结账 | 用户点击购买按钮 |
| `payment_success` | 支付成功 | Stripe支付完成 |
| `payment_failed` | 支付失败 | Stripe支付失败 |

### 音频生成事件
| 事件名 | 说明 | 包含数据 |
|--------|------|----------|
| `audio_generation_start` | 生成开始 | 文本长度 |
| `audio_generation_success` | 生成成功 | 文本长度、剩余Credits |
| `audio_generation_failed` | 生成失败 | 失败原因、剩余Credits |
| `audio_download` | 音频下载 | - |
| `insufficient_credits` | Credits不足 | 当前Credits |

## Google Analytics 4 报告设置

### 1. 创建转化漏斗报告

**路径**: Explore > Funnel exploration

**步骤**:
1. Step 1: Event = `home_view`
2. Step 2: Event = `login_button_click` OR `register_button_click`
3. Step 3: Event = `login_success` OR `registration_success`
4. Step 4: Event = `dashboard_view`
5. Step 5: Event = `generate_audio_click`
6. Step 6: Event = `audio_generation_success`
7. Step 7: Event = `pricing_view`
8. Step 8: Event = `purchase_button_click`
9. Step 9: Event = `checkout_started`
10. Step 10: Event = `payment_success`

### 2. 设置转化事件

**路径**: Admin > Events > Mark as conversion

标记以下事件为转化：
- ✅ `registration_success`
- ✅ `login_success`
- ✅ `payment_success`
- ✅ `audio_generation_success`

### 3. 创建自定义报告

#### 购买转化报告
- **起点**: `pricing_view`
- **终点**: `payment_success`
- **维度**: Package ID, User Type
- **指标**: Conversion Rate, Revenue

#### 音频生成成功率报告
- **事件**: `audio_generation_start`, `audio_generation_success`, `audio_generation_failed`
- **指标**: Success Rate, Failure Rate
- **维度**: Text Length, Credits Remaining

## 数据分析建议

### 1. 每周审查
- 查看完整转化漏斗报告
- 识别流失最多的步骤
- 分析转化率趋势

### 2. 优化重点
- **低注册转化率**: 优化首页CTA、简化注册流程
- **低登录转化率**: 优化登录页面、简化验证流程
- **低音频生成成功率**: 检查API错误、优化错误提示
- **低购买转化率**: 优化定价页面、添加限时优惠

### 3. A/B 测试
- 测试不同的按钮文案
- 测试不同的定价展示方式
- 测试不同的套餐推荐策略

## 预期转化率基准

| 指标 | 行业平均 | 目标值 |
|------|----------|--------|
| 注册转化率 | 2-5% | > 5% |
| 登录转化率 | 50-70% | > 60% |
| 音频生成成功率 | 90-95% | > 95% |
| 购买转化率 | 5-15% | > 10% |
| 完整转化率 | 0.5-2% | > 1% |

## 监控和警报

### 设置异常检测
1. 进入 GA4 > Admin > Custom Alerts
2. 创建以下警报：
   - 注册转化率下降 > 20%
   - 购买转化率下降 > 30%
   - 音频生成失败率 > 10%

### 每日检查清单
- [ ] 查看实时用户数
- [ ] 检查关键事件是否正常触发
- [ ] 查看转化漏斗报告
- [ ] 检查错误事件数量

