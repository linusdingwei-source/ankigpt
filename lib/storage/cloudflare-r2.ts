import type { UploadResult } from '../storage';

export async function uploadToCloudflareR2(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 使用 require 动态加载，避免 webpack 在构建时检查
  // R2 使用 S3 兼容的 API
  let S3Client, PutObjectCommand;
  try {
    // 使用 Function 构造器来避免 webpack 静态分析
    const requireModule = new Function('moduleName', 'return require(moduleName)');
    const s3Module = requireModule('@aws-sdk/client-s3');
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

