import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';
import { announce, haptic } from '../../lib/accessibility';
import SwipeableListItem from '../ui/SwipeableListItem';
import ZoomableImage from '../ui/ZoomableImage';

interface ImageFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedBlob: Blob | null;
  compressedSize: number | null;
  thumbnail: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

type OutputFormat = 'original' | 'webp' | 'jpeg';

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image

// Safari fallback for OffscreenCanvas
const createCanvas = (width: number, height: number): OffscreenCanvas | HTMLCanvasElement => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  // Safari fallback
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const canvasToBlob = async (
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> => {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  // Safari fallback using HTMLCanvasElement.toBlob
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
};

export default function ImageCompress() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('original');
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0); // For roving tabindex

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const calculateReduction = (original: number, compressed: number): string => {
    const reduction = ((original - compressed) / original) * 100;
    return reduction > 0 ? `-${reduction.toFixed(1)}%` : `+${Math.abs(reduction).toFixed(1)}%`;
  };

  const createThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getOutputMimeType = (file: File, format: OutputFormat): string => {
    if (format === 'webp') return 'image/webp';
    if (format === 'jpeg') return 'image/jpeg';
    // For 'original', keep the same type but fallback to jpeg for unsupported canvas output types
    if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp') {
      return file.type;
    }
    return 'image/jpeg'; // Fallback for GIF etc.
  };

  const getOutputExtension = (file: File, format: OutputFormat): string => {
    if (format === 'webp') return 'webp';
    if (format === 'jpeg') return 'jpg';
    // Extract from original filename
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
      return ext;
    }
    return 'jpg';
  };

  const compressImage = async (
    file: File,
    qualityPercent: number,
    format: OutputFormat
  ): Promise<Blob> => {
    const img = await createImageBitmap(file);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    ctx.drawImage(img, 0, 0);

    const mimeType = getOutputMimeType(file, format);
    const blob = await canvasToBlob(canvas, mimeType, qualityPercent / 100);

    return blob;
  };

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Check max files limit
    if (files.length + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images allowed`);
      return;
    }

    const validatedFiles: ImageFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      // Check size first
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 10MB limit`);
        continue;
      }

      const validation = await validateFile(file, 'image');

      if (validation.valid) {
        const thumbnail = await createThumbnail(file);
        validatedFiles.push({
          id: generateId(),
          file,
          name: sanitizeFilename(file.name),
          originalSize: file.size,
          compressedBlob: null,
          compressedSize: null,
          thumbnail,
          status: 'pending',
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (validatedFiles.length > 0) {
      setFiles((prev) => [...prev, ...validatedFiles]);
    }

    if (errors.length > 0) {
      setError(errors.length === 1 ? errors[0] : `${errors.length} files rejected`);
    } else {
      setError(null);
    }
  }, [files.length]);

  const removeFile = (id: string, fileName?: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.thumbnail) {
        URL.revokeObjectURL(file.thumbnail);
      }
      const filtered = prev.filter((f) => f.id !== id);
      // Adjust active index if needed
      if (activeFileIndex >= filtered.length && filtered.length > 0) {
        setActiveFileIndex(filtered.length - 1);
      }
      return filtered;
    });
    announce(`${fileName || 'File'} removed`);
    haptic.tap();
  };

  // Keyboard navigation for file list (roving tabindex pattern)
  const handleFileKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < files.length - 1) {
          setActiveFileIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setActiveFileIndex(index - 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveFileIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveFileIndex(files.length - 1);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        removeFile(files[index].id, files[index].name);
        break;
    }
  };

  // Focus active file when activeFileIndex changes
  useEffect(() => {
    if (fileListRef.current && files.length > 0) {
      const activeItem = fileListRef.current.querySelector(`[data-index="${activeFileIndex}"]`) as HTMLElement;
      activeItem?.focus();
    }
  }, [activeFileIndex, files.length]);

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.thumbnail) {
        URL.revokeObjectURL(file.thumbnail);
      }
    });
    setFiles([]);
    setError(null);
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

  const compressAllImages = async () => {
    if (files.length === 0) {
      setError('Please add at least 1 image to compress');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Reset all files to pending
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        status: 'pending' as const,
        compressedBlob: null,
        compressedSize: null,
        error: undefined,
      }))
    );

    for (let i = 0; i < files.length; i++) {
      const imageFile = files[i];

      // Update status to processing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === imageFile.id ? { ...f, status: 'processing' as const } : f
        )
      );

      try {
        const compressedBlob = await compressImage(
          imageFile.file,
          quality,
          outputFormat
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === imageFile.id
              ? {
                  ...f,
                  status: 'done' as const,
                  compressedBlob,
                  compressedSize: compressedBlob.size,
                }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === imageFile.id
              ? {
                  ...f,
                  status: 'error' as const,
                  error: createSafeErrorMessage(err, 'Compression failed'),
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const downloadSingleImage = (imageFile: ImageFile) => {
    if (!imageFile.compressedBlob) return;

    const url = URL.createObjectURL(imageFile.compressedBlob);
    const link = document.createElement('a');
    link.href = url;

    // Generate filename with new extension
    const baseName = imageFile.name.replace(/\.[^.]+$/, '');
    const ext = getOutputExtension(imageFile.file, outputFormat);
    link.download = `${baseName}_compressed.${ext}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    const completedFiles = files.filter(
      (f) => f.status === 'done' && f.compressedBlob
    );

    if (completedFiles.length === 0) {
      setError('No compressed images to download');
      return;
    }

    setIsProcessing(true);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const imageFile of completedFiles) {
        if (imageFile.compressedBlob) {
          const baseName = imageFile.name.replace(/\.[^.]+$/, '');
          const ext = getOutputExtension(imageFile.file, outputFormat);
          zip.file(`${baseName}_compressed.${ext}`, imageFile.compressedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'compressed_images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create ZIP file'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getTotalStats = () => {
    const completed = files.filter((f) => f.status === 'done' && f.compressedSize !== null);
    if (completed.length === 0) return null;

    const totalOriginal = completed.reduce((sum, f) => sum + f.originalSize, 0);
    const totalCompressed = completed.reduce((sum, f) => sum + (f.compressedSize || 0), 0);
    const totalSaved = totalOriginal - totalCompressed;
    const percentSaved = ((totalSaved / totalOriginal) * 100).toFixed(1);

    return {
      totalOriginal,
      totalCompressed,
      totalSaved,
      percentSaved,
      count: completed.length,
    };
  };

  const stats = getTotalStats();
  const hasCompressedFiles = files.some((f) => f.status === 'done' && f.compressedBlob);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          drop-zone rounded-2xl p-12 text-center cursor-pointer
          ${isDragging ? 'drag-over' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-5xl mb-4">🖼️</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop images here or click to browse
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Supports PNG, JPEG, WebP, GIF. Max 10MB per image, up to 20 images.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Settings Panel */}
      {files.length > 0 && (
        <div className="glass-card p-6 mt-6">
          <h4 className="text-white font-medium mb-4">Compression Settings</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quality Slider */}
            <div>
              <label className="block text-[var(--text-muted)] text-sm mb-2">
                Quality: <span className="text-white font-medium">{quality}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>

            {/* Output Format */}
            <div>
              <label className="block text-[var(--text-muted)] text-sm mb-2">
                Output Format
              </label>
              <div className="flex gap-2">
                {(['original', 'webp', 'jpeg'] as OutputFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setOutputFormat(format)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${outputFormat === format
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-[var(--text-muted)] hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    {format === 'original' ? 'Keep Original' : format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compress Button */}
          <button
            onClick={compressAllImages}
            disabled={isProcessing}
            className={`
              mt-6 w-full btn-primary flex items-center justify-center gap-2
              ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Compressing...</span>
              </>
            ) : (
              <>
                <span>Compress {files.length} Image{files.length > 1 ? 's' : ''}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="glass-card p-4 mt-6 bg-green-500/10 border border-green-500/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-green-300">
              <span className="text-2xl font-bold">{stats.percentSaved}%</span>
              <span className="text-sm ml-2">total reduction</span>
            </div>
            <div className="text-[var(--text-muted)] text-sm">
              {formatFileSize(stats.totalOriginal)} → {formatFileSize(stats.totalCompressed)}
              <span className="text-green-400 ml-2">
                (saved {formatFileSize(stats.totalSaved)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* File List - Roving tabindex for keyboard navigation */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-muted)]">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </h4>
            <button
              onClick={clearAllFiles}
              className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div
            ref={fileListRef}
            role="list"
            aria-label={`${files.length} images selected. Use arrow keys to navigate, Delete to remove.`}
          >
          {files.map((imageFile, index) => (
            <div
              key={imageFile.id}
              role="listitem"
              tabIndex={index === activeFileIndex ? 0 : -1}
              data-index={index}
              onKeyDown={(e) => handleFileKeyDown(e, index)}
              aria-label={`${imageFile.name}, ${formatFileSize(imageFile.originalSize)}${imageFile.status === 'done' ? ', compressed' : ''}`}
              className="mb-3 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-xl"
            >
            <SwipeableListItem
              onDelete={() => removeFile(imageFile.id, imageFile.name)}
              itemName={imageFile.name}
              disabled={isProcessing}
              className="glass-card rounded-xl"
              aria-label={`${imageFile.name}. Swipe left to delete.`}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Thumbnail - clickable to open preview */}
                <button
                  onClick={() => setPreviewImage(imageFile)}
                  className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 hover:ring-2 hover:ring-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Click to zoom"
                  aria-label={`Preview ${imageFile.name}`}
                >
                  {imageFile.thumbnail && (
                    <img
                      src={imageFile.thumbnail}
                      alt={imageFile.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{imageFile.name}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)]">
                      {formatFileSize(imageFile.originalSize)}
                    </span>
                    {imageFile.status === 'done' && imageFile.compressedSize !== null && (
                      <>
                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="text-white">
                          {formatFileSize(imageFile.compressedSize)}
                        </span>
                        <span
                          className={`font-medium ${
                            imageFile.compressedSize < imageFile.originalSize
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }`}
                        >
                          {calculateReduction(imageFile.originalSize, imageFile.compressedSize)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status / Actions */}
                <div className="flex items-center gap-2">
                  {imageFile.status === 'processing' && (
                    <svg className="w-5 h-5 text-indigo-400 spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {imageFile.status === 'done' && imageFile.compressedBlob && (
                    <button
                      onClick={() => downloadSingleImage(imageFile)}
                      className="p-2 text-green-400 hover:text-green-300 transition-colors"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  )}
                  {imageFile.status === 'error' && (
                    <span className="text-red-400 text-sm">{imageFile.error}</span>
                  )}

                  {/* Spacer for delete button area (handled by SwipeableListItem) */}
                  <div className="w-8" aria-hidden="true" />
                </div>
              </div>
            </SwipeableListItem>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Download All Button */}
      {hasCompressedFiles && (
        <button
          onClick={downloadAllAsZip}
          disabled={isProcessing}
          className={`
            mt-6 w-full btn-primary flex items-center justify-center gap-2
            bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500
            ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
          `}
        >
          {isProcessing ? (
            <>
              <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Creating ZIP...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>Download All as ZIP</span>
            </>
          )}
        </button>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your images never leave your browser. All processing happens locally.
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
            className="relative max-w-4xl w-full max-h-[80vh] bg-slate-900 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with filename and close button */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-white font-medium">{previewImage.name}</h3>
                <p className="text-[var(--text-muted)] text-sm">
                  {formatFileSize(previewImage.originalSize)}
                  {previewImage.compressedSize && (
                    <span className="text-green-400 ml-2">
                      Compressed: {formatFileSize(previewImage.compressedSize)}
                    </span>
                  )}
                </p>
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
            <div className="h-[60vh]">
              <ZoomableImage
                src={previewImage.thumbnail || ''}
                alt={previewImage.name}
                containerClassName="w-full h-full bg-slate-900"
                className="rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
