import React, { useState, useCallback } from 'react';

interface ShareGameProps {
  gameName: string;
  score?: number | string;
  scoreLabel?: string;
  text?: string;
  customMessage?: string;
  className?: string;
}

export const ShareGame: React.FC<ShareGameProps> = ({
  gameName,
  score,
  scoreLabel = 'Score',
  text = "Check out this awesome browser game!",
  customMessage,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Generate share message
  const shareMessage = useCallback(() => {
    let message = customMessage || `I just played ${gameName}`;

    if (score !== undefined) {
      message += ` and got ${scoreLabel}: ${score}!`;
    }

    message += ` 🎮 Play it free at https://www.newlifesolutions.dev`;

    return message;
  }, [gameName, score, scoreLabel, customMessage]);

  // Handle share button click
  const handleShare = useCallback(async () => {
    const message = shareMessage();

    try {
      // Web Share API (native dialog)
      if (navigator.share) {
        await navigator.share({
          title: `${gameName} - New Life Games`,
          text: message,
          url: window.location.href
        });

        // Track successful share
        trackShare('native');
        triggerSuccess();
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(message);
        setCopied(true);
        trackShare('clipboard');
        triggerSuccess();

        // Reset copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      // User canceled or error - silent fail is fine
    }
  }, [gameName, shareMessage]);

  // Track share event
  const trackShare = useCallback((method: 'native' | 'clipboard') => {
    // Simple analytics - could be expanded
    const payload = {
      game: gameName,
      score: score,
      method: method,
      url: window.location.href
    };

    // Try to use analytics if available
    try {
      // @ts-ignore - analytics might not be imported
      if (window.analytics || window.gtag) {
        // Use existing analytics
        // trackGameShare(payload); // Future implementation
      }

      // Analytics tracking - silent in production

      // In a real implementation, send to your analytics endpoint
      // fetch('/api/analytics/share', { method: 'POST', body: JSON.stringify(payload) });
    } catch (error) {
      // Silent fail - not critical
    }
  }, [gameName, score]);

  // Show success indicator
  const triggerSuccess = useCallback(() => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }, []);

  // Calculate if native share is supported
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={handleShare}
        title={canNativeShare ? 'Share your score' : 'Copy score to clipboard'}
        className={[
          "group relative inline-flex items-center gap-2",
          "px-4 py-2 rounded-lg",
          "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
          "border border-purple-500/30",
          "text-sm text-purple-300",
          "hover:from-purple-500/30 hover:to-pink-500/30",
          "transition-all duration-200 hover:shadow-lg",
          "active:translate-y-0.5",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        ].join(' ')}
      >
        {/* Icon */}
        {copied ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        )}

        {/* Text */}
        <span className="font-medium">
          {copied ? 'Copied!' : 'Share Score'}
        </span>

        {/* Tooltip hover effect */}
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Share your {gameName} score
        </span>
      </button>

      {/* Success indicator */}
      {showSuccess && (
        <div className="flex items-center gap-1 text-xs text-green-400 animate-fadeIn">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Shared successfully!</span>
        </div>
      )}

      {/* Score display (if provided) */}
      {score !== undefined && (
        <div className="text-xs text-[var(--text-dim)] bg-black/30 px-2 py-1 rounded">
          {scoreLabel}: {score}
        </div>
      )}
    </div>
  );
};

export default ShareGame;
