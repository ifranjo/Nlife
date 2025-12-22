import { useState, useCallback, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

interface ProcessedImage {
  id: string;
  originalFile: File;
  originalName: string;
  originalSize: string;
  originalUrl: string;
  processedUrl: string | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

type BackgroundMode = 'transparent' | 'color' | 'image';

const MAX_FILES = 10; // Limit batch processing

export default function BackgroundRemover() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('transparent');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
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

  const downloadImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.processedUrl) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load processed image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image.processedUrl!;
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

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = image.processedUrl!;
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
        <p className="text-slate-400 text-sm">
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
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
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
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
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
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
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
              <span className="text-slate-400 text-sm">{backgroundColor}</span>
            </div>
          )}

          {backgroundMode === 'image' && backgroundImage && (
            <div className="flex items-center gap-3">
              <img src={backgroundImage} alt="Background" className="w-12 h-12 rounded-lg object-cover" />
              <span className="text-slate-400 text-sm">Custom background selected</span>
            </div>
          )}
        </div>
      )}

      {/* Image List */}
      {images.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-400">
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
                  <p className="text-slate-400 text-sm">{image.originalSize}</p>
                </div>

                <button
                  onClick={() => removeImage(image.id)}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Before/After Comparison */}
              {image.processedUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-4">
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
                        src={image.processedUrl}
                        alt="Processed"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        After
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
                    <span className="text-sm text-slate-400">Processing with AI...</span>
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!image.processedUrl && !image.isProcessing && (
                  <button
                    onClick={() => removeBackground(image.id)}
                    className="flex-1 btn-primary"
                  >
                    Remove Background
                  </button>
                )}

                {image.processedUrl && (
                  <button
                    onClick={() => downloadImage(image.id)}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <span>Download</span>
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
      <p className="mt-6 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        100% private. AI models run entirely in your browser. Images never leave your device.
      </p>
    </div>
  );
}
