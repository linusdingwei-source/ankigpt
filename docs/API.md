# API 文档

本文档描述了 AnkiGPT 的 REST API，用于 Android 移动端和 Web 端调用。

## 基础信息

- **Base URL**: `https://www.nihogogpt.com` (生产环境) 或 `http://localhost:3000` (开发环境)
- **备用域名**: `https://ankigpt-kappa.vercel.app`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

## 认证方式

API 支持三种认证方式：

### 1. Bearer Token（推荐用于移动端）

在请求头中添加：
```
Authorization: Bearer <your_jwt_token>
```

### 2. Session Cookie（Web 端）

使用 NextAuth 的 session cookie（自动处理）

### 3. 匿名用户（临时用户）

在请求头中添加：
```
X-Anonymous-Id: <uuid>
```

首次使用时，服务端会自动创建匿名用户并返回 `anonymousId`。

## 统一响应格式

所有 API 响应都遵循以下格式：

### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      // 可选的详细信息
    }
  }
}
```

### 错误码

- `UNAUTHORIZED`: 未授权（401）
- `FORBIDDEN`: 禁止访问（403）
- `NOT_FOUND`: 资源不存在（404）
- `BAD_REQUEST`: 请求参数错误（400）
- `VALIDATION_ERROR`: 验证失败（400）
- `INSUFFICIENT_CREDITS`: Credits 不足（402）
- `INTERNAL_ERROR`: 服务器内部错误（500）
- `RATE_LIMIT_EXCEEDED`: 请求频率过高（429）
- `INVALID_TOKEN`: Token 无效（401）
- `TOKEN_EXPIRED`: Token 已过期（401）

## 认证 API

### 移动端登录

**POST** `/api/mobile/auth/login`

请求体：
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

或使用验证码登录：
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "image": "avatar_url",
      "credits": 100
    }
  }
}
```

### 移动端注册

**PUT** `/api/mobile/auth/register`

请求体：
```json
{
  "email": "user@example.com",
  "password": "password123",
  "code": "verification_code"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": null,
      "image": null,
      "credits": 2
    }
  }
}
```

### 获取当前 Session

**GET** `/api/mobile/auth/session`

需要认证：是（Bearer Token 或 Session Cookie）

响应：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "image": "avatar_url",
      "credits": 100
    }
  }
}
```

## 用户 API

### 获取 Credits

**GET** `/api/user/credits`

需要认证：是（Bearer Token、Session Cookie 或 X-Anonymous-Id）

响应：
```json
{
  "success": true,
  "data": {
    "credits": 100,
    "isAnonymous": false
  }
}
```

## TTS API

### 生成 TTS 音频

**POST** `/api/tts/generate`

需要认证：是

请求体：
```json
{
  "text": "こんにちは"
}
```

限制：
- 文本长度：最大 500 字符
- Credits 消耗：1 credit

响应：
```json
{
  "success": true,
  "data": {
    "audio": "base64_encoded_audio_data",
    "format": "mp3",
    "credits": 99
  }
}
```

### 生成增强 TTS（带云存储）

**POST** `/api/tts/generate-enhanced`

需要认证：是

请求体：
```json
{
  "text": "こんにちは",
  "kanaText": "こんにちは" // 可选，假名文本
}
```

响应：
```json
{
  "success": true,
  "data": {
    "audio": {
      "url": "https://storage.example.com/audio.mp3",
      "filename": "audio.mp3"
    },
    "credits": 99
  }
}
```

## LLM API

### 分析日文文本

**POST** `/api/llm/analyze`

需要认证：是

请求体：
```json
{
  "text": "こんにちは、元気ですか？"
}
```

限制：
- 文本长度：最大 1000 字符
- Credits 消耗：2 credits

响应：
```json
{
  "success": true,
  "data": {
    "analysis": {
      "markdown": "**中文翻译：**\n你好，你好吗？\n...",
      "html": "<p><strong>中文翻译：</strong><br>你好，你好吗？</p>...",
      "kanaText": "こんにちは、げんきですか？"
    },
    "credits": 98
  }
}
```

## 卡片 API

### 生成卡片

**POST** `/api/cards/generate`

需要认证：是

请求体：
```json
{
  "text": "こんにちは",
  "cardType": "问答题（附翻转卡片）",
  "deckName": "default",
  "includePronunciation": true
}
```

限制：
- Credits 消耗：3 credits（包含发音）或 2 credits（不包含发音）

响应：
```json
{
  "success": true,
  "data": {
    "card": {
      "id": "card_id",
      "frontContent": "こんにちは",
      "backContent": "<p>...</p>",
      "cardType": "问答题（附翻转卡片）",
      "audioUrl": "https://storage.example.com/audio.mp3",
      "timestamps": null,
      "kanaText": "こんにちは",
      "deckName": "default",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "credits": 97
  }
}
```

### 获取卡片列表

**GET** `/api/cards?page=1&limit=20&deck=default&search=keyword`

需要认证：是

查询参数：
- `page`: 页码（默认：1）
- `limit`: 每页数量（默认：20，最大：100）
- `deck`: 牌组名称（可选）
- `search`: 搜索关键词（可选，搜索正面和背面内容）

响应：
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "card_id",
        "frontContent": "こんにちは",
        "backContent": "<p>...</p>",
        "cardType": "问答题（附翻转卡片）",
        "audioUrl": "https://storage.example.com/audio.mp3",
        "audioFilename": "audio.mp3",
        "timestamps": null,
        "kanaText": "こんにちは",
        "deckName": "default",
        "tags": [],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 获取单个卡片

**GET** `/api/cards/[id]`

需要认证：是

响应：
```json
{
  "success": true,
  "data": {
    "card": {
      "id": "card_id",
      "frontContent": "こんにちは",
      "backContent": "<p>...</p>",
      // ... 其他字段
    }
  }
}
```

### 更新卡片

**PUT** `/api/cards/[id]`

需要认证：是

请求体：
```json
{
  "frontContent": "更新后的正面内容",
  "backContent": "更新后的背面内容",
  "cardType": "问答题（附翻转卡片）",
  "deckName": "default",
  "tags": ["tag1", "tag2"]
}
```

响应：
```json
{
  "success": true,
  "data": {
    "card": {
      // 更新后的卡片数据
    }
  }
}
```

### 删除卡片

**DELETE** `/api/cards/[id]`

需要认证：是

响应：
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

## 牌组 API

### 获取牌组列表

**GET** `/api/decks`

需要认证：是

响应：
```json
{
  "success": true,
  "data": {
    "decks": [
      {
        "id": "deck_id",
        "name": "default",
        "cardCount": 10,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 创建牌组

**POST** `/api/decks`

需要认证：是

请求体：
```json
{
  "name": "新牌组"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "deck": {
      "id": "deck_id",
      "name": "新牌组",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 使用示例

### Android (Kotlin) 示例

```kotlin
// 登录
val loginRequest = Request.Builder()
    .url("https://www.nihogogpt.com/api/mobile/auth/login")
    .post(jsonRequestBody("""
        {
            "email": "user@example.com",
            "password": "password123"
        }
    """))
    .build()

val response = client.newCall(loginRequest).execute()
val loginData = JSONObject(response.body?.string() ?: "")
val token = loginData.getJSONObject("data").getString("token")

// 使用 Token 调用 API
val ttsRequest = Request.Builder()
    .url("https://www.nihogogpt.com/api/tts/generate")
    .addHeader("Authorization", "Bearer $token")
    .post(jsonRequestBody("""
        {
            "text": "こんにちは"
        }
    """))
    .build()
```

### React Native 示例

```javascript
// 登录
const loginResponse = await fetch('https://www.nihogogpt.com/api/mobile/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// 使用 Token 调用 API
const ttsResponse = await fetch('https://www.nihogogpt.com/api/tts/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    text: 'こんにちは',
  }),
});

const ttsData = await ttsResponse.json();
const audioBase64 = ttsData.data.audio;
```

## CORS 配置

API 已配置 CORS，允许来自任何域的请求。生产环境建议限制允许的域名。

## 注意事项

1. **Credits 消耗**：
   - TTS 生成：1 credit
   - LLM 分析：2 credits
   - 卡片生成（不含发音）：2 credits
   - 卡片生成（含发音）：3 credits

2. **匿名用户**：
   - 首次使用自动创建，获得 50 个免费 credits
   - 注册后可以合并匿名用户的数据

3. **Token 有效期**：
   - JWT token 有效期为 30 天
   - Token 过期后需要重新登录

4. **错误处理**：
   - 所有错误都返回统一的错误格式
   - HTTP 状态码与错误类型对应

5. **限流**：
   - 目前未实施限流，但建议客户端实现请求重试和错误处理

## 支持

如有问题，请查看：
- 错误响应中的 `error.details` 字段
- 服务器日志（开发环境）
- GitHub Issues

