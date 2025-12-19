import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Package configurations with bonus credits
export const packages = [
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    credits: 5,
    bonusCredits: 2, // 额外赠送
    totalCredits: 7, // 5 + 2
    priceId: process.env.STRIPE_PRICE_ID_STARTER || '',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    credits: 20,
    bonusCredits: 10, // 额外赠送
    totalCredits: 30, // 20 + 10
    priceId: process.env.STRIPE_PRICE_ID_PRO || '',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 100,
    credits: 100,
    bonusCredits: 50, // 额外赠送
    totalCredits: 150, // 100 + 50
    priceId: process.env.STRIPE_PRICE_ID_PREMIUM || '',
  },
];

