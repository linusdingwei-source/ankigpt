import type { UploadResult } from '../storage';

export async function uploadToAWSS3(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 动态导入，避免构建时错误
  let S3Client, PutObjectCommand;
  try {
    // 使用字符串形式的动态导入，避免 webpack 在构建时检查
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

