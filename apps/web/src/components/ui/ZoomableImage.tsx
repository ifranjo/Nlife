import { useState, useRef, useEffect, useCallback } from 'react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  minZoom?: number;
  maxZoom?: number;
  showControls?: boolean;
  onZoomChange?: (zoom: number) => void;
}

interface TouchPoint {
  x: number;
  y: number;
}

const DOUBLE_TAP_TIMEOUT = 140; // ms for double-tap detection
const TRANSITION_DURATION = 200; // ms for smooth transitions

/**
 * ZoomableImage - A React component for pinch-to-zoom and pan functionality
 *
 * Features:
 * - Pinch-to-zoom on touch devices
 * - Mouse wheel zoom on desktop
 * - Double-tap/click to reset
 * - Accessible +/- zoom buttons (WCAG 2.5.1)
 * - Keyboard support: +/- for zoom, arrow keys for pan
 * - Constrained panning to image bounds
 * - Screen reader announcements for zoom level changes
 */
export default function ZoomableImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  minZoom = 0.5,
  maxZoom = 3,
  showControls = true,
  onZoomChange,
}: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<TouchPoint[]>([]);
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const dragStartRef = useRef<TouchPoint>({ x: 0, y: 0 });
  const positionStartRef = useRef<TouchPoint>({ x: 0, y: 0 });

  // Announce zoom level changes to screen readers
  const announceZoomLevel = useCallback((newScale: number) => {
    const percentage = Math.round(newScale * 100);
    setAnnouncement(`Zoom level: ${percentage}%`);
    // Clear announcement after it's been read
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  // Constrain pan position to keep image within bounds
  const constrainPosition = useCallback((x: number, y: number, currentScale: number) => {
    if (!containerRef.current || !imageRef.current) return { x: 0, y: 0 };

    const container = containerRef.current.getBoundingClientRect();
    const image = imageRef.current;

    const imageWidth = image.naturalWidth || image.clientWidth;
    const imageHeight = image.naturalHeight || image.clientHeight;

    // Calculate the scaled image size
    const scaledWidth = imageWidth * currentScale;
    const scaledHeight = imageHeight * currentScale;

    // Calculate max pan distance
    const maxX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxY = Math.max(0, (scaledHeight - container.height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: TouchPoint[]): number => {
    if (touches.length < 2) return 0;
    const dx = touches[1].x - touches[0].x;
    const dy = touches[1].y - touches[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle zoom with smooth transition
  const handleZoom = useCallback((newScale: number, smooth = true) => {
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, newScale));

    if (smooth) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    }

    setScale(clampedScale);

    // Constrain position when zooming out
    if (clampedScale < scale) {
      setPosition(prev => constrainPosition(prev.x, prev.y, clampedScale));
    }

    onZoomChange?.(clampedScale);
    announceZoomLevel(clampedScale);
  }, [minZoom, maxZoom, scale, constrainPosition, onZoomChange, announceZoomLevel]);

  // Reset zoom and position
  const resetZoom = useCallback(() => {
    setIsTransitioning(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    onZoomChange?.(1);
    announceZoomLevel(1);
  }, [onZoomChange, announceZoomLevel]);

  // Handle double-tap to reset
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_TIMEOUT) {
      resetZoom();
    }
    lastTapRef.current = now;
  }, [resetZoom]);

  // Touch event handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.touches).map(t => ({
      x: t.clientX,
      y: t.clientY,
    }));

    touchStartRef.current = touches;

    if (touches.length === 2) {
      // Pinch start
      initialDistanceRef.current = getTouchDistance(touches);
      initialScaleRef.current = scale;
    } else if (touches.length === 1) {
      // Pan start
      setIsDragging(true);
      dragStartRef.current = touches[0];
      positionStartRef.current = { ...position };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.touches).map(t => ({
      x: t.clientX,
      y: t.clientY,
    }));

    if (touches.length === 2 && initialDistanceRef.current > 0) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(touches);
      const scaleFactor = currentDistance / initialDistanceRef.current;
      const newScale = initialScaleRef.current * scaleFactor;
      handleZoom(newScale, false);
    } else if (touches.length === 1 && isDragging && scale > 1) {
      // Pan
      e.preventDefault();
      const dx = touches[0].x - dragStartRef.current.x;
      const dy = touches[0].y - dragStartRef.current.y;
      const newPosition = constrainPosition(
        positionStartRef.current.x + dx,
        positionStartRef.current.y + dy,
        scale
      );
      setPosition(newPosition);
    }
  }, [isDragging, scale, handleZoom, constrainPosition]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // Check for tap
      if (!isDragging || (
        Math.abs(position.x - positionStartRef.current.x) < 5 &&
        Math.abs(position.y - positionStartRef.current.y) < 5
      )) {
        handleTap();
      }
      setIsDragging(false);
      initialDistanceRef.current = 0;
    } else if (e.touches.length === 1) {
      // One finger left, start pan mode
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      positionStartRef.current = { ...position };
      setIsDragging(true);
    }
  }, [isDragging, position, handleTap]);

  // Mouse wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(scale + delta, false);
  }, [scale, handleZoom]);

  // Mouse drag handlers for desktop panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newPosition = constrainPosition(
      positionStartRef.current.x + dx,
      positionStartRef.current.y + dy,
      scale
    );
    setPosition(newPosition);
  }, [isDragging, scale, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoom(scale + 0.25);
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoom(scale - 0.25);
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'ArrowUp':
          if (scale > 1) {
            e.preventDefault();
            setPosition(prev => constrainPosition(prev.x, prev.y + 50, scale));
          }
          break;
        case 'ArrowDown':
          if (scale > 1) {
            e.preventDefault();
            setPosition(prev => constrainPosition(prev.x, prev.y - 50, scale));
          }
          break;
        case 'ArrowLeft':
          if (scale > 1) {
            e.preventDefault();
            setPosition(prev => constrainPosition(prev.x + 50, prev.y, scale));
          }
          break;
        case 'ArrowRight':
          if (scale > 1) {
            e.preventDefault();
            setPosition(prev => constrainPosition(prev.x - 50, prev.y, scale));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scale, handleZoom, resetZoom, constrainPosition]);

  // Zoom in button handler
  const zoomIn = () => handleZoom(scale + 0.25);

  // Zoom out button handler
  const zoomOut = () => handleZoom(scale - 0.25);

  const transformStyle = {
    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
    transition: isTransitioning ? `transform ${TRANSITION_DURATION}ms ease-out` : 'none',
    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ touchAction: 'pan-x pan-y' }}
      tabIndex={0}
      role="application"
      aria-label={`Zoomable image: ${alt}. Use plus and minus keys to zoom, arrow keys to pan.`}
    >
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Image container */}
      <div
        className="w-full h-full flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={`max-w-full max-h-full object-contain select-none ${className}`}
          style={transformStyle}
          draggable={false}
        />
      </div>

      {/* Zoom controls */}
      {showControls && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={zoomOut}
            disabled={scale <= minZoom}
            className="w-8 h-8 flex items-center justify-center text-white rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <button
            onClick={resetZoom}
            className="px-2 h-8 flex items-center justify-center text-white text-xs font-medium rounded hover:bg-white/20 transition-colors min-w-[50px]"
            aria-label={`Current zoom: ${Math.round(scale * 100)}%. Click to reset.`}
            title="Reset zoom (0)"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            disabled={scale >= maxZoom}
            className="w-8 h-8 flex items-center justify-center text-white rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* Zoom hint for touch devices */}
      {scale === 1 && (
        <div className="absolute bottom-3 left-3 text-xs text-white/60 bg-black/40 px-2 py-1 rounded backdrop-blur-sm pointer-events-none sm:hidden">
          Pinch to zoom
        </div>
      )}
    </div>
  );
}
