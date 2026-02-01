/**
 * Shared React hooks for New Life Solutions tools
 *
 * This module exports custom hooks that abstract common patterns
 * across tool components, reducing boilerplate and ensuring consistency.
 */

export { default as useFileProcessor } from './useFileProcessor';
export type {
  ProcessingStatus,
  ProcessResult,
  UseFileProcessorOptions,
  ProcessedFile,
  DragDropState,
  UseFileProcessorReturn,
} from './useFileProcessor';
