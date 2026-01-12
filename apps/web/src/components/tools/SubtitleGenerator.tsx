import { useState, useRef, useEffect } from 'react';
import ToolFeedback from '../ui/ToolFeedback';
import { validateAudioFile, validateVideoFile, sanitizeFilename, createSafeErrorMessage, sanitizeTextContent } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

type Status = 'idle' | 'loading' | 'transcribing' | 'done' | 'error';
type ExportFormat = 'srt' | 'vtt';

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

interface SubtitleChunk {
  index: number;
  start: number;
  end: number;
  text: string;
}

export default function SubtitleGenerator() {
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('subtitle-generator');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleChunk[]>([]);
  const [language, setLanguage] = useState('en');
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1);
  const pipelineRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ru', name: 'Russian' },
  ];

  // Update active subtitle based on video time
  useEffect(() => {
    if (subtitles.length === 0) return;

    const activeIdx = subtitles.findIndex(
      (sub) => currentTime >= sub.start && currentTime < sub.end
    );
    setActiveSubtitleIndex(activeIdx);
  }, [currentTime, subtitles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine if video or audio
    const isVideoFile = file.type.startsWith('video/');

    // Validate using appropriate validator
    const validation = isVideoFile
      ? validateVideoFile(file)
      : validateAudioFile(file);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setMediaFile(file);
    setMediaUrl(URL.createObjectURL(file));
    setIsVideo(isVideoFile);
    setError(null);
    setSubtitles([]);
    setActiveSubtitleIndex(-1);
  };

  const formatTimestamp = (seconds: number, format: ExportFormat): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    if (format === 'srt') {
      // SRT uses comma for milliseconds: 00:00:00,000
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    } else {
      // VTT uses period for milliseconds: 00:00:00.000
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
  };

  const generateSRT = (chunks: SubtitleChunk[]): string => {
    return chunks
      .map((chunk) => {
        const start = formatTimestamp(chunk.start, 'srt');
        const end = formatTimestamp(chunk.end, 'srt');
        return `${chunk.index}\n${start} --> ${end}\n${chunk.text}\n`;
      })
      .join('\n');
  };

  const generateVTT = (chunks: SubtitleChunk[]): string => {
    const header = 'WEBVTT\n\n';
    const body = chunks
      .map((chunk) => {
        const start = formatTimestamp(chunk.start, 'vtt');
        const end = formatTimestamp(chunk.end, 'vtt');
        return `${chunk.index}\n${start} --> ${end}\n${chunk.text}\n`;
      })
      .join('\n');
    return header + body;
  };

  const handleGenerate = async () => {
    if (!mediaFile) return;

    if (!checkUsage()) {
      return;
    }

    setStatus('loading');
    setProgress(0);
    setProgressText('Loading Whisper AI model...');
    setError(null);

    try {
      const { pipeline } = await import('@huggingface/transformers');

      if (!pipelineRef.current) {
        setProgressText('Downloading model (first time ~150MB)...');

        pipelineRef.current = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny',
          {
            progress_callback: (progressData: any) => {
              if (progressData.status === 'downloading') {
                const pct = Math.round((progressData.loaded / progressData.total) * 100);
                setProgress(pct);
                setProgressText(`Downloading model: ${pct}%`);
              }
            }
          }
        );
      }

      setStatus('transcribing');
      setProgress(0);
      setProgressText('Generating subtitles with timestamps...');

      // Convert media file to audio data
      const audioContext = new AudioContext({ sampleRate: 16000 });
      // Ensure AudioContext is resumed (iOS Safari requirement)
      await ensureAudioContext(audioContext);

      const arrayBuffer = await mediaFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get mono audio data
      const audioData = audioBuffer.getChannelData(0);

      // Use return_timestamps: 'word' for word-level timing, or true for chunk-level
      const result = await pipelineRef.current(audioData, {
        language: language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });

      // Process chunks into subtitle format
      const chunks: SubtitleChunk[] = [];

      if (result.chunks && Array.isArray(result.chunks)) {
        result.chunks.forEach((chunk: any, idx: number) => {
          if (chunk.text && chunk.text.trim()) {
            const sanitizedText = sanitizeTextContent(chunk.text.trim());
            chunks.push({
              index: idx + 1,
              start: chunk.timestamp[0] || 0,
              end: chunk.timestamp[1] || chunk.timestamp[0] + 2,
              text: sanitizedText,
            });
          }
        });
      } else if (result.text) {
        // Fallback: if no chunks, create single subtitle
        const sanitizedText = sanitizeTextContent(result.text);
        chunks.push({
          index: 1,
          start: 0,
          end: audioBuffer.duration,
          text: sanitizedText,
        });
      }

      setSubtitles(chunks);
      setStatus('done');
      recordUsage();
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Subtitle generation failed. Try a smaller file or different format.'));
      setStatus('error');
    }
  };

  const handleDownload = (format: ExportFormat) => {
    const content = format === 'srt' ? generateSRT(subtitles) : generateVTT(subtitles);
    const baseName = mediaFile ? sanitizeFilename(mediaFile.name.replace(/\.[^.]+$/, '')) : 'subtitles';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySubtitles = async (format: ExportFormat) => {
    const content = format === 'srt' ? generateSRT(subtitles) : generateVTT(subtitles);
    await copyToClipboard(content);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDisplayTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaFile(null);
    setMediaUrl(null);
    setIsVideo(false);
    setSubtitles([]);
    setStatus('idle');
    setActiveSubtitleIndex(-1);
    setCurrentTime(0);
  };

  return (
    <div className="space-y-6">
      {showPrompt && <UpgradePrompt toolId="subtitle-generator" toolName="Subtitle Generator" onDismiss={dismissPrompt} />}
      <UsageIndicator toolId="subtitle-generator" />
      {/* Upload */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="subtitle-upload"
          disabled={status === 'loading' || status === 'transcribing'}
        />
        <label htmlFor="subtitle-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">CC</div>
          <p className="text-[var(--text)] mb-2">
            {mediaFile ? mediaFile.name : 'Drop video or audio file to generate subtitles'}
          </p>
          {mediaFile && (
            <p className="text-[var(--text-muted)] text-sm">
              {formatSize(mediaFile.size)} - {isVideo ? 'Video' : 'Audio'}
            </p>
          )}
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Supports MP4, WebM, MOV, MP3, WAV, M4A
          </p>
        </label>
      </div>

      {/* Video/Audio Preview with Subtitles */}
      {mediaUrl && (
        <div className="relative">
          {isVideo ? (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                controls
                src={mediaUrl}
                className="w-full"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
              {/* Subtitle Overlay */}
              {status === 'done' && activeSubtitleIndex >= 0 && (
                <div className="absolute bottom-16 left-0 right-0 text-center px-4">
                  <span className="bg-black/80 text-white px-3 py-1 rounded text-lg">
                    {subtitles[activeSubtitleIndex]?.text}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <audio controls src={mediaUrl} className="w-full" />
          )}
        </div>
      )}

      {/* Language Selection */}
      {mediaFile && status === 'idle' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <label className="block text-sm text-[var(--text-muted)] mb-2">
            Audio Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)]"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status */}
      {(status === 'loading' || status === 'transcribing') && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>{progressText}</span>
          </div>
          {progress > 0 && (
            <div className="w-full bg-[var(--bg)] rounded-full h-2">
              <div
                className="bg-[var(--accent)] h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Generate Button */}
      {mediaFile && status === 'idle' && (
        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
        >
          Generate Subtitles with AI
        </button>
      )}

      {/* Results */}
      {status === 'done' && subtitles.length > 0 && (
        <div className="space-y-4">
          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDownload('srt')}
              className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
            >
              Download .SRT
            </button>
            <button
              onClick={() => handleDownload('vtt')}
              className="flex-1 py-3 border border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--bg-secondary)]"
            >
              Download .VTT
            </button>
          </div>

          {/* Copy Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleCopySubtitles('srt')}
              className="flex-1 py-2 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
            >
              Copy SRT
            </button>
            <button
              onClick={() => handleCopySubtitles('vtt')}
              className="flex-1 py-2 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
            >
              Copy VTT
            </button>
          </div>

          {/* Subtitle Preview */}
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-muted)]">
                Subtitles ({subtitles.length} segments)
              </span>
            </div>
            <div className="bg-[var(--bg)] rounded p-4 max-h-64 overflow-y-auto font-mono text-sm">
              {subtitles.map((sub, idx) => (
                <div
                  key={idx}
                  className={`py-2 border-b border-[var(--border)] last:border-0 ${
                    idx === activeSubtitleIndex ? 'bg-[var(--accent)]/10' : ''
                  }`}
                >
                  <div className="text-[var(--text-muted)] text-xs mb-1">
                    {formatDisplayTime(sub.start)} - {formatDisplayTime(sub.end)}
                  </div>
                  <div className="text-[var(--text)]">{sub.text}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Generate Subtitles for Another File
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="subtitle-generator" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>* Uses Whisper AI - runs entirely in your browser</p>
        <p>* First use downloads ~150MB model (cached after)</p>
        <p>* SRT format for video editors, VTT for web players</p>
      </div>
    </div>
  );
}
