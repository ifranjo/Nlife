import { useState, useRef, useEffect, useCallback } from 'react';
import { sanitizeFilename } from '../../lib/security';
import ToolFeedback from '../ui/ToolFeedback';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

type Status = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'done' | 'error';
type Quality = '720p' | '1080p' | 'source';

interface RecordingOptions {
  quality: Quality;
  includeAudio: boolean;
}

const QUALITY_SETTINGS: Record<Quality, { width: number; height: number; label: string }> = {
  '720p': { width: 1280, height: 720, label: '720p HD' },
  '1080p': { width: 1920, height: 1080, label: '1080p Full HD' },
  'source': { width: 0, height: 0, label: 'Source Quality' },
};

export default function ScreenRecorder() {
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('screen-recorder');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<RecordingOptions>({
    quality: '1080p',
    includeAudio: true,
  });
  const [recordingTime, setRecordingTime] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [audioSupported, setAudioSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLVideoElement>(null);

  // Check if system audio capture is supported
  useEffect(() => {
    // System audio capture requires specific browser support
    // Chrome supports it, Firefox/Safari have limitations
    const isChromium = navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Chromium');
    setAudioSupported(isChromium);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startTimer = useCallback(() => {
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    if (!checkUsage()) {
      return;
    }

    setError(null);
    setStatus('requesting');
    chunksRef.current = [];

    try {
      // Build constraints for getDisplayMedia
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: options.quality === 'source'
          ? true
          : {
              width: { ideal: QUALITY_SETTINGS[options.quality].width },
              height: { ideal: QUALITY_SETTINGS[options.quality].height },
            },
        audio: options.includeAudio,
      };

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      streamRef.current = stream;

      // Handle stream ending (user clicks stop sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (status === 'recording' || status === 'paused') {
          stopRecording();
        }
      });

      // Show preview
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        previewRef.current.play().catch(() => {});
      }

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: options.quality === '720p' ? 2500000 : 5000000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setStatus('processing');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setStatus('done');
        recordUsage();
        stopTimer();
        stopAllTracks();
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setStatus('error');
        stopTimer();
        stopAllTracks();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setStatus('recording');
      startTimer();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Screen sharing was denied. Please allow access to record your screen.');
        } else if (err.name === 'NotSupportedError') {
          setError('Screen recording is not supported in this browser. Try Chrome or Edge.');
        } else {
          setError('Failed to start recording. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
      setStatus('error');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (status === 'recording' || status === 'paused')) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const sanitizedTimestamp = sanitizeFilename(`recording-${timestamp}`);
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${sanitizedTimestamp}.webm`;
    a.click();
  };

  const handleReset = () => {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }
    setOutputUrl(null);
    setStatus('idle');
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopAllTracks();
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, [outputUrl, stopTimer, stopAllTracks]);

  return (
    <div className="space-y-6">
      {showPrompt && <UpgradePrompt toolId="screen-recorder" toolName="Screen Recorder" onDismiss={dismissPrompt} />}
      <UsageIndicator toolId="screen-recorder" />
      {/* Settings - Only shown when idle */}
      {status === 'idle' && (
        <div className="glass-card p-6 space-y-6">
          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">
              Video Quality
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(QUALITY_SETTINGS) as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setOptions(prev => ({ ...prev, quality: q }))}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    options.quality === q
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] hover:border-[var(--text-dim)]'
                  }`}
                >
                  <div className="font-medium">{q}</div>
                  <div className="text-xs text-[var(--text-dim)] mt-1">
                    {QUALITY_SETTINGS[q].width > 0
                      ? `${QUALITY_SETTINGS[q].width}x${QUALITY_SETTINGS[q].height}`
                      : 'Native resolution'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Option */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeAudio}
                onChange={(e) => setOptions(prev => ({ ...prev, includeAudio: e.target.checked }))}
                className="w-5 h-5 accent-[var(--accent)]"
                disabled={!audioSupported}
              />
              <span className="text-[var(--text)]">Include system audio</span>
              {!audioSupported && (
                <span className="text-xs text-[var(--warning)]">(Chrome/Edge only)</span>
              )}
            </label>
            <p className="text-xs text-[var(--text-dim)] mt-2 ml-8">
              When sharing a tab, audio from that tab will be captured.
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={startRecording}
            className="btn-primary w-full py-4 text-lg"
          >
            Start Recording
          </button>
        </div>
      )}

      {/* Recording Preview */}
      {(status === 'recording' || status === 'paused' || status === 'requesting') && (
        <div className="glass-card p-6 space-y-4">
          {/* Preview Video */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />

            {/* Recording Indicator */}
            {status === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">REC</span>
              </div>
            )}

            {status === 'paused' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-600 px-3 py-1.5 rounded-full">
                <span className="text-white text-sm font-medium">PAUSED</span>
              </div>
            )}

            {/* Timer */}
            <div className="absolute bottom-4 right-4 bg-black/70 px-4 py-2 rounded-lg">
              <span className="text-white font-mono text-xl">{formatTime(recordingTime)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {status === 'recording' && (
              <>
                <button
                  onClick={pauseRecording}
                  className="flex-1 py-3 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Pause
                </button>
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Stop Recording
                </button>
              </>
            )}

            {status === 'paused' && (
              <>
                <button
                  onClick={resumeRecording}
                  className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-colors"
                >
                  Resume
                </button>
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Finish Recording
                </button>
              </>
            )}

            {status === 'requesting' && (
              <div className="flex-1 py-3 text-center text-[var(--text-dim)]">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                  <span>Waiting for screen selection...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing State */}
      {status === 'processing' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span className="text-lg">Processing recording...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">Error</span>
            <div className="flex-1">
              <p className="text-red-400">{error}</p>
              <button
                onClick={handleReset}
                className="mt-3 text-sm text-[var(--text-dim)] hover:text-[var(--text)] underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {status === 'done' && outputUrl && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 text-green-400">
            <span className="text-2xl">Done</span>
            <span>Recording complete! ({formatTime(recordingTime)})</span>
          </div>

          {/* Preview */}
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              ref={resultRef}
              src={outputUrl}
              controls
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Download WebM
            </button>
            <button
              onClick={handleReset}
              className="py-3 px-6 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition-colors"
            >
              Record Again
            </button>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <ToolFeedback toolId="screen-recorder" />
          </div>
        </div>
      )}

      {/* Info Box */}
      {status === 'idle' && (
        <div className="text-xs text-[var(--text-dim)] space-y-1 px-1">
          <p>* All recording happens locally in your browser</p>
          <p>* Your screen content is never uploaded to any server</p>
          <p>* Works best in Chrome, Edge, or other Chromium browsers</p>
        </div>
      )}
    </div>
  );
}
