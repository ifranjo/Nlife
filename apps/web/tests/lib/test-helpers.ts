import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Helpers for E2E File Processing Tests
 * Utilities for uploading files, waiting for processing, and verifying downloads
 */

export const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

/**
 * File upload helper - handles drop zone or file input
 */
export async function uploadFile(
  page: Page,
  filePath: string,
  options: {
    selector?: string;
    dropZoneSelector?: string;
    inputSelector?: string;
  } = {}
): Promise<void> {
  const {
    dropZoneSelector = '.drop-zone, [data-testid="drop-zone"]',
    inputSelector = 'input[type="file"]'
  } = options;

  // Find file input (might be hidden)
  const fileInput = page.locator(inputSelector).first();

  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }

  // Upload file
  await fileInput.setInputFiles(filePath);

  // Wait for file to be processed by React
  await page.waitForTimeout(500);
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  page: Page,
  filePaths: string[],
  inputSelector: string = 'input[type="file"]'
): Promise<void> {
  const fileInput = page.locator(inputSelector).first();

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fixture file not found: ${filePath}`);
    }
  }

  await fileInput.setInputFiles(filePaths);
  await page.waitForTimeout(500);
}

/**
 * Wait for processing to complete
 */
export async function waitForProcessing(
  page: Page,
  options: {
    timeout?: number;
    successSelector?: string;
    errorSelector?: string;
    progressSelector?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const {
    timeout = 60000,
    successSelector = '[data-testid="download-btn"], .download-btn, button:has-text("Download"), button:has-text("Save")',
    errorSelector = '[data-testid="error"], .error-message, .alert-error',
    progressSelector = '[data-testid="progress"], .progress-bar, .loading'
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for success
    const successElement = page.locator(successSelector).first();
    if (await successElement.isVisible().catch(() => false)) {
      return { success: true };
    }

    // Check for error
    const errorElement = page.locator(errorSelector).first();
    if (await errorElement.isVisible().catch(() => false)) {
      const errorText = await errorElement.textContent() || 'Unknown error';
      return { success: false, error: errorText };
    }

    // Wait a bit before checking again
    await page.waitForTimeout(500);
  }

  throw new Error(`Processing timeout after ${timeout}ms`);
}

/**
 * Wait for heavy library to load (FFmpeg, Whisper, etc.)
 */
export async function waitForHeavyLibrary(
  page: Page,
  options: {
    timeout?: number;
    readySelector?: string;
  } = {}
): Promise<void> {
  const { timeout = 120000, readySelector = 'main' } = options;

  // Wait for main content
  await page.locator(readySelector).first().waitFor({ state: 'visible', timeout });

  // Additional wait for WASM initialization
  await page.waitForTimeout(2000);
}

/**
 * Click download button and verify file
 */
export async function downloadFile(
  page: Page,
  options: {
    selector?: string;
    expectedFilename?: string;
    timeout?: number;
  } = {}
): Promise<{ filename: string; size: number }> {
  const { selector = 'button:has-text("Download"), .download-btn, [data-testid="download-btn"]', timeout = 30000 } = options;

  // Start waiting for download
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
    page.locator(selector).first().click()
  ]);

  const filename = download.suggestedFilename();
  const downloadPath = await download.path();

  let size = 0;
  if (downloadPath) {
    const stats = fs.statSync(downloadPath);
    size = stats.size;
  }

  return { filename, size };
}

/**
 * Get preview data (for tools that show preview before download)
 */
export async function getPreviewData(
  page: Page,
  selector: string = '[data-testid="preview"], .preview, canvas, img.preview'
): Promise<{ visible: boolean; src?: string }> {
  const element = page.locator(selector).first();
  const visible = await element.isVisible().catch(() => false);

  if (visible) {
    const src = await element.getAttribute('src').catch(() => undefined);
    return { visible, src };
  }

  return { visible };
}

/**
 * Verify output file properties
 */
export async function verifyOutputFile(
  page: Page,
  expectations: {
    downloadSelector?: string;
    expectedExtension?: string;
    minSizeBytes?: number;
    maxSizeBytes?: number;
  } = {}
): Promise<{ filename: string; size: number; valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const { filename, size } = await downloadFile(page, {
    selector: expectations.downloadSelector
  });

  // Verify extension
  if (expectations.expectedExtension && !filename.endsWith(expectations.expectedExtension)) {
    errors.push(`Expected extension ${expectations.expectedExtension}, got ${filename}`);
  }

  // Verify size constraints
  if (expectations.minSizeBytes && size < expectations.minSizeBytes) {
    errors.push(`File too small: ${size} bytes (min: ${expectations.minSizeBytes})`);
  }

  if (expectations.maxSizeBytes && size > expectations.maxSizeBytes) {
    errors.push(`File too large: ${size} bytes (max: ${expectations.maxSizeBytes})`);
  }

  return {
    filename,
    size,
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clear files and reset tool state
 */
export async function clearFiles(
  page: Page,
  selector: string = 'button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-btn"]'
): Promise<void> {
  const clearBtn = page.locator(selector).first();
  if (await clearBtn.isVisible().catch(() => false)) {
    await clearBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Get tool state
 */
export async function getToolState(page: Page): Promise<{
  filesUploaded: boolean;
  processing: boolean;
  complete: boolean;
  hasError: boolean;
}> {
  const hasFiles = await page.locator('.file-item, [data-testid="file-item"]').first().isVisible().catch(() => false);
  const processing = await page.locator('.loading, [data-testid="processing"], .spinner').first().isVisible().catch(() => false);
  const complete = await page.locator('[data-testid="download-btn"], .download-ready').first().isVisible().catch(() => false);
  const hasError = await page.locator('.error, [data-testid="error"]').first().isVisible().catch(() => false);

  return {
    filesUploaded: hasFiles,
    processing,
    complete,
    hasError
  };
}

/**
 * Retry wrapper for flaky operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;

  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Performance measurement
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
}

/**
 * Console error capture setup
 */
export function setupErrorCapture(page: Page): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      // Filter out non-critical errors
      const nonCritical = [
        'Download the React DevTools',
        'Third-party cookie',
        'Source map',
      ];
      if (!nonCritical.some(nc => text.includes(nc))) {
        errors.push(text);
      }
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  return { errors, warnings };
}

/**
 * Assert no critical errors
 */
export function assertNoCriticalErrors(
  errors: string[],
  context: string
): void {
  const criticalErrors = errors.filter(e =>
    !e.includes('webpack') &&
    !e.includes('Source map') &&
    !e.includes('React DevTools')
  );

  expect(criticalErrors, `${context} should have no critical errors`).toHaveLength(0);
}
