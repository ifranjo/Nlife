import { useState, useCallback } from 'react';
import { sanitizeTextContent, escapeHtml } from '../../lib/security';

type DiffMode = 'line' | 'word';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: {
    left?: number;
    right?: number;
  };
}

interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

// Simple LCS-based diff algorithm
function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function backtrackDiff(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number
): DiffLine[] {
  const result: DiffLine[] = [];
  let leftLine = 1;
  let rightLine = 1;

  // Build path from start to end
  const path: Array<{ type: 'match' | 'insert' | 'delete'; aIdx?: number; bIdx?: number }> = [];

  let pi = i;
  let pj = j;

  while (pi > 0 || pj > 0) {
    if (pi > 0 && pj > 0 && a[pi - 1] === b[pj - 1]) {
      path.unshift({ type: 'match', aIdx: pi - 1, bIdx: pj - 1 });
      pi--;
      pj--;
    } else if (pj > 0 && (pi === 0 || dp[pi][pj - 1] >= dp[pi - 1][pj])) {
      path.unshift({ type: 'insert', bIdx: pj - 1 });
      pj--;
    } else {
      path.unshift({ type: 'delete', aIdx: pi - 1 });
      pi--;
    }
  }

  // Convert path to diff lines
  for (const step of path) {
    if (step.type === 'match') {
      result.push({
        type: 'unchanged',
        content: a[step.aIdx!],
        lineNumber: { left: leftLine++, right: rightLine++ }
      });
    } else if (step.type === 'delete') {
      result.push({
        type: 'removed',
        content: a[step.aIdx!],
        lineNumber: { left: leftLine++ }
      });
    } else {
      result.push({
        type: 'added',
        content: b[step.bIdx!],
        lineNumber: { right: rightLine++ }
      });
    }
  }

  return result;
}

function computeDiff(original: string, modified: string, mode: DiffMode): DiffLine[] {
  if (!original && !modified) return [];

  const splitFn = mode === 'line'
    ? (s: string) => s.split('\n')
    : (s: string) => s.split(/(\s+)/);

  const a = splitFn(original);
  const b = splitFn(modified);

  const dp = computeLCS(a, b);
  return backtrackDiff(dp, a, b, a.length, b.length);
}

function calculateStats(diff: DiffLine[]): DiffStats {
  return diff.reduce(
    (acc, line) => {
      acc[line.type]++;
      return acc;
    },
    { added: 0, removed: 0, unchanged: 0 }
  );
}

export default function DiffChecker() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [diffMode, setDiffMode] = useState<DiffMode>('line');
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [stats, setStats] = useState<DiffStats | null>(null);
  const [hasCompared, setHasCompared] = useState(false);
  
  const handleCompare = useCallback(() => {
        // Sanitize inputs before processing
    const sanitizedOriginal = sanitizeTextContent(original);
    const sanitizedModified = sanitizeTextContent(modified);
    const result = computeDiff(sanitizedOriginal, sanitizedModified, diffMode);
    setDiff(result);
    setStats(calculateStats(result));
    setHasCompared(true);
      }, [original, modified, diffMode, checkUsage, recordUsage]);

  const handleSwap = useCallback(() => {
    setOriginal(modified);
    setModified(original);
    setDiff([]);
    setStats(null);
    setHasCompared(false);
  }, [original, modified]);

  const handleClear = useCallback(() => {
    setOriginal('');
    setModified('');
    setDiff([]);
    setStats(null);
    setHasCompared(false);
  }, []);

  const renderDiffContent = () => {
    if (!hasCompared) return null;
    if (diff.length === 0) {
      return (
        <div className="text-center py-8 text-[var(--text-muted)]">
          No differences found. Both texts are identical.
        </div>
      );
    }

    if (diffMode === 'word') {
      // Word mode: inline rendering with escaped content
      return (
        <div className="font-mono text-sm whitespace-pre-wrap break-words p-4 bg-slate-900 rounded-lg border border-slate-700">
          {diff.map((part, idx) => (
            <span
              key={idx}
              className={
                part.type === 'added'
                  ? 'bg-green-500/30 text-green-300'
                  : part.type === 'removed'
                  ? 'bg-red-500/30 text-red-300 line-through'
                  : 'text-[var(--text)]'
              }
              dangerouslySetInnerHTML={{ __html: escapeHtml(part.content) }}
            />
          ))}
        </div>
      );
    }

    // Line mode: side-by-side or unified view
    return (
      <div className="font-mono text-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {diff.map((line, idx) => (
              <tr
                key={idx}
                className={
                  line.type === 'added'
                    ? 'bg-green-500/20'
                    : line.type === 'removed'
                    ? 'bg-red-500/20'
                    : ''
                }
              >
                <td className="w-12 px-2 py-1 text-right text-[var(--text-muted)] border-r border-slate-700 select-none">
                  {line.lineNumber.left || ''}
                </td>
                <td className="w-12 px-2 py-1 text-right text-[var(--text-muted)] border-r border-slate-700 select-none">
                  {line.lineNumber.right || ''}
                </td>
                <td className="w-8 px-2 py-1 text-center border-r border-slate-700 select-none">
                  {line.type === 'added' && (
                    <span className="text-green-400">+</span>
                  )}
                  {line.type === 'removed' && (
                    <span className="text-red-400">-</span>
                  )}
                </td>
                <td
                  className={`px-3 py-1 whitespace-pre ${
                    line.type === 'added'
                      ? 'text-green-300'
                      : line.type === 'removed'
                      ? 'text-red-300'
                      : 'text-[var(--text)]'
                  }`}
                  dangerouslySetInnerHTML={{ __html: escapeHtml(line.content) }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
                  {/* Input Areas */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Original Text */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Original</h3>
            <span className="text-xs text-[var(--text-muted)]">
              {original.split('\n').length} lines
            </span>
          </div>
          <textarea
            value={original}
            onChange={(e) => {
              setOriginal(e.target.value);
              setHasCompared(false);
            }}
            placeholder="Paste original text here..."
            rows={14}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Modified Text */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Modified</h3>
            <span className="text-xs text-[var(--text-muted)]">
              {modified.split('\n').length} lines
            </span>
          </div>
          <textarea
            value={modified}
            onChange={(e) => {
              setModified(e.target.value);
              setHasCompared(false);
            }}
            placeholder="Paste modified text here..."
            rows={14}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] text-sm">Mode:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              <button
                onClick={() => {
                  setDiffMode('line');
                  setHasCompared(false);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  diffMode === 'line'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Line-by-Line
              </button>
              <button
                onClick={() => {
                  setDiffMode('word');
                  setHasCompared(false);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  diffMode === 'word'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Word-by-Word
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSwap}
              disabled={!original && !modified}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                !original && !modified
                  ? 'opacity-50 cursor-not-allowed bg-slate-800 text-[var(--text-muted)]'
                  : 'bg-slate-800 text-[var(--text)] hover:bg-slate-700 hover:text-white'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Swap
            </button>
            <button
              onClick={handleClear}
              disabled={!original && !modified}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                !original && !modified
                  ? 'opacity-50 cursor-not-allowed bg-slate-800 text-[var(--text-muted)]'
                  : 'bg-slate-800 text-[var(--text)] hover:bg-slate-700 hover:text-white'
              }`}
            >
              Clear
            </button>
            <button
              onClick={handleCompare}
              disabled={!original.trim() && !modified.trim()}
              className={`btn-primary flex items-center gap-2 text-sm ${
                !original.trim() && !modified.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Compare
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && hasCompared && (
        <div className="glass-card p-6 mt-6">
          <h3 className="text-white font-medium mb-4">Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {stats.added}
              </div>
              <div className="text-sm text-green-300 mt-1">
                {diffMode === 'line' ? 'Lines' : 'Words'} Added
              </div>
            </div>
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-400">
                {stats.removed}
              </div>
              <div className="text-sm text-red-300 mt-1">
                {diffMode === 'line' ? 'Lines' : 'Words'} Removed
              </div>
            </div>
            <div className="bg-slate-500/20 border border-slate-500/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-[var(--text-muted)]">
                {stats.unchanged}
              </div>
              <div className="text-sm text-[var(--text)] mt-1">
                {diffMode === 'line' ? 'Lines' : 'Words'} Unchanged
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diff Output */}
      {hasCompared && (
        <div className="glass-card p-6 mt-6">
          <h3 className="text-white font-medium mb-4">Differences</h3>
          <div className="max-h-[500px] overflow-auto bg-slate-900 rounded-lg border border-slate-700">
            {renderDiffContent()}
          </div>
          {diff.length > 0 && (
            <div className="mt-4 flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500/30 rounded" /> Added
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500/30 rounded" /> Removed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-slate-700 rounded" /> Unchanged
              </span>
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg
          className="w-4 h-4 inline-block mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        All comparison happens locally in your browser. No data is sent to any
        server.
      </p>
    </div>
  );
}
