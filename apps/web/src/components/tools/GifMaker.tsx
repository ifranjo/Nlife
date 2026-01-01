import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ToolFeedback from '../ui/ToolFeedback';
import { validateVideoFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

type Status = 'idle' | 'loading' | 'processing' | 'done' | 'error';

interface GifSettings {
  startTime: number;
  endTime: number;
  fps: number;
  width: number;
}

export default function GifMaker() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [duration, setDuration] = useState(0);
  const [settings, setSettings] = useState<GifSettings>({
    startTime: 0,
    endTime: 0,
    fps: 15,
    width: 480,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

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
    setSettings(prev => ({ ...prev, startTime: 0 }));

    if (!ffmpegLoaded) {
      await loadFFmpeg();
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      // Default to first 5 seconds or full duration if shorter
      setSettings(prev => ({
        ...prev,
        endTime: Math.min(5, dur),
      }));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

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
    setSettings(prev => ({ ...prev, startTime: 0 }));

    if (!ffmpegLoaded) {
      await loadFFmpeg();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleConvert = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    setStatus('processing');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;

    try {
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const inputName = `input.${ext}`;
      const paletteName = 'palette.png';
      const outputName = 'output.gif';

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const clipDuration = settings.endTime - settings.startTime;

      // Generate palette for better GIF quality
      await ffmpeg.exec([
        '-ss', settings.startTime.toFixed(2),
        '-t', clipDuration.toFixed(2),
        '-i', inputName,
        '-vf', `fps=${settings.fps},scale=${settings.width}:-1:flags=lanczos,palettegen=stats_mode=diff`,
        '-y', paletteName
      ]);

      // Create GIF using palette
      await ffmpeg.exec([
        '-ss', settings.startTime.toFixed(2),
        '-t', clipDuration.toFixed(2),
        '-i', inputName,
        '-i', paletteName,
        '-lavfi', `fps=${settings.fps},scale=${settings.width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        '-y', outputName
      ]);

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], { type: 'image/gif' });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(paletteName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Conversion failed. Try shorter duration or smaller width.'));
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!outputUrl || !videoFile) return;
    const baseName = sanitizeFilename(videoFile.name.replace(/\.[^.]+$/, ''));
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${baseName}.gif`;
    a.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePreviewStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = settings.startTime;
    }
  };

  const handlePreviewEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = settings.endTime;
    }
  };

  const clipDuration = settings.endTime - settings.startTime;
  const estimatedFrames = Math.ceil(clipDuration * settings.fps);

  return (
    <div className="space-y-6">
      {/* Upload */}
      {!videoFile && (
        <div
          className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="gif-maker-upload"
          />
          <label htmlFor="gif-maker-upload" className="cursor-pointer block">
            <div className="text-4xl mb-4">GIF</div>
            <p className="text-[var(--text)]">Drop video file or click to browse</p>
            <p className="text-[var(--text-muted)] text-xs mt-2">Supports MP4, WebM, MOV, AVI (max 500MB)</p>
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

          {/* Timeline Controls */}
          {duration > 0 && status !== 'loading' && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Start: {formatTime(settings.startTime)}</span>
                  <span className="text-[var(--text-muted)]">End: {formatTime(settings.endTime)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--accent)]">
                  <span>Duration: {formatTime(clipDuration)}</span>
                  <span>~{estimatedFrames} frames</span>
                </div>
              </div>

              {/* Start Time Slider */}
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Start Time</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={settings.startTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSettings(prev => ({
                        ...prev,
                        startTime: Math.min(val, prev.endTime - 0.1),
                      }));
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

              {/* End Time Slider */}
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">End Time</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={settings.endTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSettings(prev => ({
                        ...prev,
                        endTime: Math.max(val, prev.startTime + 0.1),
                      }));
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

              {/* Frame Rate */}
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">
                  Frame Rate: {settings.fps} FPS
                </label>
                <input
                  type="range"
                  min={10}
                  max={30}
                  step={1}
                  value={settings.fps}
                  onChange={(e) => setSettings(prev => ({ ...prev, fps: parseInt(e.target.value) }))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                  <span>10 (smaller)</span>
                  <span>30 (smoother)</span>
                </div>
              </div>

              {/* Width */}
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">
                  Width: {settings.width}px (height auto-scales)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[320, 480, 640, 800].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSettings(prev => ({ ...prev, width: w }))}
                      className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                        settings.width === w
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
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
            <span>Converting to GIF...</span>
            <span className="text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2">
            <div
              className="bg-[var(--accent)] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Generating optimized palette and encoding...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Convert Button */}
      {videoFile && duration > 0 && status !== 'done' && status !== 'loading' && (
        <button
          onClick={handleConvert}
          disabled={status === 'processing' || clipDuration <= 0}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {status === 'processing' ? 'Converting...' : `Create GIF (${formatTime(clipDuration)})`}
        </button>
      )}

      {/* Result */}
      {status === 'done' && outputUrl && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">GIF</span>
            <div>
              <span className="text-green-400">GIF created successfully!</span>
              <p className="text-sm text-[var(--text-muted)]">
                Size: {formatSize(outputSize)}
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg)] rounded-lg p-2 flex justify-center">
            <img
              src={outputUrl}
              alt="Generated GIF preview"
              className="max-w-full rounded"
              style={{ maxHeight: '400px' }}
            />
          </div>

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
          >
            Download GIF
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
              setSettings({
                startTime: 0,
                endTime: 0,
                fps: 15,
                width: 480,
              });
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Convert Another Video
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="gif-maker" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>* All processing happens in your browser - videos never uploaded</p>
        <p>* Uses optimized palette generation for high-quality GIFs</p>
        <p>* Shorter clips and lower frame rates produce smaller files</p>
      </div>
    </div>
  );
}
