/**
 * VideoCompressor.tsx - MIGRATED TO WEB WORKER
 *
 * This is the MIGRATED version using useFFmpegWorker hook.
 * Compare with the original to see the changes.
 *
 * CHANGES:
 * 1. Removed direct FFmpeg imports
 * 2. Added useFFmpegWorker hook
 * 3. Removed loadFFmpeg function
 * 4. Updated file operations to use worker methods
 * 5. Simplified state management
 */

import { useState, useRef, useEffect } from 'react';
import { useFFmpegWorker } from '../../hooks/useFFmpegWorker';
import ToolFeedback from '../ui/ToolFeedback';
import { validateVideoFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

type Status = 'idle' | 'loading' | 'processing' | 'done' | 'error';

interface SharedArrayBufferCheck {
  supported: boolean;
  message?: string;
}

const checkSharedArrayBuffer = (): SharedArrayBufferCheck => {
  if (typeof SharedArrayBuffer === 'undefined') {
    return {
      supported: false,
      message: 'Your browser does not support SharedArrayBuffer, which is required for video processing. Please try using Chrome, Firefox, or Edge with the latest updates.',
    };
  }
  return { supported: true };
};

export default function VideoCompressor() {
  // Local component state
  const [status, setStatus] = useState<Status>('idle');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [quality, setQuality] = useState('medium');
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] = useState<boolean | null>(null);

  // ✨ NEW: Use FFmpeg Worker Hook
  const {
    isReady,
    progress,
    error: workerError,
    isLoading: workerLoading,
    isProcessing: workerProcessing,
    load,
    exec,
    writeFile,
    readFile,
    deleteFile,
    reset: resetWorker,
  } = useFFmpegWorker();

  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('video-compressor');

  useEffect(() => {
    const check = checkSharedArrayBuffer();
    setSharedArrayBufferSupported(check.supported);
    if (!check.supported) {
      setStatus('error');
    }
  }, []);

  const qualitySettings: Record<string, { crf: string; preset: string; label: string }> = {
    low: { crf: '32', preset: 'fast', label: 'Low (Smallest file)' },
    medium: { crf: '26', preset: 'medium', label: 'Medium (Balanced)' },
    high: { crf: '20', preset: 'slow', label: 'High (Better quality)' },
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security validation
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setStatus('error');
      return;
    }

    // Cleanup previous URL
    if (outputUrl) URL.revokeObjectURL(outputUrl);

    setVideoFile(file);
    setStatus('idle');
    setOutputUrl(null);
    resetWorker();

    // ✨ SIMPLIFIED: Just check if ready, no manual load
    if (!isReady) {
      setStatus('loading');
      try {
        await load();
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    }
  };

  const handleCompress = async () => {
    if (!videoFile || !isReady) return;

    if (!checkUsage()) {
      return;
    }

    setStatus('processing');
    resetWorker();

    const settings = qualitySettings[quality];

    try {
      const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp4';

      // ✨ SIMPLIFIED: Use worker methods
      const fileData = await videoFile.arrayBuffer();
      await writeFile(inputName, fileData);

      // Enhanced FFmpeg settings
      await exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-crf', settings.crf,
        '-preset', settings.preset,
        '-g', '60',
        '-bf', '0',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-y',
        outputName
      ]);

      const data = await readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');
      recordUsage();

      // ✨ SIMPLIFIED: Use worker cleanup
      await deleteFile(inputName);
      await deleteFile(outputName);
    } catch (err) {
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!outputUrl || !videoFile) return;
    const baseName = sanitizeFilename(videoFile.name.replace(/\.[^.]+$/, ''));
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${baseName}_compressed.mp4`;
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const compressionRatio = videoFile && outputSize
    ? Math.round((1 - outputSize / videoFile.size) * 100)
    : 0;

  // Show unsupported message
  if (sharedArrayBufferSupported === false) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div className="space-y-3">
              <h3 className="text-amber-400 font-semibold text-lg">Browser Feature Not Available</h3>
              <p className="text-[var(--text)]">
                Your browser does not support <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-sm">SharedArrayBuffer</code>,
                which is required for video processing with FFmpeg.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="video-compressor" />
      </div>

      {/* Upload */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="video-compress-upload"
          disabled={workerProcessing || workerLoading || sharedArrayBufferSupported !== true}
        />
        <label htmlFor="video-compress-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">🗜️</div>
          <p className="text-[var(--text)] mb-2">
            {videoFile ? videoFile.name : 'Drop video file or click to browse'}
          </p>
          {videoFile && (
            <p className="text-[var(--text-muted)] text-sm">
              Original size: {formatSize(videoFile.size)}
            </p>
          )}
        </label>
      </div>

      {/* Quality Settings */}
      {videoFile && !workerLoading && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <label className="block text-sm text-[var(--text-muted)] mb-2">
            Compression Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(qualitySettings).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setQuality(key)}
                disabled={workerProcessing}
                className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                  quality === key
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {qualitySettings[quality].label}
          </p>
        </div>
      )}

      {/* ✨ SIMPLIFIED: Status display uses worker state */}
      {/* Status - Loading FFmpeg */}
      {workerLoading && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Loading FFmpeg engine... {progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2 mt-2">
            <div
              className="bg-[var(--accent)] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status - Processing */}
      {workerProcessing && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span>Compressing video...</span>
            <span className="text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2">
            <div
              className="bg-[var(--accent)] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {workerError && status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {workerError}
        </div>
      )}

      {/* Compress Button */}
      {videoFile && !workerLoading && status !== 'done' && (
        <button
          onClick={handleCompress}
          disabled={workerProcessing}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {workerProcessing ? 'Compressing...' : 'Compress Video'}
        </button>
      )}

      {/* Result */}
      {status === 'done' && outputUrl && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <span className="text-green-400">Compression complete!</span>
              <p className="text-sm text-[var(--text-muted)]">
                Reduced by {compressionRatio}% ({formatSize(videoFile!.size)} → {formatSize(outputSize)})
              </p>
            </div>
          </div>

          <video controls src={outputUrl} className="w-full rounded-lg" />

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
          >
            Download Compressed Video
          </button>

          <button
            onClick={() => {
              if (outputUrl) URL.revokeObjectURL(outputUrl);
              setVideoFile(null);
              setOutputUrl(null);
              setStatus('idle');
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Compress Another Video
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="video-compressor" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• All processing happens in your browser - videos never uploaded</p>
        <p>• FFmpeg loads in background for responsive UI</p>
      </div>

      {showPrompt && <UpgradePrompt toolId="video-compressor" toolName="Video Compressor" onDismiss={dismissPrompt} />}
    </div>
  );
}
