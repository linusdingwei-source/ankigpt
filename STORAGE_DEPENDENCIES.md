# 云存储依赖说明

## 为什么这些依赖是可选的？

这些依赖（`ali-oss`、`@aws-sdk/client-s3`）是**可选的**，因为：

1. **默认使用 Vercel Blob Storage**
   - 项目默认使用 `@vercel/blob`（已安装）
   - 这是最简单的方案，与 Vercel 完美集成
   - 免费额度：1GB 存储 + 100GB 带宽/月

2. **其他存储服务是可选的**
   - 只有在需要使用其他云存储服务时才需要安装对应依赖
   - 例如：如果使用阿里云 OSS，才需要安装 `ali-oss`
   - 如果使用 AWS S3 或 Cloudflare R2，才需要安装 `@aws-sdk/client-s3`

## 当前配置

### 已安装的依赖
- ✅ `@vercel/blob` - Vercel Blob Storage（默认使用）

### 可选依赖（未安装）
- ⚠️ `ali-oss` - 仅在 `STORAGE_PROVIDER=aliyun-oss` 时需要
- ⚠️ `@aws-sdk/client-s3` - 仅在 `STORAGE_PROVIDER=aws-s3` 或 `cloudflare-r2` 时需要

## 如何安装可选依赖

### 如果需要使用阿里云 OSS

```bash
npm install ali-oss
```

然后在 Vercel 环境变量中设置：
```env
STORAGE_PROVIDER=aliyun-oss
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
```

### 如果需要使用 AWS S3

```bash
npm install @aws-sdk/client-s3
```

然后在 Vercel 环境变量中设置：
```env
STORAGE_PROVIDER=aws-s3
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
```

### 如果需要使用 Cloudflare R2

```bash
npm install @aws-sdk/client-s3
```

然后在 Vercel 环境变量中设置：
```env
STORAGE_PROVIDER=cloudflare-r2
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=your-bucket-name
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_PUBLIC_URL=https://your-domain.com  # 可选，自定义域名
```

## 推荐方案

**对于大多数用户**：使用 **Vercel Blob Storage**（默认）
- ✅ 无需安装额外依赖
- ✅ 设置最简单
- ✅ 免费额度足够个人项目使用

**如果需要更大容量**：使用 **Cloudflare R2**
- ✅ 10GB 免费存储
- ✅ 无出站流量费用
- ⚠️ 需要安装 `@aws-sdk/client-s3`

## 总结

- **当前配置**：使用 Vercel Blob Storage，不需要安装其他依赖
- **如果需要切换**：安装对应依赖并配置环境变量
- **构建不会失败**：即使这些依赖未安装，构建也会成功（因为使用了动态加载）

