import { useState } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { escapeHtml, sanitizeFilename, sanitizeTextContent } from '../../lib/security';

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'mauris', 'vitae',
  'ultricies', 'leo', 'integer', 'malesuada', 'nunc', 'vel', 'risus', 'commodo',
  'viverra', 'maecenas', 'accumsan', 'lacus', 'facilisis', 'gravida', 'neque',
  'convallis', 'cras', 'semper', 'auctor', 'nibh', 'tellus', 'molestie',
];

const FIRST_SENTENCE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

type GenerateType = 'paragraphs' | 'sentences' | 'words';

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateWord(): string {
  return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
}

function generateSentence(minWords = 8, maxWords = 15): string {
  const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  const words = Array.from({ length: wordCount }, () => generateWord());
  return capitalizeFirst(words.join(' ')) + '.';
}

function generateParagraph(minSentences = 4, maxSentences = 8): string {
  const sentenceCount = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
  return Array.from({ length: sentenceCount }, () => generateSentence()).join(' ');
}

function generateLorem(type: GenerateType, count: number, startWithLorem: boolean): string {
  let result: string[] = [];

  switch (type) {
    case 'paragraphs':
      result = Array.from({ length: count }, () => generateParagraph());
      if (startWithLorem && result.length > 0) {
        result[0] = FIRST_SENTENCE + ' ' + result[0].split('. ').slice(1).join('. ');
      }
      return sanitizeTextContent(result.join('\n\n'));

    case 'sentences':
      result = Array.from({ length: count }, () => generateSentence());
      if (startWithLorem && result.length > 0) {
        result[0] = FIRST_SENTENCE;
      }
      return sanitizeTextContent(result.join(' '));

    case 'words':
      result = Array.from({ length: count }, () => generateWord());
      if (startWithLorem && result.length >= 2) {
        result[0] = 'Lorem';
        result[1] = 'ipsum';
      }
      return sanitizeTextContent(result.join(' '));

    default:
      return '';
  }
}

function handleDownload(content: string, type: GenerateType) {
  const safeName = sanitizeFilename('lorem-ipsum');
  const extension = type === 'words' ? 'txt' : type;
  const filename = `${safeName}.${extension}`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LoremIpsum() {
  
  const [type, setType] = useState<GenerateType>('paragraphs');
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
        setOutput(generateLorem(type, count, startWithLorem));
      };

  const handleCopy = async () => {
    if (!output) return;
    const success = await copyToClipboard(output);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      
      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Type */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Generate
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as GenerateType)}
            aria-label="Text generation type"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                       text-white focus:outline-none focus:border-white/30 transition-colors"
          >
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </div>

        {/* Count */}
        <div>
          <label htmlFor="lorem-count" className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Count
          </label>
          <input
            id="lorem-count"
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                       text-white focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Start with Lorem */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Options
          </label>
          <label className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={startWithLorem}
              onChange={(e) => setStartWithLorem(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0"
            />
            <span className="text-white text-sm">Start with "Lorem ipsum"</span>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        className="w-full btn-primary"
      >
        Generate Lorem Ipsum
      </button>

      {/* Output */}
      {output && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Generated Text
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload(output, type)}
                className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Download
              </button>
              <button
                onClick={handleCopy}
                className={`
                  text-xs transition-colors
                  ${copied ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-white'}
                `}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div
            className="w-full min-h-48 max-h-96 overflow-y-auto bg-white/5 border border-white/10
                       rounded-xl p-4 text-white whitespace-pre-wrap leading-relaxed"
          >
            {output}
          </div>
          <div className="mt-2 text-center text-xs text-[var(--text-muted)]">
            {output.split(/\s+/).filter(Boolean).length} words · {output.length} characters
          </div>
        </div>
      )}
    </div>
  );
}
