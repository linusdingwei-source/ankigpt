import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits } from '@/lib/credits';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id as string;
    const credits = await getCredits(userId);

    return NextResponse.json({ credits });
  } catch (error) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      { error: 'Failed to get credits' },
      { status: 500 }
    );
  }
}

