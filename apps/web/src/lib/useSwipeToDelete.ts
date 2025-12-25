/**
 * useSwipeToDelete - Touch gesture hook for swipe-to-delete interactions
 *
 * Features:
 * - Swipe left to reveal delete button
 * - Velocity-based animation (faster swipe = faster animation)
 * - WCAG 2.5.1 compliant (visible delete button as accessible alternative)
 * - Supports touch events (touchstart, touchmove, touchend)
 * - Respects prefers-reduced-motion
 *
 * @example
 * ```tsx
 * const { swipeProps, swipeOffset, isRevealed, reset } = useSwipeToDelete({
 *   onDelete: () => handleRemove(file.id),
 *   threshold: 0.3,
 * });
 *
 * return (
 *   <div {...swipeProps} style={{ transform: `translateX(${swipeOffset}px)` }}>
 *     {content}
 *   </div>
 * );
 * ```
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { prefersReducedMotion } from './accessibility';

export interface SwipeToDeleteOptions {
  /** Callback when swipe delete is triggered */
  onDelete: () => void;
  /** Threshold as percentage of element width (0-1). Default: 0.3 (30%) */
  threshold?: number;
  /** Whether swipe is disabled (e.g., during processing) */
  disabled?: boolean;
  /** Width of the delete action area in pixels. Default: 80 */
  deleteButtonWidth?: number;
}

export interface SwipeToDeleteReturn {
  /** Props to spread on the swipeable element */
  swipeProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
  };
  /** Current horizontal offset in pixels (negative = swiped left) */
  swipeOffset: number;
  /** Whether the delete action is revealed */
  isRevealed: boolean;
  /** Whether the item is being swiped away (delete animation) */
  isDeleting: boolean;
  /** Reset the swipe state */
  reset: () => void;
  /** Programmatically trigger delete animation */
  triggerDelete: () => void;
}

export function useSwipeToDelete({
  onDelete,
  threshold = 0.3,
  disabled = false,
  deleteButtonWidth = 80,
}: SwipeToDeleteOptions): SwipeToDeleteReturn {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const elementWidthRef = useRef(0);
  const isDraggingRef = useRef(false);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const reducedMotion = prefersReducedMotion();

  // Calculate animation duration based on velocity (150-200ms)
  const getAnimationDuration = (velocity: number): number => {
    // Higher velocity = faster animation (minimum 150ms, maximum 200ms)
    const baseMs = 200;
    const minMs = 150;
    const speedFactor = Math.min(Math.abs(velocity) / 1000, 1);
    return Math.max(minMs, baseMs - (speedFactor * 50));
  };

  // Animate to target position
  const animateTo = useCallback((targetX: number, duration: number, onComplete?: () => void) => {
    if (reducedMotion) {
      setSwipeOffset(targetX);
      onComplete?.();
      return;
    }

    const startX = swipeOffset;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear easing for swipe-away as per requirements
      const currentX = startX + (targetX - startX) * progress;
      setSwipeOffset(currentX);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [swipeOffset, reducedMotion]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setSwipeOffset(0);
    setIsRevealed(false);
    setIsDeleting(false);
    isDraggingRef.current = false;
  }, []);

  const triggerDelete = useCallback(() => {
    if (disabled || isDeleting) return;

    setIsDeleting(true);
    const duration = getAnimationDuration(velocityRef.current);

    // Animate off screen to the left
    animateTo(-window.innerWidth, duration, () => {
      onDelete();
    });
  }, [disabled, isDeleting, animateTo, onDelete]);

  const handleStart = useCallback((clientX: number, target: EventTarget | null) => {
    if (disabled || isDeleting) return;

    // Get element width for threshold calculation
    const element = target as HTMLElement;
    if (element) {
      elementWidthRef.current = element.getBoundingClientRect().width;
    }

    startXRef.current = clientX;
    startTimeRef.current = performance.now();
    lastXRef.current = clientX;
    lastTimeRef.current = performance.now();
    isDraggingRef.current = true;
    velocityRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [disabled, isDeleting]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current || disabled || isDeleting) return;

    const currentTime = performance.now();
    const deltaX = clientX - lastXRef.current;
    const deltaTime = currentTime - lastTimeRef.current;

    // Calculate velocity (pixels per second)
    if (deltaTime > 0) {
      velocityRef.current = (deltaX / deltaTime) * 1000;
    }

    lastXRef.current = clientX;
    lastTimeRef.current = currentTime;

    const totalDelta = clientX - startXRef.current;

    // Only allow swiping left (negative values)
    if (totalDelta > 0) {
      // Slight resistance when trying to swipe right past origin
      setSwipeOffset(Math.min(totalDelta * 0.2, 20));
    } else {
      // Cap the swipe at -deleteButtonWidth when revealing
      const maxSwipe = -deleteButtonWidth;
      setSwipeOffset(Math.max(totalDelta, maxSwipe * 1.5));
    }
  }, [disabled, isDeleting, deleteButtonWidth]);

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current || disabled || isDeleting) return;

    isDraggingRef.current = false;

    const swipedDistance = Math.abs(swipeOffset);
    const thresholdDistance = elementWidthRef.current * threshold;
    const velocity = velocityRef.current;
    const duration = getAnimationDuration(velocity);

    // Check if swipe exceeds threshold OR has high velocity to the left
    const shouldDelete = swipedDistance >= thresholdDistance || velocity < -500;
    const shouldReveal = swipeOffset < -30 && !shouldDelete;

    if (shouldDelete) {
      triggerDelete();
    } else if (shouldReveal) {
      // Snap to reveal position
      setIsRevealed(true);
      animateTo(-deleteButtonWidth, duration);
    } else {
      // Snap back to origin
      setIsRevealed(false);
      animateTo(0, duration);
    }
  }, [disabled, isDeleting, swipeOffset, threshold, triggerDelete, animateTo, deleteButtonWidth]);

  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, e.currentTarget);
  }, [handleStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX);
  }, [handleMove]);

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse event handlers (for desktop testing/fallback)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.currentTarget);
  }, [handleStart]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      handleEnd();
    }
  }, [handleEnd]);

  return {
    swipeProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
    swipeOffset,
    isRevealed,
    isDeleting,
    reset,
    triggerDelete,
  };
}
