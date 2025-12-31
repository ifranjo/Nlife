/**
 * Security utilities for file validation and sanitization
 * All tools should use these utilities for consistent security
 */

// File size and type limits by category
export const FILE_LIMITS = {
  pdf: {
    maxSize: 50 * 1024 * 1024, // 50MB
    types: ['application/pdf'] as const,
    extensions: ['.pdf'] as const,
  },
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const,
    extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'] as const,
  },
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    types: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'] as const,
    extensions: ['.mp4', '.webm', '.mov', '.avi', '.mkv'] as const,
  },
  audio: {
    maxSize: 100 * 1024 * 1024, // 100MB
    types: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/flac'] as const,
    extensions: ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'] as const,
  },
} as const;

// Magic bytes signatures for file type verification
export const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  jpeg: [0xFF, 0xD8, 0xFF],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF (need additional check for WEBP)
  gif: [0x47, 0x49, 0x46, 0x38], // GIF8
  bmp: [0x42, 0x4D], // BM
  heic: [0x00, 0x00, 0x00], // HEIC has variable header, check ftyp box
} as const;

export type FileCategory = keyof typeof FILE_LIMITS;
export type MagicByteType = keyof typeof MAGIC_BYTES;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type by checking magic bytes (file signature)
 * Don't trust file.type alone - it can be spoofed
 */
export async function validateFileMagicBytes(
  file: File,
  expectedType: MagicByteType
): Promise<boolean> {
  try {
    // Special handling for HEIC (ISO Base Media File Format)
    if (expectedType === 'heic') {
      // HEIC files have ftyp box at offset 4, containing brand like 'heic', 'heix', 'mif1'
      const buffer = await file.slice(0, 12).arrayBuffer();
      const header = new Uint8Array(buffer);
      // Check for ftyp box signature
      const ftyp = String.fromCharCode(header[4], header[5], header[6], header[7]);
      if (ftyp !== 'ftyp') return false;
      // Check brand
      const brand = String.fromCharCode(header[8], header[9], header[10], header[11]);
      return ['heic', 'heix', 'mif1', 'msf1', 'hevc', 'hevx'].includes(brand);
    }

    const magic = MAGIC_BYTES[expectedType];
    const buffer = await file.slice(0, magic.length).arrayBuffer();
    const header = new Uint8Array(buffer);

    const isMatch = magic.every((byte, i) => header[i] === byte);

    // Additional check for WebP (RIFF....WEBP)
    if (expectedType === 'webp' && isMatch) {
      const webpBuffer = await file.slice(8, 12).arrayBuffer();
      const webpHeader = new Uint8Array(webpBuffer);
      const webpSignature = [0x57, 0x45, 0x42, 0x50]; // WEBP
      return webpSignature.every((byte, i) => webpHeader[i] === byte);
    }

    return isMatch;
  } catch {
    return false;
  }
}

/**
 * Validates file size against maximum allowed
 */
export function validateFileSize(file: File, maxBytes: number): boolean {
  return file.size > 0 && file.size <= maxBytes;
}

/**
 * Validates MIME type against allowed types
 */
export function validateMimeType(file: File, allowedTypes: readonly string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Complete file validation with size, type, and magic bytes
 */
export async function validateFile(
  file: File,
  category: FileCategory
): Promise<ValidationResult> {
  const limits = FILE_LIMITS[category];

  // Check file size
  if (!validateFileSize(file, limits.maxSize)) {
    const maxMB = limits.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxMB}MB limit`
    };
  }

  // Check MIME type
  if (!validateMimeType(file, limits.types)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${limits.types.join(', ')}`
    };
  }

  // Check magic bytes for supported types
  const magicType = category === 'pdf' ? 'pdf' :
    file.type === 'image/png' ? 'png' :
    file.type === 'image/jpeg' ? 'jpeg' :
    file.type === 'image/webp' ? 'webp' :
    file.type === 'image/gif' ? 'gif' : null;

  if (magicType) {
    const magicValid = await validateFileMagicBytes(file, magicType);
    if (!magicValid) {
      return {
        valid: false,
        error: 'File content does not match declared type'
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes filename to prevent path traversal and special characters
 */
export function sanitizeFilename(name: string): string {
  return name
    // Remove path components
    .replace(/^.*[\\/]/, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Keep only safe characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Collapse multiple underscores
    .replace(/_{2,}/g, '_')
    // Remove leading/trailing underscores and dots
    .replace(/^[_.-]+|[_.-]+$/g, '')
    // Limit length
    .slice(0, 200)
    // Fallback for empty result
    || 'file';
}

/**
 * Generates a safe download filename with timestamp
 */
export function generateDownloadFilename(
  baseName: string,
  extension: string
): string {
  const sanitized = sanitizeFilename(baseName);
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitized}_${timestamp}.${extension.replace(/^\./, '')}`;
}

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char]);
}

/**
 * Creates a user-friendly error message without exposing internals
 */
export function createSafeErrorMessage(
  error: unknown,
  fallback = 'An error occurred. Please try again.'
): string {
  // Never expose stack traces, internal paths, or library details
  if (error instanceof Error) {
    // Log full error for debugging (dev only)
    if (import.meta.env.DEV) {
      console.error('Full error:', error);
    }
  }
  return fallback;
}

/**
 * Validates that a URL is safe (same-origin or allowed external)
 */
export function isUrlSafe(
  url: string,
  allowedOrigins: string[] = []
): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    const currentOrigin = window.location.origin;

    // Allow same-origin
    if (parsed.origin === currentOrigin) return true;

    // Allow blob URLs (for file downloads)
    if (parsed.protocol === 'blob:') return true;

    // Check allowed external origins
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

/**
 * Validates video files (size and MIME type check only - no magic bytes for video)
 */
export function validateVideoFile(file: File): ValidationResult {
  const limits = FILE_LIMITS.video;

  if (!validateFileSize(file, limits.maxSize)) {
    const maxMB = limits.maxSize / (1024 * 1024);
    return { valid: false, error: `Video exceeds ${maxMB}MB limit` };
  }

  // Check if MIME type starts with video/
  if (!file.type.startsWith('video/')) {
    return { valid: false, error: 'Please select a valid video file' };
  }

  return { valid: true };
}

/**
 * Validates audio files (size and MIME type check only)
 */
export function validateAudioFile(file: File): ValidationResult {
  const limits = FILE_LIMITS.audio;

  if (!validateFileSize(file, limits.maxSize)) {
    const maxMB = limits.maxSize / (1024 * 1024);
    return { valid: false, error: `Audio exceeds ${maxMB}MB limit` };
  }

  // Check if MIME type starts with audio/ or is video (for extracting audio from video)
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    return { valid: false, error: 'Please select a valid audio file' };
  }

  return { valid: true };
}

/**
 * Sanitizes user-provided text content (for display, not storage)
 * Strips potentially dangerous content while preserving readable text
 */
export function sanitizeTextContent(text: string, maxLength = 50000): string {
  return text
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit length to prevent memory issues
    .slice(0, maxLength);
}

/**
 * Validates image files with magic bytes for FileConverter
 * Supports: HEIC, HEIF, PNG, JPG, JPEG, WebP, BMP, GIF
 */
export async function validateImageFileExtended(
  file: File,
  maxSize = 50 * 1024 * 1024 // 50MB default
): Promise<ValidationResult> {
  // Check file size
  if (!validateFileSize(file, maxSize)) {
    const maxMB = maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
  }

  // Get extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const supportedExtensions = ['heic', 'heif', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

  if (!supportedExtensions.includes(ext)) {
    return { valid: false, error: `Unsupported format: .${ext}` };
  }

  // Map extension to magic byte type
  let magicType: MagicByteType | null = null;
  if (['heic', 'heif'].includes(ext)) magicType = 'heic';
  else if (ext === 'png') magicType = 'png';
  else if (['jpg', 'jpeg'].includes(ext)) magicType = 'jpeg';
  else if (ext === 'webp') magicType = 'webp';
  else if (ext === 'bmp') magicType = 'bmp';
  else if (ext === 'gif') magicType = 'gif';

  // Validate magic bytes
  if (magicType) {
    const isValid = await validateFileMagicBytes(file, magicType);
    if (!isValid) {
      return { valid: false, error: 'File content does not match declared type' };
    }
  }

  return { valid: true };
}
