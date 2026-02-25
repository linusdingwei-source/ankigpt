import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// 更新目录（重命名等）
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
    const { name } = body;

    // 验证目录是否存在且属于当前用户
    const existingFolder = await prisma.sourceFolder.findFirst({
      where: { id, userId },
    });

    if (!existingFolder) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Folder not found'),
        { status: 404 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Folder name is required'),
        { status: 400 }
      );
    }

    // 检查同目录下是否存在同名目录
    const duplicateFolder = await prisma.sourceFolder.findFirst({
      where: {
        userId,
        name: name.trim(),
        parentId: existingFolder.parentId,
        id: { not: id },
      },
    });

    if (duplicateFolder) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Folder with this name already exists'),
        { status: 400 }
      );
    }

    const folder = await prisma.sourceFolder.update({
      where: { id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      successResponse({ folder })
    );
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update folder'),
      { status: 500 }
    );
  }
}

// 删除目录（同时删除子目录和移动资源到根目录）
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

    // 验证目录是否存在且属于当前用户
    const existingFolder = await prisma.sourceFolder.findFirst({
      where: { id, userId },
    });

    if (!existingFolder) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Folder not found'),
        { status: 404 }
      );
    }

    // 将该目录下的资源移到根目录
    await prisma.source.updateMany({
      where: { folderId: id, userId },
      data: { folderId: null },
    });

    // 递归获取所有子目录
    const getAllChildFolderIds = async (folderId: string): Promise<string[]> => {
      const children = await prisma.sourceFolder.findMany({
        where: { parentId: folderId, userId },
        select: { id: true },
      });
      
      const childIds = children.map(c => c.id);
      const grandchildIds = await Promise.all(
        childIds.map(cid => getAllChildFolderIds(cid))
      );
      
      return [...childIds, ...grandchildIds.flat()];
    };

    const allChildIds = await getAllChildFolderIds(id);
    
    // 将所有子目录下的资源移到根目录
    if (allChildIds.length > 0) {
      await prisma.source.updateMany({
        where: { folderId: { in: allChildIds }, userId },
        data: { folderId: null },
      });
    }

    // 删除所有子目录
    if (allChildIds.length > 0) {
      await prisma.sourceFolder.deleteMany({
        where: { id: { in: allChildIds } },
      });
    }

    // 删除目录本身
    await prisma.sourceFolder.delete({
      where: { id },
    });

    return NextResponse.json(
      successResponse({ message: 'Folder deleted successfully' })
    );
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete folder'),
      { status: 500 }
    );
  }
}
