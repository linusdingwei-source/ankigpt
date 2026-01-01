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

  switch (provider) {
    case 'vercel-blob':
      return uploadToVercelBlob(fileBuffer, filename, contentType);
    case 'aliyun-oss':
      return uploadToAliyunOSS(fileBuffer, filename, contentType);
    case 'aws-s3':
      return uploadToAWSS3(fileBuffer, filename, contentType);
    case 'cloudflare-r2':
      return uploadToCloudflareR2(fileBuffer, filename, contentType);
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

/**
 * 上传到 Vercel Blob Storage
 */
async function uploadToVercelBlob(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 动态导入 @vercel/blob，避免在构建时出错
  const { put } = await import('@vercel/blob');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  // 生成唯一文件名
  const timestamp = Date.now();
  const uniqueFilename = `audio/${timestamp}-${filename}`;

  const blob = await put(uniqueFilename, fileBuffer, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    url: blob.url,
    filename: uniqueFilename,
    size: fileBuffer.length,
  };
}

/**
 * 上传到阿里云 OSS
 */
async function uploadToAliyunOSS(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 动态导入，避免构建时错误
  let OSS;
  try {
    const ossModule = await import('ali-oss');
    OSS = ossModule.default || ossModule;
  } catch (error) {
    throw new Error('ali-oss package is not installed. Run: npm install ali-oss');
  }

  if (!process.env.OSS_REGION || !process.env.OSS_BUCKET || 
      !process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
    throw new Error('Aliyun OSS configuration is incomplete');
  }

  const client = new OSS({
    region: process.env.OSS_REGION,
    bucket: process.env.OSS_BUCKET,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  });

  const timestamp = Date.now();
  const uniqueFilename = `audio/${timestamp}-${filename}`;

  const result = await client.put(uniqueFilename, fileBuffer, {
    contentType,
  });

  return {
    url: result.url,
    filename: uniqueFilename,
    size: fileBuffer.length,
  };
}

/**
 * 上传到 AWS S3
 */
async function uploadToAWSS3(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 动态导入，避免构建时错误
  let S3Client, PutObjectCommand;
  try {
    const s3Module = await import('@aws-sdk/client-s3');
    S3Client = s3Module.S3Client;
    PutObjectCommand = s3Module.PutObjectCommand;
  } catch (error) {
    throw new Error('@aws-sdk/client-s3 package is not installed. Run: npm install @aws-sdk/client-s3');
  }

  if (!process.env.S3_REGION || !process.env.S3_BUCKET || 
      !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('AWS S3 configuration is incomplete');
  }

  const s3Client = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  const timestamp = Date.now();
  const uniqueFilename = `audio/${timestamp}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: uniqueFilename,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);

  const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${uniqueFilename}`;

  return {
    url,
    filename: uniqueFilename,
    size: fileBuffer.length,
  };
}

/**
 * 上传到 Cloudflare R2
 */
async function uploadToCloudflareR2(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 动态导入，避免构建时错误
  // R2 使用 S3 兼容的 API
  let S3Client, PutObjectCommand;
  try {
    const s3Module = await import('@aws-sdk/client-s3');
    S3Client = s3Module.S3Client;
    PutObjectCommand = s3Module.PutObjectCommand;
  } catch (error) {
    throw new Error('@aws-sdk/client-s3 package is not installed. Run: npm install @aws-sdk/client-s3');
  }

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET || 
      !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 configuration is incomplete');
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const timestamp = Date.now();
  const uniqueFilename = `audio/${timestamp}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: uniqueFilename,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // R2 的公共 URL 格式
  const publicUrl = process.env.R2_PUBLIC_URL || 
    `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${uniqueFilename}`;

  return {
    url: publicUrl,
    filename: uniqueFilename,
    size: fileBuffer.length,
  };
}

