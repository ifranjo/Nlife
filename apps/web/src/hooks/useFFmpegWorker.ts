/**
 * useFFmpegWorker Hook
 *
 * Custom React hook for managing FFmpeg operations via Web Worker.
 * Prevents UI freezing during FFmpeg loading (~50MB) and processing.
 *
 * Features:
 * - Automatic worker initialization and cleanup
 * - Progress tracking for both loading and processing
 * - Promise-based API for sequential operations
 * - TypeScript support with full type safety
 *
 * @example
 * ```tsx
 * const { isReady, progress, error, load, exec, writeFile, readFile } = useFFmpegWorker();
 *
 * // Load FFmpeg
 * await load();
 *
 * // Process video
 * await writeFile('input.mp4', fileData);
 * await exec(['-i', 'input.mp4', 'output.mp4']);
 * const output = await readFile('output.mp4');
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';

type WorkerStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error';

interface FFmpegWorkerState {
  status: WorkerStatus;
  progress: number;
  error: string | null;
  isReady: boolean;
}

interface WorkerMessage {
  type: 'load' | 'exec' | 'writeFile' | 'readFile' | 'deleteFile' | 'terminate';
  id?: string;
  data?: any;
}

interface WorkerResponse {
  type: 'ready' | 'progress' | 'done' | 'error';
  id?: string;
  data?: any;
  error?: string;
}

// Generate unique ID for message tracking
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

export function useFFmpegWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef<Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>>(new Map());

  const [state, setState] = useState<FFmpegWorkerState>({
    status: 'idle',
    progress: 0,
    error: null,
    isReady: false,
  });

  // Initialize worker on mount
  useEffect(() => {
    let worker: Worker | null = null;

    try {
      // Create worker from the worker file
      worker = new Worker(
        new URL('../../workers/ffmpeg-worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current = worker;

      // Handle messages from worker
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { type, id, data, error } = e.data;

        switch (type) {
          case 'progress':
            setState(prev => ({ ...prev, progress: data?.progress || 0 }));
            break;

          case 'ready':
            setState({
              status: 'ready',
              progress: 100,
              error: null,
              isReady: true,
            });
            break;

          case 'done':
            if (id && pendingRequestsRef.current.has(id)) {
              const { resolve } = pendingRequestsRef.current.get(id)!;
              resolve(data);
              pendingRequestsRef.current.delete(id);
            }
            setState(prev => ({
              ...prev,
              status: state.isReady ? 'ready' : 'processing',
            }));
            break;

          case 'error':
            const errorMsg = error || 'Unknown error';
            if (id && pendingRequestsRef.current.has(id)) {
              const { reject } = pendingRequestsRef.current.get(id)!;
              reject(new Error(errorMsg));
              pendingRequestsRef.current.delete(id);
            }
            setState(prev => ({
              ...prev,
              status: 'error',
              error: errorMsg,
            }));
            break;
        }
      };

      // Handle worker errors
      worker.onerror = (error) => {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: `Worker error: ${error.message}`,
        }));
      };

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to initialize worker',
      }));
    }

    // Cleanup on unmount
    return () => {
      if (worker) {
        worker.postMessage({ type: 'terminate' });
        worker.terminate();
      }
      pendingRequestsRef.current.clear();
    };
  }, []);

  // Helper to send message and wait for response
  const sendMessage = useCallback(<T = any>(type: WorkerMessage['type'], data?: any): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = generateId();
      pendingRequestsRef.current.set(id, { resolve, reject });

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (pendingRequestsRef.current.has(id)) {
          pendingRequestsRef.current.delete(id);
          reject(new Error('Operation timeout'));
        }
      }, 300000); // 5 minute timeout

      // Clear timeout when promise resolves
      const originalResolve = resolve;
      const wrappedResolve = (value: T) => {
        clearTimeout(timeout);
        originalResolve(value);
      };

      // Update the map with wrapped resolve
      pendingRequestsRef.current.set(id, { resolve: wrappedResolve, reject });

      workerRef.current!.postMessage({ type, id, data });
    });
  }, []);

  // Load FFmpeg
  const load = useCallback(async () => {
    if (state.isReady) return;

    setState(prev => ({ ...prev, status: 'loading', progress: 0, error: null }));

    try {
      await sendMessage('load');
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load FFmpeg',
      }));
      throw error;
    }
  }, [state.isReady, sendMessage]);

  // Execute FFmpeg command
  const exec = useCallback(async (args: string[]) => {
    setState(prev => ({ ...prev, status: 'processing', progress: 0, error: null }));

    try {
      await sendMessage('exec', { args });
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'FFmpeg execution failed',
      }));
      throw error;
    }
  }, [sendMessage]);

  // Write file to FFmpeg virtual filesystem
  const writeFile = useCallback(async (filename: string, fileData: ArrayBuffer | Uint8Array) => {
    try {
      await sendMessage('writeFile', { filename, fileData });
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to write file',
      }));
      throw error;
    }
  }, [sendMessage]);

  // Read file from FFmpeg virtual filesystem
  const readFile = useCallback(async (filename: string): Promise<Uint8Array> => {
    try {
      const response = await sendMessage<number[]>('readFile', { filename });
      return new Uint8Array(response || []);
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to read file',
      }));
      throw error;
    }
  }, [sendMessage]);

  // Delete file from FFmpeg virtual filesystem
  const deleteFile = useCallback(async (filename: string) => {
    try {
      await sendMessage('deleteFile', { filename });
    } catch (error) {
      // Silently fail for cleanup operations
      console.warn('Failed to delete file:', filename);
    }
  }, [sendMessage]);

  // Reset state (e.g., for new operations)
  const reset = useCallback(() => {
    setState({
      status: state.isReady ? 'ready' : 'idle',
      progress: 0,
      error: null,
      isReady: state.isReady,
    });
  }, [state.isReady]);

  return {
    // State
    status: state.status,
    progress: state.progress,
    error: state.error,
    isReady: state.isReady,
    isLoading: state.status === 'loading',
    isProcessing: state.status === 'processing',
    hasError: state.status === 'error',

    // Methods
    load,
    exec,
    writeFile,
    readFile,
    deleteFile,
    reset,
  };
}

/**
 * Type definitions for external use
 */
export type { WorkerStatus };
