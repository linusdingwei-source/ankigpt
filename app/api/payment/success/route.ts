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

    if (checkoutSession.payment_status === 'paid') {
      // Get locale from URL or default to 'zh'
      const pathname = request.nextUrl.pathname;
      const localeMatch = pathname.match(/^\/(zh|en|ja)/);
      const locale = localeMatch ? localeMatch[1] : 'zh';
      
      return NextResponse.redirect(new URL(`/${locale}/payment/success?session_id=${sessionId}`, request.url));
    } else if (checkoutSession.payment_status === 'unpaid' || checkoutSession.payment_status === 'no_payment_required') {
      // Payment failed or declined
      const pathname = request.nextUrl.pathname;
      const localeMatch = pathname.match(/^\/(zh|en|ja)/);
      const locale = localeMatch ? localeMatch[1] : 'zh';
      
      return NextResponse.redirect(new URL(`/${locale}/payment/cancel?error=payment_failed`, request.url));
    }

    return NextResponse.json({ 
      status: checkoutSession.payment_status,
      message: 'Payment status: ' + checkoutSession.payment_status 
    });
  } catch (error) {
    console.error('Payment success check error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

