import { useState, useRef } from 'react';
import ToolFeedback from '../ui/ToolFeedback';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';
import { validateAudioFile, sanitizeFilename, createSafeErrorMessage, sanitizeTextContent } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

type Status = 'idle' | 'loading' | 'transcribing' | 'done' | 'error';

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

export default function AudioTranscription() {
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('audio-transcription');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [language, setLanguage] = useState('en');
  const pipelineRef = useRef<any>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security validation (accepts both audio and video for audio extraction)
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid audio file');
      return;
    }

    // Cleanup previous URL to prevent memory leaks
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setError(null);
    setTranscript('');
  };

  const handleTranscribe = async () => {
    if (!audioFile) return;

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
            progress_callback: (progress: any) => {
              if (progress.status === 'downloading') {
                const pct = Math.round((progress.loaded / progress.total) * 100);
                setProgress(pct);
                setProgressText(`Downloading model: ${pct}%`);
              }
            }
          }
        );
      }

      setStatus('transcribing');
      setProgress(0);
      setProgressText('Transcribing audio...');

      // Convert audio file to proper format
      const audioContext = new AudioContext({ sampleRate: 16000 });
      // Ensure AudioContext is resumed (iOS Safari requirement)
      await ensureAudioContext(audioContext);

      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get mono audio data
      const audioData = audioBuffer.getChannelData(0);

      const result = await pipelineRef.current(audioData, {
        language: language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });

      // Sanitize transcription output
      const sanitizedTranscript = sanitizeTextContent(result.text);
      setTranscript(sanitizedTranscript);
      setStatus('done');
      recordUsage();
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Transcription failed. Try a smaller audio file or different format.'));
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(transcript);
  };

  const handleDownload = () => {
    const baseName = audioFile ? sanitizeFilename(audioFile.name.replace(/\.[^.]+$/, '')) : 'transcript';
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <UpgradePrompt toolId="audio-transcription" toolName="Audio Transcription" onDismiss={dismissPrompt} />
      <UsageIndicator toolId="audio-transcription" />
      {/* Upload */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="audio-transcribe-upload"
          disabled={status === 'loading' || status === 'transcribing'}
        />
        <label htmlFor="audio-transcribe-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">🎙️</div>
          <p className="text-[var(--text)] mb-2">
            {audioFile ? audioFile.name : 'Drop audio/video file or click to browse'}
          </p>
          {audioFile && (
            <p className="text-[var(--text-muted)] text-sm">{formatSize(audioFile.size)}</p>
          )}
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Supports MP3, WAV, M4A, MP4, WebM
          </p>
        </label>
      </div>

      {/* Audio Preview */}
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full" />
      )}

      {/* Language Selection */}
      {audioFile && status === 'idle' && (
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

      {/* Transcribe Button */}
      {audioFile && status === 'idle' && (
        <button
          onClick={handleTranscribe}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
        >
          Transcribe Audio with AI
        </button>
      )}

      {/* Result */}
      {status === 'done' && transcript && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-muted)]">Transcript</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
                >
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
                >
                  Download .txt
                </button>
              </div>
            </div>
            <div className="bg-[var(--bg)] rounded p-4 max-h-64 overflow-y-auto">
              <p className="text-[var(--text)] whitespace-pre-wrap">{transcript}</p>
            </div>
          </div>

          <button
            onClick={() => {
              // Cleanup URL to prevent memory leaks
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              setAudioFile(null);
              setAudioUrl(null);
              setTranscript('');
              setStatus('idle');
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Transcribe Another File
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="audio-transcription" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• Uses Whisper AI - runs entirely in your browser</p>
        <p>• First use downloads ~150MB model (cached after)</p>
        <p>• Best with clear speech, single speaker</p>
      </div>
    </div>
  );
}
