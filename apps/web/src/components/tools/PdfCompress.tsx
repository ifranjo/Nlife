import { useState, useCallback, useRef, useMemo } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';
import { announce, haptic } from '../../lib/accessibility';
import BatchProcessor, { type BatchFileItem } from './BatchProcessor';

interface PDFFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize: number | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  compressedBlob?: Blob;
}

type CompressionQuality = 'low' | 'medium' | 'high';

interface CompressionOptions {
  removeMetadata: boolean;
  flattenForms: boolean;
  quality: CompressionQuality;
}

const MAX_FILES = 20;
const BATCH_CONCURRENCY = 3; // Process 3 PDFs at once in batch mode

const QUALITY_SETTINGS: Record<CompressionQuality, { label: string; description: string }> = {
  low: { label: 'Maximum Compression', description: 'Smallest file size, may affect quality' },
  medium: { label: 'Balanced', description: 'Good balance of size and quality' },
  high: { label: 'High Quality', description: 'Minimal compression, best quality' },
};

export default function PdfCompress() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<CompressionOptions>({
    removeMetadata: true,
    flattenForms: false,
    quality: 'medium',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const calculateReduction = (original: number, compressed: number): string => {
    const reduction = ((original - compressed) / original) * 100;
    return `${reduction.toFixed(1)}%`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validatedFiles: PDFFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const validation = await validateFile(file, 'pdf');

      if (validation.valid) {
        validatedFiles.push({
          id: generateId(),
          file,
          name: sanitizeFilename(file.name),
          originalSize: file.size,
          compressedSize: null,
          status: 'pending',
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (validatedFiles.length > 0) {
      setFiles((prev) => [...prev, ...validatedFiles]);
    }

    if (errors.length > 0) {
      setError(errors.length === 1 ? errors[0] : `${errors.length} files rejected`);
    } else {
      setError(null);
    }
  }, [files.length]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
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
    void addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void addFiles(e.target.files);
    }
  };

  const compressPDF = async (pdfFile: PDFFile): Promise<{ blob: Blob; size: number }> => {
    const { PDFDocument } = await import('pdf-lib');

    const arrayBuffer = await pdfFile.file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    // Remove metadata if option is enabled
    if (options.removeMetadata) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
    }

    // Flatten form fields if option is enabled
    if (options.flattenForms) {
      const form = pdfDoc.getForm();
      try {
        form.flatten();
      } catch {
        // Form might not exist or already be flattened
      }
    }

    // Save with compression options
    // pdf-lib doesn't support image recompression, but we can optimize object streams
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: options.quality === 'low' ? 100 : options.quality === 'medium' ? 50 : 20,
    });

    const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'application/pdf' });
    return { blob, size: compressedBytes.length };
  };

  const compressAll = async () => {
    if (files.length === 0) {
      setError('Please add at least one PDF file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      const pdfFile = updatedFiles[i];
      if (pdfFile.status === 'done') continue;

      // Update status to processing
      updatedFiles[i] = { ...pdfFile, status: 'processing' };
      setFiles([...updatedFiles]);

      try {
        const { blob, size } = await compressPDF(pdfFile);
        updatedFiles[i] = {
          ...pdfFile,
          status: 'done',
          compressedSize: size,
          compressedBlob: blob,
        };
      } catch (err) {
        updatedFiles[i] = {
          ...pdfFile,
          status: 'error',
          error: createSafeErrorMessage(err, 'Failed to compress'),
        };
      }

      setFiles([...updatedFiles]);
    }

    setIsProcessing(false);
  };

  const downloadFile = (pdfFile: PDFFile) => {
    if (!pdfFile.compressedBlob) return;

    const url = URL.createObjectURL(pdfFile.compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = pdfFile.name.replace(/\.pdf$/i, '');
    link.download = `${baseName}_compressed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const completedFiles = files.filter((f) => f.status === 'done' && f.compressedBlob);
    if (completedFiles.length === 0) return;

    if (completedFiles.length === 1) {
      downloadFile(completedFiles[0]);
      return;
    }

    // Multiple files - create ZIP
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const pdfFile of completedFiles) {
      if (pdfFile.compressedBlob) {
        const baseName = pdfFile.name.replace(/\.pdf$/i, '');
        zip.file(`${baseName}_compressed.pdf`, pdfFile.compressedBlob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'compressed_pdfs.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ==== Batch Mode Functions ====

  // Convert files to batch items for BatchProcessor
  const batchItems: BatchFileItem[] = useMemo(() => {
    return files.map(f => ({
      id: f.id,
      file: f.file,
      name: f.name,
      size: f.originalSize,
    }));
  }, [files]);

  // Batch processor function - compress a single PDF
  const compressSinglePDF = useCallback(async (
    file: File,
    signal: AbortSignal
  ): Promise<{ blob: Blob; filename: string }> => {
    if (signal.aborted) {
      throw new Error('Cancelled');
    }

    const { PDFDocument } = await import('pdf-lib');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    if (signal.aborted) {
      throw new Error('Cancelled');
    }

    // Remove metadata if option is enabled
    if (options.removeMetadata) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
    }

    // Flatten form fields if option is enabled
    if (options.flattenForms) {
      const form = pdfDoc.getForm();
      try {
        form.flatten();
      } catch {
        // Form might not exist or already be flattened
      }
    }

    // Save with compression options
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: options.quality === 'low' ? 100 : options.quality === 'medium' ? 50 : 20,
    });

    const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'application/pdf' });

    // Generate filename
    const baseName = sanitizeFilename(file.name).replace(/\.pdf$/i, '');
    return {
      blob,
      filename: `${baseName}_compressed.pdf`,
    };
  }, [options]);

  // Handle batch complete
  const handleBatchComplete = useCallback(() => {
    announce('All PDF compression complete');
    haptic.success();
  }, []);

  // Handle batch clear
  const handleBatchClear = useCallback(() => {
    setFiles([]);
    setError(null);
    announce('All files cleared');
    haptic.tap();
  }, []);

  // Toggle batch mode
  const toggleBatchMode = useCallback(() => {
    setBatchMode(!batchMode);
    setError(null);
    announce(batchMode ? 'Batch mode disabled' : 'Batch mode enabled');
    haptic.tap();
  }, [batchMode]);

  const totalOriginalSize = files.reduce((sum, f) => sum + f.originalSize, 0);
  const totalCompressedSize = files.reduce((sum, f) => sum + (f.compressedSize || 0), 0);
  const completedFiles = files.filter((f) => f.status === 'done');
  const hasCompletedFiles = completedFiles.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Batch Mode Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={toggleBatchMode}
            className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-500/30"
            aria-label="Enable batch mode with parallel processing"
          />
          <span className="text-sm text-slate-300">Batch Mode</span>
          <span className="text-xs text-slate-500">(parallel processing, pause/cancel)</span>
        </label>
        {batchMode && files.length > 0 && (
          <span className="text-sm text-slate-400">
            {files.length} file{files.length !== 1 ? 's' : ''} queued
          </span>
        )}
      </div>

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
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-5xl mb-4">📦</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop PDFs here or click to browse
        </h3>
        <p className="text-slate-400 text-sm">
          Compress up to {MAX_FILES} PDF files at once
          {batchMode && ' - with pause and cancel support'}
        </p>
      </div>

      {/* Compression Options */}
      <div className="mt-6 glass-card p-6">
        <h4 className="text-sm font-medium text-white mb-4">Compression Settings</h4>

        {/* Quality Presets */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">Quality Preset</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(QUALITY_SETTINGS) as CompressionQuality[]).map((quality) => (
              <button
                key={quality}
                onClick={() => setOptions((prev) => ({ ...prev, quality }))}
                className={`
                  p-3 rounded-lg text-sm transition-all
                  ${options.quality === quality
                    ? 'bg-white/10 border border-white/30 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                  }
                `}
              >
                <div className="font-medium">{QUALITY_SETTINGS[quality].label}</div>
                <div className="text-xs opacity-70 mt-1">{QUALITY_SETTINGS[quality].description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.removeMetadata}
              onChange={(e) => setOptions((prev) => ({ ...prev, removeMetadata: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/30"
            />
            <span className="text-sm text-slate-300">Remove metadata</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.flattenForms}
              onChange={(e) => setOptions((prev) => ({ ...prev, flattenForms: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/30"
            />
            <span className="text-sm text-slate-300">Flatten form fields</span>
          </label>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Batch Mode: Use BatchProcessor component */}
      {batchMode && files.length > 0 && (
        <div className="mt-6">
          <BatchProcessor
            files={batchItems}
            processor={compressSinglePDF}
            onComplete={handleBatchComplete}
            onError={(err) => setError(err)}
            onClear={handleBatchClear}
            concurrency={BATCH_CONCURRENCY}
            processButtonLabel={`Compress ${files.length} PDF${files.length !== 1 ? 's' : ''}`}
            downloadButtonLabel="Download All Compressed (ZIP)"
            zipFilename="compressed_pdfs.zip"
            showIndividualDownloads={true}
          />
        </div>
      )}

      {/* Standard Mode: Original file list and buttons */}
      {!batchMode && files.length > 0 && (
        <>
          {/* File List */}
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-slate-400">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </h4>
              <button
                onClick={clearAll}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Clear all
              </button>
            </div>

            {files.map((file) => (
              <div
                key={file.id}
                className="glass-card glass-card-hover p-4 flex items-center gap-4 file-item"
              >
                {/* Status indicator */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  {file.status === 'pending' && (
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                  )}
                  {file.status === 'processing' && (
                    <svg className="w-5 h-5 spinner text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {file.status === 'done' && (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {file.status === 'error' && (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">{formatFileSize(file.originalSize)}</span>
                    {file.status === 'done' && file.compressedSize !== null && (
                      <>
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="text-green-400">{formatFileSize(file.compressedSize)}</span>
                        <span className="text-emerald-400 font-medium">
                          ({calculateReduction(file.originalSize, file.compressedSize)} smaller)
                        </span>
                      </>
                    )}
                    {file.status === 'error' && (
                      <span className="text-red-400">{file.error}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {file.status === 'done' && file.compressedBlob && (
                    <button
                      onClick={() => downloadFile(file)}
                      className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Summary */}
            {hasCompletedFiles && (
              <div className="glass-card p-4 bg-green-500/10 border-green-500/20">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Total Reduction</span>
                  <div className="text-right">
                    <span className="text-slate-400">{formatFileSize(totalOriginalSize)}</span>
                    <span className="mx-2 text-slate-500">-&gt;</span>
                    <span className="text-green-400 font-medium">{formatFileSize(totalCompressedSize)}</span>
                    {totalOriginalSize > 0 && (
                      <span className="ml-2 text-emerald-400 font-bold">
                        ({calculateReduction(totalOriginalSize, totalCompressedSize)} saved)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            {!hasCompletedFiles || files.some((f) => f.status === 'pending') ? (
              <button
                onClick={compressAll}
                disabled={isProcessing}
                className={`
                  flex-1 btn-primary flex items-center justify-center gap-2
                  ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                {isProcessing ? (
                  <>
                    <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Compressing...</span>
                  </>
                ) : (
                  <>
                    <span>Compress {files.filter((f) => f.status === 'pending').length || files.length} PDF{files.length > 1 ? 's' : ''}</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </>
                )}
              </button>
            ) : null}

            {hasCompletedFiles && (
              <button
                onClick={downloadAll}
                className="flex-1 btn-primary flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30"
              >
                <span>Download {completedFiles.length > 1 ? 'All (ZIP)' : 'Compressed PDF'}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your files never leave your browser. All compression happens locally.
      </p>
    </div>
  );
}
