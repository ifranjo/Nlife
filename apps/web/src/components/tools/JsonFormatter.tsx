import { useState, useRef, useCallback } from 'react';
import { createSafeErrorMessage } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

type IndentType = '2spaces' | '4spaces' | 'tabs';

interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentType, setIndentType] = useState<IndentType>('2spaces');
  const [error, setError] = useState<JsonError | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Get indent string based on type
  const getIndent = (): string | number => {
    switch (indentType) {
      case '2spaces':
        return 2;
      case '4spaces':
        return 4;
      case 'tabs':
        return '\t';
    }
  };

  // Parse JSON with detailed error handling
  const parseJson = useCallback((jsonStr: string): { valid: boolean; parsed?: any; error?: JsonError } => {
    if (!jsonStr.trim()) {
      return { valid: false, error: { message: 'Input is empty' } };
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return { valid: true, parsed };
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Try to extract line/column from error message
        const lineMatch = err.message.match(/line (\d+)/i);
        const colMatch = err.message.match(/column (\d+)/i);
        const posMatch = err.message.match(/position (\d+)/i);

        let line: number | undefined;
        let column: number | undefined;

        if (lineMatch) {
          line = parseInt(lineMatch[1], 10);
        }
        if (colMatch) {
          column = parseInt(colMatch[1], 10);
        } else if (posMatch) {
          // Calculate line/col from position
          const pos = parseInt(posMatch[1], 10);
          const lines = jsonStr.substring(0, pos).split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }

        return {
          valid: false,
          error: {
            message: err.message,
            line,
            column,
          }
        };
      }
      return {
        valid: false,
        error: { message: createSafeErrorMessage(err, 'Invalid JSON') }
      };
    }
  }, []);

  // Format (prettify) JSON
  const formatJson = useCallback(() => {
        const result = parseJson(input);

    if (!result.valid) {
      setError(result.error || null);
      setIsValid(false);
      setOutput('');
      return;
    }

    try {
      const formatted = JSON.stringify(result.parsed, null, getIndent());
      setOutput(formatted);
      setError(null);
      setIsValid(true);
          } catch (err) {
      setError({ message: createSafeErrorMessage(err, 'Failed to format JSON') });
      setIsValid(false);
      setOutput('');
    }
  }, [input, indentType, parseJson]);

  // Minify JSON
  const minifyJson = useCallback(() => {
        const result = parseJson(input);

    if (!result.valid) {
      setError(result.error || null);
      setIsValid(false);
      setOutput('');
      return;
    }

    try {
      const minified = JSON.stringify(result.parsed);
      setOutput(minified);
      setError(null);
      setIsValid(true);
          } catch (err) {
      setError({ message: createSafeErrorMessage(err, 'Failed to minify JSON') });
      setIsValid(false);
      setOutput('');
    }
  }, [input, parseJson]);

  // Validate JSON without formatting
  const validateJson = useCallback(() => {
    const result = parseJson(input);
    setError(result.valid ? null : result.error || null);
    setIsValid(result.valid);
    if (!result.valid) {
      setOutput('');
    }
  }, [input, parseJson]);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError({ message: 'File size exceeds 10MB limit' });
      return;
    }

    // Check file extension
    if (!file.name.endsWith('.json')) {
      setError({ message: 'Please upload a .json file' });
      return;
    }

    try {
      const text = await file.text();
      setInput(text);
      setError(null);
      setOutput('');
      setIsValid(false);
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

  // Download as JSON file
  const downloadJson = useCallback(() => {
    if (!output) return;

    try {
      const blob = new Blob([output], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `formatted_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError({ message: createSafeErrorMessage(err, 'Failed to download file') });
    }
  }, [output]);

  // Clear all
  const clearAll = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setIsValid(false);
    setCopySuccess(false);
  }, []);

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
                Upload .json
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
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
              setIsValid(false);
            }}
            placeholder='Paste or upload JSON here...\n\n{"example": "data"}'
            rows={20}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
          />

          {/* Action Buttons */}
          <div className="mt-4 space-y-3">
            {/* Indent Type Selector */}
            <div>
              <label className="block text-[var(--text-muted)] text-xs mb-2">Indentation</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: '2spaces', label: '2 Spaces' },
                  { type: '4spaces', label: '4 Spaces' },
                  { type: 'tabs', label: 'Tabs' },
                ] as const).map(({ type, label }) => (
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
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={formatJson}
                disabled={!input.trim()}
                className={`
                  btn-primary flex items-center justify-center gap-2 text-sm
                  ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                Format
              </button>
              <button
                onClick={minifyJson}
                disabled={!input.trim()}
                className={`
                  btn-secondary flex items-center justify-center gap-2 text-sm
                  ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Minify
              </button>
              <button
                onClick={validateJson}
                disabled={!input.trim()}
                className={`
                  px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                  ${!input.trim()
                    ? 'opacity-50 cursor-not-allowed bg-slate-800 text-[var(--text-muted)]'
                    : 'bg-slate-800 text-[var(--text)] hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                Validate
              </button>
            </div>
          </div>

          {/* Validation Status */}
          {isValid && !error && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Valid JSON
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
                    onClick={downloadJson}
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
            ref={outputRef}
            value={output}
            readOnly
            placeholder="Formatted JSON will appear here..."
            rows={20}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none resize-none"
          />

          {/* Character/Line Count */}
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
              <div className="font-medium mb-1">JSON Error</div>
              <div>{error.message}</div>
              {error.line && (
                <div className="mt-2 text-xs text-red-400">
                  Line {error.line}{error.column && `, Column ${error.column}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        All JSON processing happens locally in your browser. No data is sent to any server.
      </p>
    </div>
  );
}
