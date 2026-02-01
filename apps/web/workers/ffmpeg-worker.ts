/**
 * FFmpeg Web Worker
 *
 * This worker offloads FFmpeg loading and processing to a background thread,
 * preventing UI freezing during the ~50MB download and WASM compilation.
 *
 * Message Protocol:
 * - Input: { type: 'load' | 'exec' | 'writeFile' | 'readFile' | 'deleteFile', ...data }
 * - Output: { type: 'ready' | 'progress' | 'done' | 'error', ...data }
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

// SharedArrayBuffer check (required for FFmpeg.wasm)
const checkSharedArrayBuffer = (): boolean => {
  if (typeof SharedArrayBuffer === 'undefined') {
    self.postMessage({
      type: 'error',
      error: 'SharedArrayBuffer is not available. This may be due to missing COOP/COEP headers.',
    } as WorkerResponse);
    return false;
  }
  return true;
};

// Load FFmpeg in the worker
const loadFFmpeg = async () => {
  if (isLoaded && ffmpeg) {
    self.postMessage({ type: 'ready' } as WorkerResponse);
    return;
  }

  if (!checkSharedArrayBuffer()) {
    return;
  }

  try {
    ffmpeg = new FFmpeg();

    // Forward progress events to main thread
    ffmpeg.on('progress', ({ progress, time }) => {
      self.postMessage({
        type: 'progress',
        data: { progress: Math.round(progress * 100), time },
      } as WorkerResponse);
    });

    // Load FFmpeg core from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    isLoaded = true;
    self.postMessage({ type: 'ready' } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to load FFmpeg',
    } as WorkerResponse);
  }
};

// Execute FFmpeg command
const execCommand = async (args: string[], id?: string) => {
  if (!ffmpeg || !isLoaded) {
    self.postMessage({
      type: 'error',
      id,
      error: 'FFmpeg not loaded',
    } as WorkerResponse);
    return;
  }

  try {
    await ffmpeg.exec(args);
    self.postMessage({ type: 'done', id } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'FFmpeg execution failed',
    } as WorkerResponse);
  }
};

// Write file to FFmpeg's virtual filesystem
const writeFile = async (filename: string, data: ArrayBuffer, id?: string) => {
  if (!ffmpeg || !isLoaded) {
    self.postMessage({
      type: 'error',
      id,
      error: 'FFmpeg not loaded',
    } as WorkerResponse);
    return;
  }

  try {
    await ffmpeg.writeFile(filename, new Uint8Array(data));
    self.postMessage({ type: 'done', id } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Failed to write file',
    } as WorkerResponse);
  }
};

// Read file from FFmpeg's virtual filesystem
const readFile = async (filename: string, id?: string) => {
  if (!ffmpeg || !isLoaded) {
    self.postMessage({
      type: 'error',
      id,
      error: 'FFmpeg not loaded',
    } as WorkerResponse);
    return;
  }

  try {
    const data = await ffmpeg.readFile(filename) as Uint8Array;
    self.postMessage({
      type: 'done',
      id,
      data: Array.from(data), // Convert Uint8Array to regular array for transfer
    } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Failed to read file',
    } as WorkerResponse);
  }
};

// Delete file from FFmpeg's virtual filesystem
const deleteFile = async (filename: string, id?: string) => {
  if (!ffmpeg || !isLoaded) {
    return; // Silently fail for cleanup operations
  }

  try {
    await ffmpeg.deleteFile(filename);
    self.postMessage({ type: 'done', id } as WorkerResponse);
  } catch {
    // Ignore cleanup errors
    self.postMessage({ type: 'done', id } as WorkerResponse);
  }
};

// Handle messages from main thread
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, id, data } = e.data;

  switch (type) {
    case 'load':
      await loadFFmpeg();
      break;

    case 'exec':
      await execCommand(data.args, id);
      break;

    case 'writeFile':
      await writeFile(data.filename, data.fileData, id);
      break;

    case 'readFile':
      await readFile(data.filename, id);
      break;

    case 'deleteFile':
      await deleteFile(data.filename, id);
      break;

    case 'terminate':
      // Clean up and terminate worker
      ffmpeg = null;
      isLoaded = false;
      self.close();
      break;

    default:
      self.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`,
      } as WorkerResponse);
  }
};
