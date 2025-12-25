import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  value: string;
}

interface Annotation {
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface Signature {
  id: string;
  page: number;
  x: number;
  y: number;
  type: 'draw' | 'text' | 'image';
  data: string; // base64 image data or text
  width: number;
  height: number;
}

type ToolMode = 'form' | 'text' | 'signature' | 'date' | 'checkbox';

export default function PdfFormFiller() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [toolMode, setToolMode] = useState<ToolMode>('form');
  const [fontSize, setFontSize] = useState(12);
  const [textColor, setTextColor] = useState('#000000');
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  // Signature modal state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'text' | 'image'>('draw');
  const [signatureText, setSignatureText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const signatureImageInputRef = useRef<HTMLInputElement>(null);

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
      void loadPdf(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void loadPdf(e.target.files[0]);
    }
  };

  const loadPdf = async (file: File) => {
    setError(null);

    // Validate file
    const validation = await validateFile(file, 'pdf');
    if (!validation.valid) {
      setError(validation.error || 'Invalid PDF file');
      return;
    }

    setPdfFile(file);
    setPdfFileName(sanitizeFilename(file.name));

    try {
      setIsProcessing(true);

      // Dynamic import of pdf-lib
      const { PDFDocument } = await import('pdf-lib');

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      setPdfDoc(pdf);
      setTotalPages(pdf.getPageCount());
      setCurrentPage(0);

      // Extract form fields if any
      const form = pdf.getForm();
      const fields = form.getFields();

      const extractedFields: FormField[] = fields.map(field => {
        const name = field.getName();
        let type: FormField['type'] = 'text';
        let value = '';

        try {
          if (field.constructor.name.includes('Text')) {
            type = 'text';
            value = (field as any).getText?.() || '';
          } else if (field.constructor.name.includes('CheckBox')) {
            type = 'checkbox';
            value = (field as any).isChecked?.() ? 'true' : 'false';
          } else if (field.constructor.name.includes('RadioGroup')) {
            type = 'radio';
            value = (field as any).getSelected?.() || '';
          } else if (field.constructor.name.includes('Dropdown')) {
            type = 'dropdown';
            value = (field as any).getSelected?.() || '';
          }
        } catch {
          // Field type detection failed, default to text
        }

        return { name, type, value };
      });

      setFormFields(extractedFields);

      // Render first page preview
      await renderPagePreview(pdf, 0);

    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to load PDF. Please try again.'));
      setPdfFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPagePreview = async (pdf: any, pageIndex: number) => {
    if (!previewCanvasRef.current) return;

    try {
      const page = pdf.getPage(pageIndex);
      const { width, height } = page.getSize();

      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match page (scaled to fit)
      const scale = Math.min(600 / width, 800 / height);
      canvas.width = width * scale;
      canvas.height = height * scale;

      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Note: We can't actually render the PDF content without pdf.js
      // This is just a placeholder - in production you'd use pdf.js for rendering
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Page ${pageIndex + 1} of ${pdf.getPageCount()}`, canvas.width / 2, canvas.height / 2);

    } catch (err) {
      console.error('Preview render error:', err);
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormFields(prev =>
      prev.map(field => field.name === name ? { ...field, value } : field)
    );
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLElement>) => {
    if (toolMode === 'form' || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (toolMode === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const annotation: Annotation = {
          id: Math.random().toString(36).substring(2, 9),
          page: currentPage,
          x,
          y,
          text,
          fontSize,
          color: textColor,
        };
        setAnnotations(prev => [...prev, annotation]);
      }
    } else if (toolMode === 'date') {
      const today = new Date().toLocaleDateString();
      const annotation: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        page: currentPage,
        x,
        y,
        text: today,
        fontSize,
        color: textColor,
      };
      setAnnotations(prev => [...prev, annotation]);
    } else if (toolMode === 'checkbox') {
      const annotation: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        page: currentPage,
        x,
        y,
        text: '✓',
        fontSize: fontSize * 1.5,
        color: textColor,
      };
      setAnnotations(prev => [...prev, annotation]);
    } else if (toolMode === 'signature') {
      setShowSignatureModal(true);
    }
  };

  // Helper to get position from mouse or touch event
  const getCanvasPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
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

  // Signature drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw' || !signatureCanvasRef.current) return;
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureMode !== 'draw' || !signatureCanvasRef.current) return;
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Touch event handlers for signature canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw' || !signatureCanvasRef.current) return;
    e.preventDefault(); // Prevent scrolling
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPosition(e, rect);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureMode !== 'draw' || !signatureCanvasRef.current) return;
    e.preventDefault(); // Prevent scrolling
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPosition(e, rect);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      const ctx = signatureCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
      }
    }
    setSignatureText('');
  };

  const saveSignature = () => {
    let signatureData = '';

    if (signatureMode === 'draw' && signatureCanvasRef.current) {
      signatureData = signatureCanvasRef.current.toDataURL();
    } else if (signatureMode === 'text') {
      // Create text signature on canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '32px "Brush Script MT", cursive';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signatureText, 200, 50);
        signatureData = canvas.toDataURL();
      }
    } else if (signatureMode === 'image') {
      // Signature image already handled separately
      return;
    }

    if (signatureData) {
      const signature: Signature = {
        id: Math.random().toString(36).substring(2, 9),
        page: currentPage,
        x: 100,
        y: 100,
        type: signatureMode,
        data: signatureData,
        width: 150,
        height: 50,
      };
      setSignatures(prev => [...prev, signature]);
    }

    setShowSignatureModal(false);
    clearSignature();
  };

  const handleSignatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const validation = await validateFile(file, 'image');

    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const signature: Signature = {
          id: Math.random().toString(36).substring(2, 9),
          page: currentPage,
          x: 100,
          y: 100,
          type: 'image',
          data: event.target.result as string,
          width: 150,
          height: 50,
        };
        setSignatures(prev => [...prev, signature]);
        setShowSignatureModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const removeSignature = (id: string) => {
    setSignatures(prev => prev.filter(s => s.id !== id));
  };

  const fillAndDownload = async () => {
    if (!pdfDoc) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      // Create a copy of the PDF
      const pdfBytes = await pdfDoc.save();
      const pdf = await PDFDocument.load(pdfBytes);

      // Fill form fields
      const form = pdf.getForm();
      formFields.forEach(field => {
        try {
          const pdfField = form.getField(field.name);

          if (field.type === 'text' && field.value) {
            (pdfField as any).setText?.(field.value);
          } else if (field.type === 'checkbox') {
            if (field.value === 'true') {
              (pdfField as any).check?.();
            } else {
              (pdfField as any).uncheck?.();
            }
          } else if (field.type === 'radio' || field.type === 'dropdown') {
            (pdfField as any).select?.(field.value);
          }
        } catch {
          // Field filling failed, continue
        }
      });

      // Add annotations
      const font = await pdf.embedFont(StandardFonts.Helvetica);

      annotations.forEach(annotation => {
        try {
          const page = pdf.getPage(annotation.page);
          const { height } = page.getSize();

          // Convert hex color to RGB
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
          };

          page.drawText(annotation.text, {
            x: annotation.x,
            y: height - annotation.y, // PDF coordinates are bottom-up
            size: annotation.fontSize,
            font,
            color: hexToRgb(annotation.color),
          });
        } catch {
          // Annotation drawing failed, continue
        }
      });

      // Add signatures
      for (const signature of signatures) {
        try {
          const page = pdf.getPage(signature.page);
          const { height } = page.getSize();

          // Convert base64 image to bytes
          const imageBytes = Uint8Array.from(
            atob(signature.data.split(',')[1]),
            c => c.charCodeAt(0)
          );

          let image;
          if (signature.data.startsWith('data:image/png')) {
            image = await pdf.embedPng(imageBytes);
          } else {
            image = await pdf.embedJpg(imageBytes);
          }

          page.drawImage(image, {
            x: signature.x,
            y: height - signature.y - signature.height,
            width: signature.width,
            height: signature.height,
          });
        } catch {
          // Signature drawing failed, continue
        }
      }

      // Flatten form (make fields non-editable)
      try {
        form.flatten();
      } catch {
        // Flattening not supported or failed
      }

      const filledPdfBytes = await pdf.save();
      const blob = new Blob([new Uint8Array(filledPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Download
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFileName.replace('.pdf', '_filled.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to fill PDF. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPdfFile(null);
    setPdfFileName('');
    setPdfDoc(null);
    setFormFields([]);
    setAnnotations([]);
    setSignatures([]);
    setCurrentPage(0);
    setTotalPages(0);
    setError(null);
  };

  // Initialize signature canvas
  useEffect(() => {
    if (showSignatureModal && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      canvas.width = 500;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showSignatureModal]);

  return (
    <div className="max-w-5xl mx-auto">
      {!pdfFile ? (
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

            <div className="text-5xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop PDF here or click to browse
            </h3>
            <p className="text-slate-400 text-sm">
              Fill forms, add signatures, and annotate PDFs
            </p>
          </div>

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
            HIPAA-safe: Your documents never leave your browser. All processing happens locally.
          </p>
        </>
      ) : (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              {/* Tool modes */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setToolMode('form')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    toolMode === 'form'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📝 Form
                </button>
                <button
                  onClick={() => setToolMode('text')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    toolMode === 'text'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  T Text
                </button>
                <button
                  onClick={() => setToolMode('signature')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    toolMode === 'signature'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ✍️ Sign
                </button>
                <button
                  onClick={() => setToolMode('date')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    toolMode === 'date'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📅 Date
                </button>
                <button
                  onClick={() => setToolMode('checkbox')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    toolMode === 'checkbox'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ☑️ Check
                </button>
              </div>

              {/* Format controls */}
              {(toolMode === 'text' || toolMode === 'date' || toolMode === 'checkbox') && (
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    Size:
                    <input
                      type="number"
                      min="8"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    Color:
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* Actions */}
              <button
                onClick={reset}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all"
              >
                ← New PDF
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: PDF Preview */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">PDF Preview</h3>

              <div
                className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800 cursor-crosshair"
                onClick={toolMode !== 'form' ? handleCanvasClick : undefined}
              >
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-auto"
                />
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="text-slate-300 text-sm">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* Right: Form Fields & Annotations */}
            <div className="space-y-4">
              {/* Form Fields */}
              {formFields.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Form Fields</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {formFields.map((field, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-sm text-slate-400 block">
                          {field.name}
                        </label>
                        {field.type === 'text' ? (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                          />
                        ) : field.type === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={field.value === 'true'}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked ? 'true' : 'false')}
                            className="w-5 h-5"
                          />
                        ) : (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Annotations List */}
              {annotations.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Annotations</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {annotations.map((ann) => (
                      <div key={ann.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                        <span className="text-sm text-slate-300 truncate flex-1">
                          {ann.text}
                        </span>
                        <button
                          onClick={() => removeAnnotation(ann.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signatures List */}
              {signatures.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Signatures</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {signatures.map((sig) => (
                      <div key={sig.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <img src={sig.data} alt="Signature" className="h-8 border border-slate-600 rounded" />
                          <span className="text-sm text-slate-300">
                            {sig.type} signature
                          </span>
                        </div>
                        <button
                          onClick={() => removeSignature(sig.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="glass-card p-4 bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-sm text-emerald-300">
                  <strong>Tip:</strong> {
                    toolMode === 'form' ? 'Fill out the form fields above' :
                    toolMode === 'text' ? 'Click anywhere on the PDF to add text' :
                    toolMode === 'signature' ? 'Click on the PDF to place your signature' :
                    toolMode === 'date' ? 'Click to add today\'s date' :
                    'Click to add a checkmark'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={fillAndDownload}
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
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Flatten & Download PDF</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="glass-card max-w-2xl w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Add Signature</h3>

            {/* Signature mode tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSignatureMode('draw')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  signatureMode === 'draw'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ✏️ Draw
              </button>
              <button
                onClick={() => setSignatureMode('text')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  signatureMode === 'text'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                T Type
              </button>
              <button
                onClick={() => signatureImageInputRef.current?.click()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all"
              >
                🖼️ Upload Image
              </button>
              <input
                ref={signatureImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureImageUpload}
                className="hidden"
              />
            </div>

            {/* Signature input area */}
            {signatureMode === 'draw' ? (
              <div className="border border-slate-600 rounded-lg overflow-hidden bg-white mb-4">
                <canvas
                  ref={signatureCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="w-full cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />
              </div>
            ) : (
              <div className="mb-4">
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type your signature..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white text-2xl font-serif"
                  style={{ fontFamily: '"Brush Script MT", cursive' }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={clearSignature}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  clearSignature();
                }}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
              >
                Add to PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
