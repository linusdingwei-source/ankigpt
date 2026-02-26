import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// 获取单个来源详情（包括内容）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);

    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log(`[GET /api/sources/${id}] Fetching source details`);

    const source = await prisma.source.findFirst({
      where: {
        id,
        userId, // 确保只能访问自己的来源
      },
      select: {
        id: true,
        name: true,
        type: true,
        content: true, // 包含内容
        contentUrl: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Source not found'),
        { status: 404 }
      );
    }

    // 如果内容存储在 contentUrl 中，且类型是 text，尝试从 URL 获取
    let finalContent = source.content;
    if (!finalContent && source.contentUrl && source.type === 'text') {
      try {
        const response = await fetch(source.contentUrl);
        if (response.ok) {
          finalContent = await response.text();
        }
      } catch (error) {
        console.error('Failed to fetch content from URL:', error);
        // 如果获取失败，使用数据库中的 content（可能为空）
      }
    }

    return NextResponse.json(
      successResponse({ 
        source: {
          ...source,
          content: finalContent || source.content,
        }
      })
    );
  } catch (error) {
    console.error('Get source error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch source'),
      { status: 500 }
    );
  }
}

// 更新来源（重命名等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);

    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, folderId } = body;

    // 验证来源是否存在且属于当前用户
    const existingSource = await prisma.source.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingSource) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Source not found'),
        { status: 404 }
      );
    }

    // 更新来源
    const updateData: { name?: string; folderId?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          errorResponse(ErrorCodes.BAD_REQUEST, 'Source name cannot be empty'),
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    
    // 支持移动到目录（folderId 为 null 表示移动到根目录）
    if (folderId !== undefined) {
      if (folderId !== null) {
        // 验证目录是否存在且属于当前用户
        const folder = await prisma.sourceFolder.findFirst({
          where: { id: folderId, userId },
        });
        if (!folder) {
          return NextResponse.json(
            errorResponse(ErrorCodes.NOT_FOUND, 'Folder not found'),
            { status: 404 }
          );
        }
      }
      updateData.folderId = folderId;
    }

    const source = await prisma.source.update({
      where: { id },
      data: updateData,
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
      successResponse({ source })
    );
  } catch (error) {
    console.error('Update source error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update source'),
      { status: 500 }
    );
  }
}

// 删除来源
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);

    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { id } = await params;
    const url = new URL(request.url);
    const deleteCards = url.searchParams.get('deleteCards') === 'true';
    const checkOnly = url.searchParams.get('checkOnly') === 'true';

    // 验证来源是否存在且属于当前用户
    const existingSource = await prisma.source.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingSource) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Source not found'),
        { status: 404 }
      );
    }

    // 查询关联的卡片数量
    const cardCount = await prisma.card.count({
      where: {
        sourceId: id,
        userId,
      },
    });

    // 如果只是检查，返回关联卡片数量
    if (checkOnly) {
      return NextResponse.json(
        successResponse({ cardCount, sourceName: existingSource.name })
      );
    }

    // 如果选择同时删除卡片
    if (deleteCards && cardCount > 0) {
      await prisma.card.deleteMany({
        where: {
          sourceId: id,
          userId,
        },
      });
    }

    // 删除来源
    await prisma.source.delete({
      where: { id },
    });

    return NextResponse.json(
      successResponse({ 
        message: 'Source deleted successfully',
        deletedCards: deleteCards ? cardCount : 0,
      })
    );
  } catch (error) {
    console.error('Delete source error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete source'),
      { status: 500 }
    );
  }
}
