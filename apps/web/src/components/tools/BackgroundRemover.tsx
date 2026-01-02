import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';
import ZoomableImage from '../ui/ZoomableImage';

interface ProcessedImage {
  id: string;
  originalFile: File;
  originalName: string;
  originalSize: string;
  originalUrl: string;
  processedUrl: string | null;
  /** URL of the edited mask after Magic Brush modifications */
  editedMaskUrl: string | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

type BackgroundMode = 'transparent' | 'color' | 'image';

/** Brush mode: Add restores removed areas, Erase removes more */
type BrushMode = 'add' | 'erase';

/** A single brush stroke point */
interface BrushPoint {
  x: number;
  y: number;
}

/** A complete brush stroke with mode and points */
interface BrushStroke {
  mode: BrushMode;
  size: number;
  points: BrushPoint[];
}

/** State for the Magic Brush editor */
interface MagicBrushState {
  isActive: boolean;
  mode: BrushMode;
  size: number;
  strokes: BrushStroke[];
  redoStack: BrushStroke[];
  currentStroke: BrushStroke | null;
}

const MAX_FILES = 10; // Limit batch processing
const MIN_BRUSH_SIZE = 5;
const MAX_BRUSH_SIZE = 100;
const DEFAULT_BRUSH_SIZE = 25;

/** Default state for Magic Brush */
const defaultBrushState: MagicBrushState = {
  isActive: false,
  mode: 'add',
  size: DEFAULT_BRUSH_SIZE,
  strokes: [],
  redoStack: [],
  currentStroke: null,
};

export default function BackgroundRemover() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('transparent');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('processed');

  // Magic Brush state - keyed by image ID
  const [brushStates, setBrushStates] = useState<Record<string, MagicBrushState>>({});
  const [activeBrushImageId, setActiveBrushImageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Check max files limit
    if (images.length + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images allowed`);
      return;
    }

    const validatedImages: ProcessedImage[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const validation = await validateFile(file, 'image');

      if (validation.valid) {
        const url = URL.createObjectURL(file);
        validatedImages.push({
          id: generateId(),
          originalFile: file,
          originalName: sanitizeFilename(file.name),
          originalSize: formatFileSize(file.size),
          originalUrl: url,
          processedUrl: null,
          editedMaskUrl: null,
          isProcessing: false,
          progress: 0,
          error: null,
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (validatedImages.length > 0) {
      setImages((prev) => [...prev, ...validatedImages]);
    }

    if (errors.length > 0) {
      setError(errors.length === 1 ? errors[0] : `${errors.length} files rejected`);
    } else {
      setError(null);
    }
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.originalUrl);
        if (image.processedUrl) URL.revokeObjectURL(image.processedUrl);
        if (image.editedMaskUrl) URL.revokeObjectURL(image.editedMaskUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
    // Clean up brush state for this image
    setBrushStates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeBrushImageId === id) {
      setActiveBrushImageId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void addFiles(e.target.files);
    }
  };

  const handleBackgroundImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = await validateFile(file, 'image');

      if (validation.valid) {
        const url = URL.createObjectURL(file);
        setBackgroundImage(url);
        setBackgroundMode('image');
      } else {
        setError(validation.error || 'Invalid background image');
      }
    }
  };

  const removeBackground = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    // Update state to show processing
    setImages(prev => prev.map(img =>
      img.id === imageId
        ? { ...img, isProcessing: true, progress: 0, error: null }
        : img
    ));
    setError(null);

    try {
      // Dynamic import of background removal library
      const { removeBackground: removeBg } = await import('@imgly/background-removal');

      // Progress callback
      const config = {
        progress: (_key: string, current: number, total: number) => {
          const progress = Math.round((current / total) * 100);
          setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, progress } : img
          ));
        },
      };

      // Remove background
      const blob = await removeBg(image.originalFile, config);

      // Create processed image URL
      const processedUrl = URL.createObjectURL(blob);

      // Update state with result
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, processedUrl, isProcessing: false, progress: 100 }
          : img
      ));
    } catch (err) {
      const errorMsg = createSafeErrorMessage(err, 'Failed to remove background. Please try again.');
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, isProcessing: false, error: errorMsg }
          : img
      ));
    }
  };

  const processAllImages = async () => {
    const unprocessedImages = images.filter(img => !img.processedUrl && !img.isProcessing);

    for (const image of unprocessedImages) {
      await removeBackground(image.id);
    }
  };

  // ============================================================================
  // MAGIC BRUSH FUNCTIONS
  // ============================================================================

  /**
   * Initialize or get brush state for an image
   */
  const getBrushState = (imageId: string): MagicBrushState => {
    return brushStates[imageId] || { ...defaultBrushState };
  };

  /**
   * Update brush state for a specific image
   */
  const updateBrushState = (imageId: string, updates: Partial<MagicBrushState>) => {
    setBrushStates(prev => ({
      ...prev,
      [imageId]: {
        ...getBrushState(imageId),
        ...updates,
      },
    }));
  };

  /**
   * Toggle Magic Brush editor for an image
   */
  const toggleMagicBrush = (imageId: string) => {
    const currentState = getBrushState(imageId);
    if (currentState.isActive) {
      // Deactivate brush
      updateBrushState(imageId, { isActive: false });
      setActiveBrushImageId(null);
    } else {
      // Deactivate any other active brush first
      if (activeBrushImageId && activeBrushImageId !== imageId) {
        updateBrushState(activeBrushImageId, { isActive: false });
      }
      // Activate brush for this image
      updateBrushState(imageId, { isActive: true });
      setActiveBrushImageId(imageId);
    }
  };

  /**
   * Set brush mode (add or erase)
   */
  const setBrushMode = (imageId: string, mode: BrushMode) => {
    updateBrushState(imageId, { mode });
  };

  /**
   * Set brush size
   */
  const setBrushSize = (imageId: string, size: number) => {
    const clampedSize = Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, size));
    updateBrushState(imageId, { size: clampedSize });
  };

  /**
   * Start a new brush stroke
   */
  const startStroke = (imageId: string, point: BrushPoint) => {
    const state = getBrushState(imageId);
    const newStroke: BrushStroke = {
      mode: state.mode,
      size: state.size,
      points: [point],
    };
    updateBrushState(imageId, {
      currentStroke: newStroke,
      // Clear redo stack when starting a new stroke
      redoStack: [],
    });
  };

  /**
   * Continue the current brush stroke
   */
  const continueStroke = (imageId: string, point: BrushPoint) => {
    const state = getBrushState(imageId);
    if (!state.currentStroke) return;

    const updatedStroke: BrushStroke = {
      ...state.currentStroke,
      points: [...state.currentStroke.points, point],
    };
    updateBrushState(imageId, { currentStroke: updatedStroke });
  };

  /**
   * End the current brush stroke and add it to history
   */
  const endStroke = (imageId: string) => {
    const state = getBrushState(imageId);
    if (!state.currentStroke || state.currentStroke.points.length < 2) {
      updateBrushState(imageId, { currentStroke: null });
      return;
    }

    updateBrushState(imageId, {
      strokes: [...state.strokes, state.currentStroke],
      currentStroke: null,
    });
  };

  /**
   * Undo the last brush stroke
   */
  const undoStroke = (imageId: string) => {
    const state = getBrushState(imageId);
    if (state.strokes.length === 0) return;

    const lastStroke = state.strokes[state.strokes.length - 1];
    updateBrushState(imageId, {
      strokes: state.strokes.slice(0, -1),
      redoStack: [...state.redoStack, lastStroke],
    });
  };

  /**
   * Redo the last undone brush stroke
   */
  const redoStroke = (imageId: string) => {
    const state = getBrushState(imageId);
    if (state.redoStack.length === 0) return;

    const strokeToRedo = state.redoStack[state.redoStack.length - 1];
    updateBrushState(imageId, {
      strokes: [...state.strokes, strokeToRedo],
      redoStack: state.redoStack.slice(0, -1),
    });
  };

  /**
   * Clear all brush strokes for an image
   */
  const clearAllStrokes = (imageId: string) => {
    const state = getBrushState(imageId);
    updateBrushState(imageId, {
      strokes: [],
      redoStack: [...state.redoStack, ...state.strokes.reverse()],
      currentStroke: null,
    });
  };

  /**
   * Apply brush strokes to create the final edited mask
   * This composites the brush strokes with the AI-generated mask
   */
  const applyBrushStrokes = async (imageId: string): Promise<string | null> => {
    const image = images.find(img => img.id === imageId);
    const state = getBrushState(imageId);

    if (!image || !image.processedUrl || state.strokes.length === 0) {
      return image?.processedUrl || null;
    }

    try {
      // Create canvas for compositing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load the processed image (with transparent background)
      const processedImg = new Image();
      processedImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        processedImg.onload = () => resolve();
        processedImg.onerror = reject;
        processedImg.src = image.processedUrl!;
      });

      // Load the original image for "add" mode
      const originalImg = new Image();
      originalImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        originalImg.onload = () => resolve();
        originalImg.onerror = reject;
        originalImg.src = image.originalUrl;
      });

      canvas.width = processedImg.width;
      canvas.height = processedImg.height;

      // Draw the processed image first
      ctx.drawImage(processedImg, 0, 0);

      // Apply each stroke
      for (const stroke of state.strokes) {
        if (stroke.points.length < 2) continue;

        if (stroke.mode === 'erase') {
          // Erase mode: make areas transparent
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          // Add mode: restore from original image
          // We need to use a temporary canvas to sample from original
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.mode === 'add') {
          // For add mode, we create a clipping path and draw the original
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.lineWidth = stroke.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.clip();
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          // Erase mode - draw the stroke to remove pixels
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        }
      }

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      // Convert to blob and create URL
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            resolve(null);
          }
        }, 'image/png');
      });
    } catch (err) {
      console.error('Failed to apply brush strokes:', err);
      return null;
    }
  };

  /**
   * Save the edited mask for an image
   */
  const saveEditedMask = async (imageId: string) => {
    const editedUrl = await applyBrushStrokes(imageId);
    if (editedUrl) {
      // Revoke old edited mask URL if exists
      const image = images.find(img => img.id === imageId);
      if (image?.editedMaskUrl) {
        URL.revokeObjectURL(image.editedMaskUrl);
      }

      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, editedMaskUrl: editedUrl } : img
      ));

      // Deactivate brush after saving
      updateBrushState(imageId, { isActive: false });
      setActiveBrushImageId(null);
    }
  };

  const downloadImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.processedUrl) return;

    // Use edited mask if available, otherwise use processed URL
    const sourceUrl = image.editedMaskUrl || image.processedUrl;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load processed image (or edited mask)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sourceUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;

      // Apply background based on mode
      if (backgroundMode === 'color') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      } else if (backgroundMode === 'image' && backgroundImage) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = backgroundImage;
        });

        // Scale background to fit
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      } else {
        // Transparent
        ctx.drawImage(img, 0, 0);
      }

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const baseName = image.originalName.replace(/\.[^/.]+$/, '');
        link.download = `${baseName}_no_bg.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to download image. Please try again.'));
    }
  };

  const downloadAllImages = async () => {
    const processedImages = images.filter(img => img.processedUrl);

    if (processedImages.length === 0) {
      setError('No processed images to download');
      return;
    }

    if (processedImages.length === 1) {
      await downloadImage(processedImages[0].id);
      return;
    }

    try {
      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const image of processedImages) {
        if (!image.processedUrl) continue;

        // Use edited mask if available
        const sourceUrl = image.editedMaskUrl || image.processedUrl;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = sourceUrl;
        });

        canvas.width = img.width;
        canvas.height = img.height;

        if (backgroundMode === 'color') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        } else if (backgroundMode === 'image' && backgroundImage) {
          const bgImg = new Image();
          bgImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            bgImg.onload = resolve;
            bgImg.onerror = reject;
            bgImg.src = backgroundImage;
          });
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        } else {
          ctx.drawImage(img, 0, 0);
        }

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        const baseName = image.originalName.replace(/\.[^/.]+$/, '');
        zip.file(`${baseName}_no_bg.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'background_removed_images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create ZIP file. Please try again.'));
    }
  };

  // ============================================================================
  // MAGIC BRUSH EDITOR COMPONENT
  // ============================================================================

  /**
   * MagicBrushEditor - Canvas overlay for interactive brush editing
   * Supports mouse and touch events for drawing strokes
   */
  const MagicBrushEditor = ({ imageId, processedUrl, originalUrl }: {
    imageId: string;
    processedUrl: string;
    originalUrl: string;
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    const brushState = getBrushState(imageId);

    // Load images and set canvas size
    useEffect(() => {
      const loadImage = async () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });

          // Calculate display size maintaining aspect ratio
          if (containerRef.current) {
            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;
            const aspectRatio = img.width / img.height;

            let displayWidth = containerWidth;
            let displayHeight = containerWidth / aspectRatio;

            if (displayHeight > containerHeight) {
              displayHeight = containerHeight;
              displayWidth = containerHeight * aspectRatio;
            }

            setCanvasSize({ width: displayWidth, height: displayHeight });
          }
        };
        img.src = processedUrl;
      };
      loadImage();
    }, [processedUrl]);

    // Draw strokes on canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scale factor between display and actual image size
      const scaleX = imageSize.width / canvasSize.width;
      const scaleY = imageSize.height / canvasSize.height;

      // Draw all completed strokes
      const allStrokes = [...brushState.strokes];
      if (brushState.currentStroke) {
        allStrokes.push(brushState.currentStroke);
      }

      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;

        ctx.beginPath();
        ctx.lineWidth = stroke.size / scaleX; // Scale brush size for display
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Use different colors/styles for add vs erase mode
        if (stroke.mode === 'add') {
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Green for restore
        } else {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red for erase
        }

        // Scale points to display coordinates
        const scaledPoints = stroke.points.map(p => ({
          x: p.x / scaleX,
          y: p.y / scaleY,
        }));

        ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
        for (let i = 1; i < scaledPoints.length; i++) {
          ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
        }
        ctx.stroke();
      }
    }, [brushState.strokes, brushState.currentStroke, canvasSize, imageSize]);

    /**
     * Get coordinates from mouse/touch event, scaled to image coordinates
     */
    const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent): BrushPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas || imageSize.width === 0) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate position relative to canvas
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Scale to actual image coordinates
      const scaleX = imageSize.width / canvasSize.width;
      const scaleY = imageSize.height / canvasSize.height;

      return {
        x: x * scaleX,
        y: y * scaleY,
      };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const point = getEventCoordinates(e);
      if (point) {
        setIsDrawing(true);
        startStroke(imageId, point);
      }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const point = getEventCoordinates(e);
      if (point) {
        continueStroke(imageId, point);
      }
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (isDrawing) {
        setIsDrawing(false);
        endStroke(imageId);
      }
    };

    return (
      <div className="glass-card p-4 mt-4">
        {/* Brush Controls Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">Magic Brush</span>
            <span className="text-[var(--text-muted)] text-xs">
              ({brushState.strokes.length} stroke{brushState.strokes.length !== 1 ? 's' : ''})
            </span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setBrushMode(imageId, 'add')}
              className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${
                brushState.mode === 'add'
                  ? 'bg-green-500 text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
              title="Add mode: Restore removed areas"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
            <button
              onClick={() => setBrushMode(imageId, 'erase')}
              className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${
                brushState.mode === 'erase'
                  ? 'bg-red-500 text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
              title="Erase mode: Remove more background"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Erase
            </button>
          </div>
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[var(--text-muted)] text-xs w-12">Size:</span>
          <input
            type="range"
            min={MIN_BRUSH_SIZE}
            max={MAX_BRUSH_SIZE}
            value={brushState.size}
            onChange={(e) => setBrushSize(imageId, Number(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
          />
          <span className="text-white text-xs w-10 text-right">{brushState.size}px</span>

          {/* Brush size preview */}
          <div
            className="rounded-full border-2 border-white/50 flex-shrink-0"
            style={{
              width: Math.min(brushState.size / 2, 30),
              height: Math.min(brushState.size / 2, 30),
              backgroundColor: brushState.mode === 'add' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)',
            }}
          />
        </div>

        {/* Undo/Redo/Clear Controls */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => undoStroke(imageId)}
            disabled={brushState.strokes.length === 0}
            className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            title="Undo last stroke"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>
          <button
            onClick={() => redoStroke(imageId)}
            disabled={brushState.redoStack.length === 0}
            className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            title="Redo undone stroke"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
            Redo
          </button>
          <button
            onClick={() => clearAllStrokes(imageId)}
            disabled={brushState.strokes.length === 0}
            className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Clear all strokes"
          >
            Clear All
          </button>

          <div className="flex-1" />

          {/* Save/Cancel buttons */}
          <button
            onClick={() => toggleMagicBrush(imageId)}
            className="px-3 py-1.5 text-xs bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveEditedMask(imageId)}
            disabled={brushState.strokes.length === 0}
            className="px-4 py-1.5 text-xs bg-fuchsia-500 text-white rounded-lg hover:bg-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply Changes
          </button>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="relative bg-slate-900 rounded-lg overflow-hidden"
          style={{ minHeight: '300px', maxHeight: '500px' }}
        >
          {/* Checkerboard background for transparency */}
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-conic-gradient(#404040 0% 25%, #303030 0% 50%) 50% / 20px 20px',
            }}
          />

          {/* Processed image as background */}
          <img
            src={processedUrl}
            alt="Processed"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ maxHeight: '500px' }}
          />

          {/* Semi-transparent original for reference in add mode */}
          {brushState.mode === 'add' && (
            <img
              src={originalUrl}
              alt="Original (reference)"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-30"
              style={{ maxHeight: '500px' }}
            />
          )}

          {/* Drawing canvas overlay */}
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute inset-0 m-auto touch-none"
            style={{
              cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${Math.min(brushState.size, 50)}' height='${Math.min(brushState.size, 50)}' viewBox='0 0 ${Math.min(brushState.size, 50)} ${Math.min(brushState.size, 50)}'%3E%3Ccircle cx='${Math.min(brushState.size, 50) / 2}' cy='${Math.min(brushState.size, 50) / 2}' r='${Math.min(brushState.size, 50) / 2 - 1}' fill='none' stroke='${brushState.mode === 'add' ? '%2300ff00' : '%23ff0000'}' stroke-width='2'/%3E%3C/svg%3E") ${Math.min(brushState.size, 50) / 2} ${Math.min(brushState.size, 50) / 2}, crosshair`,
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        {/* Instructions */}
        <p className="text-[var(--text-muted)] text-xs mt-3 text-center">
          {brushState.mode === 'add'
            ? 'Paint over areas to restore the original (shown faintly)'
            : 'Paint over areas to remove more background'}
          {' '} | Pinch or scroll to adjust brush size on mobile
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          drop-zone rounded-2xl p-12 text-center cursor-pointer animate-fadeIn
          ${isDragging ? 'drag-over' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-5xl mb-4">✂️</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop images here or click to browse
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Supports PNG, JPEG, WebP. AI processing runs in your browser.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Background Options */}
      {images.some(img => img.processedUrl) && (
        <div className="mt-6 glass-card p-6">
          <h4 className="text-sm font-medium text-white mb-4">Background Options</h4>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setBackgroundMode('transparent')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                backgroundMode === 'transparent'
                  ? 'border-fuchsia-500 bg-fuchsia-500/20 text-white'
                  : 'border-slate-600 bg-slate-800/50 text-[var(--text-muted)] hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-1">🔲</div>
              <div className="text-xs">Transparent</div>
            </button>

            <button
              onClick={() => setBackgroundMode('color')}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                backgroundMode === 'color'
                  ? 'border-fuchsia-500 bg-fuchsia-500/20 text-white'
                  : 'border-slate-600 bg-slate-800/50 text-[var(--text-muted)] hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-1">🎨</div>
              <div className="text-xs">Solid Color</div>
            </button>

            <button
              onClick={() => backgroundInputRef.current?.click()}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                backgroundMode === 'image'
                  ? 'border-fuchsia-500 bg-fuchsia-500/20 text-white'
                  : 'border-slate-600 bg-slate-800/50 text-[var(--text-muted)] hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-1">🖼️</div>
              <div className="text-xs">Custom Image</div>
            </button>
          </div>

          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleBackgroundImageSelect}
            className="hidden"
          />

          {backgroundMode === 'color' && (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer"
              />
              <span className="text-[var(--text-muted)] text-sm">{backgroundColor}</span>
            </div>
          )}

          {backgroundMode === 'image' && backgroundImage && (
            <div className="flex items-center gap-3">
              <img src={backgroundImage} alt="Background" className="w-12 h-12 rounded-lg object-cover" />
              <span className="text-[var(--text-muted)] text-sm">Custom background selected</span>
            </div>
          )}
        </div>
      )}

      {/* Image List */}
      {images.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-muted)]">
              {images.length} image{images.length > 1 ? 's' : ''} uploaded
            </h4>

            {images.some(img => !img.processedUrl && !img.isProcessing) && (
              <button
                onClick={processAllImages}
                className="btn-primary text-sm px-4 py-2"
              >
                Process All
              </button>
            )}
          </div>

          {images.map((image) => (
            <div
              key={image.id}
              className="glass-card glass-card-hover p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{image.originalName}</p>
                  <p className="text-[var(--text-muted)] text-sm">{image.originalSize}</p>
                </div>

                <button
                  onClick={() => removeImage(image.id)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Before/After Comparison */}
              {image.processedUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-4 group">
                  <div className="absolute inset-0 grid grid-cols-2">
                    <div className="relative overflow-hidden">
                      <img
                        src={image.originalUrl}
                        alt="Original"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        Before
                      </div>
                    </div>
                    <div className="relative overflow-hidden">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: backgroundMode === 'color'
                            ? backgroundColor
                            : backgroundMode === 'image' && backgroundImage
                            ? `url(${backgroundImage})`
                            : 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                        }}
                      />
                      <img
                        src={image.editedMaskUrl || image.processedUrl}
                        alt="Processed"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded flex items-center gap-1">
                        After
                        {image.editedMaskUrl && (
                          <span className="text-green-400" title="Edited with Magic Brush">*</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-auto cursor-ew-resize"
                      style={{ left: `${sliderPosition}%` }}
                      onMouseDown={(e) => {
                        const parent = e.currentTarget.parentElement!.parentElement!;
                        const handleMove = (e: MouseEvent) => {
                          const rect = parent.getBoundingClientRect();
                          const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                          setSliderPosition((x / rect.width) * 100);
                        };
                        const handleUp = () => {
                          document.removeEventListener('mousemove', handleMove);
                          document.removeEventListener('mouseup', handleUp);
                        };
                        document.addEventListener('mousemove', handleMove);
                        document.addEventListener('mouseup', handleUp);
                      }}
                    />
                  </div>

                  {/* Zoom button */}
                  <button
                    onClick={() => {
                      setPreviewImage(image);
                      setPreviewMode('processed');
                    }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
                    title="Click to zoom"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    Zoom
                  </button>
                </div>
              ) : (
                <div
                  className="aspect-video rounded-lg overflow-hidden bg-slate-900 mb-4 cursor-pointer group relative"
                  onClick={() => {
                    setPreviewImage(image);
                    setPreviewMode('original');
                  }}
                >
                  <img
                    src={image.originalUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                  {/* Zoom hint */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    Click to zoom
                  </div>
                </div>
              )}

              {/* Processing State */}
              {image.isProcessing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-muted)]">Processing with AI...</span>
                    <span className="text-sm text-fuchsia-400">{image.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${image.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error State */}
              {image.error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                  {image.error}
                </div>
              )}

              {/* Magic Brush Editor - shown when active */}
              {image.processedUrl && getBrushState(image.id).isActive && (
                <MagicBrushEditor
                  imageId={image.id}
                  processedUrl={image.editedMaskUrl || image.processedUrl}
                  originalUrl={image.originalUrl}
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {!image.processedUrl && !image.isProcessing && (
                  <button
                    onClick={() => removeBackground(image.id)}
                    className="flex-1 btn-primary"
                  >
                    Remove Background
                  </button>
                )}

                {image.processedUrl && !getBrushState(image.id).isActive && (
                  <>
                    {/* Magic Brush Button */}
                    <button
                      onClick={() => toggleMagicBrush(image.id)}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      title="Refine the mask with Magic Brush"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Magic Brush</span>
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => downloadImage(image.id)}
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <span>Download</span>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Download */}
      {images.filter(img => img.processedUrl).length > 1 && (
        <button
          onClick={downloadAllImages}
          className="mt-6 w-full btn-primary flex items-center justify-center gap-2"
        >
          <span>Download All as ZIP</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        100% private. AI models run entirely in your browser. Images never leave your device.
      </p>

      {/* Image Preview Modal with Zoom */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div
            className="relative max-w-4xl w-full max-h-[85vh] bg-slate-900 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with toggle and close */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <h3 className="text-white font-medium">{previewImage.originalName}</h3>
                {previewImage.processedUrl && (
                  <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewMode('original')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        previewMode === 'original'
                          ? 'bg-fuchsia-500 text-white'
                          : 'text-[var(--text-muted)] hover:text-white'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setPreviewMode('processed')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        previewMode === 'processed'
                          ? 'bg-fuchsia-500 text-white'
                          : 'text-[var(--text-muted)] hover:text-white'
                      }`}
                    >
                      Processed
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 text-[var(--text-muted)] hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Zoomable Image */}
            <div
              className="h-[65vh]"
              style={{
                background: previewMode === 'processed' && backgroundMode === 'color'
                  ? backgroundColor
                  : previewMode === 'processed' && backgroundMode === 'image' && backgroundImage
                  ? `url(${backgroundImage})`
                  : previewMode === 'processed'
                  ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                  : '#1e1e2e'
              }}
            >
              <ZoomableImage
                src={
                  previewMode === 'processed' && previewImage.processedUrl
                    ? previewImage.processedUrl
                    : previewImage.originalUrl
                }
                alt={`${previewMode === 'processed' ? 'Processed' : 'Original'} - ${previewImage.originalName}`}
                containerClassName="w-full h-full"
                className="rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
