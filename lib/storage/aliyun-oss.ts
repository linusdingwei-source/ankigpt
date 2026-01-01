import type { UploadResult } from '../storage';

export async function uploadToAliyunOSS(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 动态导入，避免构建时错误
  let OSS;
  try {
    // 使用字符串形式的动态导入，避免 webpack 在构建时检查
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

