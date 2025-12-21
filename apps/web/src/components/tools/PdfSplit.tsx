import { useState, useCallback, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

type SplitMode = 'all' | 'range' | 'extract';

interface PageRange {
  start: number;
  end: number;
}

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<SplitMode>('all');
  const [pageRange, setPageRange] = useState<PageRange>({ start: 1, end: 1 });
  const [extractPages, setExtractPages] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setFileName('');
    setPageCount(0);
    setSplitMode('all');
    setPageRange({ start: 1, end: 1 });
    setExtractPages('');
    setError(null);
    setProgress('');
  };

  const loadPdf = useCallback(async (selectedFile: File) => {
    const validation = await validateFile(selectedFile, 'pdf');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setProgress('Loading PDF...');
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPageCount();

      setFile(selectedFile);
      setFileName(sanitizeFilename(selectedFile.name.replace('.pdf', '')));
      setPageCount(pages);
      setPageRange({ start: 1, end: pages });
      setError(null);
      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to load PDF. The file may be corrupted or password-protected.'));
      setProgress('');
    }
  }, []);

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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      void loadPdf(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      void loadPdf(selectedFile);
    }
  };

  const parseExtractPages = (input: string): number[] => {
    const pages: Set<number> = new Set();
    const parts = input.split(',').map(s => s.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(pageCount, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          pages.add(num);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const splitPdf = async () => {
    if (!file || pageCount === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress('Processing...');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const JSZip = (await import('jszip')).default;

      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);

      const zip = new JSZip();
      let pagesToProcess: number[][] = [];

      if (splitMode === 'all') {
        // Split into individual pages
        pagesToProcess = Array.from({ length: pageCount }, (_, i) => [i]);
      } else if (splitMode === 'range') {
        // Extract a range as single PDF
        const start = Math.max(0, pageRange.start - 1);
        const end = Math.min(pageCount, pageRange.end);
        pagesToProcess = [Array.from({ length: end - start }, (_, i) => start + i)];
      } else if (splitMode === 'extract') {
        // Extract specific pages as single PDF
        const pageNums = parseExtractPages(extractPages);
        if (pageNums.length === 0) {
          setError('Please enter valid page numbers');
          setIsProcessing(false);
          setProgress('');
          return;
        }
        pagesToProcess = [pageNums.map(p => p - 1)]; // Convert to 0-indexed
      }

      // Process pages
      for (let i = 0; i < pagesToProcess.length; i++) {
        const pageIndices = pagesToProcess[i];
        setProgress(`Creating PDF ${i + 1} of ${pagesToProcess.length}...`);

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();

        if (splitMode === 'all') {
          zip.file(`${fileName}_page_${pageIndices[0] + 1}.pdf`, pdfBytes);
        } else {
          // For range/extract, download single file directly
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}_extracted.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setProgress('');
          setIsProcessing(false);
          return;
        }
      }

      // Generate ZIP for 'all' mode
      setProgress('Creating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_split.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to split PDF. Please try again.'));
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Drop Zone */}
      {!file ? (
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
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-5xl mb-4">✂️</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Drop a PDF here or click to browse
          </h3>
          <p className="text-slate-400 text-sm">
            Upload a PDF to split into multiple files
          </p>
        </div>
      ) : (
        <>
          {/* File Info */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">📄</div>
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">{pageCount} pages</p>
                </div>
              </div>
              <button
                onClick={resetState}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Remove file"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Split Options */}
          <div className="glass-card p-6 mb-6">
            <h4 className="text-white font-medium mb-4">Split Options</h4>

            <div className="space-y-4">
              {/* All Pages */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="splitMode"
                  value="all"
                  checked={splitMode === 'all'}
                  onChange={() => setSplitMode('all')}
                  className="mt-1 w-4 h-4 accent-indigo-500"
                />
                <div>
                  <span className="text-white group-hover:text-indigo-400 transition-colors">
                    Split all pages
                  </span>
                  <p className="text-slate-500 text-sm">
                    Create {pageCount} separate PDF files (downloaded as ZIP)
                  </p>
                </div>
              </label>

              {/* Range */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="splitMode"
                  value="range"
                  checked={splitMode === 'range'}
                  onChange={() => setSplitMode('range')}
                  className="mt-1 w-4 h-4 accent-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-white group-hover:text-indigo-400 transition-colors">
                    Extract page range
                  </span>
                  <p className="text-slate-500 text-sm mb-2">
                    Extract a continuous range of pages
                  </p>
                  {splitMode === 'range' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={pageRange.start}
                        onChange={(e) => setPageRange(prev => ({
                          ...prev,
                          start: Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1))
                        }))}
                        className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={pageRange.end}
                        onChange={(e) => setPageRange(prev => ({
                          ...prev,
                          end: Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1))
                        }))}
                        className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </label>

              {/* Extract Specific */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="splitMode"
                  value="extract"
                  checked={splitMode === 'extract'}
                  onChange={() => setSplitMode('extract')}
                  className="mt-1 w-4 h-4 accent-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-white group-hover:text-indigo-400 transition-colors">
                    Extract specific pages
                  </span>
                  <p className="text-slate-500 text-sm mb-2">
                    Enter page numbers (e.g., 1, 3, 5-8, 12)
                  </p>
                  {splitMode === 'extract' && (
                    <input
                      type="text"
                      value={extractPages}
                      onChange={(e) => setExtractPages(e.target.value)}
                      placeholder="1, 3, 5-8, 12"
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Split Button */}
          <button
            onClick={splitPdf}
            disabled={isProcessing}
            className={`
              w-full btn-primary flex items-center justify-center gap-2
              ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{progress || 'Processing...'}</span>
              </>
            ) : (
              <>
                <span>
                  {splitMode === 'all'
                    ? `Split into ${pageCount} PDFs`
                    : 'Extract Pages'}
                </span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </>
            )}
          </button>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your files never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
