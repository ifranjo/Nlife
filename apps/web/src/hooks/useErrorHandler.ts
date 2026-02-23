import { useCallback, useState } from 'react';
import { captureToolError } from '../lib/error-reporting';

interface UseErrorHandlerOptions {
  toolId?: string;
  onError?: (error: Error) => void;
  onReset?: () => void;
}

interface UseErrorHandlerReturn {
  error: Error | null;
  isError: boolean;
  setError: (error: Error | null) => void;
  handleError: (error: unknown, context?: Record<string, unknown>) => void;
  clearError: () => void;
  retry: () => void;
}

/**
 * Hook for handling errors in tool components
 * Provides consistent error handling and reporting
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const { toolId, onError, onReset } = options;
  const [error, setErrorState] = useState<Error | null>(null);

  const setError = useCallback((err: Error | null) => {
    setErrorState(err);
    if (err && onError) {
      onError(err);
    }
  }, [onError]);

  const handleError = useCallback((err: unknown, context?: Record<string, unknown>) => {
    let error: Error;

    if (err instanceof Error) {
      error = err;
    } else if (typeof err === 'string') {
      error = new Error(err);
    } else {
      error = new Error('An unknown error occurred');
    }

    setErrorState(error);

    // Report to error service
    if (toolId) {
      captureToolError(toolId, error, context);
    }

    // Call custom handler
    if (onError) {
      onError(error);
    }
  }, [toolId, onError]);

  const clearError = useCallback(() => {
    setErrorState(null);
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  const retry = useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    error,
    isError: error !== null,
    setError,
    handleError,
    clearError,
    retry,
  };
}

/**
 * Hook for async operations with error handling
 */
export function useAsyncOperation<T>(
  asyncFn: () => Promise<T>,
  options: UseErrorHandlerOptions = {}
): {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  execute: () => Promise<T | null>;
  reset: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { error, isError, handleError, clearError } = useErrorHandler(options);

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    clearError();

    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, clearError, handleError]);

  const reset = useCallback(() => {
    setData(null);
    clearError();
  }, [clearError]);

  return {
    data,
    error,
    isLoading,
    isError,
    execute,
    reset,
  };
}
