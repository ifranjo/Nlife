/**
 * ContextMenu Component
 *
 * A fully accessible context menu component for mobile long-press and desktop right-click.
 *
 * Features:
 * - Scale-up animation from touch point
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Focus trap within menu
 * - Screen reader announcements
 * - React Portal rendering
 * - WCAG 2.5.1 compliant
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { trapFocus, announce, haptic, prefersReducedMotion } from '../../lib/accessibility';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Position of the menu (touch/click coordinates) */
  position: { x: number; y: number };
  /** Menu items to display */
  items: ContextMenuItem[];
  /** Callback when menu should close */
  onClose: () => void;
  /** Optional label for screen readers */
  ariaLabel?: string;
}

/**
 * ContextMenu component with portal rendering and full accessibility support
 *
 * @example
 * <ContextMenu
 *   isOpen={isMenuOpen}
 *   position={menuPosition}
 *   items={[
 *     { id: 'move-up', label: 'Move Up', icon: <ArrowUp />, onClick: handleMoveUp },
 *     { id: 'remove', label: 'Remove', danger: true, onClick: handleRemove },
 *   ]}
 *   onClose={() => setIsMenuOpen(false)}
 * />
 */
export function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  ariaLabel = 'Context menu',
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const cleanupFocusTrapRef = useRef<(() => void) | null>(null);

  // Calculate menu position to keep it within viewport
  const calculatePosition = useCallback(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth - 16) {
      x = viewportWidth - menuRect.width - 16;
    }
    if (x < 16) {
      x = 16;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight - 16) {
      y = viewportHeight - menuRect.height - 16;
    }
    if (y < 16) {
      y = 16;
    }

    const reducedMotion = prefersReducedMotion();

    setMenuStyle({
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      transformOrigin: 'top left',
      animation: reducedMotion ? 'none' : 'contextMenuScaleIn 150ms ease-out forwards',
    });
  }, [position]);

  // Set up focus trap and announce menu
  useEffect(() => {
    if (isOpen && menuRef.current) {
      // Calculate position after render
      requestAnimationFrame(calculatePosition);

      // Set up focus trap
      cleanupFocusTrapRef.current = trapFocus(menuRef.current);

      // Announce to screen readers
      const enabledItems = items.filter((item) => !item.disabled);
      announce(`${ariaLabel} opened with ${enabledItems.length} options. Use arrow keys to navigate.`);

      // Reset focus to first item
      setFocusedIndex(0);
    }

    return () => {
      if (cleanupFocusTrapRef.current) {
        cleanupFocusTrapRef.current();
        cleanupFocusTrapRef.current = null;
      }
    };
  }, [isOpen, calculatePosition, items, ariaLabel]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        announce('Context menu closed');
      }
    };

    // Use capture phase to catch clicks before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside as EventListener, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside as EventListener, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const enabledItems = items.filter((item) => !item.disabled);
      const enabledIndices = items
        .map((item, idx) => (!item.disabled ? idx : -1))
        .filter((idx) => idx !== -1);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          {
            const currentEnabledIdx = enabledIndices.indexOf(focusedIndex);
            const nextIdx = enabledIndices[(currentEnabledIdx + 1) % enabledIndices.length];
            setFocusedIndex(nextIdx);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          {
            const currentEnabledIdx = enabledIndices.indexOf(focusedIndex);
            const prevIdx =
              enabledIndices[
                (currentEnabledIdx - 1 + enabledIndices.length) % enabledIndices.length
              ];
            setFocusedIndex(prevIdx);
          }
          break;

        case 'Home':
          e.preventDefault();
          if (enabledIndices.length > 0) {
            setFocusedIndex(enabledIndices[0]);
          }
          break;

        case 'End':
          e.preventDefault();
          if (enabledIndices.length > 0) {
            setFocusedIndex(enabledIndices[enabledIndices.length - 1]);
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!items[focusedIndex].disabled) {
            haptic.tap();
            items[focusedIndex].onClick();
            onClose();
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [items, focusedIndex, onClose]
  );

  // Handle item click
  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      haptic.tap();
      item.onClick();
      onClose();
    },
    [onClose]
  );

  // Don't render if not open
  if (!isOpen) return null;

  // Render via portal to document body
  return createPortal(
    <>
      {/* CSS for animation */}
      <style>
        {`
          @keyframes contextMenuScaleIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* Invisible backdrop for closing */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
        role="menu"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={menuStyle}
        className="z-50 min-w-[180px] max-w-[280px] bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
      >
        <ul className="py-1">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                role="menuitem"
                tabIndex={index === focusedIndex ? 0 : -1}
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => !item.disabled && setFocusedIndex(index)}
                className={`
                  w-full px-4 py-3 flex items-center gap-3 text-left text-sm transition-colors
                  ${
                    item.disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : item.danger
                      ? 'text-red-400 hover:bg-red-500/10 focus:bg-red-500/10'
                      : 'text-slate-200 hover:bg-slate-700/50 focus:bg-slate-700/50'
                  }
                  ${index === focusedIndex && !item.disabled ? 'bg-slate-700/50' : ''}
                  focus:outline-none
                `}
                aria-disabled={item.disabled}
              >
                {item.icon && (
                  <span className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>,
    document.body
  );
}

// Common icons for context menu items
export const ContextMenuIcons = {
  MoveUp: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),

  MoveDown: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),

  Remove: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),

  Preview: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),

  Download: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  ),

  Copy: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ),
};

export default ContextMenu;
