/**
 * useLongPress Hook
 *
 * A React hook for detecting long-press gestures on touch and mouse devices.
 * Follows iOS conventions with 500ms hold threshold.
 *
 * Features:
 * - 500ms hold threshold (iOS standard)
 * - Cancel on move (10px threshold)
 * - Supports both touch and mouse events
 * - WCAG 2.5.1 compliant (works with right-click and context-menu key)
 */

import { useCallback, useRef } from 'react';
import { haptic } from './accessibility';

export interface LongPressPosition {
  x: number;
  y: number;
}

export interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export interface UseLongPressOptions {
  /** Callback when long press is triggered */
  onLongPress: (position: LongPressPosition) => void;
  /** Time in ms before long press triggers (default: 500ms - iOS standard) */
  threshold?: number;
  /** Distance in px before long press is cancelled (default: 10px) */
  moveThreshold?: number;
  /** Whether to prevent default context menu (default: true) */
  preventDefault?: boolean;
  /** Whether the hook is disabled */
  disabled?: boolean;
}

const LONG_PRESS_THRESHOLD = 500; // iOS standard
const MOVE_THRESHOLD = 10; // Cancel if finger moves more than 10px

/**
 * Custom hook for detecting long-press gestures
 *
 * @example
 * const longPressHandlers = useLongPress({
 *   onLongPress: (position) => {
 *     setMenuPosition(position);
 *     setIsMenuOpen(true);
 *   },
 * });
 *
 * return <div {...longPressHandlers}>Long press me</div>;
 */
export function useLongPress(options: UseLongPressOptions): LongPressHandlers {
  const {
    onLongPress,
    threshold = LONG_PRESS_THRESHOLD,
    moveThreshold = MOVE_THRESHOLD,
    preventDefault = true,
    disabled = false,
  } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<LongPressPosition | null>(null);
  const isLongPressRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    isLongPressRef.current = false;
  }, []);

  const start = useCallback(
    (position: LongPressPosition) => {
      if (disabled) return;

      clear();
      startPosRef.current = position;

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        haptic.tap(); // Haptic feedback when menu appears
        onLongPress(position);
      }, threshold);
    },
    [onLongPress, threshold, disabled, clear]
  );

  const checkMove = useCallback(
    (currentPos: LongPressPosition) => {
      if (!startPosRef.current || !timerRef.current) return;

      const deltaX = Math.abs(currentPos.x - startPosRef.current.x);
      const deltaY = Math.abs(currentPos.y - startPosRef.current.y);

      // Cancel if moved more than threshold
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clear();
      }
    },
    [moveThreshold, clear]
  );

  // Mouse event handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to left click for long press
      if (e.button !== 0) return;
      start({ x: e.clientX, y: e.clientY });
    },
    [start]
  );

  const onMouseUp = useCallback(() => {
    clear();
  }, [clear]);

  const onMouseLeave = useCallback(() => {
    clear();
  }, [clear]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      checkMove({ x: e.clientX, y: e.clientY });
    },
    [checkMove]
  );

  // Touch event handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      start({ x: touch.clientX, y: touch.clientY });
    },
    [start]
  );

  const onTouchEnd = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      checkMove({ x: touch.clientX, y: touch.clientY });
    },
    [checkMove]
  );

  // Right-click context menu (WCAG 2.5.1 compliance)
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      if (preventDefault) {
        e.preventDefault();
      }

      haptic.tap();
      onLongPress({ x: e.clientX, y: e.clientY });
    },
    [onLongPress, preventDefault, disabled]
  );

  // Keyboard support for context menu key (WCAG 2.5.1)
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      // Context menu key (usually next to right Ctrl) or Shift+F10
      if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
        e.preventDefault();

        // Get element position for menu placement
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        haptic.tap();
        onLongPress({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    },
    [onLongPress, disabled]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onMouseMove,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onContextMenu,
    onKeyDown,
  };
}

export default useLongPress;
