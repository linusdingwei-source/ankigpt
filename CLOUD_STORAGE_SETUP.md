# 云存储服务配置指南

## 推荐的云存储服务（免费试用）

### 1. Vercel Blob Storage（推荐）⭐

**优势**：
- 与 Vercel 完美集成，无需额外配置
- 免费额度：每月 1GB 存储 + 100GB 带宽
- 设置简单，API 友好
- 全球 CDN 加速

**申请步骤**：
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目
3. 点击 **Storage** 标签页
4. 点击 **Create Database** 或 **Add Storage**
5. 选择 **Blob Storage**
6. 创建后，Vercel 会自动配置环境变量

**免费额度**：
- 存储：1GB/月
- 带宽：100GB/月
- 请求：无限

---

### 2. 阿里云 OSS（适合中国用户）

**优势**：
- 国内访问速度快
- 免费额度：每月 5GB 存储 + 5GB 流量
- 价格便宜，按量付费

**申请步骤**：
1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 注册/登录账号
3. 进入 **对象存储 OSS** 服务
4. 开通服务（需要实名认证）
5. 创建 Bucket（存储桶）
6. 获取 AccessKey ID 和 AccessKey Secret

**免费额度**：
- 存储：5GB/月
- 流量：5GB/月
- 请求：每月 100 万次

**配置信息**：
- Region（地域）：选择离你最近的区域，如 `oss-cn-hangzhou`
- Bucket 名称：自定义，如 `ankigpt-audio`
- AccessKey ID：从阿里云控制台获取
- AccessKey Secret：从阿里云控制台获取

---

### 3. AWS S3（全球用户）

**优势**：
- 全球通用，稳定可靠
- 免费额度：5GB 存储 + 20,000 GET 请求 + 2,000 PUT 请求
- 12 个月免费试用

**申请步骤**：
1. 访问 [AWS 官网](https://aws.amazon.com/)
2. 注册账号（需要信用卡，但免费套餐不会扣费）
3. 进入 **S3** 服务
4. 创建 Bucket
5. 创建 IAM 用户并获取 Access Key

**免费额度**（12 个月）：
- 存储：5GB
- 请求：20,000 GET + 2,000 PUT
- 流量：15GB 出站流量

---

### 4. Cloudflare R2（推荐）⭐

**优势**：
- 免费额度大：10GB 存储 + 100 万次 A 类操作/月
- 无出站流量费用（与 S3 兼容）
- 全球 CDN

**申请步骤**：
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 注册/登录账号
3. 进入 **R2** 服务
4. 创建 Bucket
5. 创建 API Token

**免费额度**：
- 存储：10GB/月
- A 类操作：100 万次/月
- B 类操作：1000 万次/月
- 出站流量：免费

---

## 快速选择建议

| 服务 | 免费额度 | 适合场景 | 难度 |
|------|---------|---------|------|
| **Vercel Blob** | 1GB/月 | 已在 Vercel 部署 | ⭐ 最简单 |
| **Cloudflare R2** | 10GB/月 | 需要大容量 | ⭐⭐ 简单 |
| **阿里云 OSS** | 5GB/月 | 中国用户 | ⭐⭐ 简单 |
| **AWS S3** | 5GB/月 | 全球用户 | ⭐⭐⭐ 中等 |

## 推荐方案

**如果你已经在使用 Vercel**：选择 **Vercel Blob Storage**，集成最简单。

**如果需要更大的免费额度**：选择 **Cloudflare R2**，10GB 免费存储。

**如果主要用户在中国**：选择 **阿里云 OSS**，访问速度快。

---

## 下一步

选择好云存储服务后，我会帮你：
1. 安装相应的 SDK
2. 配置环境变量
3. 实现音频上传功能
4. 更新代码以保存音频到云存储

请告诉我你选择哪个云存储服务！

