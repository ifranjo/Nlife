import { useState, useCallback, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

interface PageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  selected: boolean;
}

type ImageFormat = 'jpeg' | 'png';
type ImageQuality = 'low' | 'medium' | 'high' | 'max';

const QUALITY_MAP: Record<ImageQuality, { scale: number; quality: number }> = {
  low: { scale: 1, quality: 0.7 },
  medium: { scale: 1.5, quality: 0.85 },
  high: { scale: 2, quality: 0.92 },
  max: { scale: 3, quality: 1 },
};

export default function PdfToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<PageImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState<ImageQuality>('high');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setFileName('');
    setPages([]);
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
      setIsLoading(true);
      setProgress('Loading PDF...');

      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;

      setProgress(`Generating previews (0/${pageCount})...`);

      const pageImages: PageImage[] = [];
      const previewScale = 0.5; // Lower scale for previews

      for (let i = 1; i <= pageCount; i++) {
        setProgress(`Generating previews (${i}/${pageCount})...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: previewScale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          pageImages.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.7),
            width: viewport.width,
            height: viewport.height,
            selected: true, // All selected by default
          });
        }
      }

      setFile(selectedFile);
      setFileName(sanitizeFilename(selectedFile.name.replace('.pdf', '')));
      setPages(pageImages);
      setError(null);
      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to load PDF. The file may be corrupted or password-protected.'));
      setProgress('');
    } finally {
      setIsLoading(false);
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

  const togglePage = (pageNumber: number) => {
    setPages(pages.map(p =>
      p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAll = () => {
    setPages(pages.map(p => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setPages(pages.map(p => ({ ...p, selected: false })));
  };

  const selectedCount = pages.filter(p => p.selected).length;

  const convertToImages = async () => {
    if (!file || selectedCount === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress('Preparing conversion...');

    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      const selectedPages = pages.filter(p => p.selected);
      const { scale, quality: imageQuality } = QUALITY_MAP[quality];
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = format === 'jpeg' ? 'jpg' : 'png';

      // If single page, download directly
      if (selectedPages.length === 1) {
        const pageNum = selectedPages[0].pageNumber;
        setProgress(`Converting page ${pageNum}...`);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport, canvas }).promise;

          const dataUrl = canvas.toDataURL(mimeType, imageQuality);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${fileName}_page_${pageNum}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Multiple pages: create ZIP
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < selectedPages.length; i++) {
          const pageNum = selectedPages[i].pageNumber;
          setProgress(`Converting page ${pageNum} (${i + 1}/${selectedPages.length})...`);

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const context = canvas.getContext('2d');
          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;

            // Convert to blob
            const dataUrl = canvas.toDataURL(mimeType, imageQuality);
            const base64Data = dataUrl.split(',')[1];

            zip.file(`${fileName}_page_${pageNum}.${extension}`, base64Data, { base64: true });
          }
        }

        setProgress('Creating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_images.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to convert PDF. Please try again.'));
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
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

          <div className="text-5xl mb-4">📄 → 🖼️</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Drop a PDF here or click to browse
          </h3>
          <p className="text-[var(--text-muted)] text-sm">
            Convert PDF pages to JPG or PNG images
          </p>
        </div>
      ) : isLoading ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 spinner text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white">{progress || 'Loading...'}</p>
        </div>
      ) : (
        <>
          {/* File Info */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">📄</div>
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-[var(--text-muted)] text-sm">{pages.length} pages</p>
                </div>
              </div>
              <button
                onClick={resetState}
                className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                title="Remove file"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="glass-card p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ImageFormat)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="jpeg">JPG (smaller file size)</option>
                  <option value="png">PNG (lossless quality)</option>
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-1">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as ImageQuality)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Low (72 DPI) - Fastest</option>
                  <option value="medium">Medium (108 DPI)</option>
                  <option value="high">High (144 DPI) - Recommended</option>
                  <option value="max">Maximum (216 DPI) - Largest files</option>
                </select>
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-white">
              <span className="font-medium">{selectedCount}</span>
              <span className="text-[var(--text-muted)]"> of {pages.length} pages selected</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Select all
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Deselect all
              </button>
            </div>
          </div>

          {/* Pages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                onClick={() => togglePage(page.pageNumber)}
                className={`
                  relative cursor-pointer transition-all
                  ${page.selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : 'opacity-60 hover:opacity-80'}
                `}
              >
                <div className="glass-card p-2">
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] bg-white rounded overflow-hidden mb-2">
                    <img
                      src={page.dataUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                    {/* Page number badge */}
                    <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded">
                      {page.pageNumber}
                    </div>
                    {/* Selection indicator */}
                    <div className={`
                      absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center
                      ${page.selected ? 'bg-indigo-500' : 'bg-slate-700/80'}
                    `}>
                      {page.selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Convert Button */}
          <button
            onClick={convertToImages}
            disabled={isProcessing || selectedCount === 0}
            className={`
              w-full btn-primary flex items-center justify-center gap-2
              ${isProcessing || selectedCount === 0 ? 'opacity-70 cursor-not-allowed' : ''}
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
                  {selectedCount === 1
                    ? `Download as ${format.toUpperCase()}`
                    : `Download ${selectedCount} images as ZIP`}
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
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your files never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
