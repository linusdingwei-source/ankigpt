# Android App 设置指南

## 前置要求

1. **Android Studio** (最新版本，推荐 Hedgehog 或更高)
2. **JDK 17** 或更高版本
3. **Android SDK** (API Level 24+)

## 快速开始

### 1. 克隆项目

```bash
cd /path/to/ankigpt-intel
```

### 2. 配置 Android SDK

在 Android Studio 中：
1. 打开 `android-app` 目录
2. 等待 Gradle 同步完成
3. 如果提示缺少 SDK，按照提示安装

或者手动创建 `local.properties` 文件：

```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### 3. API Base URL 配置

API Base URL 已配置为生产环境：`https://www.nihogogpt.com`

如需修改，编辑 `app/src/main/java/com/ankigpt/data/api/RetrofitClient.kt`：

```kotlin
private const val BASE_URL = "https://www.nihogogpt.com"
```

**可用域名：**
- 主域名：`https://www.nihogogpt.com` (已配置)
- Vercel 域名：`https://ankigpt-kappa.vercel.app`
- 部署域名：`https://ankigpt-a94bjse7a-linus-dingweis-projects.vercel.app`

### 4. 构建项目

在 Android Studio 中：
- 点击 "Sync Project with Gradle Files"
- 等待依赖下载完成
- 点击 "Run" 按钮

或使用命令行：

```bash
cd android-app
./gradlew build
```

### 5. 运行应用

- 连接 Android 设备或启动模拟器
- 在 Android Studio 中点击 "Run" 按钮

## 项目结构

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/ankigpt/
│   │   │   ├── data/          # 数据层
│   │   │   │   ├── api/       # API 接口
│   │   │   │   ├── model/     # 数据模型
│   │   │   │   └── repository/# Repository
│   │   │   ├── ui/            # UI 层
│   │   │   │   ├── fragment/  # Fragment
│   │   │   │   ├── viewmodel/ # ViewModel
│   │   │   │   └── adapter/   # Adapter
│   │   │   └── util/          # 工具类
│   │   └── res/               # 资源文件
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## 功能说明

### 已实现功能

1. **登录/注册**
   - 密码登录
   - 验证码登录（待完善）
   - Token 自动保存

2. **TTS 生成**
   - 文本输入
   - 音频生成
   - 音频播放

3. **卡片生成**
   - 日文文本输入
   - 卡片生成
   - 预览显示

4. **卡片列表**
   - 卡片列表展示
   - 搜索功能
   - 分页加载

## 开发指南

### 添加新的 API 端点

1. 在 `data/api/ApiService.kt` 中添加接口方法
2. 在对应的 Repository 中实现调用逻辑
3. 在 ViewModel 中暴露给 UI
4. 在 Fragment/Activity 中使用

示例：

```kotlin
// 1. ApiService.kt
@GET("/api/user/profile")
suspend fun getProfile(
    @Header("Authorization") token: String
): Response<ApiResponse<UserProfile>>

// 2. UserRepository.kt
suspend fun getProfile(token: String): Result<UserProfile> {
    // 实现逻辑
}

// 3. UserViewModel.kt
fun loadProfile() {
    viewModelScope.launch {
        // 调用 Repository
    }
}

// 4. ProfileFragment.kt
viewModel.loadProfile()
```

### 添加新的 Fragment

1. 创建 Fragment 类
2. 创建布局 XML
3. 创建对应的 ViewModel
4. 在 MainActivity 中添加导航

## 常见问题

### 1. Gradle 同步失败

**问题**: 依赖下载失败

**解决**:
- 检查网络连接
- 配置代理（如果需要）
- 清除 Gradle 缓存：`./gradlew clean`

### 2. 找不到 SDK

**问题**: `SDK location not found`

**解决**:
- 创建 `local.properties` 文件
- 设置正确的 `sdk.dir` 路径

### 3. API 调用失败

**问题**: 网络请求失败

**解决**:
- 检查 `BASE_URL` 是否正确
- 检查网络权限是否已添加
- 检查 CORS 配置（后端）

### 4. Token 获取失败

**问题**: `getTokenSync()` 返回 null

**解决**:
- 确保用户已登录
- 检查 DataStore 是否正常工作
- 查看 Logcat 日志

## 调试

### 查看日志

在 Android Studio 的 Logcat 中查看日志：

```bash
# 过滤 AnkiGPT 相关日志
adb logcat | grep AnkiGPT
```

### 网络请求日志

Retrofit 已配置 `HttpLoggingInterceptor`，可以在 Logcat 中查看所有网络请求。

### 调试 Token

在代码中添加日志：

```kotlin
lifecycleScope.launch {
    val token = tokenManager.getTokenSync()
    Log.d("Token", "Token: $token")
}
```

## 下一步

- [ ] 实现注册页面
- [ ] 添加卡片详情页面
- [ ] 实现卡片编辑/删除
- [ ] 添加牌组管理
- [ ] 优化 UI/UX
- [ ] 添加单元测试
- [ ] 添加 UI 测试

## 参考文档

- [API 文档](../docs/API.md)
- [移动端接入指南](../docs/MOBILE_API_SETUP.md)
- [Android 官方文档](https://developer.android.com/)

