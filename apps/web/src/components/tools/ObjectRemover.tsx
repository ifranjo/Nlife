import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

interface Point {
  x: number;
  y: number;
}

interface MaskData {
  mask: ImageData;
  blob: Blob;
}

type ProcessingStage = 'idle' | 'loading-model' | 'generating-mask' | 'inpainting';

export default function ObjectRemover() {
  
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [clickPoint, setClickPoint] = useState<Point | null>(null);
  const [maskData, setMaskData] = useState<MaskData | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [showMaskOverlay, setShowMaskOverlay] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const modelRef = useRef<any>(null);
  const processorRef = useRef<any>(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      if (maskData?.blob) URL.revokeObjectURL(URL.createObjectURL(maskData.blob));
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = useCallback(async (file: File) => {
    const validation = await validateFile(file, 'image');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Cleanup previous state
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    setImage(file);
    setImageUrl(URL.createObjectURL(file));
    setClickPoint(null);
    setMaskData(null);
    setResultUrl(null);
    setError(null);
  }, [imageUrl, resultUrl]);

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
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const loadModel = async () => {
    if (modelRef.current && processorRef.current) return;

    setProcessingStage('loading-model');
    setModelProgress(0);

    try {
      // Dynamic import of transformers.js
      const { SamModel, AutoProcessor, env } = await import('@huggingface/transformers');

      // Configure for browser
      env.allowLocalModels = false;

      // Try WebGPU first, fallback to WASM
      let device: 'webgpu' | 'wasm' = 'wasm';
      try {
        // Check for WebGPU support (navigator.gpu is experimental)
        const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown | null> } };
        if (nav.gpu) {
          const adapter = await nav.gpu.requestAdapter();
          if (adapter) {
            device = 'webgpu';
          }
        }
      } catch {
        // WebGPU not available, use WASM
      }

      // Progress callback
      const progressCallback = (progress: { status: string; progress?: number }) => {
        if (progress.progress !== undefined) {
          setModelProgress(Math.round(progress.progress));
        }
      };

      // Load SlimSAM model (smaller, faster)
      const model = await SamModel.from_pretrained('Xenova/slimsam-77-uniform', {
        device,
        progress_callback: progressCallback,
      });

      const processor = await AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform', {
        progress_callback: progressCallback,
      });

      modelRef.current = model;
      processorRef.current = processor;
      setModelProgress(100);
    } catch (err) {
      throw new Error('Failed to load AI model');
    }
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageRef.current || !imageUrl) return;
    if (processingStage !== 'idle') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Get click position relative to canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    setClickPoint({ x, y });
    setMaskData(null);
    setResultUrl(null);
    setError(null);

    try {
      // Load model if not loaded
      await loadModel();

      setProcessingStage('generating-mask');

      const { RawImage } = await import('@huggingface/transformers');

      // Load image for processing
      const rawImage = await RawImage.read(imageUrl);

      // Prepare input points (format: [[[x, y]]])
      const inputPoints = [[[x, y]]];

      // Process with SAM
      const inputs = await processorRef.current(rawImage, inputPoints);
      const outputs = await modelRef.current(inputs);

      // Post-process masks
      const masks = await processorRef.current.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes
      );

      // Convert mask tensor to ImageData
      const maskTensor = masks[0][0]; // Get first mask
      const maskWidth = maskTensor.dims[1];
      const maskHeight = maskTensor.dims[0];
      const maskArray = maskTensor.data;

      // Create ImageData from mask
      const maskImageData = new ImageData(maskWidth, maskHeight);
      for (let i = 0; i < maskArray.length; i++) {
        const value = maskArray[i] > 0.5 ? 255 : 0;
        maskImageData.data[i * 4] = value;     // R
        maskImageData.data[i * 4 + 1] = value; // G
        maskImageData.data[i * 4 + 2] = value; // B
        maskImageData.data[i * 4 + 3] = 255;   // A
      }

      // Create blob from mask for later use
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = maskWidth;
      tempCanvas.height = maskHeight;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(maskImageData, 0, 0);

      const maskBlob = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      setMaskData({ mask: maskImageData, blob: maskBlob });
      setProcessingStage('idle');

    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to generate mask. Please try again.'));
      setProcessingStage('idle');
    }
  };

  const removeObject = async () => {
    if (!maskData || !imageUrl || !canvasRef.current) return;

    
    setProcessingStage('inpainting');
    setError(null);

    try {
      // Load source image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Create mask canvas at image size
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const maskCtx = maskCanvas.getContext('2d')!;

      // Scale mask to image size
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = maskData.mask.width;
      tempCanvas.height = maskData.mask.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(maskData.mask, 0, 0);

      maskCtx.drawImage(tempCanvas, 0, 0, img.width, img.height);
      const scaledMaskData = maskCtx.getImageData(0, 0, img.width, img.height);

      // Content-aware fill using neighbor sampling
      // This is a simplified approach that works well for many cases
      const result = contentAwareFill(imageData, scaledMaskData);

      ctx.putImageData(result, 0, 0);

      // Create result blob
      const resultBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const url = URL.createObjectURL(resultBlob);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(url);
      setProcessingStage('idle');

      
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to remove object. Please try again.'));
      setProcessingStage('idle');
    }
  };

  // Content-aware fill implementation
  const contentAwareFill = (imageData: ImageData, maskData: ImageData): ImageData => {
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(new Uint8ClampedArray(imageData.data), width, height);

    // Find masked pixels and their boundary
    const masked: Set<number> = new Set();
    const boundary: number[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (maskData.data[idx] > 128) {
          masked.add(y * width + x);
        }
      }
    }

    // Find boundary pixels (masked pixels adjacent to non-masked)
    masked.forEach((pixelIdx) => {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);

      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (!masked.has(ny * width + nx)) {
            boundary.push(pixelIdx);
            return;
          }
        }
      }
    });

    // Iterative inpainting from boundary inward
    const filled = new Set(masked);
    const iterations = Math.max(width, height);

    for (let iter = 0; iter < iterations && filled.size > 0; iter++) {
      const toFill: number[] = [];

      filled.forEach((pixelIdx) => {
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        // Check if this pixel has non-masked neighbors
        const neighbors = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ];

        let hasFilledNeighbor = false;
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (!filled.has(ny * width + nx)) {
              hasFilledNeighbor = true;
              break;
            }
          }
        }

        if (hasFilledNeighbor) {
          toFill.push(pixelIdx);
        }
      });

      // Fill pixels by averaging non-masked neighbors
      for (const pixelIdx of toFill) {
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        let r = 0, g = 0, b = 0, count = 0;
        const sampleRadius = 3;

        for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
          for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIdx = ny * width + nx;
              if (!filled.has(neighborIdx)) {
                const dataIdx = neighborIdx * 4;
                r += result.data[dataIdx];
                g += result.data[dataIdx + 1];
                b += result.data[dataIdx + 2];
                count++;
              }
            }
          }
        }

        if (count > 0) {
          const idx = pixelIdx * 4;
          result.data[idx] = Math.round(r / count);
          result.data[idx + 1] = Math.round(g / count);
          result.data[idx + 2] = Math.round(b / count);
          result.data[idx + 3] = 255;
          filled.delete(pixelIdx);
        }
      }
    }

    // Apply slight blur to blend edges
    return applyGaussianBlurToMaskedArea(result, maskData);
  };

  const applyGaussianBlurToMaskedArea = (imageData: ImageData, maskData: ImageData): ImageData => {
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(new Uint8ClampedArray(imageData.data), width, height);

    // Simple 3x3 blur kernel
    const kernel = [
      1/16, 2/16, 1/16,
      2/16, 4/16, 2/16,
      1/16, 2/16, 1/16
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const maskIdx = (y * width + x) * 4;

        // Only blur pixels near the mask boundary
        if (maskData.data[maskIdx] > 128) {
          let r = 0, g = 0, b = 0;
          let ki = 0;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4;
              r += imageData.data[idx] * kernel[ki];
              g += imageData.data[idx + 1] * kernel[ki];
              b += imageData.data[idx + 2] * kernel[ki];
              ki++;
            }
          }

          const idx = (y * width + x) * 4;
          result.data[idx] = Math.round(r);
          result.data[idx + 1] = Math.round(g);
          result.data[idx + 2] = Math.round(b);
        }
      }
    }

    return result;
  };

  // Draw canvas with image, click point, and mask overlay
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw mask overlay
      if (maskData && showMaskOverlay) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = maskData.mask.width;
        tempCanvas.height = maskData.mask.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(maskData.mask, 0, 0);

        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff0000';

        // Create mask pattern
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const maskCtx = maskCanvas.getContext('2d')!;
        maskCtx.drawImage(tempCanvas, 0, 0, img.width, img.height);
        const scaledMask = maskCtx.getImageData(0, 0, img.width, img.height);

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            if (scaledMask.data[idx] > 128) {
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
        ctx.globalAlpha = 1.0;
      }

      // Draw click point
      if (clickPoint) {
        ctx.beginPath();
        ctx.arc(clickPoint.x, clickPoint.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      imageRef.current = img;
    };
    img.src = imageUrl;
  }, [imageUrl, clickPoint, maskData, showMaskOverlay]);

  const downloadResult = () => {
    if (!resultUrl || !image) return;

    const link = document.createElement('a');
    link.href = resultUrl;
    const baseName = sanitizeFilename(image.name).replace(/\.[^/.]+$/, '');
    link.download = `${baseName}_object_removed.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    setImage(null);
    setImageUrl(null);
    setClickPoint(null);
    setMaskData(null);
    setResultUrl(null);
    setError(null);
    setProcessingStage('idle');
  };

  const getProgressMessage = (): string => {
    switch (processingStage) {
      case 'loading-model':
        return `Loading AI model... ${modelProgress}%`;
      case 'generating-mask':
        return 'Generating object mask...';
      case 'inpainting':
        return 'Removing object...';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
            
      {/* Drop Zone (shown when no image) */}
      {!imageUrl && (
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
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-5xl mb-4">&#x1F3AF;</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Drop an image here or click to browse
          </h2>
          <p className="text-[var(--text-muted)] text-sm">
            Supports PNG, JPEG, WebP. Click on objects to remove them.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Image Canvas and Controls */}
      {imageUrl && (
        <div className="space-y-6 animate-fadeIn">
          {/* File info */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{image && sanitizeFilename(image.name)}</p>
              <p className="text-[var(--text-muted)] text-sm">{image && formatFileSize(image.size)}</p>
            </div>
            <button
              onClick={reset}
              className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
              title="Remove image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Instructions */}
          <div className="glass-card p-4">
            <p className="text-[var(--text)] text-sm">
              <strong className="text-white">Step 1:</strong> Click on the object you want to remove.
              {maskData && (
                <span className="ml-2">
                  <strong className="text-green-400">Mask generated!</strong>
                </span>
              )}
            </p>
            {maskData && (
              <p className="text-[var(--text)] text-sm mt-2">
                <strong className="text-white">Step 2:</strong> Review the red overlay (area to remove), then click "Remove Object".
              </p>
            )}
          </div>

          {/* Canvas Container */}
          <div className="glass-card p-4">
            <div className="relative">
              {resultUrl ? (
                /* Show result */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[var(--text-muted)] text-xs mb-2 text-center">Before</p>
                    <img
                      src={imageUrl}
                      alt="Original"
                      className="w-full rounded-lg"
                    />
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] text-xs mb-2 text-center">After</p>
                    <img
                      src={resultUrl}
                      alt="Result"
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                /* Show interactive canvas */
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className={`
                    w-full rounded-lg cursor-crosshair
                    ${processingStage !== 'idle' ? 'pointer-events-none opacity-75' : ''}
                  `}
                />
              )}

              {/* Processing overlay */}
              {processingStage !== 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-white font-medium">{getProgressMessage()}</p>
                    {processingStage === 'loading-model' && (
                      <div className="mt-2 w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                          style={{ width: `${modelProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mask toggle */}
            {maskData && !resultUrl && (
              <div className="mt-4 flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMaskOverlay}
                    onChange={(e) => setShowMaskOverlay(e.target.checked)}
                    className="form-checkbox rounded bg-slate-700 border-slate-600 text-cyan-500"
                  />
                  Show mask overlay
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {maskData && !resultUrl && (
              <button
                onClick={removeObject}
                disabled={processingStage !== 'idle'}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <span>Remove Object</span>
              </button>
            )}

            {resultUrl && (
              <>
                <button
                  onClick={downloadResult}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <span>Download Result</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (resultUrl) URL.revokeObjectURL(resultUrl);
                    setResultUrl(null);
                    setMaskData(null);
                    setClickPoint(null);
                  }}
                  className="btn-secondary flex items-center justify-center gap-2 px-6"
                >
                  Try Again
                </button>
              </>
            )}
          </div>

          {/* First-time model notice */}
          {!modelRef.current && processingStage === 'idle' && !maskData && (
            <div className="glass-card p-4 text-sm text-[var(--text-muted)]">
              <p>
                <strong className="text-cyan-400">First time?</strong> The AI model (~100MB) will be downloaded and cached.
                Future uses will be instant.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        100% private. AI runs entirely in your browser. Images never leave your device.
      </p>
    </div>
  );
}
