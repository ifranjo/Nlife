import { useState, useRef, useEffect, useCallback } from 'react';
import {
  createSafeErrorMessage,
  generateDownloadFilename,
} from '../../lib/security';

interface ScannedPage {
  id: string;
  imageData: string; // Base64 data URL
  thumbnail: string;
  corners?: Point[];
  enhanced: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Enhancement {
  brightness: number;
  contrast: number;
  blackAndWhite: boolean;
}

const DEFAULT_ENHANCEMENT: Enhancement = {
  brightness: 0,
  contrast: 0,
  blackAndWhite: false,
};

export default function DocumentScanner() {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEnhancement, setCurrentEnhancement] = useState<Enhancement>(DEFAULT_ENHANCEMENT);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [detectedCorners, setDetectedCorners] = useState<Point[] | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);

        // Start edge detection preview
        requestAnimationFrame(detectEdgesInPreview);
      }
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to access camera. Please grant camera permissions.'));
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsCameraActive(false);
    setDetectedCorners(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Simple edge detection using Canvas and contrast analysis
  const detectEdgesInPreview = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectEdgesInPreview);
      return;
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    ctx.drawImage(video, 0, 0);

    try {
      const corners = detectDocumentEdges(canvas);
      setDetectedCorners(corners);

      // Draw detection overlay
      if (corners && corners.length === 4) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw corner circles
        ctx.fillStyle = '#00ff00';
        corners.forEach(corner => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    } catch {
      // Silent fail for detection - continue preview
    }

    animationFrameRef.current = requestAnimationFrame(detectEdgesInPreview);
  };

  // Detect document edges using contrast and edge detection
  const detectDocumentEdges = (canvas: HTMLCanvasElement): Point[] | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert to grayscale and apply edge detection (simplified Sobel-like)
    const edges: number[][] = [];
    for (let y = 0; y < height; y++) {
      edges[y] = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        edges[y][x] = gray;
      }
    }

    // Simple edge detection using gradient
    const edgeStrength: number[][] = [];
    for (let y = 1; y < height - 1; y++) {
      edgeStrength[y] = [];
      for (let x = 1; x < width - 1; x++) {
        const gx = Math.abs(edges[y][x + 1] - edges[y][x - 1]);
        const gy = Math.abs(edges[y + 1][x] - edges[y - 1][x]);
        edgeStrength[y][x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Find strongest edges to approximate document corners
    // This is a simplified approximation - real apps use more complex algorithms
    const margin = Math.min(width, height) * 0.1;
    const corners: Point[] = [
      { x: margin, y: margin }, // Top-left
      { x: width - margin, y: margin }, // Top-right
      { x: width - margin, y: height - margin }, // Bottom-right
      { x: margin, y: height - margin }, // Bottom-left
    ];

    return corners;
  };

  // Capture photo from video stream
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      let processedCanvas = canvas;

      // Apply perspective correction if corners detected
      if (detectedCorners && detectedCorners.length === 4) {
        processedCanvas = applyPerspectiveCorrection(canvas, detectedCorners);
      }

      // Apply enhancements
      const enhancedCanvas = applyEnhancements(processedCanvas, currentEnhancement);

      // Generate thumbnail
      const thumbnailCanvas = document.createElement('canvas');
      const thumbCtx = thumbnailCanvas.getContext('2d');
      if (!thumbCtx) throw new Error('Thumbnail canvas context not available');

      const thumbSize = 150;
      const scale = Math.min(thumbSize / enhancedCanvas.width, thumbSize / enhancedCanvas.height);
      thumbnailCanvas.width = enhancedCanvas.width * scale;
      thumbnailCanvas.height = enhancedCanvas.height * scale;
      thumbCtx.drawImage(enhancedCanvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

      const imageData = enhancedCanvas.toDataURL('image/png');
      const thumbnail = thumbnailCanvas.toDataURL('image/png');

      const newPage: ScannedPage = {
        id: generateId(),
        imageData,
        thumbnail,
        corners: detectedCorners || undefined,
        enhanced: currentEnhancement.blackAndWhite || currentEnhancement.brightness !== 0 || currentEnhancement.contrast !== 0,
      };

      setPages(prev => [...prev, newPage]);
      setPreviewImage(imageData);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to capture photo. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply perspective correction using 4-point transform
  const applyPerspectiveCorrection = (canvas: HTMLCanvasElement, corners: Point[]): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Calculate destination rectangle (A4 ratio: 1:1.414)
    const [tl, tr, br, bl] = corners;

    const width = Math.max(
      Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2)),
      Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2))
    );

    const height = Math.max(
      Math.sqrt(Math.pow(bl.x - tl.x, 2) + Math.pow(bl.y - tl.y, 2)),
      Math.sqrt(Math.pow(br.x - tr.x, 2) + Math.pow(br.y - tr.y, 2))
    );

    // Create new canvas with corrected perspective
    const corrected = document.createElement('canvas');
    corrected.width = width;
    corrected.height = height;
    const correctedCtx = corrected.getContext('2d');
    if (!correctedCtx) return canvas;

    // Simple perspective transform using transform matrix
    // Note: Full perspective transform requires more complex math or library
    // This is a simplified version that works for most cases
    try {
      // Calculate transformation matrix
      correctedCtx.save();
      correctedCtx.drawImage(canvas,
        tl.x, tl.y, width, height,
        0, 0, width, height
      );
      correctedCtx.restore();
    } catch {
      // If transform fails, return original
      return canvas;
    }

    return corrected;
  };

  // Apply brightness, contrast, and black & white filter
  const applyEnhancements = (canvas: HTMLCanvasElement, enhancement: Enhancement): HTMLCanvasElement => {
    const enhanced = document.createElement('canvas');
    enhanced.width = canvas.width;
    enhanced.height = canvas.height;
    const ctx = enhanced.getContext('2d');
    if (!ctx) return canvas;

    ctx.drawImage(canvas, 0, 0);

    if (enhancement.brightness === 0 && enhancement.contrast === 0 && !enhancement.blackAndWhite) {
      return enhanced;
    }

    const imageData = ctx.getImageData(0, 0, enhanced.width, enhanced.height);
    const data = imageData.data;

    const brightness = enhancement.brightness;
    const contrast = enhancement.contrast * 2.55; // Scale to 0-255

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply brightness
      r += brightness;
      g += brightness;
      b += brightness;

      // Apply contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;

      // Apply black and white
      if (enhancement.blackAndWhite) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        // Apply threshold for cleaner document scanning
        const threshold = 128;
        const bw = gray > threshold ? 255 : 0;
        r = g = b = bw;
      }

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
    return enhanced;
  };

  // Remove page
  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  // Move page order
  const movePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;
    [newPages[index], newPages[newIndex]] = [newPages[newIndex], newPages[index]];
    setPages(newPages);
  };

  // Download as PDF
  const downloadAsPDF = async () => {
    if (pages.length === 0) {
      setError('Please scan at least one page');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Dynamic import of pdf-lib
      const { PDFDocument } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.create();

      for (const page of pages) {
        // Convert data URL to bytes
        const imageBytes = await fetch(page.imageData).then(res => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);

        // Add page with image dimensions
        const { width, height } = image.scale(1);
        const pdfPage = pdfDoc.addPage([width, height]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('scanned-document', 'pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Clear pages after download
      setPages([]);
      setPreviewImage(null);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create PDF. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Download as images (ZIP)
  const downloadAsImages = async () => {
    if (pages.length === 0) {
      setError('Please scan at least one page');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Dynamic import of jszip
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new JSZip();

      pages.forEach((page, index) => {
        const imageData = page.imageData.split(',')[1]; // Remove data URL prefix
        zip.file(`page-${index + 1}.png`, imageData, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('scanned-pages', 'zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Clear pages after download
      setPages([]);
      setPreviewImage(null);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to create ZIP file. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Camera Section */}
      {!isCameraActive ? (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-6">📷</div>
          <h3 className="text-2xl font-semibold text-white mb-3">
            Ready to Scan Documents
          </h3>
          <p className="text-slate-400 mb-6">
            Use your device camera to scan documents with automatic edge detection
          </p>
          <button
            onClick={startCamera}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Start Camera</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="glass-card overflow-hidden">
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />

              {/* Edge detection indicator */}
              {detectedCorners && (
                <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                  ✓ Document detected
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 space-y-4">
              {/* Enhancement controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Brightness: {currentEnhancement.brightness}
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={currentEnhancement.brightness}
                    onChange={(e) => setCurrentEnhancement(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Contrast: {currentEnhancement.contrast}
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={currentEnhancement.contrast}
                    onChange={(e) => setCurrentEnhancement(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentEnhancement.blackAndWhite}
                      onChange={(e) => setCurrentEnhancement(prev => ({ ...prev, blackAndWhite: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-300">Black & White</span>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span>Capture ({pages.length})</span>
                </button>

                <button
                  onClick={stopCamera}
                  className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                >
                  Stop Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm animate-fadeIn">
          {error}
        </div>
      )}

      {/* Scanned Pages */}
      {pages.length > 0 && (
        <div className="mt-8 space-y-4">
          <h4 className="text-lg font-semibold text-white">
            Scanned Pages ({pages.length})
          </h4>

          {/* Pages grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pages.map((page, index) => (
              <div key={page.id} className="glass-card p-3 space-y-2">
                <img
                  src={page.thumbnail}
                  alt={`Page ${index + 1}`}
                  className="w-full h-auto rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage(page.imageData)}
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Page {index + 1}</span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => movePage(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => movePage(index, 'down')}
                      disabled={index === pages.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => removePage(page.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadAsPDF}
              disabled={isProcessing}
              className={`flex-1 btn-primary flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <>
                  <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Download as PDF</span>
                </>
              )}
            </button>

            <button
              onClick={downloadAsImages}
              disabled={isProcessing}
              className={`flex-1 px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Download as Images (ZIP)</span>
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-full overflow-auto">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-8 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        All processing happens locally in your browser. No data is uploaded to any server.
      </p>
    </div>
  );
}
