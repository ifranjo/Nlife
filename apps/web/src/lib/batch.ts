/**
 * Batch Processing Library for New Life Solutions
 * Provides queue management, parallel processing, and ZIP generation
 * for batch file operations across PDF and other tools.
 */

import { sanitizeFilename, createSafeErrorMessage } from './security';

/**
 * Status of an individual item in the batch queue
 */
export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';

/**
 * Represents a single item in the batch processing queue
 */
export interface BatchItem<T = unknown, R = unknown> {
  id: string;
  data: T;
  name: string;
  status: BatchItemStatus;
  progress: number;
  result?: R;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Overall status of the batch processing queue
 */
export type BatchQueueStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'cancelled';

/**
 * Configuration options for the BatchQueue
 */
export interface BatchQueueOptions {
  /** Maximum number of concurrent operations (default: 2) */
  concurrency: number;
  /** Continue processing remaining items if one fails (default: true) */
  continueOnError: boolean;
  /** Callback when an item starts processing */
  onItemStart?: (item: BatchItem) => void;
  /** Callback when an item completes (success or error) */
  onItemComplete?: (item: BatchItem) => void;
  /** Callback for overall progress updates */
  onProgress?: (completed: number, total: number, currentItems: BatchItem[]) => void;
  /** Callback when all processing is complete */
  onComplete?: (items: BatchItem[]) => void;
}

/**
 * Result of batch processing
 */
export interface BatchResult<R = unknown> {
  items: BatchItem<unknown, R>[];
  successful: number;
  failed: number;
  cancelled: number;
  totalTime: number;
}

/**
 * Generate a unique ID for batch items
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * BatchQueue class for managing parallel processing of multiple items
 *
 * @example
 * const queue = new BatchQueue<File, Blob>({
 *   concurrency: 2,
 *   onProgress: (done, total) => console.log(`${done}/${total}`)
 * });
 *
 * queue.add({ id: '1', data: file1, name: 'doc1.pdf' });
 * queue.add({ id: '2', data: file2, name: 'doc2.pdf' });
 *
 * const result = await queue.process(async (file) => {
 *   return await compressPDF(file);
 * });
 */
export class BatchQueue<T = unknown, R = unknown> {
  private items: Map<string, BatchItem<T, R>> = new Map();
  private options: BatchQueueOptions;
  private status: BatchQueueStatus = 'idle';
  private startTime = 0;
  private abortController: AbortController | null = null;

  constructor(options: Partial<BatchQueueOptions> = {}) {
    this.options = {
      concurrency: options.concurrency ?? 2,
      continueOnError: options.continueOnError ?? true,
      onItemStart: options.onItemStart,
      onItemComplete: options.onItemComplete,
      onProgress: options.onProgress,
      onComplete: options.onComplete,
    };
  }

  /**
   * Add an item to the queue
   */
  add(item: Omit<BatchItem<T, R>, 'status' | 'progress'>): void {
    const batchItem: BatchItem<T, R> = {
      ...item,
      status: 'pending',
      progress: 0,
    };
    this.items.set(item.id, batchItem);
  }

  /**
   * Add multiple items to the queue
   */
  addMany(items: Array<Omit<BatchItem<T, R>, 'status' | 'progress'>>): void {
    items.forEach(item => this.add(item));
  }

  /**
   * Remove an item from the queue (only if pending)
   */
  remove(id: string): boolean {
    const item = this.items.get(id);
    if (item && item.status === 'pending') {
      this.items.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear all pending items from the queue
   */
  clearPending(): void {
    this.items.forEach((item, id) => {
      if (item.status === 'pending') {
        this.items.delete(id);
      }
    });
  }

  /**
   * Clear all items from the queue
   */
  clearAll(): void {
    this.items.clear();
    this.status = 'idle';
  }

  /**
   * Get current queue status
   */
  getStatus(): BatchQueueStatus {
    return this.status;
  }

  /**
   * Get all items in the queue
   */
  getItems(): BatchItem<T, R>[] {
    return Array.from(this.items.values());
  }

  /**
   * Get a specific item by ID
   */
  getItem(id: string): BatchItem<T, R> | undefined {
    return this.items.get(id);
  }

  /**
   * Get count of items by status
   */
  getCounts(): { pending: number; processing: number; completed: number; error: number; cancelled: number } {
    const items = this.getItems();
    return {
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      completed: items.filter(i => i.status === 'completed').length,
      error: items.filter(i => i.status === 'error').length,
      cancelled: items.filter(i => i.status === 'cancelled').length,
    };
  }

  /**
   * Update an item's status and notify callbacks
   */
  private updateItem(id: string, updates: Partial<BatchItem<T, R>>): void {
    const item = this.items.get(id);
    if (item) {
      Object.assign(item, updates);
      this.items.set(id, item);
    }
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    if (this.options.onProgress) {
      const items = this.getItems();
      const completed = items.filter(i => i.status === 'completed' || i.status === 'error').length;
      const processing = items.filter(i => i.status === 'processing');
      this.options.onProgress(completed, items.length, processing);
    }
  }

  /**
   * Process all items in the queue with the given processor function
   *
   * @param processor - Async function to process each item
   * @returns BatchResult with all processed items
   */
  async process(
    processor: (data: T, item: BatchItem<T, R>, signal: AbortSignal) => Promise<R>
  ): Promise<BatchResult<R>> {
    if (this.status === 'processing') {
      throw new Error('Batch processing already in progress');
    }

    this.status = 'processing';
    this.startTime = Date.now();
    this.abortController = new AbortController();

    const pendingItems = this.getItems().filter(i => i.status === 'pending');
    const { concurrency } = this.options;

    // Process items in parallel with concurrency limit
    await this.processWithConcurrency(
      pendingItems,
      processor,
      concurrency
    );

    const endTime = Date.now();
    const items = this.getItems();
    const counts = this.getCounts();

    const result: BatchResult<R> = {
      items,
      successful: counts.completed,
      failed: counts.error,
      cancelled: counts.cancelled,
      totalTime: endTime - this.startTime,
    };

    this.status = counts.cancelled > 0 ? 'cancelled' : 'completed';
    this.options.onComplete?.(items);

    return result;
  }

  /**
   * Process items with concurrency limit
   */
  private async processWithConcurrency(
    items: BatchItem<T, R>[],
    processor: (data: T, item: BatchItem<T, R>, signal: AbortSignal) => Promise<R>,
    concurrency: number
  ): Promise<void> {
    const queue = [...items];
    const active: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      if (this.status === 'cancelled' || this.status === 'paused') {
        return;
      }

      const item = queue.shift();
      if (!item) return;

      // Check if cancelled
      if (this.abortController?.signal.aborted) {
        this.updateItem(item.id, { status: 'cancelled' });
        return;
      }

      // Start processing
      this.updateItem(item.id, {
        status: 'processing',
        startedAt: Date.now()
      });
      this.options.onItemStart?.(this.items.get(item.id)!);
      this.notifyProgress();

      try {
        const result = await processor(
          item.data,
          this.items.get(item.id)!,
          this.abortController!.signal
        );

        this.updateItem(item.id, {
          status: 'completed',
          progress: 100,
          result,
          completedAt: Date.now(),
        });
      } catch (err) {
        if (this.abortController?.signal.aborted) {
          this.updateItem(item.id, { status: 'cancelled' });
        } else {
          this.updateItem(item.id, {
            status: 'error',
            error: createSafeErrorMessage(err, 'Processing failed'),
            completedAt: Date.now(),
          });

          if (!this.options.continueOnError) {
            this.cancel();
            return;
          }
        }
      }

      this.options.onItemComplete?.(this.items.get(item.id)!);
      this.notifyProgress();

      // Process next item
      if (queue.length > 0 && this.status === 'processing') {
        await processNext();
      }
    };

    // Start initial batch of concurrent processors
    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
      active.push(processNext());
    }

    await Promise.all(active);
  }

  /**
   * Pause processing (current items will complete)
   */
  pause(): void {
    if (this.status === 'processing') {
      this.status = 'paused';
    }
  }

  /**
   * Resume processing after pause
   */
  async resume(
    processor: (data: T, item: BatchItem<T, R>, signal: AbortSignal) => Promise<R>
  ): Promise<BatchResult<R>> {
    if (this.status !== 'paused') {
      throw new Error('Queue is not paused');
    }
    return this.process(processor);
  }

  /**
   * Cancel all pending processing
   */
  cancel(): void {
    this.status = 'cancelled';
    this.abortController?.abort();

    // Mark all pending items as cancelled
    this.items.forEach((item, id) => {
      if (item.status === 'pending' || item.status === 'processing') {
        this.updateItem(id, { status: 'cancelled' });
      }
    });
  }
}

/**
 * Create a ZIP file from batch results
 *
 * @param results - Array of objects with name and blob
 * @param zipFilename - Name for the ZIP file
 * @returns Blob of the ZIP file
 */
export async function createBatchZip(
  results: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Track filenames to avoid duplicates
  const usedNames = new Map<string, number>();

  for (const { name, blob } of results) {
    let safeName = sanitizeFilename(name);

    // Handle duplicate names
    const count = usedNames.get(safeName) ?? 0;
    if (count > 0) {
      const ext = safeName.lastIndexOf('.');
      if (ext > 0) {
        safeName = `${safeName.substring(0, ext)}_${count}${safeName.substring(ext)}`;
      } else {
        safeName = `${safeName}_${count}`;
      }
    }
    usedNames.set(sanitizeFilename(name), count + 1);

    zip.file(safeName, blob);
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Download a batch ZIP file
 */
export function downloadBatchZip(zipBlob: Blob, filename = 'batch_download.zip'): void {
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format time duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Estimate remaining time based on completed items
 */
export function estimateRemainingTime(
  completedCount: number,
  totalCount: number,
  elapsedMs: number
): number {
  if (completedCount === 0) return 0;
  const avgTimePerItem = elapsedMs / completedCount;
  const remainingItems = totalCount - completedCount;
  return Math.round(avgTimePerItem * remainingItems);
}
