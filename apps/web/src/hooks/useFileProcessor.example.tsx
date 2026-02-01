/**
 * Example component demonstrating useFileProcessor migration
 *
 * This is a simplified image compressor showing how to use the hook.
 * Compare with apps/web/src/components/tools/ImageCompress.tsx to see
 * the reduction in boilerplate code.
 */

import { useState } from 'react';
import { useFileProcessor } from '../hooks';
import { useToolUsage, UsageIndicator } from '../ui/UpgradePrompt';

interface CompressedImageMetadata {
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export default function SimpleImageCompressor() {
  const [quality, setQuality] = useState(80);

  // Usage limits integration
  const { checkUsage, recordUsage, dismissPrompt, showPrompt } = useToolUsage('image-compress');

  const { state, handlers, utils, refs, computed } = useFileProcessor<unknown, CompressedImageMetadata>({
    fileCategory: 'image',
    maxFiles: 20,
    processor: async (file) => {
      // Create image bitmap
      const img = await createImageBitmap(file);

      // Create canvas
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not create canvas context');
      }

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Convert to blob with quality
      const mimeType = 'image/jpeg';
      const blob = await canvas.convertToBlob({
        type: mimeType,
        quality: quality / 100,
      });

      return {
        blob,
        filename: file.name.replace(/\.[^.]+$/, '_compressed.jpg'),
        metadata: {
          originalSize: file.size,
          compressedSize: blob.size,
          width: img.width,
          height: img.height,
        },
      };
    },
    onProcessingComplete: () => {
      recordUsage();
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Usage Indicator */}
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="image-compress" />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onClick={() => {
          if (state.status !== 'processing') {
            refs.fileInputRef.current?.click();
          }
        }}
        className={`
          drop-zone rounded-2xl p-12 text-center cursor-pointer
          transition-colors border-2 border-dashed
          ${state.dragDrop.isDragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--border)] hover:border-[var(--text-muted)]'
          }
          ${state.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={refs.fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => {
            if (e.target.files) {
              void handlers.onFileSelect(e);
            }
          }}
          className="hidden"
          disabled={state.status === 'processing'}
        />

        <div className="text-5xl mb-4">🖼️</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop images here or click to browse
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Supports PNG, JPEG, WebP. Max 10MB per image, up to 20 images.
        </p>
      </div>

      {/* Error message */}
      {state.error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {state.error}
        </div>
      )}

      {/* Settings Panel */}
      {computed.hasFiles && (
        <div className="glass-card p-6 mt-6">
          <h4 className="text-white font-medium mb-4">Compression Settings</h4>

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
              aria-label="Image quality"
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>
          </div>

          {/* Compress Button */}
          <button
            onClick={() => {
              if (checkUsage()) {
                void handlers.onProcess();
              }
            }}
            disabled={state.status === 'processing'}
            className={`
              mt-6 w-full btn-primary flex items-center justify-center gap-2
              ${state.status === 'processing' ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {state.status === 'processing' ? (
              <>
                <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Compressing... ({state.progress}%)</span>
              </>
            ) : (
              <>
                <span>Compress {computed.totalFiles} Image{computed.totalFiles > 1 ? 's' : ''}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* File List */}
      {computed.hasFiles && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-muted)]">
              {computed.totalFiles} image{computed.totalFiles > 1 ? 's' : ''} selected
            </h4>
            <button
              onClick={handlers.onClearAll}
              className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>

          {state.files.map((file) => (
            <div
              key={file.id}
              className="glass-card p-4 flex items-center gap-4 rounded-xl"
            >
              {/* Status indicator */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {file.status === 'idle' && (
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                )}
                {file.status === 'processing' && (
                  <svg className="w-5 h-5 spinner text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {file.status === 'done' && (
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {file.status === 'error' && (
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--text-muted)]">
                    {utils.formatFileSize(file.originalSize)}
                  </span>
                  {file.status === 'done' && file.result?.metadata && (
                    <>
                      <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="text-white">
                        {utils.formatFileSize(file.result.metadata.compressedSize)}
                      </span>
                      <span
                        className={`font-medium ${
                          file.result.metadata.compressedSize < file.result.metadata.originalSize
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {Math.round(
                          (1 - file.result.metadata.compressedSize / file.result.metadata.originalSize) * 100
                        )}% smaller
                      </span>
                    </>
                  )}
                  {file.status === 'error' && (
                    <span className="text-red-400">{file.error}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {file.status === 'done' && (
                  <button
                    onClick={() => handlers.onDownload(file)}
                    className="p-2 text-green-400 hover:text-green-300 transition-colors"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
                {file.status === 'error' && (
                  <button
                    onClick={() => {
                      void handlers.onRetryFile(file.id);
                    }}
                    className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                    title="Retry"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handlers.onRemoveFile(file.id)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
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
      {computed.hasCompletedFiles && (
        <button
          onClick={() => {
            void handlers.onDownloadAll();
          }}
          className={`
            mt-6 w-full btn-primary flex items-center justify-center gap-2
            bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span>Download All as ZIP</span>
        </button>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your images never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
