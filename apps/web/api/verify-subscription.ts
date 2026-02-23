/**
 * Subscription Verification Endpoint
 *
 * This endpoint verifies a user's subscription status server-side.
 * Called by the client to validate subscription after Stripe checkout.
 *
 * Query Parameters:
 * - session_id: Stripe checkout session ID (from redirect URL)
 *
 * Returns:
 * - tier: 'free' | 'pro' | 'business'
 * - valid: boolean
 * - expiresAt: ISO date string
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Stripe API secret key
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

// Price ID to tier mapping (same as webhook handler)
const PRICE_TO_TIER: Record<string, 'free' | 'pro' | 'business'> = {
  [process.env.STRIPE_PRICE_PRO || 'price_pro']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS || 'price_business']: 'business',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://www.newlifesolutions.dev');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({
      valid: false,
      tier: 'free',
      error: 'Missing session_id parameter',
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return res.status(500).json({
      valid: false,
      tier: 'free',
      error: 'Server configuration error',
    });
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'subscription.default_payment_method'],
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(200).json({
        valid: false,
        tier: 'free',
        error: 'Payment not completed',
      });
    }

    // Get subscription details
    const subscription = session.subscription as Stripe.Subscription | null;

    if (!subscription) {
      return res.status(200).json({
        valid: false,
        tier: 'free',
        error: 'No subscription found',
      });
    }

    // Determine tier from price ID
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = priceId ? PRICE_TO_TIER[priceId] || 'pro' : 'pro';

    // Check subscription status
    const validStatuses = ['active', 'trialing'];
    const isValid = validStatuses.includes(subscription.status);

    // Calculate expiration
    const expiresAt = new Date((subscription as any).current_period_end * 1000).toISOString();

    return res.status(200).json({
      valid: isValid,
      tier: isValid ? tier : 'free',
      expiresAt: isValid ? expiresAt : null,
      customerId: session.customer,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Subscription verification error: ${message}`);

    // Check for specific Stripe errors
    if (err instanceof Stripe.errors.StripeError) {
      if (err.code === 'resource_missing') {
        return res.status(404).json({
          valid: false,
          tier: 'free',
          error: 'Session not found',
        });
      }
    }

    return res.status(500).json({
      valid: false,
      tier: 'free',
      error: 'Verification failed',
    });
  }
}
