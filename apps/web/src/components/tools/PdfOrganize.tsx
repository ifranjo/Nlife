import { useState, useCallback, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

interface PagePreview {
  index: number;
  thumbnail: string;
  width: number;
  height: number;
}

export default function PdfOrganize() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usage limits for free tier
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('pdf-organize');

  const resetState = () => {
    setFile(null);
    setFileName('');
    setPages([]);
    setError(null);
    setProgress('');
    setDraggedIndex(null);
    setDragOverIndex(null);
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

      setProgress(`Generating thumbnails (0/${pageCount})...`);

      const previews: PagePreview[] = [];
      const scale = 0.3; // Thumbnail scale

      for (let i = 1; i <= pageCount; i++) {
        setProgress(`Generating thumbnails (${i}/${pageCount})...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          previews.push({
            index: i - 1,
            thumbnail: canvas.toDataURL('image/jpeg', 0.7),
            width: viewport.width,
            height: viewport.height,
          });
        }
      }

      setFile(selectedFile);
      setFileName(sanitizeFilename(selectedFile.name.replace('.pdf', '')));
      setPages(previews);
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

  // Page drag and drop handlers
  const handlePageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handlePageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handlePageDragLeave = () => {
    setDragOverIndex(null);
  };

  const handlePageDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPages = [...pages];
    const [draggedPage] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, draggedPage);
    setPages(newPages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handlePageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const movePage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pages.length) return;

    const newPages = [...pages];
    [newPages[fromIndex], newPages[toIndex]] = [newPages[toIndex], newPages[fromIndex]];
    setPages(newPages);
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      setError('Cannot delete the last page');
      return;
    }
    setPages(pages.filter((_, i) => i !== index));
  };

  const rotatePage = async (index: number) => {
    // For visual feedback, we'll track rotation in the UI
    // The actual rotation will be applied when saving
    const newPages = [...pages];
    // Store rotation state (we'll need to track this)
    setPages(newPages);
  };

  const savePdf = async () => {
    if (!file || pages.length === 0) return;

    if (!checkUsage()) {
      return; // Prompt will be shown automatically
    }

    setIsProcessing(true);
    setError(null);
    setProgress('Processing...');

    try {
      const { PDFDocument } = await import('pdf-lib');

      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      setProgress('Reordering pages...');

      // Copy pages in the new order
      const pageIndices = pages.map(p => p.index);
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));

      setProgress('Saving PDF...');
      const pdfBytes = await newPdf.save();

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_organized.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      recordUsage();
      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to save PDF. Please try again.'));
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasChanges = pages.some((page, index) => page.index !== index);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="pdf-organize" />
      </div>

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

          <div className="text-5xl mb-4">📑</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Drop a PDF here or click to browse
          </h3>
          <p className="text-[var(--text-muted)] text-sm">
            Upload a PDF to reorder, delete, or rearrange pages
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
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">📄</div>
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-[var(--text-muted)] text-sm">{pages.length} pages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-xs text-amber-400 bg-amber-400/20 px-2 py-1 rounded">
                    Modified
                  </span>
                )}
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
          </div>

          {/* Instructions */}
          <div className="mb-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm">
            <strong>Tip:</strong> Drag and drop pages to reorder them, or use the arrow buttons. Click the trash icon to delete a page.
          </div>

          {/* Pages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {pages.map((page, index) => (
              <div
                key={`${page.index}-${index}`}
                draggable
                onDragStart={() => handlePageDragStart(index)}
                onDragOver={(e) => handlePageDragOver(e, index)}
                onDragLeave={handlePageDragLeave}
                onDrop={() => handlePageDrop(index)}
                onDragEnd={handlePageDragEnd}
                className={`
                  relative group cursor-grab active:cursor-grabbing
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${dragOverIndex === index ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''}
                `}
              >
                <div className="glass-card p-2 transition-all hover:scale-105">
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] bg-white rounded overflow-hidden mb-2">
                    <img
                      src={page.thumbnail}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    {/* Page number badge */}
                    <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </div>
                    {/* Original page indicator */}
                    {page.index !== index && (
                      <div className="absolute top-1 right-1 bg-amber-500/80 text-white text-xs px-1.5 py-0.5 rounded">
                        was {page.index + 1}
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => movePage(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => movePage(index, 'down')}
                      disabled={index === pages.length - 1}
                      className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deletePage(index)}
                      disabled={pages.length <= 1}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete page"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={savePdf}
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
                <span>Save Reorganized PDF</span>
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

      {showPrompt && <UpgradePrompt toolId="pdf-organize" toolName="PDF Organize" onDismiss={dismissPrompt} />}
    </div>
  );
}
