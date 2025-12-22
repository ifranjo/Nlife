import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ToolFeedback from '../ui/ToolFeedback';

type Status = 'idle' | 'loading' | 'processing' | 'done' | 'error';

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

  const qualitySettings: Record<string, { crf: string; preset: string; label: string }> = {
    low: { crf: '35', preset: 'faster', label: 'Low (Smallest file)' },
    medium: { crf: '28', preset: 'medium', label: 'Medium (Balanced)' },
    high: { crf: '23', preset: 'slow', label: 'High (Better quality)' },
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current && ffmpegLoaded) return;

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

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

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
      const inputName = 'input.mp4';
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-crf', settings.crf,
        '-preset', settings.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      console.error('Compression error:', err);
      setError('Compression failed. Try a different quality setting.');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!outputUrl || !videoFile) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = videoFile.name.replace(/\.[^.]+$/, '_compressed.mp4');
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const compressionRatio = videoFile && outputSize
    ? Math.round((1 - outputSize / videoFile.size) * 100)
    : 0;

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
          disabled={status === 'processing' || status === 'loading'}
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
