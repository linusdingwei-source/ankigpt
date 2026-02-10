import { put } from '@vercel/blob';
import type { UploadResult } from '../storage';

export async function uploadToVercelBlob(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  // 直接使用传入的文件名，它已经在上层处理过唯一性和路径了
  const uniqueFilename = filename;

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

