import type { UploadResult } from '../storage';

export async function uploadToAliyunOSS(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // 使用 require 动态加载，避免 webpack 在构建时检查
  let OSS;
  try {
    // 使用 Function 构造器来避免 webpack 静态分析
    const requireModule = new Function('moduleName', 'return require(moduleName)');
    const ossModule = requireModule('ali-oss');
    OSS = ossModule.default || ossModule;
  } catch {
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

