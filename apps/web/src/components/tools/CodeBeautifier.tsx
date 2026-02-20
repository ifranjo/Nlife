import { useState, useRef, useCallback, useEffect } from 'react';
import { createSafeErrorMessage } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

type Language = 'javascript' | 'typescript' | 'css' | 'html' | 'json' | 'sql';
type IndentType = '2spaces' | '4spaces' | 'tabs';

interface FormatterError {
  message: string;
  line?: number;
  column?: number;
}

// Language configuration
const LANGUAGES: { id: Language; label: string; extensions: string[] }[] = [
  { id: 'javascript', label: 'JavaScript', extensions: ['.js', '.jsx'] },
  { id: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { id: 'css', label: 'CSS', extensions: ['.css', '.scss'] },
  { id: 'html', label: 'HTML', extensions: ['.html', '.htm'] },
  { id: 'json', label: 'JSON', extensions: ['.json'] },
  { id: 'sql', label: 'SQL', extensions: ['.sql'] },
];

export default function CodeBeautifier() {
  
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [indentType, setIndentType] = useState<IndentType>('2spaces');
  const [error, setError] = useState<FormatterError | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [prettierLoaded, setPrettierLoaded] = useState(false);
  const [sqlFormatterLoaded, setSqlFormatterLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prettierRef = useRef<any>(null);
  const prettierPluginsRef = useRef<any>({});
  const sqlFormatterRef = useRef<any>(null);

  // Get indent string based on type
  const getIndentConfig = () => {
    switch (indentType) {
      case '2spaces':
        return { tabWidth: 2, useTabs: false };
      case '4spaces':
        return { tabWidth: 4, useTabs: false };
      case 'tabs':
        return { tabWidth: 2, useTabs: true };
    }
  };

  // Dynamically load Prettier
  const loadPrettier = useCallback(async () => {
    if (prettierRef.current) return true;

    try {
      const [prettier, parserBabel, parserHtml, parserCss, parserTypescript, parserEstree] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/html'),
        import('prettier/plugins/postcss'),
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);

      prettierRef.current = prettier;
      prettierPluginsRef.current = {
        babel: parserBabel,
        html: parserHtml,
        postcss: parserCss,
        typescript: parserTypescript,
        estree: parserEstree,
      };

      setPrettierLoaded(true);
      return true;
    } catch (err) {
      console.error('Failed to load Prettier:', err);
      return false;
    }
  }, []);

  // Dynamically load sql-formatter
  const loadSqlFormatter = useCallback(async () => {
    if (sqlFormatterRef.current) return true;

    try {
      const sqlFormatter = await import('sql-formatter');
      sqlFormatterRef.current = sqlFormatter;
      setSqlFormatterLoaded(true);
      return true;
    } catch (err) {
      console.error('Failed to load sql-formatter:', err);
      return false;
    }
  }, []);

  // Preload formatters on mount
  useEffect(() => {
    loadPrettier();
    loadSqlFormatter();
  }, [loadPrettier, loadSqlFormatter]);

  // Get Prettier parser for language
  const getPrettierParser = (lang: Language): string => {
    switch (lang) {
      case 'javascript':
        return 'babel';
      case 'typescript':
        return 'typescript';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      default:
        return 'babel';
    }
  };

  // Get Prettier plugins for language
  const getPrettierPlugins = (lang: Language): any[] => {
    const plugins = prettierPluginsRef.current;
    switch (lang) {
      case 'javascript':
      case 'json':
        return [plugins.babel, plugins.estree];
      case 'typescript':
        return [plugins.typescript, plugins.estree];
      case 'css':
        return [plugins.postcss];
      case 'html':
        return [plugins.html];
      default:
        return [plugins.babel, plugins.estree];
    }
  };

  // Format code
  const formatCode = useCallback(async () => {
    
    if (!input.trim()) {
      setError({ message: 'Input is empty' });
      return;
    }

    setIsFormatting(true);
    setError(null);

    try {
      let formatted: string;
      const indentConfig = getIndentConfig();

      if (language === 'sql') {
        // Use sql-formatter for SQL
        const loaded = await loadSqlFormatter();
        if (!loaded || !sqlFormatterRef.current) {
          throw new Error('SQL formatter failed to load');
        }

        formatted = sqlFormatterRef.current.format(input, {
          language: 'sql',
          tabWidth: indentConfig.tabWidth,
          useTabs: indentConfig.useTabs,
          keywordCase: 'upper',
          linesBetweenQueries: 2,
        });
      } else {
        // Use Prettier for other languages
        const loaded = await loadPrettier();
        if (!loaded || !prettierRef.current) {
          throw new Error('Code formatter failed to load');
        }

        formatted = await prettierRef.current.format(input, {
          parser: getPrettierParser(language),
          plugins: getPrettierPlugins(language),
          tabWidth: indentConfig.tabWidth,
          useTabs: indentConfig.useTabs,
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
          printWidth: 80,
        });
      }

      setOutput(formatted);
          } catch (err: any) {
      // Try to extract line/column from error
      let line: number | undefined;
      let column: number | undefined;

      if (err.loc) {
        line = err.loc.start?.line || err.loc.line;
        column = err.loc.start?.column || err.loc.column;
      }

      setError({
        message: err.message || createSafeErrorMessage(err, 'Failed to format code'),
        line,
        column,
      });
      setOutput('');
    } finally {
      setIsFormatting(false);
    }
  }, [input, language, indentType, loadPrettier, loadSqlFormatter]);

  // Minify code (JS/CSS only)
  const minifyCode = useCallback(async () => {
    
    if (!input.trim()) {
      setError({ message: 'Input is empty' });
      return;
    }

    if (!['javascript', 'css', 'json'].includes(language)) {
      setError({ message: 'Minify is only available for JavaScript, CSS, and JSON' });
      return;
    }

    setIsFormatting(true);
    setError(null);

    try {
      let minified: string;

      if (language === 'json') {
        // For JSON, just parse and stringify without spaces
        const parsed = JSON.parse(input);
        minified = JSON.stringify(parsed);
      } else {
        // Use Prettier with minimal formatting then strip whitespace
        const loaded = await loadPrettier();
        if (!loaded || !prettierRef.current) {
          throw new Error('Code formatter failed to load');
        }

        // First format to ensure valid syntax
        const formatted = await prettierRef.current.format(input, {
          parser: getPrettierParser(language),
          plugins: getPrettierPlugins(language),
          printWidth: Infinity,
          tabWidth: 1,
          useTabs: false,
        });

        if (language === 'css') {
          // Remove newlines and extra spaces for CSS
          minified = formatted
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*;\s*/g, ';')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*,\s*/g, ',')
            .replace(/\n/g, '')
            .trim();
        } else {
          // For JS, remove unnecessary whitespace while keeping syntax valid
          minified = formatted
            .replace(/\n\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      setOutput(minified);
          } catch (err: any) {
      setError({
        message: err.message || createSafeErrorMessage(err, 'Failed to minify code'),
      });
      setOutput('');
    } finally {
      setIsFormatting(false);
    }
  }, [input, language, loadPrettier]);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError({ message: 'File size exceeds 5MB limit' });
      return;
    }

    try {
      const text = await file.text();
      setInput(text);
      setError(null);
      setOutput('');

      // Auto-detect language from extension
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const detected = LANGUAGES.find(lang =>
        lang.extensions.includes(ext)
      );
      if (detected) {
        setLanguage(detected.id);
      }
    } catch (err) {
      setError({ message: createSafeErrorMessage(err, 'Failed to read file') });
    }
  }, []);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!output) return;

    const success = await copyToClipboard(output);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      setError({ message: 'Failed to copy to clipboard' });
    }
  }, [output]);

  // Download formatted code
  const downloadCode = useCallback(() => {
    if (!output) return;

    try {
      const langConfig = LANGUAGES.find(l => l.id === language);
      const ext = langConfig?.extensions[0] || '.txt';
      const mimeTypes: Record<Language, string> = {
        javascript: 'text/javascript',
        typescript: 'text/typescript',
        css: 'text/css',
        html: 'text/html',
        json: 'application/json',
        sql: 'text/plain',
      };

      const blob = new Blob([output], { type: mimeTypes[language] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `formatted_${Date.now()}${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError({ message: createSafeErrorMessage(err, 'Failed to download file') });
    }
  }, [output, language]);

  // Clear all
  const clearAll = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setCopySuccess(false);
  }, []);

  // Get file accept types for upload
  const getFileAccept = () => {
    return LANGUAGES.flatMap(l => l.extensions).join(',');
  };

  return (
    <div className="max-w-6xl mx-auto">

      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Input</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
              >
                Upload File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={getFileAccept()}
                onChange={handleFileUpload}
                className="hidden"
              />
              {input && (
                <button
                  onClick={clearAll}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOutput('');
              setError(null);
            }}
            placeholder="Paste your code here..."
            rows={18}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            spellCheck={false}
          />

          {/* Controls */}
          <div className="mt-4 space-y-3">
            {/* Language Selector */}
            <div>
              <label className="block text-[var(--text-muted)] text-xs mb-2">Language</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {LANGUAGES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setLanguage(id)}
                    className={`
                      py-2 px-3 rounded-lg text-xs font-medium transition-all
                      ${language === id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-[var(--text-muted)] hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Indent Type Selector */}
            <div>
              <label className="block text-[var(--text-muted)] text-xs mb-2">Indentation</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: '2spaces' as const, label: '2 Spaces' },
                  { type: '4spaces' as const, label: '4 Spaces' },
                  { type: 'tabs' as const, label: 'Tabs' },
                ]).map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => setIndentType(type)}
                    className={`
                      py-2 px-3 rounded-lg text-xs font-medium transition-all
                      ${indentType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-[var(--text-muted)] hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={formatCode}
                disabled={!input.trim() || isFormatting}
                className={`
                  btn-primary flex items-center justify-center gap-2 text-sm
                  ${!input.trim() || isFormatting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isFormatting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Formatting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    Beautify
                  </>
                )}
              </button>
              <button
                onClick={minifyCode}
                disabled={!input.trim() || isFormatting || !['javascript', 'css', 'json'].includes(language)}
                className={`
                  btn-secondary flex items-center justify-center gap-2 text-sm
                  ${!input.trim() || isFormatting || !['javascript', 'css', 'json'].includes(language)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                  }
                `}
                title={!['javascript', 'css', 'json'].includes(language) ? 'Minify available for JS, CSS, JSON only' : ''}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Minify
              </button>
            </div>
          </div>

          {/* Loading indicator for formatters */}
          {(!prettierLoaded || !sqlFormatterLoaded) && (
            <div className="mt-4 p-3 rounded-lg bg-slate-800 text-[var(--text-muted)] text-xs flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading code formatters...
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Output</h2>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <button
                    onClick={handleCopyToClipboard}
                    className={`
                      text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5
                      ${copySuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white'
                      }
                    `}
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadCode}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </>
              )}
            </div>
          </div>

          <textarea
            value={output}
            readOnly
            placeholder="Formatted code will appear here..."
            rows={18}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none resize-none"
            spellCheck={false}
          />

          {/* Stats */}
          {output && (
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{output.length.toLocaleString()} characters</span>
              <span>{output.split('\n').length} lines</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-medium mb-1">Syntax Error</div>
              <div className="font-mono text-xs break-all">{error.message}</div>
              {error.line && (
                <div className="mt-2 text-xs text-red-400">
                  Line {error.line}{error.column !== undefined && `, Column ${error.column}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supported Languages */}
      <div className="mt-6 glass-card p-4">
        <h4 className="text-white text-sm font-medium mb-3">Supported Languages</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          {LANGUAGES.map(({ id, label, extensions }) => (
            <div key={id} className="bg-slate-800 rounded-lg p-3">
              <div className="text-white font-medium mb-1">{label}</div>
              <div className="text-[var(--text-muted)]">{extensions.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        All code formatting happens locally in your browser. Your code is never uploaded to any server.
      </p>
    </div>
  );
}
