import { useState } from 'react';
import { copyToClipboard } from '../../lib/clipboard';

type CaseType = 'upper' | 'lower' | 'title' | 'sentence' | 'toggle' | 'camel' | 'snake' | 'kebab';

const CASE_OPTIONS: { id: CaseType; label: string; desc: string }[] = [
  { id: 'upper', label: 'UPPERCASE', desc: 'ALL CAPS' },
  { id: 'lower', label: 'lowercase', desc: 'all lowercase' },
  { id: 'title', label: 'Title Case', desc: 'First Letter Caps' },
  { id: 'sentence', label: 'Sentence case', desc: 'First word caps' },
  { id: 'toggle', label: 'tOGGLE cASE', desc: 'Inverts each letter' },
  { id: 'camel', label: 'camelCase', desc: 'For variables' },
  { id: 'snake', label: 'snake_case', desc: 'With underscores' },
  { id: 'kebab', label: 'kebab-case', desc: 'With dashes' },
];

function convertCase(text: string, type: CaseType): string {
  switch (type) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
      );
    case 'sentence':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    case 'toggle':
      return text.split('').map(c =>
        c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
      ).join('');
    case 'camel':
      return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
    case 'snake':
      return text
        .replace(/\s+/g, '_')
        .replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
        .replace(/^_/, '')
        .replace(/_+/g, '_')
        .toLowerCase();
    case 'kebab':
      return text
        .replace(/\s+/g, '-')
        .replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
        .replace(/^-/, '')
        .replace(/-+/g, '-')
        .toLowerCase();
    default:
      return text;
  }
}

export default function TextCase() {
  const [input, setInput] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('upper');
  const [copied, setCopied] = useState(false);

  const output = convertCase(input, caseType);

  const handleCopy = async () => {
    if (!output) return;
    const success = await copyToClipboard(output);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setInput('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Case Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CASE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setCaseType(opt.id)}
            className={`
              p-3 rounded-lg text-left transition-all border
              ${caseType === opt.id
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/5 border-transparent text-[var(--text-muted)] hover:bg-white/10'
              }
            `}
          >
            <div className="text-sm font-medium truncate">{opt.label}</div>
            <div className="text-[0.625rem] text-[var(--text-muted)]">{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
            Input Text
          </label>
          <button
            onClick={handleClear}
            className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4
                     text-white placeholder-[var(--text-muted)] resize-none
                     focus:outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
            Result
          </label>
          <button
            onClick={handleCopy}
            disabled={!output}
            className={`
              text-xs transition-colors
              ${copied
                ? 'text-green-400'
                : 'text-[var(--text-muted)] hover:text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <div
          className="w-full min-h-40 bg-white/5 border border-white/10 rounded-xl p-4
                     text-white whitespace-pre-wrap break-words"
        >
          {output || <span className="text-[var(--text-muted)]">Result will appear here...</span>}
        </div>
      </div>

      {/* Stats */}
      {input && (
        <div className="flex items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
          <span>{input.length} characters</span>
          <span>{input.split(/\s+/).filter(Boolean).length} words</span>
        </div>
      )}
    </div>
  );
}
