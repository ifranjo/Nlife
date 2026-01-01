import { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ToolFeedback from '../ui/ToolFeedback';
import { validateAudioFile, validateFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

type Status = 'idle' | 'loading' | 'analyzing' | 'rendering' | 'done' | 'error';

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
type AspectRatio = '1:1' | '9:16' | '16:9';
type WaveformStyle = 'bars' | 'line' | 'circular';

interface WaveformData {
  peaks: number[];
  duration: number;
}

export default function AudiogramMaker() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [artworkImage, setArtworkImage] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  // Customization options
  const [title, setTitle] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#0f1419');
  const [waveformColor, setWaveformColor] = useState('#00d4ff');
  const [waveformStyle, setWaveformStyle] = useState<WaveformStyle>('bars');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const aspectRatios: Record<AspectRatio, { width: number; height: number; label: string }> = {
    '1:1': { width: 1080, height: 1080, label: 'Square (Instagram)' },
    '9:16': { width: 1080, height: 1920, label: 'Vertical (Stories/Reels)' },
    '16:9': { width: 1920, height: 1080, label: 'Landscape (YouTube)' },
  };

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
      setError('Failed to load video engine.');
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
          const samples = 100; // Number of bars in waveform
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

  // Handle audio file selection
  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid audio file');
      return;
    }

    setAudioFile(file);
    setError(null);
    setOutputUrl(null);
    setStatus('analyzing');

    try {
      const data = await analyzeAudio(file);
      setWaveformData(data);
      setDuration(data.duration);
      setStartTime(0);
      setEndTime(Math.min(data.duration, 60)); // Default to 60 seconds max
      setStatus('idle');

      if (!ffmpegLoaded) {
        await loadFFmpeg();
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to analyze audio'));
      setStatus('error');
    }
  };

  // Handle background image selection
  const handleBackgroundSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateFile(file, 'image');
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    setBackgroundImage(file);
  };

  // Handle artwork image selection
  const handleArtworkSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateFile(file, 'image');
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    setArtworkImage(file);
  };

  // Draw waveform frame
  const drawWaveformFrame = useCallback((
    canvas: HTMLCanvasElement,
    currentTime: number,
    bgImageUrl?: string,
    artworkUrl?: string
  ) => {
    if (!waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = aspectRatios[aspectRatio];
    canvas.width = width;
    canvas.height = height;

    // Draw background
    if (bgImageUrl) {
      const img = new Image();
      img.src = bgImageUrl;
      ctx.filter = 'brightness(0.4)';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Calculate positions
    const centerY = height / 2;
    const waveformHeight = height * 0.3;
    const artworkSize = Math.min(width, height) * 0.25;
    const padding = 60;

    // Draw artwork if provided
    if (artworkUrl) {
      const artwork = new Image();
      artwork.src = artworkUrl;
      const artworkX = (width - artworkSize) / 2;
      const artworkY = padding;

      ctx.save();
      ctx.beginPath();
      ctx.arc(artworkX + artworkSize / 2, artworkY + artworkSize / 2, artworkSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(artwork, artworkX, artworkY, artworkSize, artworkSize);
      ctx.restore();

      // Border
      ctx.strokeStyle = waveformColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(artworkX + artworkSize / 2, artworkY + artworkSize / 2, artworkSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw title
    if (title) {
      const titleY = artworkUrl ? padding + artworkSize + 80 : padding + 40;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, titleY);
    }

    // Draw waveform
    const waveformY = centerY + (artworkUrl ? 100 : 0);
    const { peaks } = waveformData;
    const progressRatio = (currentTime - startTime) / (endTime - startTime);

    if (waveformStyle === 'bars') {
      const barWidth = (width - padding * 2) / peaks.length;
      const barSpacing = 4;

      for (let i = 0; i < peaks.length; i++) {
        const x = padding + i * barWidth;
        const barHeight = peaks[i] * waveformHeight;

        // Color bars based on playback progress
        if (i / peaks.length <= progressRatio) {
          ctx.fillStyle = waveformColor;
        } else {
          ctx.fillStyle = '#333333';
        }

        ctx.fillRect(
          x,
          waveformY - barHeight / 2,
          barWidth - barSpacing,
          barHeight
        );
      }
    } else if (waveformStyle === 'line') {
      ctx.strokeStyle = waveformColor;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < peaks.length; i++) {
        const x = padding + (i / peaks.length) * (width - padding * 2);
        const y = waveformY - (peaks[i] * waveformHeight / 2);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Mirror below
      ctx.beginPath();
      for (let i = 0; i < peaks.length; i++) {
        const x = padding + (i / peaks.length) * (width - padding * 2);
        const y = waveformY + (peaks[i] * waveformHeight / 2);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Progress indicator
      const progressX = padding + progressRatio * (width - padding * 2);
      ctx.fillStyle = waveformColor;
      ctx.beginPath();
      ctx.arc(progressX, waveformY, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (waveformStyle === 'circular') {
      const radius = waveformHeight;
      const centerX = width / 2;

      for (let i = 0; i < peaks.length; i++) {
        const angle = (i / peaks.length) * Math.PI * 2 - Math.PI / 2;
        const innerRadius = radius * 0.6;
        const outerRadius = innerRadius + peaks[i] * radius * 0.4;

        const x1 = centerX + Math.cos(angle) * innerRadius;
        const y1 = waveformY + Math.sin(angle) * innerRadius;
        const x2 = centerX + Math.cos(angle) * outerRadius;
        const y2 = waveformY + Math.sin(angle) * outerRadius;

        if (i / peaks.length <= progressRatio) {
          ctx.strokeStyle = waveformColor;
        } else {
          ctx.strokeStyle = '#333333';
        }

        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Draw time
    const currentTimestamp = formatTime(currentTime);
    const totalTimestamp = formatTime(endTime);
    ctx.fillStyle = '#888888';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentTimestamp} / ${totalTimestamp}`, width / 2, height - padding);
  }, [waveformData, aspectRatio, backgroundColor, waveformColor, waveformStyle, title, startTime, endTime]);

  // Update preview canvas
  useEffect(() => {
    if (!waveformData || !previewCanvasRef.current) return;

    const bgUrl = backgroundImage ? URL.createObjectURL(backgroundImage) : undefined;
    const artworkUrl = artworkImage ? URL.createObjectURL(artworkImage) : undefined;

    const img1 = bgUrl ? new Image() : null;
    const img2 = artworkUrl ? new Image() : null;
    let loadedCount = 0;
    const totalImages = (img1 ? 1 : 0) + (img2 ? 1 : 0);

    const draw = () => {
      drawWaveformFrame(previewCanvasRef.current!, startTime, bgUrl, artworkUrl);
    };

    if (totalImages === 0) {
      draw();
    } else {
      const onLoad = () => {
        loadedCount++;
        if (loadedCount === totalImages) draw();
      };

      if (img1) {
        img1.src = bgUrl!;
        img1.onload = onLoad;
      }
      if (img2) {
        img2.src = artworkUrl!;
        img2.onload = onLoad;
      }
    }
  }, [waveformData, drawWaveformFrame, backgroundImage, artworkImage, startTime]);

  // Render video
  const handleRender = async () => {
    if (!audioFile || !ffmpegRef.current || !waveformData) return;

    setStatus('rendering');
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;
    const { width, height } = aspectRatios[aspectRatio];
    const fps = 30;
    const clipDuration = endTime - startTime;
    const totalFrames = Math.floor(clipDuration * fps);

    try {
      // Write audio file
      const audioExt = audioFile.name.split('.').pop() || 'mp3';
      await ffmpeg.writeFile(`input.${audioExt}`, await fetchFile(audioFile));

      // Write background and artwork if provided
      const bgUrl = backgroundImage ? URL.createObjectURL(backgroundImage) : undefined;
      const artworkUrl = artworkImage ? URL.createObjectURL(artworkImage) : undefined;

      if (backgroundImage) {
        await ffmpeg.writeFile('bg.png', await fetchFile(backgroundImage));
      }
      if (artworkImage) {
        await ffmpeg.writeFile('artwork.png', await fetchFile(artworkImage));
      }

      // Generate frames
      const tempCanvas = document.createElement('canvas');

      for (let i = 0; i < totalFrames; i++) {
        const currentTime = startTime + (i / fps);
        drawWaveformFrame(tempCanvas, currentTime, bgUrl, artworkUrl);

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          tempCanvas.toBlob((b) => resolve(b!), 'image/png');
        });

        await ffmpeg.writeFile(`frame${i.toString().padStart(5, '0')}.png`, await fetchFile(blob));

        if (i % 10 === 0) {
          setProgress(Math.round((i / totalFrames) * 50)); // First 50% for frame generation
        }
      }

      // Encode video with FFmpeg
      const args = [
        '-framerate', fps.toString(),
        '-i', 'frame%05d.png',
        '-i', `input.${audioExt}`,
        '-ss', startTime.toString(),
        '-t', clipDuration.toString(),
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        'output.mp4'
      ];

      await ffmpeg.exec(args);
      setProgress(100);

      const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], { type: 'video/mp4' });
      setOutputUrl(URL.createObjectURL(blob));
      setStatus('done');

      // Cleanup
      await ffmpeg.deleteFile(`input.${audioExt}`);
      await ffmpeg.deleteFile('output.mp4');
      if (backgroundImage) await ffmpeg.deleteFile('bg.png');
      if (artworkImage) await ffmpeg.deleteFile('artwork.png');

      for (let i = 0; i < totalFrames; i++) {
        await ffmpeg.deleteFile(`frame${i.toString().padStart(5, '0')}.png`);
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Video rendering failed. Please try again.'));
      setStatus('error');
    }
  };

  // Download handler
  const handleDownload = () => {
    if (!outputUrl || !audioFile) return;
    const baseName = sanitizeFilename(audioFile.name.replace(/\.[^.]+$/, ''));
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${baseName}_audiogram.mp4`;
    a.click();
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset handler
  const handleReset = () => {
    setAudioFile(null);
    setBackgroundImage(null);
    setArtworkImage(null);
    setOutputUrl(null);
    setWaveformData(null);
    setStatus('idle');
    setTitle('');
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!audioFile && (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
            id="audiogram-audio-upload"
          />
          <label htmlFor="audiogram-audio-upload" className="cursor-pointer block">
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-[var(--text)]">Drop audio file or click to browse</p>
            <p className="text-[var(--text-muted)] text-xs mt-2">Supports MP3, WAV, M4A, OGG</p>
          </label>
        </div>
      )}

      {/* Status Messages */}
      {status === 'loading' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Loading video engine...</span>
          </div>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Analyzing audio...</span>
          </div>
        </div>
      )}

      {/* Customization Section */}
      {waveformData && status !== 'done' && (
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <h3 className="text-sm text-[var(--text-muted)] mb-3">Preview</h3>
            <div className="flex justify-center bg-black rounded-lg overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full h-auto"
                style={{ maxHeight: '400px' }}
              />
            </div>
          </div>

          {/* Customization Options */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Text & Images */}
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
              <h3 className="text-sm text-[var(--text-muted)]">Content</h3>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Podcast Episode"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Background Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundSelect}
                  className="text-xs text-[var(--text)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Podcast Artwork (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleArtworkSelect}
                  className="text-xs text-[var(--text)]"
                />
              </div>
            </div>

            {/* Visual Settings */}
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
              <h3 className="text-sm text-[var(--text-muted)]">Appearance</h3>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(aspectRatios).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setAspectRatio(key as AspectRatio)}
                      className={`py-2 px-3 rounded-lg border text-xs transition-all ${
                        aspectRatio === key
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">Waveform Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bars', 'line', 'circular'] as WaveformStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setWaveformStyle(style)}
                      className={`py-2 px-3 rounded-lg border text-xs transition-all capitalize ${
                        waveformStyle === style
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Background Color</label>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                    disabled={!!backgroundImage}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Waveform Color</label>
                  <input
                    type="color"
                    value={waveformColor}
                    onChange={(e) => setWaveformColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Timing Controls */}
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
            <h3 className="text-sm text-[var(--text-muted)]">Duration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                  Start: {formatTime(startTime)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => setStartTime(Math.min(parseFloat(e.target.value), endTime - 1))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                  End: {formatTime(endTime)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => setEndTime(Math.max(parseFloat(e.target.value), startTime + 1))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Video duration: {formatTime(endTime - startTime)} (max 120 seconds recommended)
            </p>
          </div>

          {/* Render Button */}
          <button
            onClick={handleRender}
            disabled={status === 'rendering' || status === 'loading'}
            className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {status === 'rendering' ? `Rendering... ${progress}%` : `Create Audiogram (${formatTime(endTime - startTime)})`}
          </button>
        </div>
      )}

      {/* Rendering Progress */}
      {status === 'rendering' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span>Rendering video...</span>
            <span className="text-[var(--accent)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2">
            <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            This may take several minutes depending on video length and device performance.
          </p>
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
            <span className="text-green-400">Audiogram created successfully!</span>
          </div>

          <video controls src={outputUrl} className="w-full rounded-lg" />

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
          >
            Download MP4
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Create Another Audiogram
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="audiogram-maker" />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>&#8226; All processing happens in your browser - files never upload</p>
        <p>&#8226; Keep videos under 60 seconds for faster rendering</p>
        <p>&#8226; Use high-contrast colors for better visibility on social media</p>
      </div>
    </div>
  );
}
