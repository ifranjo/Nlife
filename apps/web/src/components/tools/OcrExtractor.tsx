import { useState, useRef, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
  generateDownloadFilename,
} from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';
import ZoomableImage from '../ui/ZoomableImage';

interface OcrResult {
  text: string;
  confidence?: number;
  processingTime: number;
  engine: 'trocr' | 'tesseract';
  pageCount?: number;
}

type OcrEngine = 'trocr-printed' | 'trocr-handwritten' | 'tesseract';

// Tesseract language options (for multi-language support)
const TESSERACT_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'por', name: 'Portuguese' },
  { code: 'ita', name: 'Italian' },
  { code: 'nld', name: 'Dutch' },
  { code: 'pol', name: 'Polish' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
];

export default function OcrExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<OcrEngine>('trocr-printed');
  const [tesseractLang, setTesseractLang] = useState('eng');
  const [copied, setCopied] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Create image preview
  useEffect(() => {
    if (!file) {
      setImagePreview(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [file]);

  const handleFile = async (selectedFile: File) => {
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressText('');

    const isPdf = selectedFile.type === 'application/pdf';
    const validation = await validateFile(selectedFile, isPdf ? 'pdf' : 'image');

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // If PDF selected, switch to Tesseract (TrOCR doesn't support multi-page)
    if (isPdf && selectedEngine.startsWith('trocr')) {
      setSelectedEngine('tesseract');
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

  // TrOCR extraction using Transformers.js
  const extractWithTrOCR = async (imageSource: string | File): Promise<string> => {
    setProgressText('Loading AI model (~100MB first time)...');

    const { pipeline } = await import('@huggingface/transformers');

    const modelName = selectedEngine === 'trocr-handwritten'
      ? 'Xenova/trocr-base-handwritten'
      : 'Xenova/trocr-small-printed';

    setProgressText(`Loading ${selectedEngine === 'trocr-handwritten' ? 'handwritten' : 'printed'} text model...`);

    const pipe = await pipeline('image-to-text', modelName, {
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          setProgress(pct);
          setProgressText(`Downloading model: ${pct}%`);
        }
      },
    });

    setModelLoaded(true);
    setProgressText('Analyzing image...');
    setProgress(50);

    // Convert file to URL if needed
    let imageUrl: string;
    if (typeof imageSource === 'string') {
      imageUrl = imageSource;
    } else {
      imageUrl = URL.createObjectURL(imageSource);
    }

    try {
      const output = await pipe(imageUrl);
      setProgress(100);

      // Handle different output formats
      if (Array.isArray(output) && output.length > 0) {
        return output.map((o: any) => o.generated_text || '').join('\n');
      }
      return '';
    } finally {
      if (typeof imageSource !== 'string') {
        URL.revokeObjectURL(imageUrl);
      }
    }
  };

  // Tesseract extraction (for PDFs and multi-language)
  const extractWithTesseract = async (): Promise<OcrResult> => {
    const { createWorker } = await import('tesseract.js');

    const worker = await createWorker(tesseractLang, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setProgress(Math.round(m.progress * 100));
        } else if (m.status) {
          setProgressText(m.status);
        }
      },
    });

    let allText = '';
    let totalConfidence = 0;
    let pageCount = 1;

    if (file!.type === 'application/pdf') {
      setProgressText('Loading PDF...');

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file!.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pageCount = pdfDoc.numPages;

      for (let i = 1; i <= pageCount; i++) {
        setProgressText(`Processing page ${i}/${pageCount}...`);

        const page = await pdfDoc.getPage(i);
        const scale = 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport }).promise;

        if (i === 1) {
          setImagePreview(canvas.toDataURL('image/png'));
        }

        const { data } = await worker.recognize(canvas);
        allText += (i > 1 ? '\n\n--- Page ' + i + ' ---\n\n' : '') + data.text;
        totalConfidence += data.confidence;
      }

      totalConfidence = totalConfidence / pageCount;
    } else {
      setProgressText('Processing image...');
      const { data } = await worker.recognize(file!);
      allText = data.text;
      totalConfidence = data.confidence;
    }

    await worker.terminate();

    return {
      text: allText,
      confidence: totalConfidence,
      processingTime: 0,
      engine: 'tesseract',
      pageCount: pageCount > 1 ? pageCount : undefined,
    };
  };

  const extractText = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressText('Initializing...');

    const startTime = Date.now();

    try {
      let resultData: OcrResult;

      if (selectedEngine.startsWith('trocr') && !file.type.includes('pdf')) {
        // Use TrOCR for images
        const text = await extractWithTrOCR(file);
        resultData = {
          text,
          processingTime: (Date.now() - startTime) / 1000,
          engine: 'trocr',
        };
      } else {
        // Use Tesseract for PDFs and when selected
        const tesseractResult = await extractWithTesseract();
        resultData = {
          ...tesseractResult,
          processingTime: (Date.now() - startTime) / 1000,
        };
      }

      setResult(resultData);
    } catch (err) {
      console.error('OCR Error:', err);
      setError(createSafeErrorMessage(err, 'Failed to extract text. Please try again.'));
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressText('');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;

    const success = await copyToClipboard(result.text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
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

  const reset = () => {
    setFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isPdf = file?.type === 'application/pdf';

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
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,application/pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop image or PDF here
            </h3>
            <p className="text-slate-400 text-sm">
              Supports PNG, JPEG, WebP, PDF
            </p>
          </div>

          {/* Engine Selection */}
          <div className="mt-6 glass-card p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              OCR Engine
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="engine"
                  value="trocr-printed"
                  checked={selectedEngine === 'trocr-printed'}
                  onChange={() => setSelectedEngine('trocr-printed')}
                  className="mt-1 w-4 h-4 accent-cyan-500"
                />
                <div>
                  <span className="text-white group-hover:text-cyan-400 transition-colors font-medium">
                    TrOCR Printed <span className="text-cyan-400 text-xs ml-1">AI - Recommended</span>
                  </span>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Microsoft's transformer model. Best accuracy for printed text.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="engine"
                  value="trocr-handwritten"
                  checked={selectedEngine === 'trocr-handwritten'}
                  onChange={() => setSelectedEngine('trocr-handwritten')}
                  className="mt-1 w-4 h-4 accent-cyan-500"
                />
                <div>
                  <span className="text-white group-hover:text-cyan-400 transition-colors font-medium">
                    TrOCR Handwritten <span className="text-violet-400 text-xs ml-1">AI</span>
                  </span>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Optimized for handwritten notes and cursive text.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="engine"
                  value="tesseract"
                  checked={selectedEngine === 'tesseract'}
                  onChange={() => setSelectedEngine('tesseract')}
                  className="mt-1 w-4 h-4 accent-cyan-500"
                />
                <div>
                  <span className="text-white group-hover:text-cyan-400 transition-colors font-medium">
                    Tesseract <span className="text-slate-500 text-xs ml-1">Classic</span>
                  </span>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Supports PDFs, 100+ languages. Faster but less accurate.
                  </p>
                </div>
              </label>
            </div>

            {selectedEngine === 'tesseract' && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Language
                </label>
                <select
                  value={tesseractLang}
                  onChange={(e) => setTesseractLang(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  {TESSERACT_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!modelLoaded && selectedEngine.startsWith('trocr') && (
              <p className="mt-4 text-xs text-amber-400/80">
                ⚡ First use downloads ~100MB AI model (cached for future use)
              </p>
            )}
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
            {/* Image Preview with Zoom */}
            {imagePreview && (
              <div className="mb-4 rounded-lg overflow-hidden bg-slate-900/50 border border-slate-700 h-64">
                <ZoomableImage
                  src={imagePreview}
                  alt="Preview"
                  containerClassName="w-full h-full"
                  className="object-contain"
                />
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{sanitizeFilename(file.name)}</p>
                <p className="text-slate-400 text-sm mt-1">{formatFileSize(file.size)}</p>
                <p className="text-slate-500 text-xs mt-1">
                  Engine: {selectedEngine === 'trocr-printed' ? 'TrOCR (Printed)' :
                    selectedEngine === 'trocr-handwritten' ? 'TrOCR (Handwritten)' :
                      `Tesseract (${TESSERACT_LANGUAGES.find(l => l.code === tesseractLang)?.name})`}
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

            {/* PDF notice */}
            {isPdf && selectedEngine.startsWith('trocr') && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                PDFs require Tesseract engine. Switched automatically.
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={extractText}
              disabled={isProcessing}
              className={`
                mt-4 w-full btn-primary flex items-center justify-center gap-2
                ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{progressText || `Processing... ${progress}%`}</span>
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
            {isProcessing && (
              <div className="mt-4">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${Math.max(progress, 5)}%` }}
                  />
                </div>
                {progressText && (
                  <p className="text-xs text-slate-500 mt-2 text-center">{progressText}</p>
                )}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Engine</p>
                <p className="text-white text-lg font-semibold mt-1 capitalize">
                  {result.engine === 'trocr' ? 'TrOCR AI' : 'Tesseract'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Processing Time</p>
                <p className="text-white text-lg font-semibold mt-1">
                  {result.processingTime.toFixed(2)}s
                </p>
              </div>
              {result.confidence && (
                <div>
                  <p className="text-slate-400 text-sm">Confidence</p>
                  <p className="text-white text-lg font-semibold mt-1">
                    {result.confidence.toFixed(1)}%
                  </p>
                </div>
              )}
              {result.pageCount && (
                <div>
                  <p className="text-slate-400 text-sm">Pages</p>
                  <p className="text-white text-lg font-semibold mt-1">
                    {result.pageCount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Text */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-slate-300">Extracted Text</h4>
              <button
                onClick={handleCopyToClipboard}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${copied
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                  }`}
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

            <textarea
              value={result.text}
              readOnly
              className="w-full h-64 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500"
            />

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
              Download TXT
            </button>

            <button
              onClick={handleCopyToClipboard}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                }`}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

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
        100% browser-based. Your files never leave your device.
      </p>
    </div>
  );
}
