import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ToolFeedback from '../ui/ToolFeedback';
import { validateVideoFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

type ConversionStatus = 'idle' | 'loading' | 'converting' | 'done' | 'error';

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

export default function VideoToMp3() {
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [bitrate, setBitrate] = useState('192');
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
    setProgress(0);

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    ffmpeg.on('log', () => {
      // FFmpeg log output - disabled in production
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

    setVideoFile(file);
    setError(null);
    setAudioUrl(null);

    if (!ffmpegLoaded) {
      await loadFFmpeg();
    }
  };

  const handleConvert = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    
    setStatus('converting');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;

    try {
      // Use proper extension for better format detection
      const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp3';

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Enhanced audio extraction settings
      await ffmpeg.exec([
        '-i', inputName,
        '-vn',                    // No video
        '-acodec', 'libmp3lame',
        '-b:a', `${bitrate}k`,
        '-ar', '44100',           // Standard sample rate
        '-ac', '2',               // Stereo
        '-y',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
      setStatus('done');
      
      // Cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch {
        // Ignore cleanup errors
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Conversion failed. The video may not have an audio track.'));
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!audioUrl || !videoFile) return;

    // Sanitize filename for download
    const baseName = sanitizeFilename(videoFile.name.replace(/\.[^.]+$/, ''));
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${baseName}.mp3`;
    a.click();

    // Cleanup URL to prevent memory leaks
    URL.revokeObjectURL(audioUrl);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
              </div>

      {/* Upload Area */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="video-upload"
          disabled={status === 'converting' || status === 'loading' || sharedArrayBufferSupported !== true}
        />
        <label
          htmlFor="video-upload"
          className="cursor-pointer block"
        >
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-[var(--text)] mb-2">
            {videoFile ? videoFile.name : 'Drop video file or click to browse'}
          </p>
          {videoFile && (
            <p className="text-[var(--text-muted)] text-sm">
              {formatFileSize(videoFile.size)}
            </p>
          )}
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Supports MP4, WebM, MOV, AVI, MKV
          </p>
        </label>
      </div>

      {/* Settings */}
      {videoFile && status !== 'loading' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <label className="block text-sm text-[var(--text-muted)] mb-2">
            Audio Quality (Bitrate)
          </label>
          <select
            value={bitrate}
            onChange={(e) => setBitrate(e.target.value)}
            disabled={status === 'converting'}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)]"
          >
            <option value="128">128 kbps (Smaller file)</option>
            <option value="192">192 kbps (Balanced)</option>
            <option value="256">256 kbps (High quality)</option>
            <option value="320">320 kbps (Maximum quality)</option>
          </select>
        </div>
      )}

      {/* Status */}
      {status === 'loading' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span className="text-[var(--text)]">Loading FFmpeg engine (first time only)...</span>
          </div>
          <p className="text-[var(--text-muted)] text-xs mt-2">
            This downloads ~31MB and caches for future use
          </p>
        </div>
      )}

      {status === 'converting' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text)]">Converting...</span>
            <span className="text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2">
            <div
              className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Convert Button */}
      {videoFile && status !== 'loading' && status !== 'done' && (
        <button
          onClick={handleConvert}
          disabled={status === 'converting'}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'converting' ? 'Converting...' : 'Extract MP3 Audio'}
        </button>
      )}

      {/* Result */}
      {status === 'done' && audioUrl && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="text-green-400">Conversion complete!</span>
          </div>

          <audio controls src={audioUrl} className="w-full" />

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            Download MP3
          </button>

          <button
            onClick={() => {
              setVideoFile(null);
              setAudioUrl(null);
              setStatus('idle');
              setProgress(0);
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Convert Another Video
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="video-to-mp3" />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• All processing happens in your browser - videos never uploaded</p>
        <p>• First use downloads FFmpeg engine (~31MB, cached after)</p>
        <p>• Large videos may take longer to process</p>
      </div>

          </div>
  );
}
