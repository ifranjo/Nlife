import { useState, useRef, useCallback } from 'react';
import {
  sanitizeFilename,
  createSafeErrorMessage,
  generateDownloadFilename,
} from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

type Mode = 'encode' | 'decode';
type InputType = 'text' | 'file';

const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB for text input
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for file input

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileOutput, setFileOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputFileDataRef = useRef<{ blob: Blob; filename: string } | null>(null);

  // Auto-detect mode based on input
  const detectMode = useCallback((input: string): Mode => {
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    const trimmed = input.trim();

    if (trimmed.length > 0 && trimmed.length % 4 === 0 && base64Pattern.test(trimmed)) {
      return 'decode';
    }
    return 'encode';
  }, []);

  // Handle text input change
  const handleTextChange = (value: string) => {
    setTextInput(value);
    setError(null);
    setCopySuccess(false);

    if (value.trim().length > 0) {
      const detectedMode = detectMode(value);
      setMode(detectedMode);
    }
  };

  // Process text encoding/decoding
  const processText = useCallback(() => {
    if (!textInput.trim()) {
      setError('Please enter some text');
      return;
    }

    if (textInput.length > MAX_TEXT_SIZE) {
      setError('Text too large. Maximum 10MB allowed.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(textInput)));
        setTextOutput(encoded);
      } else {
        try {
          const decoded = decodeURIComponent(escape(atob(textInput)));
          setTextOutput(decoded);
        } catch {
          setError('Invalid Base64 string. Please check your input.');
          setTextOutput('');
        }
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to process text'));
      setTextOutput('');
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, mode]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum ${MAX_FILE_SIZE / (1024 * 1024)}MB allowed.`);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setFileOutput(null);
    outputFileDataRef.current = null;
  }, []);

  // Process file encoding
  const processFileEncode = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Convert to base64 in chunks to avoid memory issues
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }

      const base64 = btoa(binary);
      setFileOutput(base64);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to encode file'));
      setFileOutput(null);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile]);

  // Process file decoding
  const processFileDecode = useCallback(() => {
    if (!textInput.trim()) {
      setError('Please enter Base64 data');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const binaryString = atob(textInput.trim());
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes]);
      const filename = generateDownloadFilename('decoded_file', 'bin');

      outputFileDataRef.current = { blob, filename };
      setFileOutput('File ready for download');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Invalid Base64 data. Cannot decode to file.'));
      setFileOutput(null);
      outputFileDataRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  }, [textInput]);

  // Download file output
  const downloadFile = useCallback((base64Data?: string) => {
    try {
      let blob: Blob;
      let filename: string;

      if (base64Data) {
        // Download Base64 as text file
        blob = new Blob([base64Data], { type: 'text/plain' });
        filename = generateDownloadFilename(
          selectedFile ? sanitizeFilename(selectedFile.name) : 'encoded',
          'txt'
        );
      } else if (outputFileDataRef.current) {
        // Download decoded file
        blob = outputFileDataRef.current.blob;
        filename = outputFileDataRef.current.filename;
      } else {
        setError('No file to download');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to download file'));
    }
  }, [selectedFile]);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    const textToCopy = textOutput || fileOutput;
    if (!textToCopy) {
      setError('Nothing to copy');
      return;
    }

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      setError('Failed to copy to clipboard');
    }
  }, [textOutput, fileOutput]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Clear all
  const clearAll = () => {
    setTextInput('');
    setTextOutput('');
    setSelectedFile(null);
    setFileOutput(null);
    setError(null);
    setCopySuccess(false);
    outputFileDataRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mode and Type Selection */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-3">
              Mode
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('encode')}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium transition-all
                  ${mode === 'encode'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-[var(--text-muted)] border border-slate-700/30 hover:border-slate-600/50'
                  }
                `}
              >
                Encode
              </button>
              <button
                onClick={() => setMode('decode')}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium transition-all
                  ${mode === 'decode'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-[var(--text-muted)] border border-slate-700/30 hover:border-slate-600/50'
                  }
                `}
              >
                Decode
              </button>
            </div>
          </div>

          {/* Input Type Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-3">
              Input Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setInputType('text')}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium transition-all
                  ${inputType === 'text'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-[var(--text-muted)] border border-slate-700/30 hover:border-slate-600/50'
                  }
                `}
              >
                Text
              </button>
              <button
                onClick={() => setInputType('file')}
                disabled={mode === 'decode'}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium transition-all
                  ${inputType === 'file'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-[var(--text-muted)] border border-slate-700/30 hover:border-slate-600/50'
                  }
                  ${mode === 'decode' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                File
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Text Input/Output */}
      {inputType === 'text' && (
        <div className="space-y-6">
          {/* Input */}
          <div className="glass-card p-6">
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-3">
              {mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
            </label>
            <textarea
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={mode === 'encode'
                ? 'Enter text to encode...'
                : 'Paste Base64 string to decode...'
              }
              className="w-full h-48 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-[var(--text-muted)]">
                {textInput.length.toLocaleString()} characters
              </span>
              <button
                onClick={processText}
                disabled={isProcessing || !textInput.trim()}
                className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : mode === 'encode' ? 'Encode' : 'Decode'}
              </button>
            </div>
          </div>

          {/* Output */}
          {textOutput && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[var(--text-muted)]">
                  {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
                </label>
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-slate-800/50 text-[var(--text)] border border-slate-700/30 hover:border-cyan-500/50 transition-all"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={textOutput}
                readOnly
                className="w-full h-48 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white resize-none font-mono text-sm"
              />
              <div className="text-xs text-[var(--text-muted)] mt-3">
                {textOutput.length.toLocaleString()} characters
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Input/Output */}
      {inputType === 'file' && mode === 'encode' && (
        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              drop-zone rounded-2xl p-12 text-center cursor-pointer
              ${isDragging ? 'drag-over' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="text-5xl mb-4">📎</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedFile ? selectedFile.name : 'Drop file here or click to browse'}
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                : `Maximum ${MAX_FILE_SIZE / (1024 * 1024)}MB`
              }
            </p>
          </div>

          {/* Process Button */}
          {selectedFile && !fileOutput && (
            <button
              onClick={processFileEncode}
              disabled={isProcessing}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Encoding...' : 'Encode File to Base64'}
            </button>
          )}

          {/* File Output */}
          {fileOutput && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[var(--text-muted)]">
                  Base64 Output
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-slate-800/50 text-[var(--text)] border border-slate-700/30 hover:border-cyan-500/50 transition-all"
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => downloadFile(fileOutput)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-slate-800/50 text-[var(--text)] border border-slate-700/30 hover:border-cyan-500/50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <textarea
                value={fileOutput}
                readOnly
                className="w-full h-48 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white resize-none font-mono text-sm"
              />
              <div className="text-xs text-[var(--text-muted)] mt-3">
                {fileOutput.length.toLocaleString()} characters
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decode to File */}
      {inputType === 'text' && mode === 'decode' && textOutput && (
        <div className="glass-card p-6 mt-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
            Download as File
          </h3>
          <button
            onClick={processFileDecode}
            disabled={isProcessing}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Save Decoded Data as File</span>
          </button>
          {outputFileDataRef.current && (
            <div className="mt-4">
              <button
                onClick={() => downloadFile()}
                className="w-full px-4 py-2 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-all"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clear Button */}
      {(textInput || textOutput || selectedFile || fileOutput) && (
        <button
          onClick={clearAll}
          className="mt-6 w-full px-4 py-2 rounded-lg bg-slate-800/50 text-[var(--text-muted)] border border-slate-700/30 hover:border-slate-600/50 transition-all"
        >
          Clear All
        </button>
      )}

      {/* Privacy Note */}
      <p className="mt-8 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        All processing happens in your browser. No data is sent to any server.
      </p>
    </div>
  );
}
