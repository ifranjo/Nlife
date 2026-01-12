/**
 * Subscription Management - Client-side MVP
 *
 * WARNING: This is a client-side implementation using localStorage.
 * It is NOT secure and can be bypassed. For MVP/validation only.
 * For production, use Stripe Webhooks + server-side verification.
 *
 * Tiers:
 * - free: Default, limited usage
 * - pro: $7/mo, unlimited usage
 * - business: $19/mo, team features (future)
 */

export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  activatedAt: string | null;
  expiresAt: string | null;
  stripeSessionId: string | null;
}

const STORAGE_KEY = 'nls_subscription';

/**
 * Get current subscription status
 */
export function getSubscription(): SubscriptionStatus {
  if (typeof window === 'undefined') {
    return getDefaultStatus();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultStatus();

    const parsed = JSON.parse(stored) as SubscriptionStatus;

    // Check if subscription expired
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      // Subscription expired, reset to free
      const expired = getDefaultStatus();
      saveSubscription(expired);
      return expired;
    }

    return parsed;
  } catch {
    return getDefaultStatus();
  }
}

/**
 * Check if user has pro or higher tier
 */
export function isPro(): boolean {
  const sub = getSubscription();
  return sub.tier === 'pro' || sub.tier === 'business';
}

/**
 * Check if user has business tier
 */
export function isBusiness(): boolean {
  const sub = getSubscription();
  return sub.tier === 'business';
}

/**
 * Activate subscription (called after successful Stripe checkout)
 */
export function activateSubscription(
  tier: SubscriptionTier,
  stripeSessionId: string | null = null,
  durationDays: number = 30
): void {
  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const status: SubscriptionStatus = {
    tier,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    stripeSessionId,
  };

  saveSubscription(status);

  // Dispatch event for components to react
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('subscription-changed', { detail: status }));
  }
}

/**
 * Cancel/downgrade subscription
 */
export function cancelSubscription(): void {
  saveSubscription(getDefaultStatus());

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('subscription-changed', { detail: getDefaultStatus() }));
  }
}

/**
 * Get tier-specific limits
 */
export function getTierLimits(tier: SubscriptionTier = getSubscription().tier) {
  const limits = {
    free: {
      maxFileSizeMB: 10,
      dailyOperationsPerTool: 5,
      batchProcessing: false,
      watermark: true,
      priority: false,
    },
    pro: {
      maxFileSizeMB: 100,
      dailyOperationsPerTool: Infinity,
      batchProcessing: true,
      watermark: false,
      priority: true,
    },
    business: {
      maxFileSizeMB: 500,
      dailyOperationsPerTool: Infinity,
      batchProcessing: true,
      watermark: false,
      priority: true,
    },
  };

  return limits[tier];
}

/**
 * Check daily usage for a tool (free tier limit)
 */
export function checkDailyUsage(toolId: string): { allowed: boolean; remaining: number } {
  if (isPro()) {
    return { allowed: true, remaining: Infinity };
  }

  const today = new Date().toISOString().split('T')[0];
  const usageKey = `nls_usage_${toolId}_${today}`;

  const currentUsage = parseInt(localStorage.getItem(usageKey) || '0', 10);
  const limit = getTierLimits('free').dailyOperationsPerTool;
  const remaining = Math.max(0, limit - currentUsage);

  return {
    allowed: currentUsage < limit,
    remaining,
  };
}

/**
 * Increment usage counter for a tool
 */
export function incrementUsage(toolId: string): void {
  if (isPro()) return; // Pro users don't have limits

  const today = new Date().toISOString().split('T')[0];
  const usageKey = `nls_usage_${toolId}_${today}`;

  const currentUsage = parseInt(localStorage.getItem(usageKey) || '0', 10);
  localStorage.setItem(usageKey, String(currentUsage + 1));
}

// --- Helpers ---

function getDefaultStatus(): SubscriptionStatus {
  return {
    tier: 'free',
    activatedAt: null,
    expiresAt: null,
    stripeSessionId: null,
  };
}

function saveSubscription(status: SubscriptionStatus): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}
