import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// Get child sources (page images) for a parent source (PDF)
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

    // Verify the parent source belongs to the user
    const parentSource = await prisma.source.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!parentSource) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Source not found'),
        { status: 404 }
      );
    }

    // Get child sources (page images)
    const sources = await prisma.source.findMany({
      where: { 
        userId,
        parentSourceId: id,
      },
      orderBy: { pageNumber: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        contentUrl: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        size: true,
        pageNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      successResponse({ sources })
    );
  } catch (error) {
    console.error('Get child sources error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch child sources'),
      { status: 500 }
    );
  }
}
