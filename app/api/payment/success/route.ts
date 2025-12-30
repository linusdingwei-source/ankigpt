import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify the session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Return payment status as JSON instead of redirecting
    // The client-side page will handle the display and redirect
    return NextResponse.json({ 
      success: checkoutSession.payment_status === 'paid',
      status: checkoutSession.payment_status,
      sessionId: sessionId,
      message: checkoutSession.payment_status === 'paid' 
        ? 'Payment successful' 
        : 'Payment status: ' + checkoutSession.payment_status 
    });
  } catch (error) {
    console.error('Payment success check error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

