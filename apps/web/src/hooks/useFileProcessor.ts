/**
 * useFileProcessor - Generic hook for file processing operations
 *
 * This hook abstracts common patterns found across 36/52 tool components:
 * - File validation with lib/security.ts
 * - Drag and drop handling
 * - Processing state management
 * - Error handling with sanitized messages
 * - Download functionality
 * - Progress tracking
 *
 * @example
 * ```tsx
 * // Image compression example
 * const { state, handlers, utils } = useFileProcessor<ImageFile>({
 *   fileCategory: 'image',
 *   maxFiles: 20,
 *   processor: async (file) => {
 *     const blob = await compressImage(file);
 *     return { blob, filename: file.name };
 *   },
 * });
 * ```
 *
 * @example
 * // PDF merge example (multi-file input)
 * const { state, handlers } = useFileProcessor<PDFFile>({
 *   fileCategory: 'pdf',
 *   maxFiles: 50,
 *   multiFileProcessor: async (files) => {
 *     const blob = await mergePDFs(files);
 *     return { blob, filename: 'merged.pdf' };
 *   },
 * });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  validateFile,
  validateVideoFile,
  validateAudioFile,
  sanitizeFilename,
  createSafeErrorMessage,
  generateDownloadFilename,
  type FileCategory,
  type ValidationResult,
} from '../lib/security';

/**
 * Standard file processing status
 */
export type ProcessingStatus = 'idle' | 'validating' | 'processing' | 'done' | 'error';

/**
 * Result type for single file processing
 */
export interface ProcessResult<T = unknown> {
  blob: Blob;
  filename?: string;
  metadata?: T;
}

/**
 * Configuration options for the hook
 */
export interface UseFileProcessorOptions<TInput, TResult> {
  /**
   * File category for validation ('pdf', 'image', 'video', 'audio')
   */
  fileCategory: FileCategory | 'video' | 'audio';

  /**
   * Maximum number of files allowed (default: 1)
   */
  maxFiles?: number;

  /**
   * Maximum file size in bytes (optional, overrides category default)
   */
  maxFileSize?: number;

  /**
   * Custom file validation function (optional)
   * If provided, this runs after standard validation
   */
  customValidation?: (file: File) => Promise<ValidationResult>;

  /**
   * Process a single file
   * Use this for tools that process files individually (compress, convert)
   */
  processor?: (file: File, signal?: AbortSignal) => Promise<ProcessResult<TResult>>;

  /**
   * Process multiple files together
   * Use this for tools that combine files (merge, zip)
   */
  multiFileProcessor?: (files: File[], signal?: AbortSignal) => Promise<ProcessResult<TResult>>;

  /**
   * Enable batch processing mode (parallel processing with pause/cancel)
   */
  enableBatchMode?: boolean;

  /**
   * Number of concurrent operations in batch mode (default: 3)
   */
  batchConcurrency?: number;

  /**
   * Callback when processing completes successfully
   */
  onProcessingComplete?: (result: ProcessResult<TResult>) => void;

  /**
   * Callback when processing fails
   */
  onError?: (error: string) => void;

  /**
   * Callback when files are added
   */
  onFilesAdded?: (files: ProcessedFile<TInput>[]) => void;

  /**
   * Whether to auto-start processing after file selection (default: false)
   */
  autoProcess?: boolean;

  /**
   * Custom ID generator (default: random string)
   */
  generateId?: () => string;
}

/**
 * A file being processed or queued
 */
export interface ProcessedFile<TMetadata = unknown> {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  status: ProcessingStatus;
  error?: string;
  result?: ProcessResult<TMetadata>;
  progress?: number; // 0-100
}

/**
 * Drag and drop state
 */
export interface DragDropState {
  isDragging: boolean;
  isDragOver: boolean;
}

/**
 * Complete return type of the hook
 */
export interface UseFileProcessorReturn<TInput, TResult> {
  /**
   * Current state of the processor
   */
  state: {
    files: ProcessedFile<TInput>[];
    status: ProcessingStatus;
    error: string | null;
    progress: number; // Overall progress 0-100
    dragDrop: DragDropState;
    isBatchMode: boolean;
  };

  /**
   * Event handlers for drop zone and file input
   */
  handlers: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onProcess: () => Promise<void>;
    onDownload: (fileOrIndex?: ProcessedFile<TInput> | number) => void;
    onDownloadAll: () => Promise<void>;
    onRemoveFile: (id: string) => void;
    onClearAll: () => void;
    onRetryFile: (id: string) => Promise<void>;
    onToggleBatchMode: () => void;
    onCancelProcessing: () => void;
  };

  /**
   * Utility functions
   */
  utils: {
    formatFileSize: (bytes: number) => string;
    generateId: () => string;
    downloadBlob: (blob: Blob, filename: string) => void;
    createZipDownload: (files: ProcessedFile<TInput>[]) => Promise<void>;
  };

  /**
   * Refs for component integration
   */
  refs: {
    fileInputRef: React.RefObject<HTMLInputElement>;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
  };

  /**
   * Computed values
   */
  computed: {
    hasFiles: boolean;
    hasCompletedFiles: boolean;
    hasErrors: boolean;
    totalFiles: number;
    completedFiles: number;
    processingFiles: number;
    errorFiles: number;
    totalOriginalSize: number;
    totalProcessedSize: number;
  };
}

/**
 * Default file ID generator
 */
const defaultIdGenerator = (): string =>
  Math.random().toString(36).substring(2, 9);

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Download a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Create a ZIP file from multiple processed files and download it
 */
const createZipDownload = async <T,>(
  files: ProcessedFile<T>[],
  zipFilename: string
): Promise<void> => {
  const completedFiles = files.filter((f) => f.status === 'done' && f.result?.blob);

  if (completedFiles.length === 0) {
    throw new Error('No completed files to download');
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const file of completedFiles) {
    if (file.result?.blob) {
      const filename = file.result.filename || sanitizeFilename(file.name);
      zip.file(filename, file.result.blob);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, zipFilename);
};

/**
 * Validate a file based on category
 */
const validateFileByCategory = async (
  file: File,
  category: FileCategory | 'video' | 'audio',
  customValidation?: (file: File) => Promise<ValidationResult>
): Promise<ValidationResult> => {
  // Built-in validation
  if (category === 'video') {
    return validateVideoFile(file);
  }
  if (category === 'audio') {
    return validateAudioFile(file);
  }
  const validation = await validateFile(file, category as FileCategory);
  if (!validation.valid) {
    return validation;
  }

  // Custom validation
  if (customValidation) {
    return customValidation(file);
  }

  return { valid: true };
};

/**
 * Generic hook for file processing operations
 */
export function useFileProcessor<TInput = unknown, TResult = unknown>(
  options: UseFileProcessorOptions<TInput, TResult>
): UseFileProcessorReturn<TInput, TResult> {
  const {
    fileCategory,
    maxFiles = 1,
    maxFileSize,
    customValidation,
    processor,
    multiFileProcessor,
    enableBatchMode = false,
    batchConcurrency = 3,
    onProcessingComplete,
    onError,
    onFilesAdded,
    autoProcess = false,
    generateId = defaultIdGenerator,
  } = options;

  // State
  const [files, setFiles] = useState<ProcessedFile<TInput>[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Computed values
  const hasFiles = files.length > 0;
  const hasCompletedFiles = files.some((f) => f.status === 'done');
  const hasErrors = files.some((f) => f.status === 'error');
  const totalFiles = files.length;
  const completedFiles = files.filter((f) => f.status === 'done').length;
  const processingFiles = files.filter((f) => f.status === 'processing').length;
  const errorFiles = files.filter((f) => f.status === 'error').length;
  const totalOriginalSize = files.reduce((sum, f) => sum + f.originalSize, 0);
  const totalProcessedSize = files.reduce(
    (sum, f) => sum + (f.result?.blob.size || 0),
    0
  );

  // Validate and add new files
  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      // Check max files limit
      if (files.length + fileArray.length > maxFiles) {
        const errorMsg = `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setStatus('validating');
      setError(null);

      const validatedFiles: ProcessedFile<TInput>[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        // Check custom max file size if provided
        if (maxFileSize && file.size > maxFileSize) {
          errors.push(
            `${file.name}: File size exceeds ${formatFileSize(maxFileSize)} limit`
          );
          continue;
        }

        const validation = await validateFileByCategory(file, fileCategory, customValidation);

        if (validation.valid) {
          validatedFiles.push({
            id: generateId(),
            file,
            name: sanitizeFilename(file.name),
            originalSize: file.size,
            status: 'idle',
          });
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      }

      if (validatedFiles.length > 0) {
        setFiles((prev) => [...prev, ...validatedFiles]);
        onFilesAdded?.(validatedFiles);
      }

      if (errors.length > 0) {
        const errorMsg =
          errors.length === 1 ? errors[0] : `${errors.length} files rejected`;
        setError(errorMsg);
        onError?.(errorMsg);
      }

      setStatus('idle');

      // Auto-process if enabled
      if (autoProcess && validatedFiles.length > 0) {
        // Process will be triggered on next tick
        setTimeout(() => {
          void processFiles();
        }, 0);
      }
    },
    [
      files.length,
      maxFiles,
      maxFileSize,
      fileCategory,
      customValidation,
      generateId,
      autoProcess,
      onFilesAdded,
      onError,
    ]
  );

  // Process files (single or multi-file)
  const processFiles = useCallback(async () => {
    if (files.length === 0) {
      setError('No files to process');
      onError?.('No files to process');
      return;
    }

    // Check which processor to use
    const useMultiFile = multiFileProcessor && files.length > 1;

    if (!useMultiFile && !processor) {
      setError('No processor configured');
      onError?.('No processor configured');
      return;
    }

    setStatus('processing');
    setError(null);
    setProgress(0);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (useMultiFile && multiFileProcessor) {
        // Multi-file processor (merge, zip, etc.)
        const result = await multiFileProcessor(
          files.map((f) => f.file),
          signal
        );

        // Update all files as done
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            status: 'done',
            result,
            progress: 100,
          }))
        );

        setProgress(100);
        onProcessingComplete?.(result);
      } else if (processor) {
        // Single file processor - process each file individually
        let completed = 0;

        for (let i = 0; i < files.length; i++) {
          if (signal.aborted) {
            throw new Error('Processing cancelled');
          }

          const file = files[i];

          // Update status to processing
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: 'processing', progress: 0 } : f
            )
          );

          try {
            const result = await processor(file.file, signal);

            setFiles((prev) =>
              prev.map((f) =>
                f.id === file.id
                  ? { ...f, status: 'done', result, progress: 100 }
                  : f
              )
            );

            completed++;
            setProgress(Math.round((completed / files.length) * 100));
          } catch (err) {
            const errorMsg = createSafeErrorMessage(err, 'Processing failed');
            setFiles((prev) =>
              prev.map((f) =>
                f.id === file.id
                  ? { ...f, status: 'error', error: errorMsg }
                  : f
              )
            );
          }
        }

        // Check final status
        setFiles((prev) => {
          const hasErrorsLocal = prev.some((f) => f.status === 'error');
          if (!hasErrorsLocal) {
            onProcessingComplete?.();
          }
          return prev;
        });
      }

      setStatus('done');
    } catch (err) {
      if (signal.aborted) {
        setError('Processing cancelled');
        setStatus('idle');
      } else {
        const errorMsg = createSafeErrorMessage(err, 'Processing failed');
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [files, processor, multiFileProcessor, onProcessingComplete, onError]);

  // Remove a file
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.result?.blob) {
        // Cleanup blob URL if exists
        URL.revokeObjectURL(URL.createObjectURL(file.result.blob));
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    // Cleanup blob URLs
    files.forEach((f) => {
      if (f.result?.blob) {
        URL.revokeObjectURL(URL.createObjectURL(f.result.blob));
      }
    });
    setFiles([]);
    setError(null);
    setStatus('idle');
    setProgress(0);
  }, [files]);

  // Retry a failed file
  const retryFile = useCallback(
    async (id: string) => {
      if (!processor) return;

      const file = files.find((f) => f.id === id);
      if (!file) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'processing', error: undefined } : f
        )
      );

      try {
        const result = await processor(file.file);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'done', result } : f
          )
        );

        // Check if all files are done
        const allDone = files.every((f) => f.status === 'done');
        if (allDone) {
          setStatus('done');
          onProcessingComplete?.();
        }
      } catch (err) {
        const errorMsg = createSafeErrorMessage(err, 'Processing failed');
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'error', error: errorMsg } : f
          )
        );
      }
    },
    [files, processor, onProcessingComplete]
  );

  // Download a single file result
  const downloadFile = useCallback(
    (fileOrIndex?: ProcessedFile<TInput> | number) => {
      let file: ProcessedFile<TInput> | undefined;

      if (typeof fileOrIndex === 'number') {
        file = files[fileOrIndex];
      } else if (fileOrIndex) {
        file = fileOrIndex;
      } else {
        // Download first completed file
        file = files.find((f) => f.status === 'done' && f.result);
      }

      if (!file?.result?.blob) return;

      const filename = file.result.filename || file.name;
      downloadBlob(file.result.blob, filename);
    },
    [files]
  );

  // Download all files as ZIP
  const downloadAll = useCallback(async () => {
    const zipFilename = `${fileCategory}_files_${Date.now()}.zip`;
    await createZipDownload(files, zipFilename);
  }, [files, fileCategory]);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus('idle');
    setProgress(0);
  }, []);

  // Toggle batch mode
  const toggleBatchMode = useCallback(() => {
    if (!enableBatchMode) return;
    setIsBatchMode((prev) => !prev);
  }, [enableBatchMode]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setIsDragOver(false);
      void addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        void addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all blob URLs
      files.forEach((f) => {
        if (f.result?.blob) {
          URL.revokeObjectURL(URL.createObjectURL(f.result.blob));
        }
      });
      // Cancel any ongoing processing
      abortControllerRef.current?.abort();
    };
  }, [files]);

  return {
    state: {
      files,
      status,
      error,
      progress,
      dragDrop: {
        isDragging,
        isDragOver,
      },
      isBatchMode,
    },
    handlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onFileSelect: handleFileSelect,
      onProcess: processFiles,
      onDownload: downloadFile,
      onDownloadAll: downloadAll,
      onRemoveFile: removeFile,
      onClearAll: clearAll,
      onRetryFile: retryFile,
      onToggleBatchMode: toggleBatchMode,
      onCancelProcessing: cancelProcessing,
    },
    utils: {
      formatFileSize,
      generateId,
      downloadBlob,
      createZipDownload: (filesToZip) =>
        createZipDownload(filesToZip, `${fileCategory}_files_${Date.now()}.zip`),
    },
    refs: {
      fileInputRef,
      abortControllerRef,
    },
    computed: {
      hasFiles,
      hasCompletedFiles,
      hasErrors,
      totalFiles,
      completedFiles,
      processingFiles,
      errorFiles,
      totalOriginalSize,
      totalProcessedSize,
    },
  };
}

export default useFileProcessor;
