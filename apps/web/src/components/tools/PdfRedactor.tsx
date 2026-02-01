import { useState, useRef, useCallback, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
  generateDownloadFilename,
} from '../../lib/security';

interface RedactionBox {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'manual' | 'auto';
  pattern?: string;
}

interface DetectedPII {
  id: string;
  pageIndex: number;
  text: string;
  type: 'ssn' | 'email' | 'phone' | 'credit-card' | 'dob';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PDFPageRender {
  pageIndex: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  scale: number;
}

// PII detection patterns
const PII_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  dob: /\b(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
};

export default function PdfRedactor() {
    const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PDFPageRender[]>([]);
  const [redactionBoxes, setRedactionBoxes] = useState<RedactionBox[]>([]);
  const [detectedPII, setDetectedPII] = useState<DetectedPII[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [showDetectedOnly, setShowDetectedOnly] = useState(false);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [zoomPreviewUrl, setZoomPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pdfDocRef = useRef<any>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

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
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      void loadPDF(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void loadPDF(e.target.files[0]);
    }
  };

  const detectPIIInText = (
    text: string,
    pageIndex: number,
    textItems: any[]
  ): DetectedPII[] => {
    const detected: DetectedPII[] = [];

    Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          // Find the text item that contains this match
          const matchText = match[0];
          const textItem = textItems.find((item) =>
            item.str.includes(matchText)
          );

          if (textItem) {
            detected.push({
              id: generateId(),
              pageIndex,
              text: matchText,
              type: type as DetectedPII['type'],
              x: textItem.transform[4],
              y: textItem.transform[5],
              width: textItem.width || 100,
              height: textItem.height || 12,
            });
          }
        }
      }
    });

    return detected;
  };

  const loadPDF = async (selectedFile: File) => {
    setError(null);
    setIsRendering(true);
    setPages([]);
    setRedactionBoxes([]);
    setDetectedPII([]);
    setCurrentPage(0);

    try {
      // Validate file
      const validation = await validateFile(selectedFile, 'pdf');
      if (!validation.valid) {
        setError(validation.error || 'Invalid PDF file');
        setIsRendering(false);
        return;
      }

      setFile(selectedFile);

      // Dynamic import of pdf.js
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;

      const renderedPages: PDFPageRender[] = [];
      const allDetectedPII: DetectedPII[] = [];

      // Render all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as Parameters<typeof page.render>[0]).promise;

        renderedPages.push({
          pageIndex: i - 1,
          canvas,
          width: viewport.width,
          height: viewport.height,
          scale: 1.5,
        });

        // Extract text for PII detection
        try {
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');

          const piiInPage = detectPIIInText(
            pageText,
            i - 1,
            textContent.items
          );
          allDetectedPII.push(...piiInPage);
        } catch (err) {
          console.warn('Could not extract text for PII detection:', err);
        }
      }

      setPages(renderedPages);
      setDetectedPII(allDetectedPII);
    } catch (err) {
      setError(
        createSafeErrorMessage(
          err,
          'Failed to load PDF. Please ensure the file is valid.'
        )
      );
    } finally {
      setIsRendering(false);
    }
  };

  // Helper to get position from mouse or touch event
  const getEventPosition = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    rect: DOMRect
  ) => {
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleDrawStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    // Prevent default to stop scrolling on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = getEventPosition(e, rect);

    setIsDrawing(true);
    setDrawStart({ x: pos.x, y: pos.y });
  };

  const handleDrawMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    if (!isDrawing || !drawStart) return;

    // Prevent default to stop scrolling on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = getEventPosition(e, rect);

    // Update temporary drawing box (visual feedback)
    const overlay = overlayRefs.current[pageIndex];
    if (overlay) {
      const existingTemp = overlay.querySelector('.temp-redaction-box');
      if (existingTemp) existingTemp.remove();

      const tempBox = document.createElement('div');
      tempBox.className = 'temp-redaction-box';
      tempBox.style.position = 'absolute';
      tempBox.style.left = `${Math.min(drawStart.x, pos.x)}px`;
      tempBox.style.top = `${Math.min(drawStart.y, pos.y)}px`;
      tempBox.style.width = `${Math.abs(pos.x - drawStart.x)}px`;
      tempBox.style.height = `${Math.abs(pos.y - drawStart.y)}px`;
      tempBox.style.border = '2px dashed #ef4444';
      tempBox.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
      tempBox.style.pointerEvents = 'none';
      overlay.appendChild(tempBox);
    }
  };

  const handleDrawEnd = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    if (!isDrawing || !drawStart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = getEventPosition(e, rect);

    const width = Math.abs(pos.x - drawStart.x);
    const height = Math.abs(pos.y - drawStart.y);

    // Only create box if it has meaningful size
    if (width > 10 && height > 10) {
      const newBox: RedactionBox = {
        id: generateId(),
        pageIndex,
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width,
        height,
        type: 'manual',
      };
      setRedactionBoxes((prev) => [...prev, newBox]);
    }

    // Clean up temp box
    const overlay = overlayRefs.current[pageIndex];
    if (overlay) {
      const existingTemp = overlay.querySelector('.temp-redaction-box');
      if (existingTemp) existingTemp.remove();
    }

    setIsDrawing(false);
    setDrawStart(null);
  };

  // Legacy mouse event handlers for backward compatibility
  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => handleDrawStart(e, pageIndex);

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => handleDrawMove(e, pageIndex);

  const handleMouseUp = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => handleDrawEnd(e, pageIndex);

  // Touch event handlers
  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>,
    pageIndex: number
  ) => handleDrawStart(e, pageIndex);

  const handleTouchMove = (
    e: React.TouchEvent<HTMLDivElement>,
    pageIndex: number
  ) => handleDrawMove(e, pageIndex);

  const handleTouchEnd = (
    e: React.TouchEvent<HTMLDivElement>,
    pageIndex: number
  ) => handleDrawEnd(e, pageIndex);

  const addDetectedPIIAsRedaction = (pii: DetectedPII) => {
    const newBox: RedactionBox = {
      id: generateId(),
      pageIndex: pii.pageIndex,
      x: pii.x,
      y: pii.y,
      width: pii.width,
      height: pii.height,
      type: 'auto',
      pattern: pii.type,
    };
    setRedactionBoxes((prev) => [...prev, newBox]);
    setDetectedPII((prev) => prev.filter((p) => p.id !== pii.id));
  };

  const addAllDetectedPII = () => {
    const newBoxes: RedactionBox[] = detectedPII.map((pii) => ({
      id: generateId(),
      pageIndex: pii.pageIndex,
      x: pii.x,
      y: pii.y,
      width: pii.width,
      height: pii.height,
      type: 'auto',
      pattern: pii.type,
    }));
    setRedactionBoxes((prev) => [...prev, ...newBoxes]);
    setDetectedPII([]);
  };

  const removeRedactionBox = (id: string) => {
    setRedactionBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  const clearAllRedactions = () => {
    setRedactionBoxes([]);
  };

  const applyRedactions = async () => {
    if (!file || redactionBoxes.length === 0) {
      setError('No redactions to apply');
      return;
    }

    
    setIsProcessing(true);
    setError(null);

    try {
      // Dynamic import of pdf-lib
      const { PDFDocument, rgb } = await import('pdf-lib');

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Strip metadata if requested
      if (stripMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
        pdfDoc.setCreationDate(new Date(0));
        pdfDoc.setModificationDate(new Date(0));
      }

      // Group redactions by page
      const redactionsByPage = new Map<number, RedactionBox[]>();
      redactionBoxes.forEach((box) => {
        const existing = redactionsByPage.get(box.pageIndex) || [];
        redactionsByPage.set(box.pageIndex, [...existing, box]);
      });

      // Apply redactions to each page
      for (const [pageIndex, boxes] of redactionsByPage.entries()) {
        const page = pdfDoc.getPages()[pageIndex];
        if (!page) continue;

        const { height: pageHeight } = page.getSize();
        const pageRender = pages[pageIndex];
        if (!pageRender) continue;

        // Calculate scale factor between rendered canvas and PDF coordinates
        const scaleX = page.getWidth() / pageRender.width;
        const scaleY = pageHeight / pageRender.height;

        boxes.forEach((box) => {
          // Convert canvas coordinates to PDF coordinates
          // PDF origin is bottom-left, canvas is top-left
          const pdfX = box.x * scaleX;
          const pdfY = pageHeight - (box.y + box.height) * scaleY;
          const pdfWidth = box.width * scaleX;
          const pdfHeight = box.height * scaleY;

          // Draw black rectangle
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(0, 0, 0),
          });
        });
      }

      const redactedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(redactedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Download
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename(
        sanitizeFilename(file.name.replace('.pdf', '_redacted')),
        'pdf'
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      
      // Reset state after successful redaction
      setFile(null);
      setPages([]);
      setRedactionBoxes([]);
      setDetectedPII([]);
      setCurrentPage(0);
      pdfDocRef.current = null;
    } catch (err) {
      setError(
        createSafeErrorMessage(err, 'Failed to apply redactions. Please try again.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Update canvas refs when pages change
  useEffect(() => {
    if (pages.length > 0) {
      canvasRefs.current = canvasRefs.current.slice(0, pages.length);
      overlayRefs.current = overlayRefs.current.slice(0, pages.length);
    }
  }, [pages.length]);

  const getPIITypeLabel = (type: DetectedPII['type']): string => {
    const labels = {
      ssn: 'SSN',
      email: 'Email',
      phone: 'Phone',
      'credit-card': 'Credit Card',
      dob: 'Date of Birth',
    };
    return labels[type] || type;
  };

  const getPIITypeColor = (type: DetectedPII['type']): string => {
    const colors = {
      ssn: 'bg-red-500',
      email: 'bg-blue-500',
      phone: 'bg-green-500',
      'credit-card': 'bg-yellow-500',
      dob: 'bg-purple-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const currentPagePII = detectedPII.filter(
    (pii) => pii.pageIndex === currentPage
  );
  const currentPageRedactions = redactionBoxes.filter(
    (box) => box.pageIndex === currentPage
  );

  return (
    <div className="max-w-6xl mx-auto">
                  {!file ? (
        <>
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              drop-zone rounded-2xl p-12 text-center cursor-pointer animate-fadeIn
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

            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop PDF here or click to browse
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Permanently redact sensitive information from PDFs
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <div className="text-2xl mb-2">🔍</div>
              <h4 className="text-white font-medium mb-1">Auto-Detect PII</h4>
              <p className="text-[var(--text-muted)] text-sm">
                Automatically finds SSN, emails, phone numbers, credit cards, and dates of birth
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl mb-2">✏️</div>
              <h4 className="text-white font-medium mb-1">Manual Redaction</h4>
              <p className="text-[var(--text-muted)] text-sm">
                Draw custom redaction boxes anywhere on the document
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl mb-2">🗑️</div>
              <h4 className="text-white font-medium mb-1">Strip Metadata</h4>
              <p className="text-[var(--text-muted)] text-sm">
                Remove author, creation date, and other identifying metadata
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl mb-2">⚫</div>
              <h4 className="text-white font-medium mb-1">Permanent Redaction</h4>
              <p className="text-[var(--text-muted)] text-sm">
                Redactions are burned into the PDF and cannot be removed
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Loading state */}
          {isRendering && (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 spinner mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-[var(--text-muted)]">Rendering PDF and detecting PII...</p>
            </div>
          )}

          {/* Main content */}
          {!isRendering && pages.length > 0 && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="glass-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">
                      {sanitizeFilename(file.name)}
                    </h3>
                    <p className="text-[var(--text-muted)] text-sm">
                      {pages.length} page{pages.length !== 1 ? 's' : ''} •{' '}
                      {detectedPII.length} PII item{detectedPII.length !== 1 ? 's' : ''}{' '}
                      detected • {redactionBoxes.length} redaction
                      {redactionBoxes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripMetadata}
                        onChange={(e) => setStripMetadata(e.target.checked)}
                        className="w-4 h-4"
                      />
                      Strip metadata
                    </label>
                  </div>
                </div>
              </div>

              {/* Detected PII Panel */}
              {detectedPII.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">
                      Detected PII ({detectedPII.length})
                    </h4>
                    <button
                      onClick={addAllDetectedPII}
                      className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                    >
                      Redact All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detectedPII.map((pii) => (
                      <div
                        key={pii.id}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`px-2 py-1 text-xs font-medium text-white rounded ${getPIITypeColor(
                              pii.type
                            )}`}
                          >
                            {getPIITypeLabel(pii.type)}
                          </span>
                          <span className="text-[var(--text)] text-sm truncate">
                            {pii.text}
                          </span>
                          <span className="text-[var(--text-muted)] text-xs">
                            Page {pii.pageIndex + 1}
                          </span>
                        </div>
                        <button
                          onClick={() => addDetectedPIIAsRedaction(pii)}
                          className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors flex-shrink-0"
                        >
                          Redact
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page navigation */}
              {pages.length > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-2 text-[var(--text-muted)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="text-white">
                    Page {currentPage + 1} of {pages.length}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
                    }
                    disabled={currentPage === pages.length - 1}
                    className="p-2 text-[var(--text-muted)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* PDF Preview with redaction overlay */}
              <div className="glass-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[var(--text-muted)] text-sm">
                    Click and drag to create redaction boxes
                  </p>
                  {currentPageRedactions.length > 0 && (
                    <button
                      onClick={clearAllRedactions}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear all redactions
                    </button>
                  )}
                </div>
                <div className="relative inline-block">
                  {pages[currentPage] && (
                    <>
                      <canvas
                        ref={(el) => {
                          if (el && pages[currentPage]) {
                            const ctx = el.getContext('2d');
                            if (ctx) {
                              el.width = pages[currentPage].width;
                              el.height = pages[currentPage].height;
                              ctx.drawImage(pages[currentPage].canvas, 0, 0);
                            }
                          }
                          canvasRefs.current[currentPage] = el;
                        }}
                        className="border border-slate-700 rounded-lg max-w-full"
                      />
                      <div
                        ref={(el) => { overlayRefs.current[currentPage] = el; }}
                        onMouseDown={(e) => handleMouseDown(e, currentPage)}
                        onMouseMove={(e) => handleMouseMove(e, currentPage)}
                        onMouseUp={(e) => handleMouseUp(e, currentPage)}
                        onTouchStart={(e) => handleTouchStart(e, currentPage)}
                        onTouchMove={(e) => handleTouchMove(e, currentPage)}
                        onTouchEnd={(e) => handleTouchEnd(e, currentPage)}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                        style={{
                          width: pages[currentPage].width,
                          height: pages[currentPage].height,
                          touchAction: 'none',
                        }}
                      >
                        {/* Render existing redaction boxes */}
                        {currentPageRedactions.map((box) => (
                          <div
                            key={box.id}
                            className="absolute group"
                            style={{
                              left: `${box.x}px`,
                              top: `${box.y}px`,
                              width: `${box.width}px`,
                              height: `${box.height}px`,
                              backgroundColor:
                                box.type === 'auto'
                                  ? 'rgba(239, 68, 68, 0.3)'
                                  : 'rgba(0, 0, 0, 0.6)',
                              border:
                                box.type === 'auto'
                                  ? '2px solid #ef4444'
                                  : '2px solid #000',
                            }}
                          >
                            <button
                              onClick={() => removeRedactionBox(box.id)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        {/* Render detected PII highlights on current page */}
                        {currentPagePII.map((pii) => (
                          <div
                            key={pii.id}
                            className="absolute pointer-events-none"
                            style={{
                              left: `${pii.x}px`,
                              top: `${pii.y}px`,
                              width: `${pii.width}px`,
                              height: `${pii.height}px`,
                              border: '2px dashed #fbbf24',
                              backgroundColor: 'rgba(251, 191, 36, 0.2)',
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setFile(null);
                    setPages([]);
                    setRedactionBoxes([]);
                    setDetectedPII([]);
                    setCurrentPage(0);
                    pdfDocRef.current = null;
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={applyRedactions}
                  disabled={isProcessing || redactionBoxes.length === 0}
                  className={`flex-1 btn-primary ${
                    isProcessing || redactionBoxes.length === 0
                      ? 'opacity-70 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <svg
                        className="w-5 h-5 spinner inline-block mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Applying Redactions...
                    </>
                  ) : (
                    `Apply ${redactionBoxes.length} Redaction${
                      redactionBoxes.length !== 1 ? 's' : ''
                    }`
                  )}
                </button>
              </div>
            </div>
          )}
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
        Your files never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
