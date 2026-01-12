import { useState, useCallback, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
}

type PageSize = 'fit' | 'a4' | 'letter' | 'legal';
type Orientation = 'auto' | 'portrait' | 'landscape';

export default function JpgToPdf() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [margin, setMargin] = useState<number>(20);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usage limits for free tier
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('jpg-to-pdf');

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const loadImage = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            id: generateId(),
            file,
            preview: e.target?.result as string,
            width: img.width,
            height: img.height,
          });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const validation = await validateFile(file, 'image');
      if (validation.valid) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setError('No valid image files selected. Supported formats: JPG, PNG, WebP, GIF');
      return;
    }

    try {
      setProgress(`Loading ${validFiles.length} image(s)...`);
      const newImages = await Promise.all(validFiles.map(loadImage));
      setImages(prev => [...prev, ...newImages]);
      setError(null);
      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to load some images'));
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
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const clearAll = () => {
    setImages([]);
    setError(null);
    setProgress('');
  };

  // Reorder handlers
  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleImageDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleImageDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);
    setImages(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getPageDimensions = (imgWidth: number, imgHeight: number): { width: number; height: number } => {
    // Page sizes in points (72 points = 1 inch)
    const sizes = {
      a4: { width: 595, height: 842 },      // 210mm x 297mm
      letter: { width: 612, height: 792 },   // 8.5" x 11"
      legal: { width: 612, height: 1008 },   // 8.5" x 14"
      fit: { width: imgWidth, height: imgHeight },
    };

    let { width, height } = sizes[pageSize];

    if (pageSize !== 'fit') {
      if (orientation === 'landscape') {
        [width, height] = [height, width];
      } else if (orientation === 'auto') {
        // Match orientation to image
        const imgIsLandscape = imgWidth > imgHeight;
        const pageIsLandscape = width > height;
        if (imgIsLandscape !== pageIsLandscape) {
          [width, height] = [height, width];
        }
      }
    }

    return { width, height };
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;

    if (!checkUsage()) {
      return; // Prompt will be shown automatically
    }

    setIsProcessing(true);
    setError(null);
    setProgress('Creating PDF...');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setProgress(`Processing image ${i + 1} of ${images.length}...`);

        // Get page dimensions
        const pageDims = getPageDimensions(img.width, img.height);

        // Add page
        const page = pdfDoc.addPage([pageDims.width, pageDims.height]);

        // Embed image
        const imageBytes = await img.file.arrayBuffer();
        let embeddedImage;

        const mimeType = img.file.type.toLowerCase();
        if (mimeType === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          // For other formats (WebP, GIF), convert via canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const imgEl = new Image();

          await new Promise<void>((resolve, reject) => {
            imgEl.onload = () => {
              canvas.width = imgEl.width;
              canvas.height = imgEl.height;
              ctx?.drawImage(imgEl, 0, 0);
              resolve();
            };
            imgEl.onerror = reject;
            imgEl.src = img.preview;
          });

          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const jpegBase64 = jpegDataUrl.split(',')[1];
          const jpegBytes = Uint8Array.from(atob(jpegBase64), c => c.charCodeAt(0));
          embeddedImage = await pdfDoc.embedJpg(jpegBytes);
        }

        // Calculate image dimensions to fit page with margins
        const marginPts = margin;
        const maxWidth = pageDims.width - (marginPts * 2);
        const maxHeight = pageDims.height - (marginPts * 2);

        const imgAspect = embeddedImage.width / embeddedImage.height;
        const pageAspect = maxWidth / maxHeight;

        let drawWidth, drawHeight;
        if (imgAspect > pageAspect) {
          drawWidth = maxWidth;
          drawHeight = maxWidth / imgAspect;
        } else {
          drawHeight = maxHeight;
          drawWidth = maxHeight * imgAspect;
        }

        // Center image on page
        const x = (pageDims.width - drawWidth) / 2;
        const y = (pageDims.height - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      setProgress('Saving PDF...');
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'images.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      recordUsage();
      setProgress('');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create PDF. Please try again.'));
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="jpg-to-pdf" />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          drop-zone rounded-2xl p-8 text-center cursor-pointer mb-6
          ${isDragging ? 'drag-over' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-4xl mb-3">🖼️ → 📄</div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Drop images here or click to browse
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Supports JPG, PNG, WebP, GIF • Multiple files allowed
        </p>
      </div>

      {/* Images Preview */}
      {images.length > 0 && (
        <>
          {/* Options */}
          <div className="glass-card p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-1">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PageSize)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="a4">A4 (210 x 297 mm)</option>
                  <option value="letter">Letter (8.5 x 11 in)</option>
                  <option value="legal">Legal (8.5 x 14 in)</option>
                  <option value="fit">Fit to Image</option>
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-1">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as Orientation)}
                  disabled={pageSize === 'fit'}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="auto">Auto (match image)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-1">Margin (px)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={margin}
                  onChange={(e) => setMargin(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Images Grid */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">{images.length} image(s)</span>
              <button
                onClick={clearAll}
                className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>

            <p className="text-[var(--text-muted)] text-xs mb-3">Drag to reorder • Images will appear in this order in the PDF</p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleImageDragStart(index)}
                  onDragOver={(e) => handleImageDragOver(e, index)}
                  onDragLeave={handleImageDragLeave}
                  onDrop={() => handleImageDrop(index)}
                  onDragEnd={handleImageDragEnd}
                  className={`
                    relative group cursor-grab active:cursor-grabbing
                    ${draggedIndex === index ? 'opacity-50' : ''}
                    ${dragOverIndex === index ? 'ring-2 ring-indigo-500' : ''}
                  `}
                >
                  <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                    <img
                      src={img.preview}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                  {/* Page number */}
                  <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Convert Button */}
          <button
            onClick={convertToPdf}
            disabled={isProcessing || images.length === 0}
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
                <span>Convert to PDF</span>
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

      {showPrompt && <UpgradePrompt toolId="jpg-to-pdf" toolName="JPG to PDF" onDismiss={dismissPrompt} />}
    </div>
  );
}
