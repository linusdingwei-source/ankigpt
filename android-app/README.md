# AnkiGPT Android App

AnkiGPT 的 Android 原生应用，使用 Kotlin 开发。

## 功能特性

- ✅ 用户登录/注册
- ✅ TTS 文本转语音生成
- ✅ 卡片生成
- ✅ 卡片列表查看（历史记录）
- ✅ Bearer Token 认证
- ✅ 安全 Token 存储（DataStore）

## 技术栈

- **语言**: Kotlin
- **架构**: MVVM (Model-View-ViewModel)
- **网络**: Retrofit + OkHttp
- **依赖注入**: 手动 Factory
- **数据存储**: DataStore
- **UI**: Material Design Components
- **异步**: Kotlin Coroutines + Flow

## 项目结构

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/ankigpt/
│   │   │   ├── data/
│   │   │   │   ├── api/          # API 服务接口
│   │   │   │   ├── model/        # 数据模型
│   │   │   │   └── repository/   # Repository 层
│   │   │   ├── ui/
│   │   │   │   ├── fragment/     # Fragment
│   │   │   │   ├── viewmodel/    # ViewModel
│   │   │   │   └── adapter/      # RecyclerView Adapter
│   │   │   └── util/             # 工具类
│   │   └── res/                  # 资源文件
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## 配置

### 1. 更新 API Base URL

在 `app/src/main/java/com/ankigpt/data/api/RetrofitClient.kt` 中更新：

```kotlin
private const val BASE_URL = "https://your-domain.vercel.app"
```

### 2. 构建项目

```bash
cd android-app
./gradlew build
```

### 3. 运行

使用 Android Studio 打开项目并运行，或使用命令行：

```bash
./gradlew installDebug
```

## API 端点

所有 API 端点都支持 Bearer Token 认证：

- `POST /api/auth/mobile/login` - 登录
- `PUT /api/auth/mobile/register` - 注册
- `POST /api/tts/generate` - TTS 生成
- `POST /api/cards/generate` - 卡片生成
- `GET /api/cards` - 卡片列表

详细 API 文档请参考：[../docs/API.md](../docs/API.md)

## 依赖

- AndroidX Core KTX
- Material Design Components
- Retrofit 2.9.0
- OkHttp 4.12.0
- Gson
- DataStore
- Lifecycle & ViewModel
- Navigation Component

## 注意事项

1. **Token 管理**: Token 使用 DataStore 安全存储
2. **网络请求**: 所有网络请求都在协程中执行
3. **错误处理**: 统一的错误处理机制
4. **UI 状态**: 使用 StateFlow 管理 UI 状态

## 待实现功能

- [ ] 注册页面
- [ ] 卡片详情页面
- [ ] 卡片编辑/删除
- [ ] 牌组管理
- [ ] 用户信息页面
- [ ] Credits 显示
- [ ] 音频播放优化
- [ ] 离线缓存

## 开发指南

### 添加新的 API 端点

1. 在 `ApiService.kt` 中添加接口方法
2. 在对应的 Repository 中实现调用逻辑
3. 在 ViewModel 中暴露给 UI
4. 在 Fragment/Activity 中使用

### 添加新的 Fragment

1. 创建 Fragment 类
2. 创建布局 XML
3. 创建对应的 ViewModel
4. 在 MainActivity 中添加导航

## License

MIT

