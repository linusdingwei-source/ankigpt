# Anki 卡片生成功能实现计划

## 📋 功能概述

基于 `anki-gpt20` 插件的功能，在网站中实现完整的日文 Anki 卡片生成系统。

### 核心功能

1. **日文句子分析**：使用 LLM 分析日文句子，生成翻译、单词解释、语法点
2. **TTS 音频生成**：生成日文发音音频（支持时间戳）
3. **卡片生成**：将分析结果整合成 Anki 格式卡片
4. **卡片管理**：查看、编辑、删除、导出卡片
5. **批量生成**：支持批量处理多个句子

---

## 🏗️ 架构设计

### 数据库 Schema

需要在 Prisma schema 中添加以下模型：

```prisma
model Card {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 卡片内容
  frontContent  String   // 日文原文
  backContent   String   // HTML 格式的分析内容（翻译、解释等）
  cardType      String   @default("问答题（附翻转卡片）")
  
  // 音频相关
  audioUrl      String?  // 音频文件 URL（存储在云存储或本地）
  audioFilename String?  // 音频文件名
  timestamps    Json?    // 时间戳数据（字符级对齐）
  kanaText      String?  // 用于 TTS 的假名文本
  
  // 元数据
  deckName      String   @default("default")
  tags          String[] // 标签数组
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([userId])
  @@index([deckName])
}

model Deck {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name      String   // 牌组名称
  cards     Card[]   // 关联的卡片
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, name]) // 每个用户的牌组名称唯一
  @@index([userId])
}
```

### API 路由设计

```
/api/cards
  POST   - 创建新卡片（生成分析 + TTS）
  GET    - 获取用户的卡片列表（支持分页、筛选）
  
/api/cards/[id]
  GET    - 获取单个卡片详情
  PUT    - 更新卡片
  DELETE - 删除卡片
  
/api/cards/generate
  POST   - 生成卡片预览（不保存，只返回分析结果）
  
/api/cards/batch
  POST   - 批量生成卡片（多个句子）
  
/api/cards/export
  GET    - 导出卡片为 Anki 格式（.apkg 文件）
  
/api/decks
  GET    - 获取用户的牌组列表
  POST   - 创建新牌组
  
/api/decks/[name]
  GET    - 获取牌组中的卡片
  DELETE - 删除牌组
  
/api/llm/analyze
  POST   - LLM 分析日文句子（翻译、解释、语法）
  
/api/tts/generate-enhanced
  POST   - 增强版 TTS（支持假名提取、时间戳）
```

---

## 🔧 实现步骤

### 阶段 1: 数据库和基础 API

#### 1.1 更新 Prisma Schema

```bash
# 添加 Card 和 Deck 模型
# 运行迁移
npx prisma migrate dev --name add_cards_and_decks
```

#### 1.2 创建基础 API 路由

- `app/api/cards/route.ts` - 卡片 CRUD
- `app/api/decks/route.ts` - 牌组管理
- `app/api/llm/analyze/route.ts` - LLM 分析

### 阶段 2: LLM 分析功能

#### 2.1 集成 DashScope API

需要安装 DashScope SDK（如果使用 Node.js）或通过 HTTP API 调用。

**环境变量：**
```env
DASHSCOPE_API_KEY=your-dashscope-api-key
```

**LLM 分析 API 实现：**

```typescript
// app/api/llm/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await request.json();
  
  // 检查 credits
  const userId = session.user.id as string;
  const credits = await getCredits(userId);
  if (credits < 2) { // LLM 分析消耗 2 credits
    return NextResponse.json(
      { error: 'Insufficient credits' },
      { status: 402 }
    );
  }

  // 调用 DashScope API
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一个有帮助的助手，擅长将日文翻译成中文，并能对日文句子进行详细的语言分析...'
          },
          {
            role: 'user',
            content: `请将以下日文句子翻译成中文...\n日文句子：\n${text}`
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    }),
  });

  const data = await response.json();
  
  // 消耗 credits
  await consumeCredits(userId, 2);
  
  // 解析 LLM 返回的 markdown，提取假名
  const analysis = parseLLMResponse(data.output.choices[0].message.content);
  
  return NextResponse.json({
    success: true,
    analysis: analysis.markdown,
    html: markdownToHtml(analysis.markdown),
    kanaText: analysis.kanaText, // 提取的假名
  });
}
```

#### 2.2 假名提取函数

```typescript
// lib/llm-utils.ts
export function extractKanaFromLLMResult(markdown: string): string | null {
  // 匹配 **句子读法：** 后面的假名
  const patterns = [
    /\*\*句子读法[：:]\*\*\s*\n\s*-\s*([^\n]+)/,
    /句子读法[：:]\s*\n\s*-\s*([^\n]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) {
      return match[1].trim().replace(/^-/, '').trim();
    }
  }
  
  return null;
}
```

### 阶段 3: 增强 TTS 功能

#### 3.1 集成 DashScope TTS

```typescript
// app/api/tts/generate-enhanced/route.ts
export async function POST(request: NextRequest) {
  const { text, kanaText } = await request.json();
  
  // 使用假名文本生成 TTS（如果提供）
  const ttsInput = kanaText || text;
  
  // 调用 DashScope Qwen-TTS
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/tts/v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen3-tts-flash',
      text: ttsInput,
      voice: 'Cherry',
      language_type: 'Japanese',
    }),
  });
  
  // 下载音频文件并保存到云存储（或本地）
  // 返回音频 URL 和时间戳（如果支持）
}
```

### 阶段 4: 卡片生成和管理

#### 4.1 卡片生成 API

```typescript
// app/api/cards/generate/route.ts
export async function POST(request: NextRequest) {
  const { text, cardType, deckName, includePronunciation } = await request.json();
  
  // 1. 调用 LLM 分析
  const analysis = await analyzeWithLLM(text);
  
  // 2. 生成 TTS（如果需要）
  let audioUrl = null;
  let timestamps = null;
  if (includePronunciation) {
    const ttsResult = await generateTTS(analysis.kanaText || text);
    audioUrl = ttsResult.audioUrl;
    timestamps = ttsResult.timestamps;
  }
  
  // 3. 对齐时间戳到原文（如果假名与原文不同）
  const alignedTimestamps = alignTimestamps(text, analysis.kanaText, timestamps);
  
  // 4. 创建卡片（保存到数据库）
  const card = await prisma.card.create({
    data: {
      userId: session.user.id,
      frontContent: text,
      backContent: analysis.html,
      cardType,
      deckName,
      audioUrl,
      timestamps: alignedTimestamps,
      kanaText: analysis.kanaText,
    },
  });
  
  return NextResponse.json({ success: true, card });
}
```

#### 4.2 卡片列表和详情 API

```typescript
// app/api/cards/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  
  const deckName = searchParams.get('deck');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const cards = await prisma.card.findMany({
    where: {
      userId: session.user.id,
      ...(deckName && { deckName }),
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  
  return NextResponse.json({ cards });
}
```

### 阶段 5: 前端 UI

#### 5.1 卡片生成页面

创建 `app/[locale]/cards/generate/page.tsx`：

- 输入框：日文句子
- 选择器：卡片类型、牌组
- 复选框：包含发音
- 预览区域：显示生成的分析结果
- 按钮：生成预览、保存卡片

#### 5.2 卡片管理页面

创建 `app/[locale]/cards/page.tsx`：

- 卡片列表（支持筛选、搜索）
- 卡片详情（查看、编辑、删除）
- 批量操作（批量删除、导出）

#### 5.3 牌组管理

- 牌组列表
- 创建/删除牌组
- 牌组中的卡片列表

---

## 📦 依赖和配置

### 新增依赖

```json
{
  "dependencies": {
    // 如果需要 Node.js SDK
    // "@alicloud/dashscope": "^1.0.0",
    
    // Markdown 转 HTML
    "marked": "^11.0.0",
    "dompurify": "^3.0.0",
    
    // 音频处理（如果需要）
    "waveform-data": "^4.4.0"
  }
}
```

### 环境变量

```env
# DashScope API
DASHSCOPE_API_KEY=your-dashscope-api-key

# 云存储（用于存储音频文件）
# 选项 1: AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# 选项 2: 本地存储（开发环境）
AUDIO_STORAGE_PATH=./public/audio
```

---

## 🎯 优先级

### 高优先级（MVP）

1. ✅ 数据库 Schema（Card, Deck）
2. ✅ LLM 分析 API
3. ✅ 增强 TTS API
4. ✅ 卡片生成 API
5. ✅ 卡片生成页面 UI

### 中优先级

6. 卡片管理页面
7. 牌组管理
8. 批量生成功能

### 低优先级

9. 卡片导出（Anki 格式）
10. 时间戳对齐优化
11. ASR 功能（音频转文字）

---

## 📝 注意事项

1. **Credit 消耗**：
   - LLM 分析：2 credits
   - TTS 生成：1 credit
   - 完整卡片生成：3 credits

2. **音频存储**：
   - 生产环境建议使用云存储（S3、OSS 等）
   - 开发环境可以使用本地存储

3. **时间戳对齐**：
   - 如果假名与原文不同，需要对齐时间戳
   - 这是一个复杂的功能，可以先实现基础版本

4. **性能优化**：
   - LLM 和 TTS 调用可能较慢，考虑使用队列（如 BullMQ）
   - 实现缓存机制（相同文本不重复生成）

5. **错误处理**：
   - API 调用失败时的重试机制
   - 用户友好的错误提示

---

## 🚀 开始实现

建议按照以下顺序实现：

1. **第一步**：更新数据库 Schema，创建 Card 和 Deck 模型
2. **第二步**：实现 LLM 分析 API
3. **第三步**：实现增强 TTS API
4. **第四步**：实现卡片生成 API
5. **第五步**：创建前端 UI

每一步完成后进行测试，确保功能正常后再进行下一步。

