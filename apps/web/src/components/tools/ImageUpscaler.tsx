import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

interface UpscaledImage {
  id: string;
  originalFile: File;
  originalName: string;
  originalSize: string;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  upscaledUrl: string | null;
  upscaledWidth: number;
  upscaledHeight: number;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
}

type ScaleFactor = 2 | 4;
type ModelQuality = 'fast' | 'balanced' | 'quality';

const MODEL_INFO: Record<ModelQuality, { name: string; description: string; sizeHint: string }> = {
  fast: {
    name: 'esrgan-slim',
    description: 'Fastest processing, good quality',
    sizeHint: '~5MB'
  },
  balanced: {
    name: 'esrgan-medium',
    description: 'Best balance of speed and quality',
    sizeHint: '~10MB'
  },
  quality: {
    name: 'esrgan-thick',
    description: 'Highest quality, slower processing',
    sizeHint: '~20MB'
  }
};

const MAX_FILES = 5;

export default function ImageUpscaler() {
  
  const [images, setImages] = useState<UpscaledImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState<ScaleFactor>(2);
  const [modelQuality, setModelQuality] = useState<ModelQuality>('balanced');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [comparePosition, setComparePosition] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upscalerRef = useRef<any>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Cleanup upscaler on unmount
  useEffect(() => {
    return () => {
      if (upscalerRef.current) {
        upscalerRef.current.dispose?.();
      }
    };
  }, []);

  const loadModel = async () => {
    if (upscalerRef.current || modelLoading) return;

    setModelLoading(true);
    setModelLoadProgress(0);
    setError(null);

    try {
      // Dynamic import of upscaler library
      const Upscaler = (await import('upscaler')).default;

      // Get the appropriate model package name
      const modelPackage = `@upscalerjs/${MODEL_INFO[modelQuality].name}`;
      let modelModule;

      // Dynamic import based on selected quality
      if (modelQuality === 'fast') {
        modelModule = await import('@upscalerjs/esrgan-slim');
      } else if (modelQuality === 'balanced') {
        modelModule = await import('@upscalerjs/esrgan-medium');
      } else {
        modelModule = await import('@upscalerjs/esrgan-thick');
      }

      // Get the model for the selected scale factor
      const model = scaleFactor === 2 ? modelModule.x2 : modelModule.x4;

      setModelLoadProgress(30);

      // Create upscaler instance
      upscalerRef.current = new Upscaler({
        model,
      });

      // Warm up the model with a tiny image
      setModelLoadProgress(60);
      const warmupCanvas = document.createElement('canvas');
      warmupCanvas.width = 4;
      warmupCanvas.height = 4;
      const ctx = warmupCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#888';
        ctx.fillRect(0, 0, 4, 4);
        await upscalerRef.current.upscale(warmupCanvas);
      }

      setModelLoadProgress(100);
      setModelLoaded(true);
    } catch (err) {
      console.error('Model load error:', err);
      setError(createSafeErrorMessage(err, 'Failed to load AI model. Please refresh and try again.'));
      upscalerRef.current = null;
    } finally {
      setModelLoading(false);
    }
  };

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    if (images.length + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images allowed at once`);
      return;
    }

    const validatedImages: UpscaledImage[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const validation = await validateFile(file, 'image');

      if (validation.valid) {
        try {
          const dimensions = await getImageDimensions(file);
          const url = URL.createObjectURL(file);

          validatedImages.push({
            id: generateId(),
            originalFile: file,
            originalName: sanitizeFilename(file.name),
            originalSize: formatFileSize(file.size),
            originalUrl: url,
            originalWidth: dimensions.width,
            originalHeight: dimensions.height,
            upscaledUrl: null,
            upscaledWidth: 0,
            upscaledHeight: 0,
            isProcessing: false,
            progress: 0,
            progressMessage: '',
            error: null,
          });
        } catch {
          errors.push(`${file.name}: Failed to read image dimensions`);
        }
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
        if (image.upscaledUrl) URL.revokeObjectURL(image.upscaledUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
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

  const upscaleImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    
    // Load model if not already loaded
    if (!upscalerRef.current && !modelLoading) {
      await loadModel();
    }

    if (!upscalerRef.current) {
      setError('AI model not loaded. Please try again.');
      return;
    }

    setImages(prev => prev.map(img =>
      img.id === imageId
        ? { ...img, isProcessing: true, progress: 0, progressMessage: 'Preparing image...', error: null }
        : img
    ));
    setError(null);

    try {
      // Create image element from file
      const imgElement = new Image();
      await new Promise((resolve, reject) => {
        imgElement.onload = resolve;
        imgElement.onerror = reject;
        imgElement.src = image.originalUrl;
      });

      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, progress: 20, progressMessage: 'Upscaling with AI...' }
          : img
      ));

      // Upscale the image
      const upscaledSrc = await upscalerRef.current.upscale(imgElement, {
        output: 'base64',
        patchSize: 64, // Process in smaller patches for progress
        padding: 2,
        progress: (progress: number) => {
          const progressPercent = Math.round(20 + progress * 70);
          setImages(prev => prev.map(img =>
            img.id === imageId
              ? { ...img, progress: progressPercent, progressMessage: `Upscaling: ${progressPercent}%` }
              : img
          ));
        }
      });

      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, progress: 95, progressMessage: 'Finalizing...' }
          : img
      ));

      // Get dimensions of upscaled image
      const upscaledImg = new Image();
      await new Promise((resolve, reject) => {
        upscaledImg.onload = resolve;
        upscaledImg.onerror = reject;
        upscaledImg.src = upscaledSrc;
      });

      setImages(prev => prev.map(img =>
        img.id === imageId
          ? {
              ...img,
              upscaledUrl: upscaledSrc,
              upscaledWidth: upscaledImg.width,
              upscaledHeight: upscaledImg.height,
              isProcessing: false,
              progress: 100,
              progressMessage: 'Complete!'
            }
          : img
      ));

          } catch (err) {
      console.error('Upscale error:', err);
      const errorMsg = createSafeErrorMessage(err, 'Failed to upscale image. Try a smaller image or different settings.');
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, isProcessing: false, error: errorMsg }
          : img
      ));
    }
  };

  const processAllImages = async () => {
    // Load model first if not loaded
    if (!upscalerRef.current && !modelLoading) {
      await loadModel();
    }

    const unprocessedImages = images.filter(img => !img.upscaledUrl && !img.isProcessing);
    for (const image of unprocessedImages) {
      await upscaleImage(image.id);
    }
  };

  const downloadImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.upscaledUrl) return;

    const link = document.createElement('a');
    link.href = image.upscaledUrl;
    const baseName = image.originalName.replace(/\.[^/.]+$/, '');
    link.download = `${baseName}_${scaleFactor}x_upscaled.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = async () => {
    const processedImages = images.filter(img => img.upscaledUrl);

    if (processedImages.length === 0) {
      setError('No upscaled images to download');
      return;
    }

    if (processedImages.length === 1) {
      downloadImage(processedImages[0].id);
      return;
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const image of processedImages) {
        if (!image.upscaledUrl) continue;

        // Convert base64 to blob
        const response = await fetch(image.upscaledUrl);
        const blob = await response.blob();

        const baseName = image.originalName.replace(/\.[^/.]+$/, '');
        zip.file(`${baseName}_${scaleFactor}x_upscaled.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'upscaled_images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create ZIP file. Please try again.'));
    }
  };

  // Reset model when quality or scale changes
  const handleQualityChange = (quality: ModelQuality) => {
    if (quality !== modelQuality) {
      if (upscalerRef.current) {
        upscalerRef.current.dispose?.();
        upscalerRef.current = null;
      }
      setModelLoaded(false);
      setModelQuality(quality);
    }
  };

  const handleScaleChange = (scale: ScaleFactor) => {
    if (scale !== scaleFactor) {
      if (upscalerRef.current) {
        upscalerRef.current.dispose?.();
        upscalerRef.current = null;
      }
      setModelLoaded(false);
      setScaleFactor(scale);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
            
      {/* Settings Panel */}
      <div className="glass-card p-6 mb-6">
        <h4 className="text-sm font-medium text-white mb-4">Upscaling Settings</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scale Factor */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">Scale Factor</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleScaleChange(2)}
                disabled={modelLoading || images.some(img => img.isProcessing)}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  scaleFactor === 2
                    ? 'border-violet-500 bg-violet-500/20 text-white'
                    : 'border-slate-600 bg-slate-800/50 text-[var(--text-muted)] hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-2xl font-bold mb-1">2x</div>
                <div className="text-xs">Double size</div>
              </button>
              <button
                onClick={() => handleScaleChange(4)}
                disabled={modelLoading || images.some(img => img.isProcessing)}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  scaleFactor === 4
                    ? 'border-violet-500 bg-violet-500/20 text-white'
                    : 'border-slate-600 bg-slate-800/50 text-[var(--text-muted)] hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-2xl font-bold mb-1">4x</div>
                <div className="text-xs">Quadruple size</div>
              </button>
            </div>
          </div>

          {/* Model Quality */}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">Quality Mode</label>
            <div className="flex gap-2">
              {(['fast', 'balanced', 'quality'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => handleQualityChange(quality)}
                  disabled={modelLoading || images.some(img => img.isProcessing)}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    modelQuality === quality
                      ? 'border-violet-500 bg-violet-500/20 text-white'
                      : 'border-slate-600 bg-slate-800/50 text-[var(--text-muted)] hover:border-slate-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium capitalize mb-1">{quality}</div>
                  <div className="text-xs opacity-70">{MODEL_INFO[quality].sizeHint}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{MODEL_INFO[modelQuality].description}</p>
          </div>
        </div>

        {/* Model Status */}
        {modelLoading && (
          <div className="mt-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-violet-300">Loading AI Model...</span>
              <span className="text-sm text-violet-400">{modelLoadProgress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                style={{ width: `${modelLoadProgress}%` }}
              />
            </div>
          </div>
        )}

        {modelLoaded && !modelLoading && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-300">AI Model Ready ({scaleFactor}x {modelQuality})</span>
          </div>
        )}
      </div>

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

        <div className="text-5xl mb-4">AI</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop images here or click to browse
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Supports PNG, JPEG, WebP. AI upscaling runs entirely in your browser.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Image List */}
      {images.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-muted)]">
              {images.length} image{images.length > 1 ? 's' : ''} uploaded
            </h4>

            {images.some(img => !img.upscaledUrl && !img.isProcessing) && (
              <button
                onClick={processAllImages}
                disabled={modelLoading}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {modelLoaded ? 'Upscale All' : 'Load Model & Upscale All'}
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
                  <p className="text-[var(--text-muted)] text-sm">
                    {image.originalSize} - {image.originalWidth} x {image.originalHeight}px
                    {image.upscaledUrl && (
                      <span className="text-green-400 ml-2">
                        {String.fromCodePoint(0x2192)} {image.upscaledWidth} x {image.upscaledHeight}px
                      </span>
                    )}
                  </p>
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
              {image.upscaledUrl ? (
                <div
                  className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-4 cursor-ew-resize select-none"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    setComparePosition((x / rect.width) * 100);
                  }}
                  onMouseLeave={() => setComparePosition(50)}
                >
                  {/* Upscaled (After) - Full width, underneath */}
                  <img
                    src={image.upscaledUrl}
                    alt="Upscaled"
                    className="absolute inset-0 w-full h-full object-contain"
                  />

                  {/* Original (Before) - Clipped */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${comparePosition}%` }}
                  >
                    <img
                      src={image.originalUrl}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ width: `${10000 / comparePosition}%`, maxWidth: 'none' }}
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                    style={{ left: `${comparePosition}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-20">
                    Before ({image.originalWidth}x{image.originalHeight})
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-20">
                    After ({image.upscaledWidth}x{image.upscaledHeight})
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 mb-4">
                  <img
                    src={image.originalUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Processing State */}
              {image.isProcessing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-muted)]">{image.progressMessage}</span>
                    <span className="text-sm text-violet-400">{image.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!image.upscaledUrl && !image.isProcessing && (
                  <button
                    onClick={() => upscaleImage(image.id)}
                    disabled={modelLoading}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {modelLoaded ? `Upscale ${scaleFactor}x` : `Load Model & Upscale ${scaleFactor}x`}
                  </button>
                )}

                {image.upscaledUrl && (
                  <button
                    onClick={() => downloadImage(image.id)}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <span>Download {scaleFactor}x Image</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Download */}
      {images.filter(img => img.upscaledUrl).length > 1 && (
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

      {/* Info Box */}
      <div className="mt-6 glass-card p-4">
        <h5 className="text-sm font-medium text-white mb-2">About AI Image Upscaling</h5>
        <p className="text-[var(--text-muted)] text-sm">
          This tool uses ESRGAN (Enhanced Super-Resolution Generative Adversarial Network) AI models
          running directly in your browser via TensorFlow.js. The AI learns patterns from millions of images
          to intelligently add detail when enlarging photos - much better than simple interpolation.
        </p>
        <ul className="mt-3 text-[var(--text-muted)] text-sm space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-green-400">*</span>
            <span>Best for: Photos, illustrations, artwork, game sprites</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400">*</span>
            <span>Tip: Start with smaller images (&lt;1000px) for faster processing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400">*</span>
            <span>The model downloads once ({MODEL_INFO[modelQuality].sizeHint}) and is cached for future use</span>
          </li>
        </ul>
      </div>

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        100% private. AI models run entirely in your browser. Images never leave your device.
      </p>
    </div>
  );
}
