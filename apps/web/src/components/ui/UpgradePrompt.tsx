/**
 * UpgradePrompt - Shows when free user hits usage limit
 *
 * Design: Non-intrusive glass overlay, can be dismissed
 * Triggers: When checkDailyUsage().allowed === false
 */

import { useState, useEffect } from 'react';
import { checkDailyUsage, isPro, getSubscription } from '../../lib/subscription';

interface UpgradePromptProps {
  toolId: string;
  toolName: string;
  onDismiss?: () => void;
}

export default function UpgradePrompt({ toolId, toolName, onDismiss }: UpgradePromptProps) {
  const [visible, setVisible] = useState(false);
  const [usage, setUsage] = useState({ allowed: true, remaining: 5 });

  useEffect(() => {
    // Don't show for Pro users
    if (isPro()) {
      setVisible(false);
      return;
    }

    const currentUsage = checkDailyUsage(toolId);
    setUsage(currentUsage);

    // Show when limit reached
    if (!currentUsage.allowed) {
      setVisible(true);
    }
  }, [toolId]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative max-w-md w-full bg-[#0a0a0a]/95 border border-white/20 rounded-2xl p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Daily Limit Reached
          </h2>
          <p className="text-white/60">
            You've used all 5 free operations for <strong>{toolName}</strong> today.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span className="text-emerald-400">✓</span>
            <span>Unlimited operations on all tools</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span className="text-emerald-400">✓</span>
            <span>10x larger file size limits</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span className="text-emerald-400">✓</span>
            <span>No watermarks, priority processing</span>
          </div>
        </div>

        {/* CTA */}
        <a
          href="/pricing"
          className="block w-full py-4 px-6 rounded-xl bg-white text-black font-semibold text-center hover:bg-white/90 transition-all"
        >
          Upgrade to Pro - $7/month
        </a>

        {/* Secondary */}
        <p className="text-center text-xs text-white/40 mt-4">
          Or come back tomorrow for 5 more free uses
        </p>
      </div>
    </div>
  );
}

/**
 * UsageIndicator - Small badge showing remaining uses
 * Use this at the top of tools to show "3/5 uses today"
 */
export function UsageIndicator({ toolId }: { toolId: string }) {
  const [usage, setUsage] = useState({ allowed: true, remaining: 5 });
  const [isProUser, setIsProUser] = useState(false);

  useEffect(() => {
    setIsProUser(isPro());
    if (!isPro()) {
      setUsage(checkDailyUsage(toolId));
    }
  }, [toolId]);

  // Don't show for Pro users
  if (isProUser) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
        <span>✓</span>
        <span>Pro - Unlimited</span>
      </div>
    );
  }

  const used = 5 - usage.remaining;
  const percentage = (used / 5) * 100;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${
              i < used ? 'bg-amber-400' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
      <span className={usage.remaining <= 2 ? 'text-amber-400' : 'text-white/60'}>
        {usage.remaining}/5 today
      </span>
      {usage.remaining === 0 && (
        <a href="/pricing" className="text-amber-400 hover:underline">
          Upgrade
        </a>
      )}
    </div>
  );
}

/**
 * Hook to manage tool usage with automatic prompt
 */
export function useToolUsage(toolId: string) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [canUse, setCanUse] = useState(true);

  const checkUsage = () => {
    if (isPro()) return true;

    const { allowed } = checkDailyUsage(toolId);
    if (!allowed) {
      setShowPrompt(true);
      setCanUse(false);
      return false;
    }
    return true;
  };

  const recordUsage = () => {
    if (isPro()) return;

    // Import incrementUsage dynamically to avoid SSR issues
    import('../../lib/subscription').then(({ incrementUsage }) => {
      incrementUsage(toolId);
      // Recheck after increment
      const { allowed, remaining } = checkDailyUsage(toolId);
      setCanUse(allowed);
    });
  };

  const dismissPrompt = () => setShowPrompt(false);

  return {
    canUse,
    showPrompt,
    checkUsage,
    recordUsage,
    dismissPrompt,
  };
}
