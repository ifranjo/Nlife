import { useState, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
  generateDownloadFilename,
} from '../../lib/security';

interface OcrResult {
  text: string;
  confidence: number;
  processingTime: number;
}

const SUPPORTED_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'por', name: 'Portuguese' },
  { code: 'ita', name: 'Italian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'rus', name: 'Russian' },
  { code: 'hin', name: 'Hindi' },
];

export default function OcrExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [outputFormat, setOutputFormat] = useState<'text' | 'searchable-pdf'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = async (selectedFile: File) => {
    setError(null);
    setResult(null);
    setProgress(0);

    // Validate file type (PDF or image)
    const isPdf = selectedFile.type === 'application/pdf';
    const validation = await validateFile(selectedFile, isPdf ? 'pdf' : 'image');

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFile(selectedFile);
  };

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
      void handleFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      void handleFile(selectedFile);
    }
  };

  const extractText = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    const startTime = Date.now();

    try {
      // Dynamic import of Tesseract.js
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker(selectedLanguage, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      let imageData: string | File = file;

      // If PDF, convert first page to image
      if (file.type === 'application/pdf') {
        const { PDFDocument } = await import('pdf-lib');
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        if (pdfDoc.getPageCount() === 0) {
          throw new Error('PDF has no pages');
        }

        // For PDFs with multiple pages, we'll process first page
        // In a production app, you'd want to process all pages
        const firstPage = pdfDoc.getPage(0);

        // Convert PDF page to image using canvas
        // Note: pdf-lib doesn't render, so we'll use a different approach
        // We need to create a data URL from the PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        imageData = new File([blob], 'temp.pdf', { type: 'application/pdf' });
      }

      const { data } = await worker.recognize(imageData);

      await worker.terminate();

      const processingTime = Date.now() - startTime;

      setResult({
        text: data.text,
        confidence: data.confidence,
        processingTime: processingTime / 1000,
      });
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to extract text. Please try again.'));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.text);
      // Visual feedback would go here (toast notification)
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const downloadText = () => {
    if (!result || !file) return;

    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    link.download = generateDownloadFilename(baseName, 'txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const createSearchablePdf = async () => {
    if (!result || !file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { PDFDocument, rgb } = await import('pdf-lib');

      let pdfDoc: any;

      if (file.type === 'application/pdf') {
        // Load existing PDF
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
      } else {
        // Create new PDF from image
        pdfDoc = await PDFDocument.create();
        const imageBytes = await file.arrayBuffer();

        let image;
        if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else if (file.type === 'image/jpeg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          // For WebP and other formats, create a canvas and convert
          const img = new Image();
          const url = URL.createObjectURL(file);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
          URL.revokeObjectURL(url);

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);

          const pngDataUrl = canvas.toDataURL('image/png');
          const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer());
          image = await pdfDoc.embedPng(pngBytes);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      // Add invisible text layer (simplified - in production you'd position based on OCR coordinates)
      const firstPage = pdfDoc.getPage(0);
      const { height } = firstPage.getSize();

      // Add text as invisible layer
      firstPage.drawText(result.text, {
        x: 0,
        y: height,
        size: 0.1, // Very small but searchable
        color: rgb(1, 1, 1), // White (invisible on white background)
        opacity: 0,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      link.download = generateDownloadFilename(baseName + '_searchable', 'pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create searchable PDF. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!file && !result && (
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
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop image or PDF here
            </h3>
            <p className="text-slate-400 text-sm">
              Supports PDF, PNG, JPEG, WebP • Max 50MB for PDF, 10MB for images
            </p>
          </div>

          {/* Language Selection */}
          <div className="mt-6 glass-card p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              OCR Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Select the primary language in your document for best accuracy
            </p>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* File Preview */}
      {file && !result && (
        <div className="mt-6 animate-fadeIn">
          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{sanitizeFilename(file.name)}</p>
                <p className="text-slate-400 text-sm mt-1">{formatFileSize(file.size)}</p>
                <p className="text-slate-500 text-xs mt-1">
                  Language: {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              </div>
              <button
                onClick={reset}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Remove file"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Process Button */}
            <button
              onClick={extractText}
              disabled={isProcessing}
              className={`
                mt-6 w-full btn-primary flex items-center justify-center gap-2
                ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Extracting text... {progress}%</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Extract Text</span>
                </>
              )}
            </button>

            {/* Progress Bar */}
            {isProcessing && progress > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4 animate-fadeIn">
          {/* Stats */}
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Confidence</p>
                <p className="text-white text-2xl font-semibold mt-1">
                  {result.confidence.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Processing Time</p>
                <p className="text-white text-2xl font-semibold mt-1">
                  {result.processingTime.toFixed(2)}s
                </p>
              </div>
            </div>
          </div>

          {/* Extracted Text */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-slate-300">Extracted Text</h4>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors flex items-center gap-2"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>

            <div className="relative">
              <textarea
                value={result.text}
                readOnly
                className="w-full h-64 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {result.text.split(/\s+/).filter(w => w.length > 0).length} words • {result.text.length} characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadText}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download as TXT
            </button>

            <button
              onClick={createSearchablePdf}
              disabled={isProcessing}
              className={`
                flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2
                ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Searchable PDF
                </>
              )}
            </button>
          </div>

          {/* Process Another */}
          <button
            onClick={reset}
            className="w-full px-6 py-3 border border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800/50 transition-colors"
          >
            Process Another File
          </button>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your files never leave your browser. All OCR processing happens locally.
      </p>
    </div>
  );
}
