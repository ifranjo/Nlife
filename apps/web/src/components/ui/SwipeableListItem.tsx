/**
 * SwipeableListItem - A wrapper component for list items with swipe-to-delete gesture
 *
 * Features:
 * - Swipe left to reveal delete button
 * - Long-press / right-click context menu support
 * - Velocity-based animation
 * - WCAG 2.5.1 compliant with visible delete button alternative
 * - Haptic feedback on delete
 * - Screen reader announcements
 *
 * @example
 * ```tsx
 * <SwipeableListItem
 *   onDelete={() => removeFile(file.id)}
 *   itemName={file.name}
 *   disabled={isProcessing}
 *   contextMenuItems={[
 *     { id: 'move-up', label: 'Move Up', onClick: handleMoveUp },
 *     { id: 'remove', label: 'Remove', danger: true, onClick: handleRemove },
 *   ]}
 * >
 *   <FileContent file={file} />
 * </SwipeableListItem>
 * ```
 */

import React, { useState, useCallback } from 'react';
import { useSwipeToDelete } from '../../lib/useSwipeToDelete';
import { useLongPress, type LongPressPosition } from '../../lib/useLongPress';
import { announce, haptic, prefersReducedMotion } from '../../lib/accessibility';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

export interface SwipeableListItemProps {
  /** Content to render inside the swipeable container */
  children: React.ReactNode;
  /** Callback when item is deleted via swipe or button */
  onDelete: () => void;
  /** Name of the item for accessibility announcements */
  itemName: string;
  /** Whether swipe is disabled (e.g., during processing) */
  disabled?: boolean;
  /** Additional className for the outer container */
  className?: string;
  /** Role for the list item (default: "listitem") */
  role?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** Data attributes to pass through */
  'data-index'?: number;
  /** Keyboard event handler */
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** Aria label for the item */
  'aria-label'?: string;
  /** Context menu items (optional) */
  contextMenuItems?: ContextMenuItem[];
}

export default function SwipeableListItem({
  children,
  onDelete,
  itemName,
  disabled = false,
  className = '',
  role = 'listitem',
  tabIndex,
  'data-index': dataIndex,
  onKeyDown,
  'aria-label': ariaLabel,
  contextMenuItems,
}: SwipeableListItemProps) {
  const reducedMotion = prefersReducedMotion();

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<LongPressPosition>({ x: 0, y: 0 });

  // Handle long-press to open context menu
  const handleLongPress = useCallback((position: LongPressPosition) => {
    if (disabled || !contextMenuItems || contextMenuItems.length === 0) return;
    setContextMenuPosition(position);
    setContextMenuOpen(true);
  }, [disabled, contextMenuItems]);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  // Long press handlers (only enabled if context menu items are provided)
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    disabled: disabled || !contextMenuItems || contextMenuItems.length === 0,
  });

  const handleDelete = () => {
    haptic.heavy();
    announce(`${itemName} removed`, 'assertive');
    onDelete();
  };

  const {
    swipeProps,
    swipeOffset,
    isRevealed,
    isDeleting,
    reset,
    triggerDelete,
  } = useSwipeToDelete({
    onDelete: handleDelete,
    threshold: 0.3,
    disabled,
    deleteButtonWidth: 80,
  });

  // Handle delete button click
  const handleDeleteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isDeleting) return;
    triggerDelete();
  };

  // Handle keyboard delete (visible button)
  const handleDeleteButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isDeleting) {
        triggerDelete();
      }
    }
  };

  // Combine keyboard handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Pass through to parent handler first
    onKeyDown?.(e);

    // If the swipe action is revealed, Enter should trigger delete
    if (isRevealed && e.key === 'Enter') {
      e.preventDefault();
      triggerDelete();
    }
  };

  // Calculate transform and transition styles
  const getTransformStyle = (): React.CSSProperties => {
    const transform = `translateX(${swipeOffset}px)`;

    // Use transition when not being actively dragged
    if (!isDeleting && swipeOffset === 0) {
      return {
        transform,
        transition: reducedMotion ? 'none' : 'transform 0.15s ease-out',
      };
    }

    return { transform };
  };

  // Calculate delete button opacity based on reveal amount
  const deleteButtonOpacity = Math.min(1, Math.abs(swipeOffset) / 60);

  // Combine long press keyboard handler with existing keyboard handler
  const combinedKeyDownHandler = useCallback((e: React.KeyboardEvent) => {
    // Handle long press keyboard events (context menu key, Shift+F10)
    if (contextMenuItems && contextMenuItems.length > 0) {
      longPressHandlers.onKeyDown(e);
    }
    // Then handle other keyboard events
    handleKeyDown(e);
  }, [contextMenuItems, longPressHandlers, handleKeyDown]);

  return (
    <>
      <div
        className={`swipeable-item-container relative overflow-hidden touch-manipulation ${className}`}
        role={role}
        tabIndex={tabIndex}
        data-index={dataIndex}
        onKeyDown={combinedKeyDownHandler}
        aria-label={ariaLabel}
        {...(contextMenuItems && contextMenuItems.length > 0 ? {
          onMouseDown: longPressHandlers.onMouseDown,
          onMouseUp: longPressHandlers.onMouseUp,
          onMouseLeave: longPressHandlers.onMouseLeave,
          onMouseMove: longPressHandlers.onMouseMove,
          onTouchStart: longPressHandlers.onTouchStart,
          onTouchEnd: longPressHandlers.onTouchEnd,
          onTouchMove: longPressHandlers.onTouchMove,
          onContextMenu: longPressHandlers.onContextMenu,
        } : {})}
      >
      {/* Delete action background - revealed on swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-l from-red-600 to-red-500"
        style={{
          width: '100px',
          opacity: deleteButtonOpacity,
        }}
        aria-hidden="true"
      >
        <div className="flex items-center justify-center w-20 h-full">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        {...swipeProps}
        className={`
          swipeable-content relative bg-[var(--bg-secondary,#1a1a1a)]
          ${isDeleting ? 'pointer-events-none' : ''}
        `}
        style={getTransformStyle()}
      >
        {children}
      </div>

      {/* Visible delete button for accessibility (WCAG 2.5.1) */}
      {/* This is always available as an alternative to swipe gesture */}
      <button
        onClick={handleDeleteButtonClick}
        onKeyDown={handleDeleteButtonKeyDown}
        disabled={disabled || isDeleting}
        className={`
          absolute top-1/2 -translate-y-1/2 right-2
          p-2 rounded-lg
          text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-red-400/50
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
        style={{
          // Hide when significantly swiped
          visibility: Math.abs(swipeOffset) > 20 ? 'hidden' : 'visible',
        }}
        aria-label={`Delete ${itemName}`}
        title={`Delete ${itemName}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      </div>

      {/* Context Menu */}
      {contextMenuItems && contextMenuItems.length > 0 && (
        <ContextMenu
          isOpen={contextMenuOpen}
          position={contextMenuPosition}
          items={contextMenuItems}
          onClose={handleContextMenuClose}
          ariaLabel={`Options for ${itemName}`}
        />
      )}
    </>
  );
}
