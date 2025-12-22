import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ToolFeedback from '../ui/ToolFeedback';

type Status = 'idle' | 'loading' | 'processing' | 'done' | 'error';

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
      setError('Failed to load FFmpeg.');
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

    setStatus('processing');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;

    try {
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = `output.${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const durationSec = endTime - startTime;
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', startTime.toFixed(2),
        '-t', durationSec.toFixed(2),
        '-c', 'copy',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: videoFile.type });
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      console.error('Trim error:', err);
      setError('Trimming failed. Try re-encoding option.');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!outputUrl || !videoFile) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = videoFile.name.replace(/(\.[^.]+)$/, '_trimmed$1');
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

  return (
    <div className="space-y-6">
      {/* Upload */}
      {!videoFile && (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="video-trim-upload"
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
        <p>• All processing happens in your browser</p>
        <p>• Uses fast copy mode (no re-encoding) for speed</p>
      </div>
    </div>
  );
}
