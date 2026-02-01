import { useState, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
  sanitizeTextContent,
} from '../../lib/security';
import { announce, haptic } from '../../lib/accessibility';
import { copyToClipboard } from '../../lib/clipboard';

// Types
type InputType = 'text' | 'file' | 'url';
type SummaryLength = 'brief' | 'standard' | 'detailed';
type SummaryFormat = 'paragraph' | 'bullets' | 'takeaways';
type SummaryFocus = 'general' | 'actions' | 'facts';
type SummaryMode = 'extractive' | 'openai' | 'claude';

interface TextStats {
  words: number;
  characters: number;
  sentences: number;
  readingTime: string;
}

interface ApiSettings {
  openaiKey: string;
  claudeKey: string;
}

// Constants
const MAX_TEXT_LENGTH = 100000; // 100k chars
const LENGTH_SETTINGS = {
  brief: { sentences: 2, label: 'Brief (1-2 sentences)' },
  standard: { sentences: 5, label: 'Standard (1 paragraph)' },
  detailed: { sentences: 12, label: 'Detailed (multiple paragraphs)' },
};

// Extractive summarization using TF-IDF
function extractiveSummarize(
  text: string,
  numSentences: number,
  focus: SummaryFocus
): string {
  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length <= numSentences) {
    return sentences.join(' ');
  }

  // Calculate word frequencies (TF)
  const wordFreq: Record<string, number> = {};
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

  // Focus-specific boost words
  const focusBoostWords: Record<SummaryFocus, Set<string>> = {
    general: new Set(),
    actions: new Set(['do', 'make', 'create', 'build', 'implement', 'need', 'should', 'must', 'action', 'step', 'task', 'complete', 'start', 'finish', 'next', 'first', 'then']),
    facts: new Set(['is', 'are', 'was', 'were', 'fact', 'data', 'number', 'percent', 'million', 'billion', 'year', 'date', 'study', 'research', 'found', 'shows', 'according']),
  };

  const allWords = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  for (const word of allWords) {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  // Score sentences
  const scoredSentences = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;

    for (const word of words) {
      if (wordFreq[word]) {
        score += wordFreq[word];
        // Boost for focus-specific words
        if (focusBoostWords[focus].has(word)) {
          score += wordFreq[word] * 2;
        }
      }
    }

    // Normalize by sentence length
    score = words.length > 0 ? score / Math.sqrt(words.length) : 0;

    // Boost first few sentences (usually important)
    if (index < 3) {
      score *= 1.5;
    }

    return { sentence, score, index };
  });

  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, numSentences)
    .sort((a, b) => a.index - b.index); // Restore original order

  return topSentences.map(s => s.sentence).join(' ');
}

// Format summary based on user preference
function formatSummary(
  text: string,
  format: SummaryFormat,
  focus: SummaryFocus
): string {
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (format === 'paragraph') {
    return sentences.join(' ');
  }

  if (format === 'bullets') {
    return sentences.map(s => `- ${s}`).join('\n');
  }

  // takeaways format
  const prefix = focus === 'actions' ? 'Action' : focus === 'facts' ? 'Fact' : 'Key Point';
  return sentences.map((s, i) => `${prefix} ${i + 1}: ${s}`).join('\n');
}

// Calculate text statistics
function calculateStats(text: string): TextStats {
  const words = text.split(/\s+/).filter(Boolean).length;
  const characters = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const readingMinutes = Math.ceil(words / 200);
  const readingTime = readingMinutes < 1 ? '< 1 min' : `${readingMinutes} min`;

  return { words, characters, sentences, readingTime };
}

// Extract text from PDF using pdf.js
async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        // Type guard for TextItem which has 'str' property
        if ('str' in item && typeof item.str === 'string') {
          return item.str;
        }
        return '';
      })
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

// Extract text from DOCX (simple approach using JSZip)
async function extractTextFromDocx(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const docXml = await zip.file('word/document.xml')?.async('string');

  if (!docXml) {
    throw new Error('Invalid DOCX file');
  }

  // Simple XML text extraction
  const text = docXml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

// Fetch text from URL
async function fetchUrlContent(url: string): Promise<string> {
  // Use a CORS proxy for client-side fetching
  const corsProxy = 'https://api.allorigins.win/raw?url=';
  const response = await fetch(corsProxy + encodeURIComponent(url));

  if (!response.ok) {
    throw new Error('Failed to fetch URL');
  }

  const html = await response.text();

  // Simple HTML to text conversion
  // SECURITY: Sanitize HTML to prevent XSS before DOM parsing
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'div', 'span', 'main', 'article', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'br', 'nav', 'header', 'footer', 'aside'],
    ALLOWED_ATTR: ['class', 'id'],
  });

  // Remove nav, header, footer elements (kept in sanitization for removal)
  const scripts = div.querySelectorAll('script, style, nav, header, footer, aside');
  scripts.forEach(el => el.remove());

  // Get text from main content areas if they exist
  const mainContent = div.querySelector('main, article, .content, #content, .post, .article');
  const textSource = mainContent || div;

  return textSource.textContent?.replace(/\s+/g, ' ').trim() || '';
}

// Generate AI summary using OpenAI
async function generateOpenAISummary(
  text: string,
  apiKey: string,
  length: SummaryLength,
  focus: SummaryFocus
): Promise<string> {
  const lengthInstructions = {
    brief: '1-2 sentences',
    standard: 'one paragraph (4-6 sentences)',
    detailed: 'multiple paragraphs (8-12 sentences)',
  };

  const focusInstructions = {
    general: 'Focus on the main points and key information.',
    actions: 'Focus on action items, tasks, and things that need to be done.',
    facts: 'Focus on facts, data, statistics, and concrete information.',
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful summarization assistant. Create a summary in ${lengthInstructions[length]}. ${focusInstructions[focus]} Be concise and accurate.`,
        },
        {
          role: 'user',
          content: `Summarize the following text:\n\n${text.slice(0, 15000)}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Generate AI summary using Claude
async function generateClaudeSummary(
  text: string,
  apiKey: string,
  length: SummaryLength,
  focus: SummaryFocus
): Promise<string> {
  const lengthInstructions = {
    brief: '1-2 sentences',
    standard: 'one paragraph (4-6 sentences)',
    detailed: 'multiple paragraphs (8-12 sentences)',
  };

  const focusInstructions = {
    general: 'Focus on the main points and key information.',
    actions: 'Focus on action items, tasks, and things that need to be done.',
    facts: 'Focus on facts, data, statistics, and concrete information.',
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Create a summary in ${lengthInstructions[length]}. ${focusInstructions[focus]} Be concise and accurate.\n\nText to summarize:\n\n${text.slice(0, 15000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API error');
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

// Stat Card Component
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
      <div className="text-lg font-light text-white">{value}</div>
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Main Component
export default function AiSummary() {
  // Usage tracking
  
  // State
  const [inputType, setInputType] = useState<InputType>('text');
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [extractedText, setExtractedText] = useState('');

  const [summaryMode, setSummaryMode] = useState<SummaryMode>('extractive');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('standard');
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>('paragraph');
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocus>('general');

  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => {
    if (typeof window !== 'undefined') {
      return {
        openaiKey: sessionStorage.getItem('newlife_openai_key') || '',
        claudeKey: sessionStorage.getItem('newlife_claude_key') || '',
      };
    }
    return { openaiKey: '', claudeKey: '' };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed values
  const currentText = inputType === 'text' ? inputText : extractedText;
  const stats = useMemo(() => calculateStats(currentText), [currentText]);
  const hasContent = currentText.trim().length > 0;

  // Save API keys to sessionStorage (auto-cleared when tab closes)
  const saveApiKey = (provider: 'openai' | 'claude', key: string) => {
    const newSettings = { ...apiSettings };
    if (provider === 'openai') {
      newSettings.openaiKey = key;
      sessionStorage.setItem('newlife_openai_key', key);
    } else {
      newSettings.claudeKey = key;
      sessionStorage.setItem('newlife_claude_key', key);
    }
    setApiSettings(newSettings);
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setIsProcessing(true);
    announce('Processing file');

    try {
      const fileName = selectedFile.name.toLowerCase();

      // Validate based on file type
      if (fileName.endsWith('.pdf')) {
        const validation = await validateFile(selectedFile, 'pdf');
        if (!validation.valid) {
          setError(validation.error || 'Invalid PDF file');
          haptic.error();
          return;
        }
        const text = await extractTextFromPdf(selectedFile);
        setExtractedText(sanitizeTextContent(text, MAX_TEXT_LENGTH));
      } else if (fileName.endsWith('.docx')) {
        const text = await extractTextFromDocx(selectedFile);
        setExtractedText(sanitizeTextContent(text, MAX_TEXT_LENGTH));
      } else if (fileName.endsWith('.txt')) {
        const text = await selectedFile.text();
        setExtractedText(sanitizeTextContent(text, MAX_TEXT_LENGTH));
      } else {
        setError('Unsupported file type. Please use PDF, DOCX, or TXT files.');
        haptic.error();
        return;
      }

      setFile(selectedFile);
      announce(`${sanitizeFilename(selectedFile.name)} loaded successfully`);
      haptic.success();
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to read file. Please try again.'));
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle URL fetch
  const handleUrlFetch = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setError(null);
    setIsProcessing(true);
    announce('Fetching content from URL');

    try {
      const text = await fetchUrlContent(url);
      if (text.length < 50) {
        setError('Could not extract meaningful content from this URL');
        haptic.error();
        return;
      }
      setExtractedText(sanitizeTextContent(text, MAX_TEXT_LENGTH));
      announce('Content fetched successfully');
      haptic.success();
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to fetch URL. The website may block external requests.'));
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  }, [url]);

  // Generate summary
  const generateSummary = useCallback(async () => {
    if (!hasContent) {
      setError('Please add some text to summarize');
      return;
    }

    
    setError(null);
    setIsProcessing(true);
    announce('Generating summary');

    try {
      let result = '';
      const numSentences = LENGTH_SETTINGS[summaryLength].sentences;

      if (summaryMode === 'extractive') {
        // Local extractive summarization
        result = extractiveSummarize(currentText, numSentences, summaryFocus);
        result = formatSummary(result, summaryFormat, summaryFocus);
      } else if (summaryMode === 'openai') {
        if (!apiSettings.openaiKey) {
          setError('Please add your OpenAI API key in settings');
          setShowSettings(true);
          return;
        }
        result = await generateOpenAISummary(
          currentText,
          apiSettings.openaiKey,
          summaryLength,
          summaryFocus
        );
        // Apply format if not paragraph
        if (summaryFormat !== 'paragraph') {
          result = formatSummary(result, summaryFormat, summaryFocus);
        }
      } else if (summaryMode === 'claude') {
        if (!apiSettings.claudeKey) {
          setError('Please add your Claude API key in settings');
          setShowSettings(true);
          return;
        }
        result = await generateClaudeSummary(
          currentText,
          apiSettings.claudeKey,
          summaryLength,
          summaryFocus
        );
        // Apply format if not paragraph
        if (summaryFormat !== 'paragraph') {
          result = formatSummary(result, summaryFormat, summaryFocus);
        }
      }

      setSummary(result);
            announce('Summary generated');
      haptic.success();
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to generate summary. Please try again.'));
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  }, [hasContent, currentText, summaryMode, summaryLength, summaryFormat, summaryFocus, apiSettings]);

  // Copy summary to clipboard
  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(summary);
    if (success) {
      setCopied(true);
      announce('Summary copied to clipboard');
      haptic.tap();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [summary]);

  // Clear all
  const handleClear = useCallback(() => {
    setInputText('');
    setExtractedText('');
    setFile(null);
    setUrl('');
    setSummary('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    announce('Content cleared');
    haptic.tap();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upgrade Prompt */}
      
      {/* Usage Indicator */}
      
      {/* Input Type Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        {(['text', 'file', 'url'] as InputType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setInputType(type);
              setError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${inputType === type
                ? 'bg-white/10 text-white'
                : 'text-[var(--text-muted)] hover:text-white'
              }`}
          >
            {type === 'text' && 'Paste Text'}
            {type === 'file' && 'Upload File'}
            {type === 'url' && 'Enter URL'}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        {inputType === 'text' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                Your Text
              </label>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setInputText(sanitizeTextContent(text, MAX_TEXT_LENGTH));
                      announce('Text pasted');
                    } catch {
                      // Clipboard access denied
                    }
                  }}
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
              value={inputText}
              onChange={(e) => setInputText(sanitizeTextContent(e.target.value, MAX_TEXT_LENGTH))}
              placeholder="Paste your text here to summarize..."
              className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4
                       text-white placeholder-[var(--text-muted)] resize-none
                       focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        )}

        {inputType === 'file' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
                     hover:border-white/40 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-4xl mb-3">
              {file ? '✅' : '📄'}
            </div>
            {file ? (
              <div>
                <p className="text-white font-medium">{sanitizeFilename(file.name)}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Click to choose a different file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-white font-medium">Drop a file here or click to browse</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Supports PDF, DOCX, TXT (max 50MB)
                </p>
              </div>
            )}
          </div>
        )}

        {inputType === 'url' && (
          <div className="space-y-3">
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Web Page URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                         text-white placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                onClick={handleUrlFetch}
                disabled={isProcessing || !url.trim()}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white
                         font-medium transition-colors disabled:opacity-50"
              >
                Fetch
              </button>
            </div>
          </div>
        )}

        {/* Show extracted text preview for file/URL */}
        {(inputType === 'file' || inputType === 'url') && extractedText && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                Extracted Text Preview
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <p className="text-sm text-[var(--text-muted)] line-clamp-4">
              {extractedText.slice(0, 500)}...
            </p>
          </div>
        )}
      </div>

      {/* Text Stats */}
      {hasContent && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Words" value={stats.words.toLocaleString()} />
          <StatCard label="Characters" value={stats.characters.toLocaleString()} />
          <StatCard label="Sentences" value={stats.sentences.toLocaleString()} />
          <StatCard label="Reading Time" value={stats.readingTime} />
        </div>
      )}

      {/* Summary Options */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Summary Options</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            API Settings
          </button>
        </div>

        {/* API Settings Panel */}
        {showSettings && (
          <div className="bg-white/5 rounded-lg p-4 space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              API keys are stored only in your browser's sessionStorage (cleared when tab closes). Never sent anywhere except to the respective API.
            </p>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">OpenAI API Key</label>
              <input
                type="password"
                value={apiSettings.openaiKey}
                onChange={(e) => saveApiKey('openai', e.target.value)}
                placeholder="sk-..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-white text-sm placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Claude API Key</label>
              <input
                type="password"
                value={apiSettings.claudeKey}
                onChange={(e) => saveApiKey('claude', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-white text-sm placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        )}

        {/* Summary Mode */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
            Summary Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'extractive', label: 'Extractive (Local)', desc: 'No AI, 100% private' },
              { value: 'openai', label: 'OpenAI', desc: 'GPT-3.5 Turbo' },
              { value: 'claude', label: 'Claude', desc: 'Claude 3 Haiku' },
            ] as { value: SummaryMode; label: string; desc: string }[]).map((mode) => (
              <button
                key={mode.value}
                onClick={() => setSummaryMode(mode.value)}
                className={`p-3 rounded-lg border transition-all text-left
                  ${summaryMode === mode.value
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'border-white/10 text-[var(--text-muted)] hover:border-white/20'
                  }`}
              >
                <div className="text-sm font-medium">{mode.label}</div>
                <div className="text-xs opacity-70">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Length */}
          <div>
            <label htmlFor="summary-length" className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Length
            </label>
            <select
              id="summary-length"
              value={summaryLength}
              onChange={(e) => setSummaryLength(e.target.value as SummaryLength)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                       text-white text-sm focus:outline-none focus:border-white/30"
            >
              <option value="brief">Brief (1-2 sentences)</option>
              <option value="standard">Standard (paragraph)</option>
              <option value="detailed">Detailed (multiple)</option>
            </select>
          </div>

          {/* Format */}
          <div>
            <label htmlFor="summary-format" className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Format
            </label>
            <select
              id="summary-format"
              value={summaryFormat}
              onChange={(e) => setSummaryFormat(e.target.value as SummaryFormat)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                       text-white text-sm focus:outline-none focus:border-white/30"
            >
              <option value="paragraph">Paragraph</option>
              <option value="bullets">Bullet Points</option>
              <option value="takeaways">Key Takeaways</option>
            </select>
          </div>

          {/* Focus */}
          <div>
            <label htmlFor="summary-focus" className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Focus
            </label>
            <select
              id="summary-focus"
              value={summaryFocus}
              onChange={(e) => setSummaryFocus(e.target.value as SummaryFocus)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                       text-white text-sm focus:outline-none focus:border-white/30"
            >
              <option value="general">General</option>
              <option value="actions">Action Items</option>
              <option value="facts">Key Facts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
        >
          <span aria-hidden="true">! </span>
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateSummary}
        disabled={isProcessing || !hasContent}
        aria-busy={isProcessing}
        className={`w-full py-4 rounded-xl font-medium text-lg transition-all flex items-center justify-center gap-2
          ${hasContent && !isProcessing
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90'
            : 'bg-white/10 text-[var(--text-muted)] cursor-not-allowed'
          }`}
      >
        {isProcessing ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Generating Summary...</span>
          </>
        ) : (
          <>
            <span>Generate Summary</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </>
        )}
      </button>

      {/* Summary Output */}
      {summary && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white uppercase tracking-wider">Summary</h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="text-white whitespace-pre-wrap leading-relaxed">
            {summary}
          </div>
          <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-white/10">
            {calculateStats(summary).words} words | {calculateStats(summary).readingTime} read
            {summaryMode !== 'extractive' && (
              <span className="ml-2">| Generated with {summaryMode === 'openai' ? 'GPT-3.5' : 'Claude 3 Haiku'}</span>
            )}
          </div>
        </div>
      )}

      {/* Privacy Note */}
      <p className="text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {summaryMode === 'extractive'
          ? 'Extractive mode processes everything locally. Your text never leaves your browser.'
          : 'AI mode sends text to the selected API. API keys are stored only in your browser\'s sessionStorage (cleared when tab closes).'}
      </p>
    </div>
  );
}
