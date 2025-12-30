import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe, packages } from '@/lib/stripe';
import { getLocaleFromRequest, buildLocalizedPath } from '@/lib/locale-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { packageId } = await request.json();

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    const selectedPackage = packages.find(p => p.id === packageId);
    if (!selectedPackage) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      );
    }

    if (!selectedPackage.priceId) {
      return NextResponse.json(
        { error: 'Package price not configured. Please set STRIPE_PRICE_ID environment variables.' },
        { status: 500 }
      );
    }

    // Get locale from request
    const locale = getLocaleFromRequest(request);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPackage.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}${buildLocalizedPath(locale, 'payment/success')}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${buildLocalizedPath(locale, 'payment/cancel')}`,
      metadata: {
        userId: session.user.id as string,
        packageId: selectedPackage.id,
        credits: selectedPackage.totalCredits.toString(), // 包含赠送的credits
        baseCredits: selectedPackage.credits.toString(),
        bonusCredits: selectedPackage.bonusCredits.toString(),
      },
      payment_intent_data: {
        metadata: {
          userId: session.user.id as string,
          packageId: selectedPackage.id,
        },
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

