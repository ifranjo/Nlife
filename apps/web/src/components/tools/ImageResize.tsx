import { useState, useCallback, useRef } from 'react';
import { validateFile } from '../../lib/security';

interface ImageDimensions {
  width: number;
  height: number;
}

const PRESET_SIZES = [
  { name: 'Instagram Post', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Twitter Post', width: 1200, height: 675 },
  { name: 'Facebook Cover', width: 820, height: 312 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720 },
  { name: 'LinkedIn Banner', width: 1584, height: 396 },
];

export default function ImageResize() {
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<ImageDimensions | null>(null);
  const [targetDimensions, setTargetDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [quality, setQuality] = useState(90);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file with security checks
    const validation = await validateFile(file, 'image');
    if (!validation.valid) {
      console.error('Invalid file:', validation.error);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setOriginalDimensions({ width: img.width, height: img.height });
        setTargetDimensions({ width: img.width, height: img.height });

        // Clear previous preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [previewUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleWidthChange = (width: number) => {
    if (!originalDimensions) return;

    setTargetDimensions(prev => {
      if (aspectRatioLocked) {
        const aspectRatio = originalDimensions.width / originalDimensions.height;
        return { width, height: Math.round(width / aspectRatio) };
      }
      return { ...prev, width };
    });
  };

  const handleHeightChange = (height: number) => {
    if (!originalDimensions) return;

    setTargetDimensions(prev => {
      if (aspectRatioLocked) {
        const aspectRatio = originalDimensions.width / originalDimensions.height;
        return { width: Math.round(height * aspectRatio), height };
      }
      return { ...prev, height };
    });
  };

  const applyPreset = (width: number, height: number) => {
    setTargetDimensions({ width, height });
    setAspectRatioLocked(false);
  };

  const resizeImage = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;

    
    setProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = targetDimensions.width;
    canvas.height = targetDimensions.height;

    // High-quality resize
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImage, 0, 0, targetDimensions.width, targetDimensions.height);

    // Convert to blob and create preview URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
                  }
        setProcessing(false);
      },
      `image/${format}`,
      quality / 100
    );
  }, [originalImage, targetDimensions, format, quality, previewUrl]);

  const downloadImage = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resized-${targetDimensions.width}x${targetDimensions.height}.${format === 'jpeg' ? 'jpg' : format}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      `image/${format}`,
      quality / 100
    );
  }, [targetDimensions, format, quality]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-4 flex justify-end">
              </div>
      {/* Upload Zone */}
      {!originalImage && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center
                     hover:border-white/40 hover:bg-white/5 transition-all cursor-pointer"
        >
          <div className="space-y-4">
            <div className="text-6xl">📐</div>
            <div>
              <p className="text-lg text-white mb-2">Drop an image here or click to browse</p>
              <p className="text-sm text-[var(--text-muted)]">Supports JPG, PNG, WebP, GIF</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Controls */}
      {originalImage && originalDimensions && (
        <>
          {/* Image Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Original Size</p>
                <p className="text-lg font-mono text-white">
                  {originalDimensions.width} × {originalDimensions.height}
                </p>
              </div>
              <button
                onClick={() => {
                  setOriginalImage(null);
                  setOriginalDimensions(null);
                  setTargetDimensions({ width: 0, height: 0 });
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Remove Image
              </button>
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Target Dimensions</h3>
              <button
                onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                className={`p-2 rounded-lg transition-all ${
                  aspectRatioLocked
                    ? 'bg-cyan-400/20 text-cyan-400'
                    : 'bg-white/10 text-[var(--text-muted)]'
                }`}
                title={aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              >
                {aspectRatioLocked ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Width (px)</label>
                <input
                  type="number"
                  value={targetDimensions.width}
                  onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2
                           text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Height (px)</label>
                <input
                  type="number"
                  value={targetDimensions.height}
                  onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2
                           text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium mb-3">Preset Sizes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRESET_SIZES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.width, preset.height)}
                  className="text-left p-3 bg-white/10 hover:bg-white/20 border border-white/10
                           rounded-lg transition-all"
                >
                  <p className="text-sm text-white">{preset.name}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    {preset.width} × {preset.height}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Format & Quality */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-white mb-3">Output Format</label>
              <div className="grid grid-cols-3 gap-3">
                {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`py-2 px-4 rounded-lg border transition-all ${
                      format === fmt
                        ? 'bg-white/20 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:bg-white/10'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {format !== 'png' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-white">Quality</label>
                  <span className="text-sm font-mono text-cyan-400 bg-white/10 px-3 py-1 rounded">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-white
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:hover:bg-cyan-400
                           [&::-webkit-slider-thumb]:transition-colors"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resizeImage}
              disabled={processing || targetDimensions.width === 0 || targetDimensions.height === 0}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Preview Resize'}
            </button>
            {previewUrl && (
              <button
                onClick={downloadImage}
                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400
                         border border-green-500/30 rounded-lg px-6 py-3 font-medium
                         transition-all"
              >
                Download Image
              </button>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Preview</h3>
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Resized preview"
                  className="max-w-full max-h-96 border border-white/10 rounded"
                />
              </div>
              <p className="text-center text-sm text-[var(--text-muted)] mt-3">
                {targetDimensions.width} × {targetDimensions.height}
              </p>
            </div>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>All image processing happens locally in your browser using Canvas API.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Your images never leave your device. No upload to servers.
        </p>
      </div>

          </div>
  );
}
