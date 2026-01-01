/**
 * 云存储工具函数
 * 支持多种云存储服务：Vercel Blob、阿里云 OSS、AWS S3、Cloudflare R2
 */

export interface StorageConfig {
  provider: 'vercel-blob' | 'aliyun-oss' | 'aws-s3' | 'cloudflare-r2';
  // Vercel Blob 配置
  vercelBlobToken?: string;
  // 阿里云 OSS 配置
  ossRegion?: string;
  ossBucket?: string;
  ossAccessKeyId?: string;
  ossAccessKeySecret?: string;
  // AWS S3 配置
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  // Cloudflare R2 配置
  r2AccountId?: string;
  r2Bucket?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

/**
 * 上传文件到云存储
 */
export async function uploadToStorage(
  fileBuffer: Buffer,
  filename: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  const provider = (process.env.STORAGE_PROVIDER || 'vercel-blob') as StorageConfig['provider'];

  // 使用动态导入，只在需要时加载对应的存储模块
  switch (provider) {
    case 'vercel-blob': {
      const { uploadToVercelBlob } = await import('./storage/vercel-blob');
      return uploadToVercelBlob(fileBuffer, filename, contentType);
    }
    case 'aliyun-oss': {
      const { uploadToAliyunOSS } = await import('./storage/aliyun-oss');
      return uploadToAliyunOSS(fileBuffer, filename, contentType);
    }
    case 'aws-s3': {
      const { uploadToAWSS3 } = await import('./storage/aws-s3');
      return uploadToAWSS3(fileBuffer, filename, contentType);
    }
    case 'cloudflare-r2': {
      const { uploadToCloudflareR2 } = await import('./storage/cloudflare-r2');
      return uploadToCloudflareR2(fileBuffer, filename, contentType);
    }
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

