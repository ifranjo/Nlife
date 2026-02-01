import { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { validateAudioFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

type Status = 'idle' | 'loading' | 'analyzing' | 'processing' | 'done' | 'error';

// Helper to ensure AudioContext is resumed (required for iOS Safari)
const ensureAudioContext = async (ctx: AudioContext): Promise<AudioContext> => {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('Failed to resume AudioContext:', err);
      throw new Error('Audio playback is blocked. Please tap the screen and try again.');
    }
  }
  return ctx;
};
type ExportFormat = 'mp3' | 'wav';

interface WaveformData {
  peaks: number[];
  duration: number;
}

export default function AudioWaveformEditor() {
    const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp3');
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'region' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartSelection, setDragStartSelection] = useState({ start: 0, end: 0 });

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Load FFmpeg
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
      setError('Failed to load audio engine.');
      setStatus('error');
    }
  };

  // Analyze audio and generate waveform
  const analyzeAudio = async (file: File): Promise<WaveformData> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          // Ensure AudioContext is resumed (iOS Safari requirement)
          await ensureAudioContext(audioContext);

          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const rawData = audioBuffer.getChannelData(0);
          const samples = 500; // Number of bars in waveform
          const blockSize = Math.floor(rawData.length / samples);
          const peaks: number[] = [];

          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[i * blockSize + j]);
            }
            peaks.push(sum / blockSize);
          }

          // Normalize peaks
          const max = Math.max(...peaks);
          const normalizedPeaks = peaks.map(p => p / max);

          resolve({
            peaks: normalizedPeaks,
            duration: audioBuffer.duration
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read audio file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid audio file');
      return;
    }

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setError(null);
    setOutputUrl(null);
    setStatus('analyzing');

    try {
      const data = await analyzeAudio(file);
      setWaveformData(data);
      setDuration(data.duration);
      setSelectionStart(0);
      setSelectionEnd(data.duration);
      setStatus('idle');

      if (!ffmpegLoaded) {
        await loadFFmpeg();
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to analyze audio'));
      setStatus('error');
    }
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid audio file');
      return;
    }

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setError(null);
    setOutputUrl(null);
    setStatus('analyzing');

    try {
      const data = await analyzeAudio(file);
      setWaveformData(data);
      setDuration(data.duration);
      setSelectionStart(0);
      setSelectionEnd(data.duration);
      setStatus('idle');

      if (!ffmpegLoaded) {
        await loadFFmpeg();
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to analyze audio'));
      setStatus('error');
    }
  };

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { peaks } = waveformData;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw selection region
    const startX = (selectionStart / duration) * width;
    const endX = (selectionEnd / duration) * width;
    ctx.fillStyle = 'rgba(100, 180, 255, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);

    // Draw waveform
    const barWidth = width / peaks.length;
    const centerY = height / 2;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barHeight = peaks[i] * height * 0.8;

      // Color based on position relative to selection
      const timePos = (i / peaks.length) * duration;
      if (timePos >= selectionStart && timePos <= selectionEnd) {
        ctx.fillStyle = '#64b4ff';
      } else {
        ctx.fillStyle = '#444444';
      }

      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    }

    // Draw selection handles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX - 2, 0, 4, height);
    ctx.fillRect(endX - 2, 0, 4, height);

    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = '#ff6464';
    ctx.fillRect(playheadX - 1, 0, 2, height);

    // Draw fade regions
    if (fadeIn > 0) {
      const fadeInWidth = (fadeIn / duration) * width;
      const gradient = ctx.createLinearGradient(startX, 0, startX + fadeInWidth, 0);
      gradient.addColorStop(0, 'rgba(100, 255, 100, 0.3)');
      gradient.addColorStop(1, 'rgba(100, 255, 100, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(startX, 0, fadeInWidth, height);
    }

    if (fadeOut > 0) {
      const fadeOutWidth = (fadeOut / duration) * width;
      const gradient = ctx.createLinearGradient(endX - fadeOutWidth, 0, endX, 0);
      gradient.addColorStop(0, 'rgba(255, 100, 100, 0)');
      gradient.addColorStop(1, 'rgba(255, 100, 100, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(endX - fadeOutWidth, 0, fadeOutWidth, height);
    }
  }, [waveformData, duration, selectionStart, selectionEnd, currentTime, fadeIn, fadeOut]);

  // Animation loop for playhead
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const updatePlayhead = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
        animationRef.current = requestAnimationFrame(updatePlayhead);
      };
      animationRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Redraw waveform when data changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = 150;
        drawWaveform();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  // Mouse handlers for selection
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !duration) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;

    const startX = (selectionStart / duration) * rect.width;
    const endX = (selectionEnd / duration) * rect.width;

    // Check if clicking on handles or region
    if (Math.abs(x - startX) < 10) {
      setIsDragging('start');
    } else if (Math.abs(x - endX) < 10) {
      setIsDragging('end');
    } else if (x > startX && x < endX) {
      setIsDragging('region');
      setDragStartX(x);
      setDragStartSelection({ start: selectionStart, end: selectionEnd });
    } else {
      // Click to set selection point
      if (time < (selectionStart + selectionEnd) / 2) {
        setSelectionStart(Math.max(0, time));
      } else {
        setSelectionEnd(Math.min(duration, time));
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !duration) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, (x / rect.width) * duration));

    if (isDragging === 'start') {
      setSelectionStart(Math.min(time, selectionEnd - 0.1));
    } else if (isDragging === 'end') {
      setSelectionEnd(Math.max(time, selectionStart + 0.1));
    } else if (isDragging === 'region') {
      const dx = x - dragStartX;
      const dt = (dx / rect.width) * duration;
      const regionLength = dragStartSelection.end - dragStartSelection.start;

      let newStart = dragStartSelection.start + dt;
      let newEnd = dragStartSelection.end + dt;

      if (newStart < 0) {
        newStart = 0;
        newEnd = regionLength;
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - regionLength;
      }

      setSelectionStart(newStart);
      setSelectionEnd(newEnd);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(null);
  };

  // Helper to get position from mouse or touch event
  const getCanvasX = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    rect: DOMRect
  ): number => {
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return touch.clientX - rect.left;
    }
    return e.clientX - rect.left;
  };

  // Touch event handlers for waveform selection
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !duration) return;
    e.preventDefault(); // Prevent scrolling

    const rect = canvasRef.current.getBoundingClientRect();
    const x = getCanvasX(e, rect);
    const time = (x / rect.width) * duration;

    const startX = (selectionStart / duration) * rect.width;
    const endX = (selectionEnd / duration) * rect.width;

    // Check if touching on handles or region
    if (Math.abs(x - startX) < 20) { // Larger touch target
      setIsDragging('start');
    } else if (Math.abs(x - endX) < 20) { // Larger touch target
      setIsDragging('end');
    } else if (x > startX && x < endX) {
      setIsDragging('region');
      setDragStartX(x);
      setDragStartSelection({ start: selectionStart, end: selectionEnd });
    } else {
      // Tap to set selection point
      if (time < (selectionStart + selectionEnd) / 2) {
        setSelectionStart(Math.max(0, time));
      } else {
        setSelectionEnd(Math.min(duration, time));
      }
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !duration) return;
    e.preventDefault(); // Prevent scrolling

    const rect = canvasRef.current.getBoundingClientRect();
    const x = getCanvasX(e, rect);
    const time = Math.max(0, Math.min(duration, (x / rect.width) * duration));

    if (isDragging === 'start') {
      setSelectionStart(Math.min(time, selectionEnd - 0.1));
    } else if (isDragging === 'end') {
      setSelectionEnd(Math.max(time, selectionStart + 0.1));
    } else if (isDragging === 'region') {
      const dx = x - dragStartX;
      const dt = (dx / rect.width) * duration;
      const regionLength = dragStartSelection.end - dragStartSelection.start;

      let newStart = dragStartSelection.start + dt;
      let newEnd = dragStartSelection.end + dt;

      if (newStart < 0) {
        newStart = 0;
        newEnd = regionLength;
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - regionLength;
      }

      setSelectionStart(newStart);
      setSelectionEnd(newEnd);
    }
  };

  const handleCanvasTouchEnd = () => {
    setIsDragging(null);
  };

  // Playback controls
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = selectionStart;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const playSelection = () => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = selectionStart;
    audioRef.current.play();
    setIsPlaying(true);
  };

  // Stop playback at selection end
  useEffect(() => {
    if (isPlaying && currentTime >= selectionEnd) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentTime, selectionEnd, isPlaying]);

  // Process audio (trim + fade)
  const handleProcess = async () => {
    if (!audioFile || !ffmpegRef.current) return;

    
    setStatus('processing');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;

    try {
      const inputExt = audioFile.name.split('.').pop() || 'mp3';
      const inputName = `input.${inputExt}`;
      const outputName = `output.${exportFormat}`;

      await ffmpeg.writeFile(inputName, await fetchFile(audioFile));

      const trimDuration = selectionEnd - selectionStart;
      const filterParts: string[] = [];

      // Trim filter
      filterParts.push(`atrim=start=${selectionStart.toFixed(3)}:end=${selectionEnd.toFixed(3)}`);
      filterParts.push('asetpts=PTS-STARTPTS');

      // Fade in/out filters
      if (fadeIn > 0) {
        filterParts.push(`afade=t=in:st=0:d=${fadeIn.toFixed(2)}`);
      }
      if (fadeOut > 0) {
        const fadeOutStart = trimDuration - fadeOut;
        filterParts.push(`afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeOut.toFixed(2)}`);
      }

      const filterComplex = filterParts.join(',');

      const args = [
        '-i', inputName,
        '-af', filterComplex
      ];

      // Output format options
      if (exportFormat === 'mp3') {
        args.push('-codec:a', 'libmp3lame', '-q:a', '2');
      } else {
        args.push('-codec:a', 'pcm_s16le');
      }

      args.push(outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const mimeType = exportFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const blob = new Blob([new Uint8Array(data)], { type: mimeType });
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');
      
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Processing failed. Please try again.'));
      setStatus('error');
    }
  };

  // Download handler
  const handleDownload = () => {
    if (!outputUrl || !audioFile) return;
    const baseName = sanitizeFilename(audioFile.name.replace(/\.[^.]+$/, ''));
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${baseName}_edited.${exportFormat}`;
    a.click();
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Reset handler
  const handleReset = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setOutputUrl(null);
    setWaveformData(null);
    setStatus('idle');
    setDuration(0);
    setCurrentTime(0);
    setSelectionStart(0);
    setSelectionEnd(0);
    setFadeIn(0);
    setFadeOut(0);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
            {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        />
      )}

      {/* Upload */}
      {!audioFile && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors"
        >
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
            id="audio-editor-upload"
          />
          <label htmlFor="audio-editor-upload" className="cursor-pointer block">
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-[var(--text)]">Drop audio file or click to browse</p>
            <p className="text-[var(--text-muted)] text-xs mt-2">Supports MP3, WAV, M4A, OGG, FLAC</p>
          </label>
        </div>
      )}

      {/* Status Messages */}
      {status === 'loading' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Loading audio engine...</span>
          </div>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Analyzing audio waveform...</span>
          </div>
        </div>
      )}

      {/* Waveform Editor */}
      {waveformData && status !== 'done' && (
        <div className="space-y-4">
          {/* Waveform Canvas */}
          <div ref={containerRef} className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
              <span>{formatTime(0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <canvas
              ref={canvasRef}
              height={150}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasTouchEnd}
              className="w-full rounded cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
            <div className="flex justify-between text-xs mt-2">
              <span className="text-blue-400">Selection: {formatTime(selectionStart)} - {formatTime(selectionEnd)}</span>
              <span className="text-[var(--accent)]">Duration: {formatTime(selectionEnd - selectionStart)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={togglePlayback}
              className="px-6 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={playSelection}
              className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text)]"
            >
              ▶ Play Selection
            </button>
          </div>

          {/* Time Inputs */}
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Start Time</label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.01}
                    value={selectionStart}
                    onChange={(e) => setSelectionStart(Math.min(parseFloat(e.target.value), selectionEnd - 0.1))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-xs w-16 text-right text-[var(--text)]">{formatTime(selectionStart)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">End Time</label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.01}
                    value={selectionEnd}
                    onChange={(e) => setSelectionEnd(Math.max(parseFloat(e.target.value), selectionStart + 0.1))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-xs w-16 text-right text-[var(--text)]">{formatTime(selectionEnd)}</span>
                </div>
              </div>
            </div>

            {/* Fade Controls */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                  Fade In: {fadeIn.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.min(5, (selectionEnd - selectionStart) / 2)}
                  step={0.1}
                  value={fadeIn}
                  onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                  Fade Out: {fadeOut.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.min(5, (selectionEnd - selectionStart) / 2)}
                  step={0.1}
                  value={fadeOut}
                  onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>
            </div>

            {/* Export Format */}
            <div className="pt-2 border-t border-[var(--border)]">
              <label className="text-xs text-[var(--text-muted)] block mb-2">Export Format</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="mp3"
                    checked={exportFormat === 'mp3'}
                    onChange={() => setExportFormat('mp3')}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-[var(--text)]">MP3 (smaller size)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="wav"
                    checked={exportFormat === 'wav'}
                    onChange={() => setExportFormat('wav')}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-[var(--text)]">WAV (lossless)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Process Button */}
          <button
            onClick={handleProcess}
            disabled={status === 'processing' || status === 'loading'}
            className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {status === 'processing' ? `Processing... ${progress}%` : `Export as ${exportFormat.toUpperCase()} (${formatTime(selectionEnd - selectionStart)})`}
          </button>
        </div>
      )}

      {/* Processing Progress */}
      {status === 'processing' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span>Processing audio...</span>
            <span className="text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2">
            <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {status === 'done' && outputUrl && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#10004;</span>
            <span className="text-green-400">Audio processed successfully!</span>
          </div>

          <audio controls src={outputUrl} className="w-full" />

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
          >
            Download {exportFormat.toUpperCase()}
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Edit Another Audio
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="audio-editor" />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>&#8226; Drag handles to select region, or click and drag within selection to move it</p>
        <p>&#8226; All processing happens in your browser - your audio never uploads</p>
        <p>&#8226; Use fade in/out for smooth transitions</p>
      </div>
    </div>
  );
}
