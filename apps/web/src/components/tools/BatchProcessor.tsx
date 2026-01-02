import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BatchQueue,
  type BatchItem,
  type BatchQueueStatus,
  createBatchZip,
  downloadBatchZip,
  formatDuration,
  estimateRemainingTime,
} from '../../lib/batch';
import { announce, haptic, createProgressAnnouncer } from '../../lib/accessibility';

/**
 * Props for individual file item in the batch
 */
export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

/**
 * Result of processing a single file
 */
export interface BatchProcessResult {
  blob: Blob;
  filename: string;
  originalSize: number;
  processedSize: number;
}

/**
 * Props for BatchProcessor component
 */
export interface BatchProcessorProps {
  /** Files to process */
  files: BatchFileItem[];
  /** Function to process a single file */
  processor: (file: File, signal: AbortSignal) => Promise<{ blob: Blob; filename: string }>;
  /** Called when processing is complete */
  onComplete?: (results: BatchProcessResult[]) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Called when files are cleared */
  onClear?: () => void;
  /** Maximum concurrent operations (default: 2) */
  concurrency?: number;
  /** Label for the process button */
  processButtonLabel?: string;
  /** Label for the download button */
  downloadButtonLabel?: string;
  /** ZIP filename for batch download */
  zipFilename?: string;
  /** Whether to show individual download buttons */
  showIndividualDownloads?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Internal state for a batch item with processing info
 */
interface BatchItemState extends BatchFileItem {
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  result?: BatchProcessResult;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculate percentage reduction
 */
function calculateReduction(original: number, processed: number): string {
  const reduction = ((original - processed) / original) * 100;
  if (reduction > 0) return `-${reduction.toFixed(1)}%`;
  if (reduction < 0) return `+${Math.abs(reduction).toFixed(1)}%`;
  return '0%';
}

/**
 * BatchProcessor Component
 *
 * A reusable component for batch processing files with:
 * - Queue management with configurable concurrency
 * - Progress indicator per file
 * - Overall progress bar
 * - Parallel processing
 * - Download all as ZIP
 * - Error handling per file (continue on error)
 * - Cancel/pause functionality
 *
 * @example
 * <BatchProcessor
 *   files={selectedFiles}
 *   processor={async (file, signal) => {
 *     const compressed = await compressPDF(file);
 *     return { blob: compressed, filename: `${file.name}_compressed.pdf` };
 *   }}
 *   onComplete={(results) => console.log('Done!', results)}
 *   concurrency={3}
 *   zipFilename="compressed_pdfs.zip"
 * />
 */
export default function BatchProcessor({
  files,
  processor,
  onComplete,
  onError,
  onClear,
  concurrency = 2,
  processButtonLabel = 'Process All',
  downloadButtonLabel = 'Download All (ZIP)',
  zipFilename = 'batch_download.zip',
  showIndividualDownloads = true,
  className = '',
}: BatchProcessorProps) {
  const [items, setItems] = useState<BatchItemState[]>([]);
  const [queueStatus, setQueueStatus] = useState<BatchQueueStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCreatingZip, setIsCreatingZip] = useState(false);

  const queueRef = useRef<BatchQueue<BatchFileItem, BatchProcessResult> | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize items from files prop
  useEffect(() => {
    const newItems: BatchItemState[] = files.map(f => ({
      ...f,
      status: 'pending',
      progress: 0,
    }));
    setItems(newItems);
    setQueueStatus('idle');
    setElapsedTime(0);
  }, [files]);

  // Timer for elapsed time
  useEffect(() => {
    if (queueStatus === 'processing') {
      startTimeRef.current = Date.now() - elapsedTime;
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [queueStatus]);

  // Update a single item's state
  const updateItem = useCallback((id: string, updates: Partial<BatchItemState>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Start processing
  const startProcessing = useCallback(async () => {
    if (items.length === 0) return;

    const announcer = createProgressAnnouncer('Batch processing');

    // Reset all items to pending
    setItems(prev => prev.map(item => ({
      ...item,
      status: 'pending',
      progress: 0,
      error: undefined,
      result: undefined,
    })));

    // Create new queue
    const queue = new BatchQueue<BatchFileItem, BatchProcessResult>({
      concurrency,
      continueOnError: true,
      onItemStart: (item) => {
        updateItem(item.id, { status: 'processing', progress: 0 });
      },
      onItemComplete: (item) => {
        const batchItem = item as BatchItem<BatchFileItem, BatchProcessResult>;
        if (batchItem.status === 'completed' && batchItem.result) {
          updateItem(item.id, {
            status: 'completed',
            progress: 100,
            result: batchItem.result,
          });
        } else if (batchItem.status === 'error') {
          updateItem(item.id, {
            status: 'error',
            progress: 0,
            error: batchItem.error || 'Processing failed',
          });
        } else if (batchItem.status === 'cancelled') {
          updateItem(item.id, { status: 'cancelled', progress: 0 });
        }
      },
      onProgress: (completed, total) => {
        const percent = Math.round((completed / total) * 100);
        announcer.update(percent);
      },
    });

    queueRef.current = queue;

    // Add all items to queue
    items.forEach(item => {
      queue.add({
        id: item.id,
        data: { id: item.id, file: item.file, name: item.name, size: item.size },
        name: item.name,
      });
    });

    setQueueStatus('processing');
    setElapsedTime(0);

    try {
      const result = await queue.process(async (data, _item, signal) => {
        const { blob, filename } = await processor(data.file, signal);
        return {
          blob,
          filename,
          originalSize: data.size,
          processedSize: blob.size,
        };
      });

      setQueueStatus(result.cancelled > 0 ? 'cancelled' : 'completed');

      if (result.failed > 0) {
        onError?.(`${result.failed} file(s) failed to process`);
        haptic.warning();
      } else if (result.cancelled === 0) {
        announcer.complete();
        const successItems = items.filter(i =>
          result.items.find(ri => ri.id === i.id && ri.status === 'completed')
        );
        onComplete?.(successItems.map(i => i.result!).filter(Boolean));
      }
    } catch (err) {
      setQueueStatus('idle');
      onError?.(err instanceof Error ? err.message : 'Processing failed');
      haptic.error();
    }
  }, [items, concurrency, processor, updateItem, onComplete, onError]);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    queueRef.current?.cancel();
    setQueueStatus('cancelled');
    announce('Batch processing cancelled', 'assertive');
    haptic.warning();
  }, []);

  // Pause processing
  const pauseProcessing = useCallback(() => {
    queueRef.current?.pause();
    setQueueStatus('paused');
    announce('Batch processing paused');
    haptic.tap();
  }, []);

  // Download single file
  const downloadSingle = useCallback((item: BatchItemState) => {
    if (!item.result) return;

    const url = URL.createObjectURL(item.result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    haptic.tap();
  }, []);

  // Download all as ZIP
  const downloadAllAsZip = useCallback(async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.result);

    if (completedItems.length === 0) {
      onError?.('No files to download');
      return;
    }

    // If only one file, download directly
    if (completedItems.length === 1) {
      downloadSingle(completedItems[0]);
      return;
    }

    setIsCreatingZip(true);
    announce('Creating ZIP file');

    try {
      const zipItems = completedItems.map(item => ({
        name: item.result!.filename,
        blob: item.result!.blob,
      }));

      const zipBlob = await createBatchZip(zipItems);
      downloadBatchZip(zipBlob, zipFilename);
      announce('ZIP download started');
      haptic.success();
    } catch (err) {
      onError?.('Failed to create ZIP file');
      haptic.error();
    } finally {
      setIsCreatingZip(false);
    }
  }, [items, zipFilename, downloadSingle, onError]);

  // Clear all
  const handleClear = useCallback(() => {
    if (queueStatus === 'processing') {
      cancelProcessing();
    }
    setItems([]);
    setQueueStatus('idle');
    setElapsedTime(0);
    onClear?.();
    announce('All files cleared');
    haptic.tap();
  }, [queueStatus, cancelProcessing, onClear]);

  // Calculate statistics
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    processing: items.filter(i => i.status === 'processing').length,
    completed: items.filter(i => i.status === 'completed').length,
    error: items.filter(i => i.status === 'error').length,
    cancelled: items.filter(i => i.status === 'cancelled').length,
  };

  const overallProgress = stats.total > 0
    ? Math.round(((stats.completed + stats.error) / stats.total) * 100)
    : 0;

  const estimatedRemaining = estimateRemainingTime(
    stats.completed + stats.error,
    stats.total,
    elapsedTime
  );

  const totalOriginalSize = items.reduce((sum, i) => sum + i.size, 0);
  const totalProcessedSize = items
    .filter(i => i.result)
    .reduce((sum, i) => sum + (i.result?.processedSize || 0), 0);

  const hasCompletedItems = stats.completed > 0;
  const isProcessing = queueStatus === 'processing';
  const isPaused = queueStatus === 'paused';
  const canProcess = stats.pending > 0 && !isProcessing && !isPaused;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`batch-processor ${className}`}>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-400">
          {stats.total} file{stats.total !== 1 ? 's' : ''} in queue
        </h4>
        <button
          onClick={handleClear}
          disabled={isProcessing}
          className="text-sm text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
          aria-label="Clear all files"
        >
          Clear all
        </button>
      </div>

      {/* Overall progress bar */}
      {(isProcessing || isPaused || hasCompletedItems) && (
        <div className="mb-4 glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Overall Progress: {stats.completed + stats.error}/{stats.total}
            </span>
            <span className="text-sm text-slate-400">
              {formatDuration(elapsedTime)}
              {isProcessing && estimatedRemaining > 0 && (
                <span className="text-slate-400">
                  {' '}(~{formatDuration(estimatedRemaining)} remaining)
                </span>
              )}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
              role="progressbar"
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall batch progress"
            />
          </div>

          {/* Size stats */}
          {hasCompletedItems && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                {formatFileSize(totalOriginalSize)} total input
              </span>
              {totalProcessedSize > 0 && (
                <span className={totalProcessedSize < totalOriginalSize ? 'text-green-400' : 'text-yellow-400'}>
                  {formatFileSize(totalProcessedSize)} output
                  ({calculateReduction(totalOriginalSize, totalProcessedSize)})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* File list */}
      <div
        className="space-y-2 max-h-80 overflow-y-auto"
        role="list"
        aria-label="Batch processing queue"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="listitem"
            className="glass-card p-3 flex items-center gap-3"
          >
            {/* Status indicator */}
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
              {item.status === 'pending' && (
                <div className="w-2 h-2 rounded-full bg-slate-500" aria-label="Pending" />
              )}
              {item.status === 'processing' && (
                <svg
                  className="w-5 h-5 text-indigo-400 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-label="Processing"
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
              )}
              {item.status === 'completed' && (
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-label="Completed"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {item.status === 'error' && (
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-label="Error"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {item.status === 'cancelled' && (
                <svg
                  className="w-5 h-5 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-label="Cancelled"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{item.name}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">{formatFileSize(item.size)}</span>
                {item.status === 'completed' && item.result && (
                  <>
                    <svg
                      className="w-3 h-3 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                    <span className="text-white">
                      {formatFileSize(item.result.processedSize)}
                    </span>
                    <span
                      className={
                        item.result.processedSize < item.size
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }
                    >
                      ({calculateReduction(item.size, item.result.processedSize)})
                    </span>
                  </>
                )}
                {item.status === 'error' && (
                  <span className="text-red-400">{item.error}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {showIndividualDownloads && item.status === 'completed' && item.result && (
              <button
                onClick={() => downloadSingle(item)}
                className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                title="Download"
                aria-label={`Download ${item.name}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        {/* Process / Cancel / Pause buttons */}
        {canProcess && (
          <button
            onClick={startProcessing}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
            aria-label={processButtonLabel}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{processButtonLabel}</span>
          </button>
        )}

        {isProcessing && (
          <>
            <button
              onClick={pauseProcessing}
              className="flex-1 btn-primary bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center gap-2"
              aria-label="Pause processing"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Pause</span>
            </button>
            <button
              onClick={cancelProcessing}
              className="flex-1 btn-primary bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center gap-2"
              aria-label="Cancel processing"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Cancel</span>
            </button>
          </>
        )}

        {isPaused && (
          <button
            onClick={startProcessing}
            className="flex-1 btn-primary bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center gap-2"
            aria-label="Resume processing"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Resume</span>
          </button>
        )}

        {/* Download button */}
        {hasCompletedItems && !isProcessing && !isPaused && (
          <button
            onClick={downloadAllAsZip}
            disabled={isCreatingZip}
            className="flex-1 btn-primary bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
            aria-label={downloadButtonLabel}
          >
            {isCreatingZip ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
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
                <span>Creating ZIP...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <span>{downloadButtonLabel}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
