/**
 * Stripe Webhook Handler
 *
 * This endpoint receives webhook events from Stripe for:
 * - checkout.session.completed: User completed payment
 * - customer.subscription.created: New subscription activated
 * - customer.subscription.updated: Subscription changed (upgrade/downgrade)
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_failed: Payment failed
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret from Stripe Dashboard
 *
 * @see https://stripe.com/docs/webhooks
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

// Subscription tier mapping from Stripe price IDs
const PRICE_TO_TIER: Record<string, 'free' | 'pro' | 'business'> = {
  // Add your Stripe Price IDs here
  // Example: 'price_1234567890': 'pro',
  [process.env.STRIPE_PRICE_PRO || 'price_pro']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS || 'price_business']: 'business',
};

// In-memory store for demo (use Redis/DB in production)
// This maps Stripe customer IDs to subscription data
const subscriptionStore = new Map<string, {
  tier: 'free' | 'pro' | 'business';
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd: number;
}>();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get the raw body for signature verification
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    // Read raw body
    const rawBody = await getRawBody(req);

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook handler error: ${message}`);
    return res.status(500).json({ error: message });
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription ID in session');
    return;
  }

  // Fetch full subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionChange(subscription);

  console.log(`Checkout completed for customer ${customerId}`);
}

/**
 * Handle subscription create/update
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? PRICE_TO_TIER[priceId] || 'free' : 'free';

  subscriptionStore.set(customerId, {
    tier,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: (subscription as any).current_period_end,
  });

  console.log(`Subscription ${subscription.status} for customer ${customerId}: tier=${tier}`);

  // TODO: In production, save to database
  // await db.subscriptions.upsert({
  //   where: { customerId },
  //   update: { tier, status: subscription.status, ... },
  //   create: { customerId, tier, ... }
  // });
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Set to free tier
  subscriptionStore.set(customerId, {
    tier: 'free',
    customerId,
    subscriptionId: subscription.id,
    status: 'canceled',
    currentPeriodEnd: (subscription as any).current_period_end,
  });

  console.log(`Subscription cancelled for customer ${customerId}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  console.log(`Payment failed for customer ${customerId}`);

  // TODO: Send email notification, apply grace period, etc.
}

/**
 * Get raw request body for signature verification
 */
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}

// Export for testing
export { subscriptionStore, PRICE_TO_TIER };
