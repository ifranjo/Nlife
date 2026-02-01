import { useState, useRef, useEffect } from 'react';
import ToolFeedback from '../ui/ToolFeedback';
import { sanitizeFilename, createSafeErrorMessage, sanitizeTextContent } from '../../lib/security';
import { announce, haptic } from '../../lib/accessibility';

type Status = 'idle' | 'processing' | 'error';
type Format = 'srt' | 'vtt';

interface SubtitleEntry {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export default function SubtitleEditor() {
    const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [format, setFormat] = useState<Format>('srt');
  const [entries, setEntries] = useState<SubtitleEntry[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const entriesListRef = useRef<HTMLDivElement>(null);
  const [outputFormat, setOutputFormat] = useState<Format>('srt');
  const [activeEntryIndex, setActiveEntryIndex] = useState(0); // For roving tabindex

  // Parse SRT format
  const parseSRT = (content: string): SubtitleEntry[] => {
    const blocks = content.trim().split(/\n\s*\n/);
    const parsed: SubtitleEntry[] = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      const indexLine = lines[0].trim();
      const timeLine = lines[1].trim();
      const textLines = lines.slice(2);

      // Parse time format: 00:00:01,000 --> 00:00:04,000
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) continue;

      parsed.push({
        id: crypto.randomUUID(),
        index: parseInt(indexLine) || parsed.length + 1,
        startTime: timeMatch[1],
        endTime: timeMatch[2],
        text: sanitizeTextContent(textLines.join('\n'))
      });
    }

    return parsed;
  };

  // Parse VTT format
  const parseVTT = (content: string): SubtitleEntry[] => {
    // Remove WEBVTT header
    const cleaned = content.replace(/^WEBVTT.*?\n\n?/i, '');
    const blocks = cleaned.trim().split(/\n\s*\n/);
    const parsed: SubtitleEntry[] = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;

      // First line might be identifier or time
      let timeLine = lines[0];
      let textStartIndex = 1;

      // Check if first line contains time arrow
      if (!timeLine.includes('-->')) {
        timeLine = lines[1];
        textStartIndex = 2;
      }

      const textLines = lines.slice(textStartIndex);

      // Parse time format: 00:00:01.000 --> 00:00:04.000
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (!timeMatch) continue;

      parsed.push({
        id: crypto.randomUUID(),
        index: parsed.length + 1,
        startTime: timeMatch[1].replace('.', ','), // Normalize to SRT format internally
        endTime: timeMatch[2].replace('.', ','),
        text: sanitizeTextContent(textLines.join('\n'))
      });
    }

    return parsed;
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatus('processing');

    try {
      // Validate file size (5MB max for subtitle files)
      if (file.size > 5 * 1024 * 1024) {
        setError('Subtitle file exceeds 5MB limit');
        setStatus('error');
        return;
      }

      // Check extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'srt' && ext !== 'vtt') {
        setError('Only SRT and VTT files are supported');
        setStatus('error');
        return;
      }

      setFileName(file.name);
      setFormat(ext as Format);
      setOutputFormat(ext as Format);

      const content = await file.text();
      const parsed = ext === 'srt' ? parseSRT(content) : parseVTT(content);

      if (parsed.length === 0) {
        setError('No valid subtitle entries found in file');
        setStatus('error');
        return;
      }

      setEntries(parsed);
      setStatus('idle');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to parse subtitle file'));
      setStatus('error');
    }
  };

  // Handle video file upload
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic video validation
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('Video file exceeds 500MB limit');
      return;
    }

    setVideoFile(file);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
  };

  // Update entry
  const updateEntry = (id: string, field: keyof SubtitleEntry, value: string | number) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  // Add new entry
  const addEntry = () => {
    const lastEntry = entries[entries.length - 1];
    const newIndex = entries.length + 1;

    // Default to 1 second after last entry
    let startTime = '00:00:00,000';
    let endTime = '00:00:03,000';

    if (lastEntry) {
      const [hh, mm, ss, ms] = lastEntry.endTime.split(/[:,]/);
      const totalMs = parseInt(hh) * 3600000 + parseInt(mm) * 60000 + parseInt(ss) * 1000 + parseInt(ms) + 1000;
      startTime = formatTime(totalMs);
      endTime = formatTime(totalMs + 3000);
    }

    const newEntry: SubtitleEntry = {
      id: crypto.randomUUID(),
      index: newIndex,
      startTime,
      endTime,
      text: 'New subtitle text'
    };

    setEntries([...entries, newEntry]);
  };

  // Delete entry
  const deleteEntry = (id: string) => {
    const entryToDelete = entries.find(e => e.id === id);
    const filtered = entries.filter(e => e.id !== id);
    // Reindex
    const reindexed = filtered.map((e, idx) => ({ ...e, index: idx + 1 }));
    setEntries(reindexed);
    // Adjust active index if needed
    if (activeEntryIndex >= reindexed.length && reindexed.length > 0) {
      setActiveEntryIndex(reindexed.length - 1);
    }
    announce(`Entry ${entryToDelete?.index || ''} removed`);
    haptic.tap();
  };

  // Move entry up
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newEntries = [...entries];
    [newEntries[index - 1], newEntries[index]] = [newEntries[index], newEntries[index - 1]];
    // Reindex
    const reindexed = newEntries.map((e, idx) => ({ ...e, index: idx + 1 }));
    setEntries(reindexed);
    setActiveEntryIndex(index - 1);
    announce(`Moved to position ${index}`);
    haptic.tap();
  };

  // Move entry down
  const moveDown = (index: number) => {
    if (index === entries.length - 1) return;
    const newEntries = [...entries];
    [newEntries[index], newEntries[index + 1]] = [newEntries[index + 1], newEntries[index]];
    // Reindex
    const reindexed = newEntries.map((e, idx) => ({ ...e, index: idx + 1 }));
    setEntries(reindexed);
    setActiveEntryIndex(index + 1);
    announce(`Moved to position ${index + 2}`);
    haptic.tap();
  };

  // Keyboard navigation for entries list (roving tabindex pattern)
  const handleEntryKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < entries.length - 1) {
          setActiveEntryIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setActiveEntryIndex(index - 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveEntryIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveEntryIndex(entries.length - 1);
        break;
      case 'Delete':
      case 'Backspace':
        // Only delete if not focused on an input/textarea
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteEntry(entries[index].id);
        }
        break;
    }
  };

  // Focus active entry when activeEntryIndex changes
  useEffect(() => {
    if (entriesListRef.current && entries.length > 0) {
      const activeItem = entriesListRef.current.querySelector(`[data-index="${activeEntryIndex}"]`) as HTMLElement;
      activeItem?.focus();
    }
  }, [activeEntryIndex, entries.length]);

  // Format time from milliseconds
  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  };

  // Convert to SRT format
  const toSRT = (): string => {
    return entries.map(e =>
      `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}\n`
    ).join('\n');
  };

  // Convert to VTT format
  const toVTT = (): string => {
    const vttEntries = entries.map(e => {
      const startVTT = e.startTime.replace(',', '.');
      const endVTT = e.endTime.replace(',', '.');
      return `${startVTT} --> ${endVTT}\n${e.text}`;
    }).join('\n\n');

    return `WEBVTT\n\n${vttEntries}\n`;
  };

  // Download subtitle file
  const handleDownload = () => {
    
    const content = outputFormat === 'srt' ? toSRT() : toVTT();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const baseName = sanitizeFilename(fileName.replace(/\.[^.]+$/, '') || 'subtitles');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_edited.${outputFormat}`;
    a.click();
    URL.revokeObjectURL(url);

      };

  // Seek video to subtitle time
  const seekToTime = (timeStr: string) => {
    if (!videoRef.current) return;

    const [hh, mm, ss, ms] = timeStr.split(/[:,]/);
    const totalSeconds = parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss) + parseInt(ms) / 1000;
    videoRef.current.currentTime = totalSeconds;
  };

  return (
    <div className="space-y-6">
                  {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Subtitle File Upload */}
        <div className={`border ${entries.length === 0 ? 'border-dashed' : 'border-solid'} border-[var(--border)] rounded-lg p-6 text-center hover:border-[var(--accent)] transition-colors`}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt"
            onChange={handleFileSelect}
            className="hidden"
            id="subtitle-upload"
          />
          <label htmlFor="subtitle-upload" className="cursor-pointer block">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-[var(--text)] font-medium mb-1">
              {fileName || 'Upload Subtitle File'}
            </p>
            <p className="text-[var(--text-muted)] text-xs">
              {entries.length === 0 ? 'SRT or VTT format' : `${entries.length} entries loaded`}
            </p>
          </label>
        </div>

        {/* Video File Upload (Optional) */}
        <div className="border border-dashed border-[var(--border)] rounded-lg p-6 text-center hover:border-[var(--accent)] transition-colors">
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="cursor-pointer block">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-[var(--text)] font-medium mb-1">
              {videoFile?.name || 'Add Video (Optional)'}
            </p>
            <p className="text-[var(--text-muted)] text-xs">Preview subtitles with video</p>
          </label>
        </div>
      </div>

      {/* Video Preview */}
      {videoUrl && (
        <div className="glass-card p-4">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full rounded-lg"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Subtitle Entries Editor */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text)]">
              Subtitle Entries ({entries.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={addEntry}
                className="px-3 py-1.5 bg-[var(--accent)] text-[var(--bg)] rounded text-sm font-medium hover:opacity-90"
              >
                + Add Entry
              </button>
            </div>
          </div>

          {/* Entries List - Roving tabindex for keyboard navigation */}
          <div
            ref={entriesListRef}
            role="list"
            aria-label={`${entries.length} subtitle entries. Use arrow keys to navigate, Delete to remove.`}
            className="space-y-3 max-h-[600px] overflow-y-auto"
          >
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                role="listitem"
                tabIndex={idx === activeEntryIndex ? 0 : -1}
                data-index={idx}
                onKeyDown={(e) => handleEntryKeyDown(e, idx)}
                aria-label={`Entry ${entry.index}, ${entry.startTime} to ${entry.endTime}`}
                className="glass-card p-4 space-y-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-[var(--text-muted)]">#{entry.index}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)] disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === entries.length - 1}
                      className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)] disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="px-2 py-1 text-xs border border-red-500/30 text-red-400 rounded hover:bg-red-500/10"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Start Time</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={entry.startTime}
                        onChange={(e) => updateEntry(entry.id, 'startTime', e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-sm font-mono focus:border-[var(--accent)] outline-none"
                        placeholder="00:00:00,000"
                      />
                      {videoRef.current && (
                        <button
                          onClick={() => seekToTime(entry.startTime)}
                          className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
                          title="Seek to start"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">End Time</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={entry.endTime}
                        onChange={(e) => updateEntry(entry.id, 'endTime', e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-sm font-mono focus:border-[var(--accent)] outline-none"
                        placeholder="00:00:03,000"
                      />
                      {videoRef.current && (
                        <button
                          onClick={() => seekToTime(entry.endTime)}
                          className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--bg)]"
                          title="Seek to end"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Subtitle Text</label>
                  <textarea
                    value={entry.text}
                    onChange={(e) => updateEntry(entry.id, 'text', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-sm focus:border-[var(--accent)] outline-none resize-none"
                    rows={2}
                    placeholder="Enter subtitle text..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Export Section */}
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-[var(--text-muted)]">Export Format:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOutputFormat('srt')}
                  className={`px-4 py-2 rounded font-medium ${
                    outputFormat === 'srt'
                      ? 'bg-[var(--accent)] text-[var(--bg)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  SRT
                </button>
                <button
                  onClick={() => setOutputFormat('vtt')}
                  className={`px-4 py-2 rounded font-medium ${
                    outputFormat === 'vtt'
                      ? 'bg-[var(--accent)] text-[var(--bg)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  VTT
                </button>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
            >
              Download Edited Subtitles (.{outputFormat})
            </button>

            <div className="pt-3 border-t border-[var(--border)]">
              <ToolFeedback toolId="subtitle-editor" />
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• Time format: HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT)</p>
        <p>• Edit text inline, adjust timing, add or remove entries</p>
        <p>• All processing happens in your browser</p>
      </div>
    </div>
  );
}
