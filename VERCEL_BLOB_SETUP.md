# Vercel Blob Storage 设置指南（推荐）

## 为什么选择 Vercel Blob Storage？

✅ **与 Vercel 完美集成  
✅ **设置最简单（5 分钟完成）  
✅ **免费额度：1GB 存储 + 100GB 带宽/月  
✅ **全球 CDN 加速  
✅ **无需额外配置域名或 CORS

## 设置步骤

### 步骤 1：在 Vercel Dashboard 创建 Blob Storage

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 `ankigpt`
3. 点击顶部的 **Storage** 标签页
4. 点击 **Create Database** 或 **Add Storage**
5. 选择 **Blob Storage**
6. 输入存储名称（例如：`ankigpt-audio`）
7. 选择区域（建议选择 `Hong Kong` 或离你最近的区域）
8. 点击 **Create**

### 步骤 2：获取访问令牌

创建 Blob Storage 后：

1. 在 Storage 页面，点击你创建的 Blob Storage
2. 点击 **Settings** 标签页
3. 在 **Tokens** 部分，点击 **Create Token**
4. 输入令牌名称（例如：`audio-upload-token`）
5. 选择权限：**Read and Write**
6. 点击 **Create**
7. **复制生成的令牌**（只显示一次，请妥善保存）

### 步骤 3：配置环境变量

在 Vercel Dashboard：

1. 进入项目 **Settings** > **Environment Variables**
2. 添加以下环境变量：

```env
# 云存储配置
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxx
```

**重要**：
- `STORAGE_PROVIDER` 设置为 `vercel-blob`
- `BLOB_READ_WRITE_TOKEN` 使用步骤 2 中复制的令牌

### 步骤 4：安装依赖

在项目根目录运行：

```bash
npm install @vercel/blob
```

### 步骤 5：部署

1. 提交代码到 GitHub
2. Vercel 会自动部署
3. 部署完成后，音频文件会自动上传到 Vercel Blob Storage

## 验证设置

部署完成后，测试音频生成功能：

1. 访问 Dashboard 页面
2. 输入日语文本并生成音频
3. 检查 Vercel 日志，应该看到：
   ```
   Audio uploaded to cloud storage: https://xxx.vercel-storage.com/audio/xxx.mp3
   ```

## 免费额度说明

**每月免费额度**：
- 存储：1GB
- 带宽：100GB
- 请求：无限

**超出后价格**：
- 存储：$0.15/GB/月
- 带宽：$0.15/GB

**估算**：
- 假设每个音频文件 100KB
- 1GB 可以存储约 10,000 个音频文件
- 对于个人项目，免费额度通常足够使用

## 故障排查

### 问题：`BLOB_READ_WRITE_TOKEN is not configured`

**解决方案**：
1. 检查 Vercel 环境变量中是否设置了 `BLOB_READ_WRITE_TOKEN`
2. 确认令牌权限是 **Read and Write**
3. 重新部署应用

### 问题：上传失败

**解决方案**：
1. 检查网络连接
2. 查看 Vercel 函数日志
3. 确认 Blob Storage 已创建且状态正常

### 问题：音频 URL 无法访问

**解决方案**：
1. 确认 Blob Storage 设置为 **Public** 访问
2. 检查 CORS 设置（Vercel Blob 默认允许所有来源）

## 下一步

设置完成后，音频文件将：
1. 从 DashScope 下载
2. 上传到 Vercel Blob Storage
3. 返回永久 URL 保存到数据库
4. 不再依赖 DashScope 的临时 URL

---

**提示**：如果免费额度不够用，可以考虑：
- 升级到 Vercel Pro（$20/月，包含更多存储）
- 切换到 Cloudflare R2（10GB 免费存储）
- 使用阿里云 OSS（5GB 免费存储）

