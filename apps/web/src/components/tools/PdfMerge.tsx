import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';
import { announce, haptic } from '../../lib/accessibility';
import SwipeableListItem from '../ui/SwipeableListItem';
import { ContextMenuIcons, type ContextMenuItem } from '../ui/ContextMenu';

interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

const MAX_FILES = 50; // Limit number of files to prevent DoS

export default function PdfMerge() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0); // For roving tabindex
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);
  const errorId = 'pdf-merge-error'; // Stable ID for aria-describedby

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Check max files limit
    if (files.length + fileArray.length > MAX_FILES) {
      const errorMsg = `Maximum ${MAX_FILES} files allowed`;
      setError(errorMsg);
      announce(errorMsg, 'assertive');
      haptic.error();
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
          size: formatFileSize(file.size),
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (validatedFiles.length > 0) {
      setFiles((prev) => [...prev, ...validatedFiles]);
      announce(`${validatedFiles.length} file${validatedFiles.length > 1 ? 's' : ''} added`);
      haptic.tap();
    }

    if (errors.length > 0) {
      const errorMsg = errors.length === 1 ? errors[0] : `${errors.length} files rejected`;
      setError(errorMsg);
      announce(errorMsg, 'assertive');
      haptic.error();
    } else {
      setError(null);
    }
  }, [files.length]);

  const removeFile = useCallback((id: string, fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    announce(`${fileName} removed`);
    haptic.tap();
  }, []);

  const moveFile = useCallback((index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newFiles.length) return prev;
      [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
      setActiveFileIndex(newIndex);
      announce(`Moved to position ${newIndex + 1}`);
      haptic.tap();
      return newFiles;
    });
  }, []);

  // Generate context menu items for a file at a specific index
  const getContextMenuItems = useCallback((fileId: string, fileName: string, index: number, totalFiles: number): ContextMenuItem[] => {
    return [
      {
        id: 'move-up',
        label: 'Move Up',
        icon: <ContextMenuIcons.MoveUp />,
        disabled: index === 0,
        onClick: () => moveFile(index, 'up'),
      },
      {
        id: 'move-down',
        label: 'Move Down',
        icon: <ContextMenuIcons.MoveDown />,
        disabled: index === totalFiles - 1,
        onClick: () => moveFile(index, 'down'),
      },
      {
        id: 'remove',
        label: 'Remove',
        icon: <ContextMenuIcons.Remove />,
        danger: true,
        onClick: () => removeFile(fileId, fileName),
      },
    ];
  }, [moveFile, removeFile]);

  // Keyboard navigation for file list (roving tabindex pattern)
  const handleFileKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < files.length - 1) {
          setActiveFileIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setActiveFileIndex(index - 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveFileIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveFileIndex(files.length - 1);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        removeFile(files[index].id, files[index].name);
        break;
    }
  };

  // Focus active file when activeFileIndex changes
  useEffect(() => {
    if (fileListRef.current && files.length > 0) {
      const activeItem = fileListRef.current.querySelector(`[data-index="${activeFileIndex}"]`) as HTMLElement;
      activeItem?.focus();
    }
  }, [activeFileIndex, files.length]);

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

  const mergePDFs = async () => {
    if (files.length < 2) {
      const errorMsg = 'Please add at least 2 PDF files to merge';
      setError(errorMsg);
      announce(errorMsg, 'assertive');
      haptic.error();
      return;
    }

    setIsProcessing(true);
    setError(null);
    announce(`Merging ${files.length} PDF files`);

    try {
      // Dynamic import of pdf-lib
      const { PDFDocument } = await import('pdf-lib');

      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Download
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Clear files after successful merge
      setFiles([]);
      announce('PDF merge complete. Download started.');
      haptic.success();
    } catch (err) {
      const errorMsg = createSafeErrorMessage(err, 'Failed to merge PDFs. Please try again.');
      setError(errorMsg);
      announce(errorMsg, 'assertive');
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF files. Drop files here or press Enter to browse."
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
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
          aria-label="Select PDF files to merge"
        />

        <div className="text-5xl mb-4" aria-hidden="true">📄</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Drop PDFs here or click to browse
        </h3>
        <p className="text-slate-400 text-sm">
          Supports multiple PDF files. Drag to reorder.
        </p>
      </div>

      {/* Error message - WCAG: role="alert" for immediate announcement */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm error-state"
        >
          <span aria-hidden="true">⚠️ </span>
          {error}
        </div>
      )}

      {/* File List - Roving tabindex for keyboard navigation */}
      {files.length > 0 && (
        <div
          ref={fileListRef}
          role="list"
          aria-label={`${files.length} PDF files selected. Use arrow keys to navigate, Delete to remove.`}
          className="mt-6 space-y-3"
        >
          <h4 className="text-sm font-medium text-slate-400 mb-3">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </h4>

          {files.map((file, index) => (
            <SwipeableListItem
              key={file.id}
              onDelete={() => removeFile(file.id, file.name)}
              itemName={file.name}
              disabled={isProcessing}
              className="glass-card glass-card-hover rounded-xl file-item focus-within:ring-2 focus-within:ring-white/50"
              role="listitem"
              tabIndex={index === activeFileIndex ? 0 : -1}
              data-index={index}
              onKeyDown={(e) => handleFileKeyDown(e, index)}
              aria-label={`${file.name}, ${file.size}, position ${index + 1} of ${files.length}. Swipe left to delete.`}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Order controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${file.name} up`}
                    className="p-1 text-slate-400 hover:text-white hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === files.length - 1}
                    aria-label={`Move ${file.name} down`}
                    className="p-1 text-slate-400 hover:text-white hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-slate-400 text-sm">{file.size}</p>
                </div>

                {/* Spacer for delete button area (handled by SwipeableListItem) */}
                <div className="w-8" aria-hidden="true" />
              </div>
            </SwipeableListItem>
          ))}
        </div>
      )}

      {/* Merge Button */}
      {files.length >= 2 && (
        <button
          onClick={mergePDFs}
          disabled={isProcessing}
          aria-busy={isProcessing}
          aria-label={isProcessing ? `Merging ${files.length} PDF files` : `Merge ${files.length} PDF files`}
          className={`
            mt-6 w-full btn-primary flex items-center justify-center gap-2
            ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
          `}
        >
          {isProcessing ? (
            <>
              <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Merging...</span>
            </>
          ) : (
            <>
              <span>Merge {files.length} PDFs</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </>
          )}
        </button>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-slate-500 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your files never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
