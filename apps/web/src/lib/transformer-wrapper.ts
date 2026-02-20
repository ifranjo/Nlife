/**
 * Transformer Singleton Wrapper
 *
 * Prevents duplicate loading of @huggingface/transformers and onnxruntime
 * by maintaining a single shared instance across all components.
 */

let transformersInstance: any = null;
let initializationPromise: Promise<any> | null = null;

interface InitOptions {
  modelId?: string;
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  device?: 'auto';
}

export async function getTransformersInstance() {
  // Return existing instance
  if (transformersInstance) {
    return transformersInstance;
  }

  // Return existing initialization promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = import('@huggingface/transformers').then((module) => {
    const transformers = (module as any);

    // Configure environment for optimal loading
    if (transformers?.env) {
      transformers.env.allowLocalModels = false;
      transformers.env.backends.onnx.wasm.numThreads = 1;
    }

    transformersInstance = transformers;
    return transformers;
  }).catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

export async function initPipeline(task: string, model: string, options: InitOptions = {}) {
  const transformers = await getTransformersInstance();

  return transformers.pipeline(task, model, {
    dtype: options.dtype || 'fp32',
    device: options.device || 'auto',
    ...options
  });
}

/**
 * Preload transformers in background
 */
export function preloadTransformers() {
  // Only preload if not already loaded or loading
  if (!transformersInstance && !initializationPromise) {
    getTransformersInstance().catch(() => {
      // Silently fail preloading
    });
  }
}

/**
 * Dispose transformers instance (for testing)
 */
export function disposeTransformers() {
  transformersInstance = null;
  initializationPromise = null;
}