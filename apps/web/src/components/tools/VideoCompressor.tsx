import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ToolFeedback from '../ui/ToolFeedback';
import { validateVideoFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

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
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [quality, setQuality] = useState('medium');
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const check = checkSharedArrayBuffer();
    setSharedArrayBufferSupported(check.supported);
    if (!check.supported) {
      setError(check.message || 'SharedArrayBuffer not supported');
    }
  }, []);

  const qualitySettings: Record<string, { crf: string; preset: string; label: string }> = {
    low: { crf: '32', preset: 'fast', label: 'Low (Smallest file)' },
    medium: { crf: '26', preset: 'medium', label: 'Medium (Balanced)' },
    high: { crf: '20', preset: 'slow', label: 'High (Better quality)' },
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current && ffmpegLoaded) return;

    // Check SharedArrayBuffer support before loading FFmpeg
    const sabCheck = checkSharedArrayBuffer();
    if (!sabCheck.supported) {
      setError(sabCheck.message || 'SharedArrayBuffer not supported');
      setStatus('error');
      return;
    }

    setStatus('loading');
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setFfmpegLoaded(true);
      setStatus('idle');
    } catch (err) {
      setError('Failed to load FFmpeg. Please try again.');
      setStatus('error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security validation
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid video file');
      return;
    }

    // Cleanup previous URL to prevent memory leaks
    if (outputUrl) URL.revokeObjectURL(outputUrl);

    setVideoFile(file);
    setError(null);
    setOutputUrl(null);

    if (!ffmpegLoaded) {
      await loadFFmpeg();
    }
  };

  const handleCompress = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    setStatus('processing');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;
    const settings = qualitySettings[quality];

    try {
      // Get file extension for proper input handling
      const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Enhanced FFmpeg settings to prevent corruption:
      // - pix_fmt yuv420p: Required for universal player compatibility
      // - profile baseline: Maximum device compatibility
      // - g 60: Keyframe every 60 frames for better seeking
      // - bf 0: No B-frames (improves compatibility, slight quality trade-off)
      // - movflags +faststart: Enable streaming/progressive download
      await ffmpeg.exec([
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

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], { type: 'video/mp4' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');

      // Cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch {
        // Ignore cleanup errors
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Compression failed. Try a different quality setting or a smaller video.'));
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

  // Show unsupported message if SharedArrayBuffer is not available
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
              <div className="text-sm text-[var(--text-muted)] space-y-2">
                <p><strong>This can happen when:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Using an older browser version</li>
                  <li>The site is missing required security headers (COOP/COEP)</li>
                  <li>Using certain privacy-focused browsers or extensions</li>
                </ul>
                <p className="mt-3"><strong>Try these solutions:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use the latest version of Chrome, Firefox, or Edge</li>
                  <li>Disable browser extensions that may block features</li>
                  <li>Try opening the page in a private/incognito window</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="video-compress-upload"
          disabled={status === 'processing' || status === 'loading' || sharedArrayBufferSupported !== true}
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
      {videoFile && status !== 'loading' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <label className="block text-sm text-[var(--text-muted)] mb-2">
            Compression Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(qualitySettings).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setQuality(key)}
                disabled={status === 'processing'}
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

      {/* Status */}
      {status === 'loading' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Loading FFmpeg engine...</span>
          </div>
        </div>
      )}

      {status === 'processing' && (
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Compress Button */}
      {videoFile && status !== 'loading' && status !== 'done' && (
        <button
          onClick={handleCompress}
          disabled={status === 'processing'}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {status === 'processing' ? 'Compressing...' : 'Compress Video'}
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
              // Cleanup URL to prevent memory leaks
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
        <p>• Output is MP4 (H.264) for maximum compatibility</p>
      </div>
    </div>
  );
}
