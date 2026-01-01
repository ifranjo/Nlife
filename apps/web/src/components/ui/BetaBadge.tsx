import React from 'react';

interface BetaBadgeProps {
  className?: string;
  tooltip?: string;
}

/**
 * BetaBadge Component
 *
 * Displays a beta badge indicating the tool is in beta/early development.
 * Hover shows tooltip with transparency message.
 */
export const BetaBadge: React.FC<BetaBadgeProps> = ({
  className = '',
  tooltip = "BETA v0.0.1 - Security audit in progress.\n\nLast updated: January 2025\nPrivacy: 100% browser-based processing\nSee full status: https://www.newlifesolutions.dev/status\n\nThis tool is in active development. We're continuously improving security, performance, and features. Please report any issues you encounter."
}) => {
  return (
    <span
      className={[
        "inline-flex items-center gap-1",
        "px-2 py-1 rounded-full",
        "bg-gradient-to-r from-yellow-500/20 to-orange-500/20",
        "border border-yellow-500/30",
        "text-xs font-semibold text-yellow-300",
        "hover:from-yellow-500/30 hover:to-orange-500/30",
        "transition-all duration-200",
        "cursor-help group",
        className
      ].join(' ')}
      title={tooltip}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      BETA
      <span className="absolute md:relative bottom-full left-1/2 -translate-x-1/2 md:translate-x-0 mb-1 md:mb-0 px-2 py-1 rounded bg-black text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100 md:bg-transparent md:text-inherit md:p-0 md:whitespace-normal md:static md:translate-x-0 pointer-events-none md:pointer-events-auto">
        {tooltip}
      </span>
    </span>
  );
};

export default BetaBadge;
