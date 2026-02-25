import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// 获取所有目录
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

    const folders = await prisma.sourceFolder.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        _count: {
          select: { sources: true },
        },
      },
    });

    return NextResponse.json(
      successResponse({
        folders: folders.map(f => ({
          ...f,
          sourceCount: f._count.sources,
        })),
      })
    );
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch folders'),
      { status: 500 }
    );
  }
}

// 创建目录
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

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Folder name is required'),
        { status: 400 }
      );
    }

    // 如果指定了父目录，验证其存在
    if (parentId) {
      const parentFolder = await prisma.sourceFolder.findFirst({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        return NextResponse.json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Parent folder not found'),
          { status: 404 }
        );
      }
    }

    // 检查同目录下是否存在同名目录
    const existingFolder = await prisma.sourceFolder.findFirst({
      where: {
        userId,
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Folder with this name already exists'),
        { status: 400 }
      );
    }

    const folder = await prisma.sourceFolder.create({
      data: {
        userId,
        name: name.trim(),
        parentId: parentId || null,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      successResponse({ folder }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create folder'),
      { status: 500 }
    );
  }
}
