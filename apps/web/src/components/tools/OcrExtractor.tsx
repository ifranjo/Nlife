import { useState, useRef, useCallback } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
  generateDownloadFilename,
} from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface PageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  imagePreview?: string;
}

interface OcrResult {
  text: string;
  confidence?: number;
  processingTime: number;
  engine: 'trocr' | 'tesseract';
  pageCount?: number;
  pageResults?: PageResult[];
}

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: OcrResult;
  error?: string;
  preview?: string;
}

type OcrEngine = 'trocr-printed' | 'trocr-handwritten' | 'tesseract';
type OutputFormat = 'txt' | 'searchable-pdf' | 'docx';
type OutputMode = 'combined' | 'separate';

interface PreprocessingOptions {
  deskew: boolean;
  enhanceContrast: boolean;
  grayscale: boolean;
}

// ============================================================================
// Constants
// ============================================================================

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

const MAX_FILES = 20;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// Component
// ============================================================================

export default function OcrExtractor() {
  // Usage tracking
  
  // State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<OcrEngine>('tesseract');
  const [tesseractLang, setTesseractLang] = useState('eng');
  const [copied, setCopied] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [currentPageProgress, setCurrentPageProgress] = useState({ current: 0, total: 0 });
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('txt');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_outputMode, _setOutputMode] = useState<OutputMode>('combined');
  const [preprocessing, setPreprocessing] = useState<PreprocessingOptions>({
    deskew: false,
    enhanceContrast: false,
    grayscale: false,
  });

  // Preload transformers on component mount
  useEffect(() => {
    preloadTransformers();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Create preview URL for image
  const createPreview = async (file: File): Promise<string | undefined> => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  // ============================================================================
  // Image Preprocessing
  // ============================================================================

  const preprocessImage = async (
    canvas: HTMLCanvasElement,
    options: PreprocessingOptions
  ): Promise<HTMLCanvasElement> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Grayscale conversion
    if (options.grayscale) {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    // Contrast enhancement
    if (options.enhanceContrast) {
      const factor = 1.5; // Increase contrast by 50%
      const intercept = 128 * (1 - factor);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * data[i] + intercept));
        data[i + 1] = Math.min(255, Math.max(0, factor * data[i + 1] + intercept));
        data[i + 2] = Math.min(255, Math.max(0, factor * data[i + 2] + intercept));
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Deskew (simple threshold-based approach)
    if (options.deskew) {
      // For now, we'll skip actual deskew as it requires complex algorithms
      // In production, you'd use OpenCV.js or similar for proper deskewing
    }

    return canvas;
  };

  // ============================================================================
  // OCR Engines
  // ============================================================================

  // TrOCR extraction using Transformers.js
  const extractWithTrOCR = async (imageSource: string | File): Promise<string> => {
    setProgressText('Loading AI model (~100MB first time)...');

    const transcriber = await initPipeline;

    const modelName = selectedEngine === 'trocr-handwritten'
      ? 'Xenova/trocr-base-handwritten'
      : 'Xenova/trocr-small-printed';

    setProgressText(`Loading ${selectedEngine === 'trocr-handwritten' ? 'handwritten' : 'printed'} text model...`);

    const pipe = await initPipeline('image-to-text', modelName, {
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

    let imageUrl: string;
    if (typeof imageSource === 'string') {
      imageUrl = imageSource;
    } else {
      imageUrl = URL.createObjectURL(imageSource);
    }

    try {
      const output = await pipe(imageUrl);
      setProgress(100);

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
  const extractWithTesseract = async (
    file: File,
    onPageComplete?: (pageResult: PageResult) => void
  ): Promise<OcrResult> => {
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
    const pageResults: PageResult[] = [];

    if (file.type === 'application/pdf') {
      setProgressText('Loading PDF...');

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pageCount = pdfDoc.numPages;

      setCurrentPageProgress({ current: 0, total: pageCount });

      for (let i = 1; i <= pageCount; i++) {
        setProgressText(`Processing page ${i}/${pageCount}...`);
        setCurrentPageProgress({ current: i, total: pageCount });

        const page = await pdfDoc.getPage(i);
        const scale = 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // @ts-expect-error - pdf.js type definition mismatch with canvas context
        await page.render({ canvasContext: context!, viewport }).promise;

        // Apply preprocessing if enabled
        if (preprocessing.grayscale || preprocessing.enhanceContrast || preprocessing.deskew) {
          await preprocessImage(canvas, preprocessing);
        }

        const pagePreview = canvas.toDataURL('image/png');
        const { data } = await worker.recognize(canvas);

        const pageResult: PageResult = {
          pageNumber: i,
          text: data.text,
          confidence: data.confidence,
          imagePreview: pagePreview,
        };

        pageResults.push(pageResult);
        allText += (i > 1 ? `\n\n--- Page ${i} ---\n\n` : '') + data.text;
        totalConfidence += data.confidence;

        if (onPageComplete) {
          onPageComplete(pageResult);
        }
      }

      totalConfidence = totalConfidence / pageCount;
    } else {
      setProgressText('Processing image...');

      // Load image and apply preprocessing
      const img = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      if (preprocessing.grayscale || preprocessing.enhanceContrast || preprocessing.deskew) {
        await preprocessImage(canvas, preprocessing);
      }

      const { data } = await worker.recognize(canvas);
      allText = data.text;
      totalConfidence = data.confidence;

      pageResults.push({
        pageNumber: 1,
        text: data.text,
        confidence: data.confidence,
      });
    }

    await worker.terminate();

    return {
      text: allText,
      confidence: totalConfidence,
      processingTime: 0,
      engine: 'tesseract',
      pageCount: pageCount > 1 ? pageCount : undefined,
      pageResults,
    };
  };

  // ============================================================================
  // File Handling
  // ============================================================================

  const handleFile = useCallback(async (selectedFile: File) => {
    setError(null);
    setProgress(0);
    setProgressText('');

    const isPdf = selectedFile.type === 'application/pdf';
    const validation = await validateFile(selectedFile, isPdf ? 'pdf' : 'image');

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 50MB limit');
      return;
    }

    const preview = await createPreview(selectedFile);

    const newFile: FileItem = {
      id: generateId(),
      file: selectedFile,
      name: sanitizeFilename(selectedFile.name),
      size: selectedFile.size,
      status: 'pending',
      preview,
    };

    setFiles(prev => {
      if (prev.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        return prev;
      }
      return [...prev, newFile];
    });

    // If PDF selected with TrOCR, switch to Tesseract
    if (isPdf && selectedEngine.startsWith('trocr')) {
      setSelectedEngine('tesseract');
    }
  }, [selectedEngine]);

  const handleMultipleFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      await handleFile(file);
    }
  }, [handleFile]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
  };

  const clearAllFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setSelectedFileId(null);
    setError(null);
  };

  // ============================================================================
  // Drag & Drop Handlers
  // ============================================================================

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
    void handleMultipleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleMultipleFiles(e.target.files);
    }
  };

  // ============================================================================
  // OCR Processing
  // ============================================================================

  const processAllFiles = async () => {
    if (files.length === 0) {
      setError('Please add at least one file');
      return;
    }

    
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressText('Initializing...');

    const pendingFiles = files.filter(f => f.status === 'pending');

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileItem = pendingFiles[i];
      const startTime = Date.now();

      // Update status to processing
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'processing' as const } : f
      ));

      setProgressText(`Processing ${fileItem.name} (${i + 1}/${pendingFiles.length})...`);

      try {
        let resultData: OcrResult;

        if (selectedEngine.startsWith('trocr') && !fileItem.file.type.includes('pdf')) {
          const text = await extractWithTrOCR(fileItem.file);
          resultData = {
            text,
            processingTime: (Date.now() - startTime) / 1000,
            engine: 'trocr',
          };
        } else {
          const tesseractResult = await extractWithTesseract(
            fileItem.file,
            (pageResult) => {
              // Update with partial results for each page
              setFiles(prev => prev.map(f => {
                if (f.id === fileItem.id) {
                  const existingPages = f.result?.pageResults || [];
                  return {
                    ...f,
                    result: {
                      ...f.result,
                      text: existingPages.map(p => p.text).join('\n\n--- Page Break ---\n\n') + pageResult.text,
                      pageResults: [...existingPages, pageResult],
                      processingTime: 0,
                      engine: 'tesseract' as const,
                    },
                  };
                }
                return f;
              }));
            }
          );
          resultData = {
            ...tesseractResult,
            processingTime: (Date.now() - startTime) / 1000,
          };
        }

        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'done' as const, result: resultData }
            : f
        ));
      } catch (err) {
        console.error('OCR Error:', err);
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'error' as const, error: createSafeErrorMessage(err, 'Failed to extract text') }
            : f
        ));
      }
    }

        setIsProcessing(false);
    setProgress(0);
    setProgressText('');
    setCurrentPageProgress({ current: 0, total: 0 });
  };

  // ============================================================================
  // Output Generation
  // ============================================================================

  const getCombinedText = (): string => {
    const completedFiles = files.filter(f => f.status === 'done' && f.result);
    if (completedFiles.length === 0) return '';

    if (completedFiles.length === 1) {
      return completedFiles[0].result!.text;
    }

    return completedFiles.map((f) =>
      `=== ${f.name} ===\n\n${f.result!.text}`
    ).join('\n\n' + '='.repeat(50) + '\n\n');
  };

  const handleCopyToClipboard = async () => {
    const text = getCombinedText();
    if (!text) return;

    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setError('Failed to copy to clipboard');
    }
  };

  const downloadTxt = () => {
    const text = getCombinedText();
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = generateDownloadFilename('ocr_extracted', 'txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async () => {
    const text = getCombinedText();
    if (!text) return;

    setProgressText('Creating Word document...');

    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

      const paragraphs = text.split('\n\n').map((para) => {
        // Check if it looks like a heading or file separator
        if (para.startsWith('===') && para.endsWith('===')) {
          return new Paragraph({
            children: [new TextRun({ text: para.replace(/=/g, '').trim(), bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          });
        }

        if (para.startsWith('--- Page')) {
          return new Paragraph({
            children: [new TextRun({ text: para.replace(/-/g, '').trim(), italics: true, size: 20 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          });
        }

        return new Paragraph({
          children: [new TextRun({ text: para, size: 24 })],
          spacing: { after: 200 },
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('ocr_extracted', 'docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create Word document'));
    } finally {
      setProgressText('');
    }
  };

  const downloadSearchablePdf = async () => {
    const completedFiles = files.filter(f => f.status === 'done' && f.result);
    if (completedFiles.length === 0) return;

    setProgressText('Creating searchable PDF...');

    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const fileItem of completedFiles) {
        if (!fileItem.result) continue;

        const pages = fileItem.result.pageResults || [{
          pageNumber: 1,
          text: fileItem.result.text,
          confidence: fileItem.result.confidence || 0
        }];

        for (const pageResult of pages) {
          // Create a page with text
          const page = pdfDoc.addPage([612, 792]); // Letter size
          const { width, height } = page.getSize();

          // Split text into lines that fit the page width
          const fontSize = 10;
          const maxWidth = width - 100;
          const lines = pageResult.text.split('\n');

          let y = height - 50;
          const lineHeight = fontSize * 1.5;

          for (const line of lines) {
            if (y < 50) {
              // Create new page if we run out of space
              pdfDoc.addPage([612, 792]);
              y = height - 50;
            }

            // Simple word wrap
            const words = line.split(' ');
            let currentLine = '';

            for (const word of words) {
              const testLine = currentLine + (currentLine ? ' ' : '') + word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize);

              if (testWidth > maxWidth && currentLine) {
                page.drawText(currentLine, {
                  x: 50,
                  y,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
                y -= lineHeight;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }

            if (currentLine) {
              page.drawText(currentLine, {
                x: 50,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
              y -= lineHeight;
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('ocr_searchable', 'pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create searchable PDF'));
    } finally {
      setProgressText('');
    }
  };

  const downloadAllAsZip = async () => {
    const completedFiles = files.filter(f => f.status === 'done' && f.result);
    if (completedFiles.length === 0) return;

    setProgressText('Creating ZIP archive...');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const fileItem of completedFiles) {
        if (!fileItem.result) continue;

        const baseName = fileItem.name.replace(/\.[^.]+$/, '');

        // Add text file
        zip.file(`${baseName}_ocr.txt`, fileItem.result.text);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('ocr_results', 'zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create ZIP file'));
    } finally {
      setProgressText('');
    }
  };

  const reset = () => {
    clearAllFiles();
    setProgress(0);
    setProgressText('');
    setCurrentPageProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const selectedFile = files.find(f => f.id === selectedFileId);
  const completedFiles = files.filter(f => f.status === 'done' && f.result);
  const hasResults = completedFiles.length > 0;
  const hasPendingFiles = files.some(f => f.status === 'pending');
  const isBatchMode = files.length > 1;

  const getTotalStats = () => {
    if (completedFiles.length === 0) return null;

    const totalWords = completedFiles.reduce((sum, f) =>
      sum + (f.result?.text.split(/\s+/).filter(w => w.length > 0).length || 0), 0
    );
    const totalChars = completedFiles.reduce((sum, f) =>
      sum + (f.result?.text.length || 0), 0
    );
    const avgConfidence = completedFiles.reduce((sum, f) =>
      sum + (f.result?.confidence || 0), 0
    ) / completedFiles.length;
    const totalPages = completedFiles.reduce((sum, f) =>
      sum + (f.result?.pageCount || 1), 0
    );
    const totalTime = completedFiles.reduce((sum, f) =>
      sum + (f.result?.processingTime || 0), 0
    );

    return { totalWords, totalChars, avgConfidence, totalPages, totalTime, count: completedFiles.length };
  };

  const stats = getTotalStats();

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto">
      {/* Upgrade Prompt */}
      
      {/* Usage Indicator */}
      
      {/* Drop Zone - Always visible when no files */}
      {files.length === 0 && (
        <>
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
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop images or PDFs here
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Supports PNG, JPEG, WebP, PDF. Multiple files supported. Max 50MB each.
            </p>
          </div>

          {/* Engine & Language Selection */}
          <div className="mt-6 glass-card p-6">
            <label className="block text-sm font-medium text-[var(--text)] mb-3">
              OCR Engine
            </label>
            <div className="space-y-3">
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
                    Tesseract <span className="text-cyan-400 text-xs ml-1">Recommended</span>
                  </span>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    Supports PDFs, 100+ languages, multi-page documents. Best overall.
                  </p>
                </div>
              </label>

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
                    TrOCR Printed <span className="text-violet-400 text-xs ml-1">AI</span>
                  </span>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    Microsoft's transformer model. Best for single images with printed text.
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
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    Optimized for handwritten notes and cursive text.
                  </p>
                </div>
              </label>
            </div>

            {/* Language Selection */}
            {selectedEngine === 'tesseract' && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Document Language
                </label>
                <select
                  value={tesseractLang}
                  onChange={(e) => setTesseractLang(e.target.value)}
                  aria-label="Document language"
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

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Advanced Settings
            </button>

            {/* Advanced Settings Panel */}
            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                {/* Preprocessing Options */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                    Image Preprocessing
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preprocessing.grayscale}
                        onChange={(e) => setPreprocessing(prev => ({ ...prev, grayscale: e.target.checked }))}
                        className="w-4 h-4 accent-cyan-500 rounded"
                      />
                      <span className="text-[var(--text)] text-sm">Convert to grayscale</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preprocessing.enhanceContrast}
                        onChange={(e) => setPreprocessing(prev => ({ ...prev, enhanceContrast: e.target.checked }))}
                        className="w-4 h-4 accent-cyan-500 rounded"
                      />
                      <span className="text-[var(--text)] text-sm">Enhance contrast</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer opacity-50">
                      <input
                        type="checkbox"
                        checked={preprocessing.deskew}
                        onChange={(e) => setPreprocessing(prev => ({ ...prev, deskew: e.target.checked }))}
                        className="w-4 h-4 accent-cyan-500 rounded"
                        disabled
                      />
                      <span className="text-[var(--text)] text-sm">Auto-deskew (coming soon)</span>
                    </label>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                    Default Output Format
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['txt', 'docx', 'searchable-pdf'] as OutputFormat[]).map((format) => (
                      <button
                        key={format}
                        onClick={() => setOutputFormat(format)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                          ${outputFormat === format
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-800 text-[var(--text-muted)] hover:bg-slate-700 hover:text-white'
                          }
                        `}
                      >
                        {format === 'txt' ? 'Plain Text' : format === 'docx' ? 'Word (.docx)' : 'Searchable PDF'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!modelLoaded && selectedEngine.startsWith('trocr') && (
              <p className="mt-4 text-xs text-amber-400/80">
                First use downloads ~100MB AI model (cached for future use)
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

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-[var(--text-muted)]">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </h4>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
              >
                + Add more
              </button>
              <button
                onClick={clearAllFiles}
                disabled={isProcessing}
                className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Clear all
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,application/pdf,image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Cards */}
          <div className="space-y-3">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                onClick={() => setSelectedFileId(fileItem.id)}
                className={`
                  glass-card p-4 rounded-xl cursor-pointer transition-all
                  ${selectedFileId === fileItem.id ? 'ring-2 ring-cyan-500' : 'hover:bg-slate-800/50'}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                    {fileItem.preview ? (
                      <img
                        src={fileItem.preview}
                        alt={fileItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">📄</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{fileItem.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--text-muted)]">{formatFileSize(fileItem.size)}</span>
                      {fileItem.result?.pageCount && (
                        <span className="text-[var(--text-muted)]">
                          {fileItem.result.pageCount} pages
                        </span>
                      )}
                      {fileItem.result?.confidence && (
                        <span className="text-[var(--text-muted)]">
                          {fileItem.result.confidence.toFixed(1)}% confidence
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {fileItem.status === 'pending' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-[var(--text-muted)]">
                        Pending
                      </span>
                    )}
                    {fileItem.status === 'processing' && (
                      <svg className="w-5 h-5 text-cyan-400 spinner" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {fileItem.status === 'done' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                        Done
                      </span>
                    )}
                    {fileItem.status === 'error' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                        Error
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileItem.id);
                      }}
                      disabled={isProcessing}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {fileItem.error && (
                  <p className="mt-2 text-sm text-red-400">{fileItem.error}</p>
                )}
              </div>
            ))}
          </div>

          {/* Process Button */}
          {hasPendingFiles && (
            <button
              onClick={processAllFiles}
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
                  <span>{progressText || `Processing... ${progress}%`}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Extract Text from {files.filter(f => f.status === 'pending').length} File{files.filter(f => f.status === 'pending').length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-4">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${Math.max(progress, 5)}%` }}
                />
              </div>
              {currentPageProgress.total > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
                  Page {currentPageProgress.current} of {currentPageProgress.total}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {hasResults && (
        <div className="mt-6 space-y-4 animate-fadeIn">
          {/* Stats Summary */}
          {stats && (
            <div className="glass-card p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Files Processed</p>
                  <p className="text-white text-lg font-semibold mt-1">{stats.count}</p>
                </div>
                {stats.totalPages > 1 && (
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">Total Pages</p>
                    <p className="text-white text-lg font-semibold mt-1">{stats.totalPages}</p>
                  </div>
                )}
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Words Extracted</p>
                  <p className="text-white text-lg font-semibold mt-1">{stats.totalWords.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Processing Time</p>
                  <p className="text-white text-lg font-semibold mt-1">{stats.totalTime.toFixed(2)}s</p>
                </div>
                {stats.avgConfidence > 0 && (
                  <div>
                    <p className="text-[var(--text-muted)] text-sm">Avg. Confidence</p>
                    <p className="text-white text-lg font-semibold mt-1">{stats.avgConfidence.toFixed(1)}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected File Preview */}
          {selectedFile?.result && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-[var(--text)]">
                  {selectedFile.name}
                  {selectedFile.result.pageCount && (
                    <span className="text-[var(--text-muted)] ml-2">
                      ({selectedFile.result.pageCount} pages)
                    </span>
                  )}
                </h4>
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

              {/* Page tabs for multi-page documents */}
              {selectedFile.result.pageResults && selectedFile.result.pageResults.length > 1 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {selectedFile.result.pageResults.map((page) => (
                    <button
                      key={page.pageNumber}
                      className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-[var(--text)] hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                    >
                      Page {page.pageNumber}
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        ({page.confidence.toFixed(0)}%)
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={selectedFile.result.text}
                readOnly
                className="w-full h-64 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500"
              />

              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {selectedFile.result.text.split(/\s+/).filter(w => w.length > 0).length} words
                {' '}{selectedFile.result.text.length} characters
              </p>
            </div>
          )}

          {/* Download Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={downloadTxt}
              className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              TXT
            </button>

            <button
              onClick={downloadDocx}
              className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              DOCX
            </button>

            <button
              onClick={downloadSearchablePdf}
              className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PDF
            </button>

            {isBatchMode && (
              <button
                onClick={downloadAllAsZip}
                className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                ZIP
              </button>
            )}
          </div>

          <button
            onClick={handleCopyToClipboard}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${copied
                ? 'bg-green-500 text-white'
                : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
          >
            {copied ? 'Copied to Clipboard!' : 'Copy All Text to Clipboard'}
          </button>

          <button
            onClick={reset}
            className="w-full px-6 py-3 border border-slate-700 text-[var(--text)] rounded-lg font-medium hover:bg-slate-800/50 transition-colors"
          >
            Process More Files
          </button>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        100% browser-based. Your files never leave your device.
      </p>
    </div>
  );
}
