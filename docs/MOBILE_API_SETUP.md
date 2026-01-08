# 移动端 API 接入指南

## 概述

Next.js 后端已经完全 API 化，所有核心功能都通过 REST API 暴露，支持移动端（Android/iOS）调用。

## 核心 API 端点

### 1. 认证 API

#### 登录
```
POST /api/mobile/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
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
      "credits": 100
    }
  }
}
```

#### 注册
```
PUT /api/mobile/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "code": "verification_code"
}
```

### 2. TTS API

#### 生成 TTS 音频
```
POST /api/tts/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "こんにちは"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "audio": "base64_encoded_audio",
    "format": "mp3",
    "credits": 99
  }
}
```

### 3. 卡片生成 API

#### 生成卡片
```
POST /api/cards/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "こんにちは",
  "cardType": "问答题（附翻转卡片）",
  "deckName": "default",
  "includePronunciation": true
}
```

### 4. 卡片列表 API（历史记录）

#### 获取卡片列表
```
GET /api/cards?page=1&limit=20&deck=default&search=keyword
Authorization: Bearer <token>
```

响应：
```json
{
  "success": true,
  "data": {
    "cards": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 认证方式

### Bearer Token（推荐）

所有需要认证的 API 请求都需要在 Header 中添加：
```
Authorization: Bearer <your_jwt_token>
```

### 匿名用户（临时用户）

对于未登录用户，可以在 Header 中添加：
```
X-Anonymous-Id: <uuid>
```

首次使用时，服务端会自动创建匿名用户并返回 `anonymousId`。

## CORS 配置

所有 API 路由已配置 CORS，允许来自任何域的请求：
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Anonymous-Id`

## Android 集成示例

### 1. 使用 Retrofit (Kotlin)

```kotlin
// ApiService.kt
interface ApiService {
    @POST("/api/mobile/auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<LoginData>
    
    @POST("/api/tts/generate")
    suspend fun generateTTS(
        @Header("Authorization") token: String,
        @Body request: TTSRequest
    ): ApiResponse<TTSData>
    
    @POST("/api/cards/generate")
    suspend fun generateCard(
        @Header("Authorization") token: String,
        @Body request: CardGenerateRequest
    ): ApiResponse<CardData>
    
    @GET("/api/cards")
    suspend fun getCards(
        @Header("Authorization") token: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int,
        @Query("search") search: String?
    ): ApiResponse<CardsResponse>
}

// 使用
val retrofit = Retrofit.Builder()
    .baseUrl("https://www.nihogogpt.com")
    .addConverterFactory(GsonConverterFactory.create())
    .build()

val apiService = retrofit.create(ApiService::class.java)

// 登录
val loginResponse = apiService.login(LoginRequest(email, password))
val token = loginResponse.data.token

// 使用 Token 调用 API
val ttsResponse = apiService.generateTTS("Bearer $token", TTSRequest(text))
```

### 2. 使用 OkHttp (Kotlin)

```kotlin
val client = OkHttpClient()

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

val loginResponse = client.newCall(loginRequest).execute()
val loginData = JSONObject(loginResponse.body?.string() ?: "")
val token = loginData.getJSONObject("data").getString("token")

// 使用 Token
val ttsRequest = Request.Builder()
    .url("https://www.nihogogpt.com/api/tts/generate")
    .addHeader("Authorization", "Bearer $token")
    .post(jsonRequestBody("""
        {
            "text": "こんにちは"
        }
    """))
    .build()

val ttsResponse = client.newCall(ttsRequest).execute()
```

## 错误处理

所有 API 返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credits",
    "details": {
      "credits": 0,
      "required": 3
    }
  }
}
```

常见错误码：
- `UNAUTHORIZED` (401): 未授权，需要登录
- `INSUFFICIENT_CREDITS` (402): Credits 不足
- `NOT_FOUND` (404): 资源不存在
- `BAD_REQUEST` (400): 请求参数错误

## 注意事项

1. **Token 存储**：建议使用 Android 的 `SharedPreferences` 或 `EncryptedSharedPreferences` 存储 token
2. **Token 刷新**：当前 token 有效期为 30 天，过期后需要重新登录
3. **匿名用户**：首次启动时生成 UUID 作为 `anonymousId`，存储在本地
4. **错误重试**：建议实现指数退避的重试机制
5. **网络超时**：建议设置合理的超时时间（如 30 秒）

## 测试 API

可以使用 curl 或 Postman 测试 API：

```bash
# 登录
curl -X POST https://www.nihogogpt.com/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 使用 Token 调用 API
curl -X POST https://www.nihogogpt.com/api/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"text":"こんにちは"}'
```

## 完整 API 文档

详细 API 文档请参考：[docs/API.md](API.md)

