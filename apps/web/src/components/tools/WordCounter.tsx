import { useState, useMemo } from 'react';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

interface Stats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingTime: string;
  speakingTime: string;
}

function calculateStats(text: string): Stats {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;

  // Average reading speed: 200 wpm, speaking: 150 wpm
  const readingMinutes = Math.ceil(words / 200);
  const speakingMinutes = Math.ceil(words / 150);

  const readingTime = readingMinutes < 1 ? '< 1 min' : `${readingMinutes} min`;
  const speakingTime = speakingMinutes < 1 ? '< 1 min' : `${speakingMinutes} min`;

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    readingTime,
    speakingTime,
  };
}

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-2xl font-light text-white mb-1">{value}</div>
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
      {sublabel && (
        <div className="text-[0.625rem] text-[var(--text-dim)] mt-1">{sublabel}</div>
      )}
    </div>
  );
}

export default function WordCounter() {
  const [text, setText] = useState('');
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('word-counter');

  const stats = useMemo(() => calculateStats(text), [text]);

  const handleClear = () => setText('');

  const handlePaste = async () => {
    if (!checkUsage()) {
      return;
    }
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      recordUsage();
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {showPrompt && <UpgradePrompt toolId="word-counter" toolName="Word Counter" onDismiss={dismissPrompt} />}
      <UsageIndicator toolId="word-counter" />
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Words" value={stats.words} />
        <StatCard label="Characters" value={stats.characters} sublabel="with spaces" />
        <StatCard label="Characters" value={stats.charactersNoSpaces} sublabel="no spaces" />
        <StatCard label="Sentences" value={stats.sentences} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Paragraphs" value={stats.paragraphs} />
        <StatCard label="Reading Time" value={stats.readingTime} sublabel="@ 200 wpm" />
        <StatCard label="Speaking Time" value={stats.speakingTime} sublabel="@ 150 wpm" />
      </div>

      {/* Text Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
            Your Text
          </label>
          <div className="flex gap-3">
            <button
              onClick={handlePaste}
              className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Paste
            </button>
            <button
              onClick={handleClear}
              className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here to count words, characters, and more..."
          className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4
                     text-white placeholder-[var(--text-muted)] resize-none
                     focus:outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Keyword Density (if text exists) */}
      {stats.words >= 10 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Top Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {getTopKeywords(text).map(({ word, count }) => (
              <span
                key={word}
                className="px-2 py-1 bg-white/10 rounded text-xs text-white"
              >
                {word} <span className="text-[var(--text-muted)]">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTopKeywords(text: string, limit = 10): { word: string; count: number }[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'as', 'if',
  ]);

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq: Record<string, number> = {};

  for (const word of words) {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
