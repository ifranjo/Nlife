/**
 * useDragAndDrop - Reusable hook for drag-and-drop file uploads
 *
 * Eliminates code duplication across 20+ tool components by providing:
 * - Consistent drag-and-drop state management
 * - Standardized event handlers
 * - File validation integration
 * - Accessibility support (ARIA attributes, screen reader announcements)
 *
 * @example Basic usage
 * ```tsx
 * function MyTool() {
 *   const { isDragging, dragHandlers, fileInputRef } = useDragAndDrop({
 *     onFilesDrop: (files) => {
 *       // Handle dropped files
 *       console.log('Received files:', files);
 *     },
 *     accept: '.pdf',
 *     multiple: true,
 *   });
 *
 *   return (
 *     <div {...dragHandlers} className={isDragging ? 'drag-over' : ''}>
 *       <input ref={fileInputRef} type="file" accept={accept} multiple={multiple} />
 *       Drop files here
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With file validation
 * ```tsx
 * import { validateFile } from '../lib/security';
 *
 * const { dragHandlers } = useDragAndDrop({
 *   onFilesDrop: async (files) => {
 *     const validatedFiles = [];
 *     for (const file of Array.from(files)) {
 *       const result = await validateFile(file, 'pdf');
 *       if (result.valid) {
 *         validatedFiles.push(file);
 *       }
 *     }
 *     setFiles(validatedFiles);
 *   },
 *   validator: async (file) => {
 *     return await validateFile(file, 'pdf');
 *   },
 * });
 * ```
 */

import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Configuration options for useDragAndDrop
 */
export interface UseDragAndDropOptions {
  /**
   * Callback invoked when files are dropped or selected
   * @param files - The FileList or File array from the drop/select event
   */
  onFilesDrop: (files: FileList | File[]) => void | Promise<void>;

  /**
   * Optional custom file validator
   * If provided, files will be validated before calling onFilesDrop
   * @param file - File to validate
   * @returns Validation result with optional error message
   */
  validator?: (file: File) => FileValidationResult | Promise<FileValidationResult>;

  /**
   * File types to accept (for the file input)
   * Examples: '.pdf', 'image/*', '.pdf,.doc,.docx'
   * @default '*'
   */
  accept?: string;

  /**
   * Whether to allow multiple file selection
   * @default true
   */
  multiple?: boolean;

  /**
   * Callback invoked when drag state changes
   * @param isDragging - Current drag state
   */
  onDragStateChange?: (isDragging: boolean) => void;

  /**
   * Whether to disable drag-and-drop functionality
   * @default false
   */
  disabled?: boolean;

  /**
   * Maximum number of files allowed
   * @default undefined (no limit)
   */
  maxFiles?: number;

  /**
   * Maximum file size in bytes
   * @default undefined (no limit)
   */
  maxFileSize?: number;
}

/**
 * Drag-and-drop event handlers to spread onto drop zone element
 */
export interface DragHandlers {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * ARIA attributes for accessibility
 */
export interface DragAriaAttributes {
  role: string;
  tabIndex: number;
  ariaLabel: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

/**
 * Return value from useDragAndDrop hook
 */
export interface UseDragAndDropReturn {
  /**
   * Whether a file is currently being dragged over the drop zone
   */
  isDragging: boolean;

  /**
   * Event handlers to spread onto the drop zone element
   * @example
   * ```tsx
   * <div {...dragHandlers} />
   * ```
   */
  dragHandlers: DragHandlers;

  /**
   * Ref for the hidden file input element
   * Use this to programmatically trigger file selection
   */
  fileInputRef: React.RefObject<HTMLInputElement>;

  /**
   * ARIA attributes for accessibility
   * Spread these onto your drop zone element
   */
  ariaAttributes: DragAriaAttributes;

  /**
   * Programmatically trigger the file input click
   */
  triggerFileSelect: () => void;

  /**
   * Reset the file input value
   * Useful after processing files to allow re-selecting the same file
   */
  resetFileInput: () => void;

  /**
   * Current error state from validation (if any)
   */
  error: string | null;

  /**
   * Clear the current error state
   */
  clearError: () => void;
}

/**
 * Default drag-over class name
 * Can be customized by consumers
 */
export const DRAG_OVER_CLASS = 'drag-over';

/**
 * Reusable hook for drag-and-drop file uploads
 *
 * Provides consistent drag-and-drop behavior across all tool components,
 * including file validation, accessibility support, and state management.
 *
 * @param options - Configuration options
 * @returns Drag-and-drop state and handlers
 */
export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropReturn {
  const {
    onFilesDrop,
    validator,
    accept = '*',
    multiple = true,
    onDragStateChange,
    disabled = false,
    maxFiles,
    maxFileSize,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  // Notify parent of drag state changes
  useEffect(() => {
    onDragStateChange?.(isDragging);
  }, [isDragging, onDragStateChange]);

  /**
   * Validate files against constraints
   */
  const validateFiles = useCallback(async (
    files: FileList | File[]
  ): Promise<{ valid: File[]; errors: string[] }> => {
    const fileArray = Array.from(files);
    const valid: File[] = [];
    const errors: string[] = [];

    // Check max files limit
    if (maxFiles !== undefined && fileArray.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`);
      return { valid: [], errors };
    }

    for (const file of fileArray) {
      // Check file size limit
      if (maxFileSize !== undefined && file.size > maxFileSize) {
        const maxMB = Math.round(maxFileSize / (1024 * 1024));
        errors.push(`${file.name}: File size exceeds ${maxMB}MB limit`);
        continue;
      }

      // Run custom validator if provided
      if (validator) {
        const result = await validator(file);
        if (result.valid) {
          valid.push(file);
        } else {
          errors.push(`${file.name}: ${result.error || 'Invalid file'}`);
        }
      } else {
        // No validator, accept all files that passed size check
        valid.push(file);
      }
    }

    return { valid, errors };
  }, [maxFiles, maxFileSize, validator]);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [disabled]);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    // Only clear drag state if we're actually leaving the drop zone
    // This prevents flickering when dragging over child elements
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, [disabled]);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Clear previous error
    setError(null);

    // Validate files if validator or constraints provided
    if (validator || maxFiles || maxFileSize) {
      const { valid, errors } = await validateFiles(files);

      if (valid.length > 0) {
        await onFilesDrop(valid as any);
      }

      if (errors.length > 0) {
        setError(errors.length === 1 ? errors[0] : `${errors.length} files rejected`);
      }
    } else {
      // No validation, pass all files directly
      await onFilesDrop(files);
    }
  }, [disabled, validator, maxFiles, maxFileSize, validateFiles, onFilesDrop]);

  /**
   * Handle file input change event
   */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Clear previous error
    setError(null);

    // Validate files if validator or constraints provided
    if (validator || maxFiles || maxFileSize) {
      const { valid, errors } = await validateFiles(files);

      if (valid.length > 0) {
        await onFilesDrop(valid as any);
      }

      if (errors.length > 0) {
        setError(errors.length === 1 ? errors[0] : `${errors.length} files rejected`);
      }
    } else {
      // No validation, pass all files directly
      await onFilesDrop(files);
    }

    // Reset input to allow re-selecting the same file
    e.target.value = '';
  }, [validator, maxFiles, maxFileSize, validateFiles, onFilesDrop]);

  /**
   * Trigger the file input click programmatically
   */
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Reset the file input value
   */
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle keyboard activation (Enter or Space)
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileSelect();
    }
  }, [triggerFileSelect]);

  /**
   * Drag handlers to spread onto drop zone
   */
  const dragHandlers: DragHandlers = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onClick: triggerFileSelect,
    onKeyDown: handleKeyDown,
  };

  /**
   * ARIA attributes for accessibility
   */
  const ariaAttributes: DragAriaAttributes = {
    role: 'button',
    tabIndex: disabled ? -1 : 0,
    ariaLabel: multiple
      ? 'Drop files here or press Enter to browse'
      : 'Drop file here or press Enter to browse',
    ariaInvalid: error ? true : undefined,
  };

  return {
    isDragging,
    dragHandlers,
    fileInputRef,
    ariaAttributes,
    triggerFileSelect,
    resetFileInput,
    error,
    clearError,
  };
}

/**
 * HOC to add drag-and-drop functionality to a component
 *
 * @example
 * ```tsx
 * const DropZone = withDragAndDrop('pdf')(({ isDragging, dragHandlers, fileInputRef }) => (
 *   <div {...dragHandlers} className={isDragging ? 'drag-over' : ''}>
 *     <input ref={fileInputRef} type="file" accept=".pdf" />
 *     Drop PDF files here
 *   </div>
 * ));
 * ```
 */
export function withDragAndDrop<
  P extends {
    isDragging?: boolean;
    dragHandlers?: DragHandlers;
    fileInputRef?: React.RefObject<HTMLInputElement>;
  }
>(
  defaultAccept?: string,
  defaultOptions?: Partial<UseDragAndDropOptions>
) {
  return function <T extends P>(
    Component: React.ComponentType<T>
  ): React.ComponentType<Omit<T, 'isDragging' | 'dragHandlers' | 'fileInputRef'> & {
    onFilesDrop: UseDragAndDropOptions['onFilesDrop'];
    validator?: UseDragAndDropOptions['validator'];
    accept?: string;
    multiple?: boolean;
  }> {
    return function WrappedComponent(props: any) {
      const {
        onFilesDrop,
        validator,
        accept = defaultAccept,
        multiple = true,
        ...rest
      } = props;

      const dnd = useDragAndDrop({
        onFilesDrop,
        validator,
        accept: accept || '*',
        multiple,
        ...defaultOptions,
      });

      return <Component {...(rest as T)} {...dnd} />;
    };
  };
}

export default useDragAndDrop;
