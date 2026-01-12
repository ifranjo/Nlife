import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
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

export default function VideoTrimmer() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [preciseMode, setPreciseMode] = useState(true); // Re-encode for precise cuts
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] = useState<boolean | null>(null);
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('video-trimmer');

  useEffect(() => {
    const check = checkSharedArrayBuffer();
    setSharedArrayBufferSupported(check.supported);
    if (!check.supported) {
      setError(check.message || 'SharedArrayBuffer not supported');
    }
  }, []);

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
      setError('Failed to load FFmpeg.');
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

    // Cleanup previous URLs to prevent memory leaks
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setError(null);
    setOutputUrl(null);
    setStartTime(0);

    if (!ffmpegLoaded) {
      await loadFFmpeg();
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
    }
  };

  const handleTrim = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    if (!checkUsage()) {
      return;
    }

    setStatus('processing');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;

    try {
      const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      // Always output MP4 when re-encoding for compatibility
      const outputName = preciseMode ? 'output.mp4' : `output.${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const durationSec = endTime - startTime;

      if (preciseMode) {
        // Re-encode mode: Precise cuts, no frozen frames
        // Uses same robust settings as VideoCompressor
        await ffmpeg.exec([
          '-ss', startTime.toFixed(3),
          '-i', inputName,
          '-t', durationSec.toFixed(3),
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-profile:v', 'baseline',
          '-level', '3.1',
          '-crf', '23',
          '-preset', 'fast',
          '-g', '60',
          '-bf', '0',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-ac', '2',
          '-movflags', '+faststart',
          '-avoid_negative_ts', 'make_zero',
          '-y',
          outputName
        ]);
      } else {
        // Fast mode: Stream copy (may have slight timing issues at cut points)
        await ffmpeg.exec([
          '-ss', startTime.toFixed(3),
          '-i', inputName,
          '-t', durationSec.toFixed(3),
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          '-y',
          outputName
        ]);
      }

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const mimeType = preciseMode ? 'video/mp4' : videoFile.type;
      const blob = new Blob([new Uint8Array(data)], { type: mimeType });
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');
      recordUsage();

      // Cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch {
        // Ignore cleanup errors
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Trimming failed. Try a shorter clip or different video.'));
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!outputUrl || !videoFile) return;
    const baseName = sanitizeFilename(videoFile.name.replace(/\.[^.]+$/, ''));
    // Use MP4 extension when in precise mode (re-encoded)
    const ext = preciseMode ? 'mp4' : (videoFile.name.split('.').pop() || 'mp4');
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${baseName}_trimmed.${ext}`;
    a.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handlePreviewStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
  };

  const handlePreviewEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = endTime;
    }
  };

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
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="video-trimmer" />
      </div>

      {/* Upload */}
      {!videoFile && (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="video-trim-upload"
            disabled={sharedArrayBufferSupported !== true}
          />
          <label htmlFor="video-trim-upload" className="cursor-pointer block">
            <div className="text-4xl mb-4">✂️</div>
            <p className="text-[var(--text)]">Drop video file or click to browse</p>
            <p className="text-[var(--text-muted)] text-xs mt-2">Supports MP4, WebM, MOV, AVI</p>
          </label>
        </div>
      )}

      {/* Video Preview */}
      {videoUrl && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full rounded-lg"
          />

          {/* Timeline */}
          {duration > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Start: {formatTime(startTime)}</span>
                  <span className="text-[var(--text-muted)]">End: {formatTime(endTime)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--accent)]">
                  <span>Duration: {formatTime(endTime - startTime)}</span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <div>
                  <span className="text-sm text-[var(--text)]">Precise Mode</span>
                  <p className="text-xs text-[var(--text-muted)]">
                    {preciseMode ? 'Re-encodes for exact cuts (recommended)' : 'Fast copy, may have frozen start frame'}
                  </p>
                </div>
                <button
                  onClick={() => setPreciseMode(!preciseMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    preciseMode ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      preciseMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Range Sliders */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Start Time</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStartTime(Math.min(val, endTime - 0.1));
                      }}
                      className="flex-1 accent-[var(--accent)]"
                    />
                    <button
                      onClick={handlePreviewStart}
                      className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
                    >
                      Preview
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">End Time</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={endTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setEndTime(Math.max(val, startTime + 0.1));
                      }}
                      className="flex-1 accent-[var(--accent)]"
                    />
                    <button
                      onClick={handlePreviewEnd}
                      className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            <span>Trimming video...</span>
            <span className="text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2">
            <div className="bg-[var(--accent)] h-2 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Trim Button */}
      {videoFile && duration > 0 && status !== 'done' && (
        <button
          onClick={handleTrim}
          disabled={status === 'processing' || status === 'loading'}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {status === 'processing' ? 'Trimming...' : `Trim Video (${formatTime(endTime - startTime)})`}
        </button>
      )}

      {/* Result */}
      {status === 'done' && outputUrl && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="text-green-400">Video trimmed successfully!</span>
          </div>

          <video controls src={outputUrl} className="w-full rounded-lg" />

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
          >
            Download Trimmed Video
          </button>

          <button
            onClick={() => {
              // Cleanup URLs to prevent memory leaks
              if (videoUrl) URL.revokeObjectURL(videoUrl);
              if (outputUrl) URL.revokeObjectURL(outputUrl);
              setVideoFile(null);
              setVideoUrl(null);
              setOutputUrl(null);
              setStatus('idle');
              setDuration(0);
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Trim Another Video
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="video-trimmer" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• All processing happens in your browser - video never uploaded</p>
        <p>• Precise mode re-encodes for exact cuts and prevents frozen frames</p>
        <p>• Output is MP4 (H.264) for maximum compatibility</p>
      </div>

      {showPrompt && <UpgradePrompt toolId="video-trimmer" toolName="Video Trimmer" onDismiss={dismissPrompt} />}
    </div>
  );
}
