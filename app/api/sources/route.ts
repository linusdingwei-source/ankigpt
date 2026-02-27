import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// 获取用户的来源列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);

    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const sources = await prisma.source.findMany({
      where: { 
        userId,
        parentSourceId: null, // Only show root sources, not page images
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        folderId: true,
        contentUrl: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      successResponse({ sources })
    );
  } catch (error) {
    console.error('Get sources error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch sources'),
      { status: 500 }
    );
  }
}

// 创建新来源（上传文本内容到 Vercel Blob Storage）
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);

    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const parentSourceId = formData.get('parentSourceId') as string | null;
      const pageNumberStr = formData.get('pageNumber') as string | null;
      const pageNumber = pageNumberStr ? parseInt(pageNumberStr, 10) : null;
      
      if (!file) {
        return NextResponse.json(
          errorResponse(ErrorCodes.BAD_REQUEST, 'File is required'),
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `sources/${timestamp}-${safeName}`;
      console.log(`[POST /api/sources] Uploading file: ${filename}, type: ${file.type}, parentSourceId: ${parentSourceId}, pageNumber: ${pageNumber}`);

      let contentUrl: string | null = null;
      try {
        const uploadResult = await uploadToStorage(
          buffer,
          filename,
          file.type
        );
        contentUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('Failed to upload source file:', uploadError);
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file'),
          { status: 500 }
        );
      }

      const source = await prisma.source.create({
        data: {
          userId,
          name: file.name,
          type: file.type.startsWith('audio/') ? 'audio' : 
                file.type.startsWith('image/') ? 'image' : 'file',
          content: '', // 文件内容不直接存储在 content 字段
          contentUrl,
          size: file.size,
          mimeType: file.type,
          fileUrl: contentUrl, // 同时保存到 fileUrl
          fileName: file.name,
          parentSourceId: parentSourceId || null, // 关联父资源
          pageNumber: pageNumber || null, // PDF页码
        },
        select: {
          id: true,
          name: true,
          type: true,
          contentUrl: true,
          fileUrl: true,
          fileName: true,
          mimeType: true,
          size: true,
          parentSourceId: true,
          pageNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(successResponse({ source }));
    }

    const body = await request.json();
    const { name, content, type = 'text' } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Source name is required'),
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Source content is required'),
        { status: 400 }
      );
    }

    // 将文本内容转换为 Buffer 并上传到 Vercel Blob Storage
    const contentBuffer = Buffer.from(content, 'utf-8');
    const timestamp = Date.now();
    const filename = `sources/${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;

    let contentUrl: string | null = null;
    try {
      const uploadResult = await uploadToStorage(
        contentBuffer,
        filename,
        'text/plain; charset=utf-8'
      );
      contentUrl = uploadResult.url;
    } catch (uploadError) {
      console.error('Failed to upload source to storage:', uploadError);
      // 如果上传失败，仍然保存到数据库，但 contentUrl 为 null
      // 内容会保存在 content 字段中
    }

    // 创建来源记录
    const source = await prisma.source.create({
      data: {
        userId,
        name: name.trim(),
        type,
        content: content.trim(),
        contentUrl,
        size: contentBuffer.length,
        mimeType: 'text/plain; charset=utf-8',
      },
      select: {
        id: true,
        name: true,
        type: true,
        contentUrl: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      successResponse({ source })
    );
  } catch (error) {
    console.error('Create source error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create source'),
      { status: 500 }
    );
  }
}
