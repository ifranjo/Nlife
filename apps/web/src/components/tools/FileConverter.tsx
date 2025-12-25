import { useState, useCallback, useRef } from 'react';
import { sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

interface ImageFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalFormat: string;
  convertedBlob: Blob | null;
  convertedSize: number | null;
  thumbnail: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

type OutputFormat = 'jpg' | 'png' | 'webp';

const MAX_FILES = 20;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per image (HEIC can be large)

// Supported input extensions (used in validation function)
const SUPPORTED_EXTENSIONS = ['heic', 'heif', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
};

const FORMAT_MIME: Record<OutputFormat, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export default function FileConverter() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg');
  const [quality, setQuality] = useState(90);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const getFormatFromFile = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['heic', 'heif'].includes(ext)) return 'HEIC';
    if (['jpg', 'jpeg'].includes(ext)) return 'JPG';
    if (ext === 'png') return 'PNG';
    if (ext === 'webp') return 'WebP';
    if (ext === 'bmp') return 'BMP';
    if (ext === 'gif') return 'GIF';
    return ext.toUpperCase();
  };

  const isHeicFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ['heic', 'heif'].includes(ext) ||
           file.type === 'image/heic' ||
           file.type === 'image/heif';
  };

  const createThumbnail = async (file: File): Promise<string> => {
    // For HEIC files, we need to convert first to get a thumbnail
    if (isHeicFile(file)) {
      try {
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.3, // Low quality for thumbnail
        }) as Blob;
        return URL.createObjectURL(convertedBlob);
      } catch {
        // Return a placeholder if HEIC preview fails
        return '';
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertHeicToBlob = async (file: File, format: OutputFormat, qualityPercent: number): Promise<Blob> => {
    const heic2any = (await import('heic2any')).default;
    const mimeType = FORMAT_MIME[format];

    const result = await heic2any({
      blob: file,
      toType: mimeType,
      quality: qualityPercent / 100,
    });

    // heic2any can return an array or single blob
    return Array.isArray(result) ? result[0] : result;
  };

  const convertImageWithCanvas = async (
    file: File,
    format: OutputFormat,
    qualityPercent: number
  ): Promise<Blob> => {
    const img = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // For JPG output, fill background with white (for transparent PNGs)
    if (format === 'jpg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const mimeType = FORMAT_MIME[format];
    const blob = await canvas.convertToBlob({
      type: mimeType,
      quality: qualityPercent / 100,
    });

    return blob;
  };

  const convertImage = async (
    file: File,
    format: OutputFormat,
    qualityPercent: number
  ): Promise<Blob> => {
    if (isHeicFile(file)) {
      return convertHeicToBlob(file, format, qualityPercent);
    }
    return convertImageWithCanvas(file, format, qualityPercent);
  };

  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
    }

    // Check file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `Unsupported format: .${ext}` };
    }

    return { valid: true };
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
      const validation = validateImageFile(file);

      if (validation.valid) {
        const thumbnail = await createThumbnail(file);
        validatedFiles.push({
          id: generateId(),
          file,
          name: sanitizeFilename(file.name),
          originalSize: file.size,
          originalFormat: getFormatFromFile(file),
          convertedBlob: null,
          convertedSize: null,
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

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.thumbnail && file.thumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(file.thumbnail);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.thumbnail && file.thumbnail.startsWith('blob:')) {
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

  const convertAllImages = async () => {
    if (files.length === 0) {
      setError('Please add at least 1 image to convert');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Reset all files to pending
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        status: 'pending' as const,
        convertedBlob: null,
        convertedSize: null,
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
        const convertedBlob = await convertImage(
          imageFile.file,
          outputFormat,
          quality
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === imageFile.id
              ? {
                  ...f,
                  status: 'done' as const,
                  convertedBlob,
                  convertedSize: convertedBlob.size,
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
                  error: createSafeErrorMessage(err, 'Conversion failed'),
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const downloadSingleImage = (imageFile: ImageFile) => {
    if (!imageFile.convertedBlob) return;

    const url = URL.createObjectURL(imageFile.convertedBlob);
    const link = document.createElement('a');
    link.href = url;

    // Generate filename with new extension
    const baseName = imageFile.name.replace(/\.[^.]+$/, '');
    const ext = FORMAT_EXTENSIONS[outputFormat];
    link.download = `${baseName}.${ext}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    const completedFiles = files.filter(
      (f) => f.status === 'done' && f.convertedBlob
    );

    if (completedFiles.length === 0) {
      setError('No converted images to download');
      return;
    }

    setIsProcessing(true);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const imageFile of completedFiles) {
        if (imageFile.convertedBlob) {
          const baseName = imageFile.name.replace(/\.[^.]+$/, '');
          const ext = FORMAT_EXTENSIONS[outputFormat];
          zip.file(`${baseName}.${ext}`, imageFile.convertedBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted_images.zip';
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

  const hasConvertedFiles = files.some((f) => f.status === 'done' && f.convertedBlob);
  const heicCount = files.filter((f) => isHeicFile(f.file)).length;

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
          accept=".heic,.heif,.png,.jpg,.jpeg,.webp,.bmp,.gif,image/heic,image/heif,image/png,image/jpeg,image/webp,image/bmp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-5xl mb-4">🔄</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop images here or click to browse
        </h3>
        <p className="text-slate-400 text-sm">
          Supports <span className="text-cyan-400 font-medium">HEIC</span> (iPhone), PNG, JPG, WebP, BMP, GIF
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Max 50MB per image, up to 20 images
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
          <h4 className="text-white font-medium mb-4">Conversion Settings</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Output Format */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">
                Convert to
              </label>
              <div className="flex gap-2">
                {(['jpg', 'png', 'webp'] as OutputFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setOutputFormat(format)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${outputFormat === format
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider (only for JPG/WebP) */}
            {(outputFormat === 'jpg' || outputFormat === 'webp') && (
              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  Quality: <span className="text-white font-medium">{quality}%</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Smaller file</span>
                  <span>Higher quality</span>
                </div>
              </div>
            )}
          </div>

          {/* HEIC notice */}
          {heicCount > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm">
              <strong>{heicCount} HEIC file{heicCount > 1 ? 's' : ''}</strong> detected (iPhone photos).
              These will be converted using the heic2any library.
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={convertAllImages}
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
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span>Convert {files.length} Image{files.length > 1 ? 's' : ''} to {outputFormat.toUpperCase()}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-400">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </h4>
            <button
              onClick={clearAllFiles}
              className="text-sm text-slate-500 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>

          {files.map((imageFile) => (
            <div
              key={imageFile.id}
              className="glass-card p-4 flex items-center gap-4"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                {imageFile.thumbnail ? (
                  <img
                    src={imageFile.thumbnail}
                    alt={imageFile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">📷</span>
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{imageFile.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    imageFile.originalFormat === 'HEIC'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {imageFile.originalFormat}
                  </span>
                  <span className="text-slate-400">
                    {formatFileSize(imageFile.originalSize)}
                  </span>
                  {imageFile.status === 'done' && imageFile.convertedSize !== null && (
                    <>
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300">
                        {outputFormat.toUpperCase()}
                      </span>
                      <span className="text-white">
                        {formatFileSize(imageFile.convertedSize)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status / Actions */}
              <div className="flex items-center gap-2">
                {imageFile.status === 'processing' && (
                  <svg className="w-5 h-5 text-cyan-400 spinner" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {imageFile.status === 'done' && imageFile.convertedBlob && (
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

                {/* Remove button */}
                <button
                  onClick={() => removeFile(imageFile.id)}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download All Button */}
      {hasConvertedFiles && (
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

      {/* Supported Formats Info */}
      <div className="mt-8 glass-card p-6">
        <h4 className="text-white font-medium mb-4">Supported Conversions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="text-cyan-400 font-medium mb-2">Input Formats</h5>
            <ul className="space-y-1 text-slate-400">
              <li><span className="text-cyan-300 font-medium">HEIC/HEIF</span> - iPhone photos</li>
              <li><span className="text-slate-300">PNG</span> - Lossless with transparency</li>
              <li><span className="text-slate-300">JPG/JPEG</span> - Standard photos</li>
              <li><span className="text-slate-300">WebP</span> - Modern web format</li>
              <li><span className="text-slate-300">BMP</span> - Windows bitmap</li>
              <li><span className="text-slate-300">GIF</span> - Graphics format</li>
            </ul>
          </div>
          <div>
            <h5 className="text-green-400 font-medium mb-2">Output Formats</h5>
            <ul className="space-y-1 text-slate-400">
              <li><span className="text-green-300 font-medium">JPG</span> - Best for photos, smaller size</li>
              <li><span className="text-green-300 font-medium">PNG</span> - Preserves transparency</li>
              <li><span className="text-green-300 font-medium">WebP</span> - Modern, best compression</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <p className="mt-6 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your images never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
