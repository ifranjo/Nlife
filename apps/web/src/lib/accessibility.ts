/**
 * Accessibility utilities for New Life Solutions
 * WCAG 2.2 compliant helpers for screen readers, haptics, and focus management
 */

// Extend Window interface for global announce function
declare global {
  interface Window {
    announce: (message: string, priority?: 'polite' | 'assertive') => void;
  }
}

/**
 * Announce a message to screen readers via aria-live region
 * The live region must exist in the DOM (added in Layout.astro)
 *
 * @param message - The message to announce
 * @param priority - 'polite' waits for user to finish, 'assertive' interrupts immediately
 *
 * @example
 * announce('File uploaded successfully');
 * announce('Error: Invalid file format', 'assertive');
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof window !== 'undefined' && window.announce) {
    window.announce(message, priority);
  }
}

/**
 * Haptic feedback patterns for mobile devices
 * Note: Only works on Android Chrome/Firefox. iOS Safari blocks Vibration API.
 * Fails silently on unsupported browsers.
 */
export const haptic = {
  /** Light tap feedback - 10ms */
  tap: (): void => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /** Success feedback - double pulse */
  success: (): void => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /** Error feedback - triple pulse */
  error: (): void => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  },

  /** Warning feedback - medium pulse */
  warning: (): void => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 30, 30]);
    }
  },

  /** Heavy impact - 100ms for destructive actions */
  heavy: (): void => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
  },
};

/**
 * Check if device supports haptic feedback
 */
export function supportsHaptics(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Debounced progress announcer - announces at intervals to avoid spam
 * Announces at 0%, 25%, 50%, 75%, 100% and completion
 *
 * @example
 * const announcer = createProgressAnnouncer('Compressing video');
 * announcer.update(25);  // "Compressing video: 25% complete"
 * announcer.complete();  // "Compressing video complete"
 */
export function createProgressAnnouncer(taskName: string) {
  let lastAnnouncedPercent = -1;
  const thresholds = [0, 25, 50, 75, 100];

  return {
    update(percent: number): void {
      const roundedPercent = Math.round(percent);
      const threshold = thresholds.find(t => roundedPercent >= t && lastAnnouncedPercent < t);

      if (threshold !== undefined) {
        announce(`${taskName}: ${threshold}% complete`);
        lastAnnouncedPercent = threshold;
      }
    },

    complete(): void {
      announce(`${taskName} complete`);
      haptic.success();
    },

    error(message: string): void {
      announce(`${taskName} failed: ${message}`, 'assertive');
      haptic.error();
    },
  };
}

/**
 * Focus trap for modals and dialogs
 * Returns a cleanup function to restore focus
 *
 * @example
 * const cleanup = trapFocus(modalElement);
 * // ... modal is open
 * cleanup(); // Restore focus to previous element
 */
export function trapFocus(container: HTMLElement): () => void {
  const previouslyFocused = document.activeElement as HTMLElement;

  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  // Focus first element
  firstFocusable?.focus();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: going backwards
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    previouslyFocused?.focus();
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
