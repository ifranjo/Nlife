import { useState, useRef } from 'react';
import ToolFeedback from '../ui/ToolFeedback';

type Status = 'idle' | 'processing' | 'done' | 'error';

export default function RemoveVocals() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [vocalStrength, setVocalStrength] = useState(1.0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file');
      return;
    }

    setAudioFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    setProcessedUrl(null);
    setError(null);
    setStatus('idle');
  };

  const processAudio = async () => {
    if (!audioFile) return;

    setStatus('processing');
    setError(null);

    try {
      // Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Decode audio file
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Check if stereo
      if (audioBuffer.numberOfChannels < 2) {
        setError('Vocal removal requires stereo audio. This file is mono.');
        setStatus('error');
        return;
      }

      // Get channel data
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);

      // Create output buffer
      const outputBuffer = audioContext.createBuffer(
        2,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const outputLeft = outputBuffer.getChannelData(0);
      const outputRight = outputBuffer.getChannelData(1);

      // Phase cancellation - subtract channels to remove center-panned audio
      // Vocals are typically panned to center
      for (let i = 0; i < audioBuffer.length; i++) {
        const diff = (leftChannel[i] - rightChannel[i]) * vocalStrength;
        outputLeft[i] = leftChannel[i] - diff * 0.5;
        outputRight[i] = rightChannel[i] + diff * 0.5;
      }

      // Convert to WAV
      const wavBlob = audioBufferToWav(outputBuffer);
      setProcessedUrl(URL.createObjectURL(wavBlob));
      setStatus('done');
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process audio. Try a different file.');
      setStatus('error');
    }
  };

  // Helper to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const handleDownload = () => {
    if (!processedUrl || !audioFile) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = audioFile.name.replace(/\.[^.]+$/, '_instrumental.wav');
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
          id="vocals-upload"
          disabled={status === 'processing'}
        />
        <label htmlFor="vocals-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">🎤</div>
          <p className="text-[var(--text)] mb-2">
            {audioFile ? audioFile.name : 'Drop audio file or click to browse'}
          </p>
          {audioFile && (
            <p className="text-[var(--text-muted)] text-sm">{formatSize(audioFile.size)}</p>
          )}
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Supports MP3, WAV, M4A (stereo required)
          </p>
        </label>
      </div>

      {/* Original Audio Preview */}
      {originalUrl && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-2">
          <span className="text-sm text-[var(--text-muted)]">Original</span>
          <audio controls src={originalUrl} className="w-full" />
        </div>
      )}

      {/* Settings */}
      {audioFile && status === 'idle' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
          <label className="block text-sm text-[var(--text-muted)]">
            Vocal Removal Strength: {Math.round(vocalStrength * 100)}%
          </label>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={vocalStrength}
            onChange={(e) => setVocalStrength(parseFloat(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Higher = more aggressive vocal removal (may affect other instruments)
          </p>
        </div>
      )}

      {/* Status */}
      {status === 'processing' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Processing audio...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Process Button */}
      {audioFile && status === 'idle' && (
        <button
          onClick={processAudio}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
        >
          Remove Vocals
        </button>
      )}

      {/* Result */}
      {status === 'done' && processedUrl && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="text-green-400">Vocals removed!</span>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-[var(--text-muted)]">Instrumental</span>
            <audio controls src={processedUrl} className="w-full" />
          </div>

          <button
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
          >
            Download Instrumental
          </button>

          <button
            onClick={() => {
              setAudioFile(null);
              setOriginalUrl(null);
              setProcessedUrl(null);
              setStatus('idle');
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Process Another Song
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="remove-vocals" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• Uses phase cancellation (works best on center-panned vocals)</p>
        <p>• Requires stereo audio files</p>
        <p>• Results vary by song - professionally mixed tracks work best</p>
        <p>• All processing happens in your browser</p>
      </div>
    </div>
  );
}
