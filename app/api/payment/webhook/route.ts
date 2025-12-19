import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { addCredits } from '@/lib/credits';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Webhook: Missing stripe-signature header');
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook: STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', {
      message: err.message,
      type: err.type,
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle different event types
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process if payment is successful
      if (session.payment_status !== 'paid') {
        console.log(`Payment not completed for session ${session.id}, status: ${session.payment_status}`);
        return NextResponse.json({ received: true });
      }

      const userId = session.metadata?.userId;
      const packageId = session.metadata?.packageId;
      const totalCredits = parseInt(session.metadata?.credits || '0');
      const baseCredits = parseInt(session.metadata?.baseCredits || '0');
      const bonusCredits = parseInt(session.metadata?.bonusCredits || '0');

      if (!userId || !packageId || !totalCredits) {
        console.error('Missing metadata in session:', session.metadata);
        return NextResponse.json({ received: true });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.error(`User not found: ${userId}`);
        return NextResponse.json({ received: true });
      }

      // Check if order already exists (idempotency)
      const existingOrder = await prisma.order.findUnique({
        where: { stripeId: session.id },
      });

      if (existingOrder) {
        console.log(`Order already processed: ${session.id}`);
        return NextResponse.json({ received: true });
      }

      // Get package details
      const packages = [
        { id: 'starter', price: 5 },
        { id: 'pro', price: 20 },
        { id: 'premium', price: 100 },
      ];
      const selectedPackage = packages.find(p => p.id === packageId);
      const amount = selectedPackage ? selectedPackage.price * 100 : session.amount_total || 0;

      // Create order record
      await prisma.order.create({
        data: {
          userId,
          stripeId: session.id,
          amount,
          credits: totalCredits,
          status: 'completed',
        },
      });

      // Add credits to user (includes bonus)
      await addCredits(userId, totalCredits);

      console.log(`✅ Payment successful: Added ${totalCredits} credits (${baseCredits} base + ${bonusCredits} bonus) to user ${userId}`);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.error('❌ Payment failed:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        lastPaymentError: paymentIntent.last_payment_error,
      });

      // Update order status if exists
      if (paymentIntent.metadata?.userId && paymentIntent.metadata?.packageId) {
        // Try to find order by payment intent
        const orders = await prisma.order.findMany({
          where: {
            userId: paymentIntent.metadata.userId,
            status: 'pending',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });

        if (orders.length > 0) {
          await prisma.order.update({
            where: { id: orders[0].id },
            data: { status: 'failed' },
          });
        }
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.error('❌ Async payment failed:', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        userId: session.metadata?.userId,
      });

      // Update order status
      if (session.metadata?.userId) {
        const order = await prisma.order.findUnique({
          where: { stripeId: session.id },
        });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'failed' },
          });
        }
      }
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error('Error processing webhook event:', {
      type: event.type,
      error: error.message,
      stack: error.stack,
    });
    // Don't return error to Stripe, just log it
    // Stripe will retry if we return 5xx
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

