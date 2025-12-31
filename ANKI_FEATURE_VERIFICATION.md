# Anki 卡片生成功能验证指南

## ✅ 功能已实现

已成功实现类似 `anki-gpt20` 项目的 Anki 卡片生成功能，包括：

1. **数据库 Schema**：`Card` 和 `Deck` 模型
2. **LLM 分析 API**：`/api/llm/analyze` - 分析日语文本
3. **增强 TTS API**：`/api/tts/generate-enhanced` - 生成带时间戳的音频
4. **卡片生成 API**：`/api/cards/generate` - 生成并保存卡片
5. **卡片管理 API**：
   - `GET /api/cards` - 获取卡片列表
   - `GET /api/cards/[id]` - 获取单个卡片
   - `DELETE /api/cards/[id]` - 删除卡片
6. **卡组管理 API**：
   - `GET /api/decks` - 获取卡组列表
   - `POST /api/decks` - 创建新卡组
7. **前端页面**：
   - `/cards/generate` - 生成新卡片
   - `/cards` - 查看我的卡片

## 🔍 如何验证功能

### 步骤 1：访问 Dashboard

1. 登录你的账户
2. 进入 Dashboard 页面：`https://your-domain.vercel.app/zh/dashboard`

### 步骤 2：查看功能导航

在 Dashboard 页面顶部，你应该看到一个新的功能导航区域，包含三个按钮：

- **文本转语音** - 原有的 TTS 功能
- **生成新卡片** - 新的 Anki 卡片生成功能
- **查看我的卡片** - 查看已生成的卡片

### 步骤 3：生成 Anki 卡片

1. 点击 **"生成新卡片"** 按钮
2. 页面跳转到 `/zh/cards/generate`
3. 在页面中：
   - **选择或创建卡组**：选择一个现有卡组，或输入新卡组名称并点击"创建卡组"
   - **输入日语文本**：在文本框中输入日语文本（最多 500 字符）
   - **包含发音**：勾选此选项以生成音频（需要额外 1 个 Credit）
   - 点击 **"生成预览"** 按钮

### 步骤 4：查看生成的卡片

1. 生成成功后，右侧会显示卡片预览：
   - **正面**：输入的日语文本
   - **背面**：LLM 分析结果（翻译、假名、单词解释、语法点）
   - **发音**：如果选择了包含发音，会显示音频播放器
2. 点击 **"保存卡片"** 将卡片保存到数据库

### 步骤 5：查看卡片列表

1. 点击 **"查看我的卡片"** 按钮
2. 页面跳转到 `/zh/cards`
3. 你应该看到：
   - 所有已生成的卡片
   - 可以按卡组筛选
   - 可以查看或删除卡片

## 🧪 测试用例

### 测试 1：基本卡片生成

1. 输入日语文本：`今日は良い天気です。`
2. 选择或创建卡组
3. 不勾选"包含发音"（节省 Credits）
4. 点击"生成预览"
5. **预期结果**：
   - 右侧显示卡片预览
   - 正面：`今日は良い天気です。`
   - 背面：包含中文翻译、假名读音、单词解释、语法点

### 测试 2：带发音的卡片生成

1. 输入日语文本：`こんにちは`
2. 选择或创建卡组
3. **勾选"包含发音"**
4. 点击"生成预览"
5. **预期结果**：
   - 卡片预览包含音频播放器
   - 可以播放发音
   - 消耗 2 个 Credits（1 个 LLM + 1 个 TTS）

### 测试 3：卡组管理

1. 在生成页面输入新卡组名称，例如：`N5词汇`
2. 点击"创建卡组"
3. **预期结果**：
   - 显示成功消息
   - 新卡组出现在下拉列表中
   - 自动选中新创建的卡组

### 测试 4：卡片列表和筛选

1. 生成多个卡片，分配到不同卡组
2. 访问 `/zh/cards` 页面
3. 使用"按卡组筛选"下拉菜单
4. **预期结果**：
   - 可以查看所有卡片
   - 可以按卡组筛选
   - 可以删除卡片

## 🔧 故障排查

### 问题：看不到功能导航按钮

**解决方案**：
1. 刷新页面（`Ctrl+F5` 或 `Cmd+Shift+R`）
2. 检查是否已部署最新代码
3. 清除浏览器缓存

### 问题：点击"生成新卡片"后显示 404

**解决方案**：
1. 检查路由是否正确：应该是 `/zh/cards/generate`
2. 确认文件存在：`app/[locale]/cards/generate/page.tsx`
3. 重新部署应用

### 问题：生成卡片时提示"Insufficient credits"

**解决方案**：
1. 检查账户 Credits 余额
2. 生成卡片需要：
   - 不包含发音：1 个 Credit（仅 LLM）
   - 包含发音：2 个 Credits（LLM + TTS）
3. 如果 Credits 不足，点击"购买Credits"购买套餐

### 问题：LLM 分析失败

**可能原因**：
1. `DASHSCOPE_API_KEY` 未配置或无效
2. 网络连接问题
3. DashScope API 服务暂时不可用

**解决方案**：
1. 检查 Vercel 环境变量中的 `DASHSCOPE_API_KEY`
2. 查看浏览器控制台和 Vercel 日志
3. 确认 DashScope API 密钥有效

### 问题：TTS 音频生成失败

**可能原因**：
1. `DASHSCOPE_API_KEY` 未配置
2. DashScope TTS 服务问题
3. 文本格式不支持

**解决方案**：
1. 检查环境变量配置
2. 尝试不勾选"包含发音"选项
3. 查看 Vercel 函数日志

## 📊 API 端点验证

### 使用 curl 测试 API（需要认证）

```bash
# 1. 获取卡组列表
curl -X GET https://your-domain.vercel.app/api/decks \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# 2. 创建新卡组
curl -X POST https://your-domain.vercel.app/api/decks \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"name": "测试卡组"}'

# 3. 生成卡片
curl -X POST https://your-domain.vercel.app/api/cards/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "text": "今日は良い天気です。",
    "deckName": "测试卡组",
    "includePronunciation": false
  }'

# 4. 获取卡片列表
curl -X GET https://your-domain.vercel.app/api/cards \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## ✅ 验证检查清单

- [ ] Dashboard 页面显示功能导航按钮
- [ ] 可以访问 `/zh/cards/generate` 页面
- [ ] 可以创建新卡组
- [ ] 可以生成不包含发音的卡片
- [ ] 可以生成包含发音的卡片
- [ ] 卡片预览正确显示（正面、背面、音频）
- [ ] 可以保存卡片到数据库
- [ ] 可以访问 `/zh/cards` 查看卡片列表
- [ ] 可以按卡组筛选卡片
- [ ] 可以删除卡片
- [ ] Credits 正确扣除
- [ ] 数据库表 `Card` 和 `Deck` 正确创建

## 🎯 下一步

功能验证成功后，你可以：

1. **导出卡片**：实现导出为 Anki `.apkg` 格式
2. **批量生成**：支持一次输入多句文本，批量生成卡片
3. **卡片编辑**：允许编辑已生成的卡片
4. **复习功能**：实现类似 Anki 的复习系统
5. **统计功能**：显示卡片数量、学习进度等统计信息

---

**提示**：如果功能未显示，请确保：
1. 代码已推送到 GitHub
2. Vercel 已成功部署
3. 浏览器缓存已清除
4. 已登录账户

