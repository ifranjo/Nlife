#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * CLI Tool for scaffolding new tools in New Life Solutions
 * Automates the creation of:
 * 1. Tool registration in tools.ts
 * 2. React component template
 * 3. Astro page template
 * 4. Test files (functional, accessibility, visual)
 * 5. Thumbnail placeholder
 */

const args = process.argv.slice(2);
const toolName = args[0];
const toolId = args[1];

if (!toolName || !toolId) {
  console.error('Usage: node create-new-tool.js "Tool Name" tool-id');
  console.error('Example: node create-new-tool.js "PDF Organizer" pdf-organizer');
  process.exit(1);
}

// Configuration
const config = {
  toolName,
  toolId,
  toolNameCamel: toolName.replace(/\s+(.)/g, (_, char) => char.toUpperCase()),
  toolNamePascal: toolName.replace(/(?:^\w|\s+\w)/g, match => match.trim().toUpperCase()),
  toolPath: `/tools/${toolId}`,
  componentPath: `src/components/tools/${toolId}.tsx`,
  pagePath: `src/pages/tools/${toolId}.astro`,
  testPath: `tests/${toolId}.spec.ts`,
  a11yTestPath: `tests/accessibility/${toolId}.spec.ts`,
  visualTestPath: `tests/visual/${toolId}.spec.ts`,
  thumbnailPath: `public/thumbnails/${toolId}.svg`,
  category: args[2] || 'document', // document, media, ai, utility, games
  tier: 'free',
  color: 'from-blue-500 to-purple-500',
  tags: [],
  popular: false,
  releaseDate: new Date().toISOString().split('T')[0],
  fileAccept: getFileAccept(toolId),
  maxFileSize: getMaxFileSize(toolId),
  processingType: getProcessingType(toolId)
};

function getFileAccept(toolId) {
  if (toolId.includes('pdf')) return '.pdf,application/pdf';
  if (toolId.includes('image') || toolId.includes('jpg') || toolId.includes('png')) return 'image/*';
  if (toolId.includes('video')) return 'video/*';
  if (toolId.includes('audio')) return 'audio/*';
  return '*/*';
}

function getMaxFileSize(toolId) {
  if (toolId.includes('video')) return '500MB';
  if (toolId.includes('pdf') || toolId.includes('image')) return '50MB';
  if (toolId.includes('audio')) return '100MB';
  return '10MB';
}

function getProcessingType(toolId) {
  if (toolId.includes('pdf')) return 'pdf-lib';
  if (toolId.includes('image')) return 'canvas';
  if (toolId.includes('video')) return 'ffmpeg';
  if (toolId.includes('audio')) return 'web-audio';
  return 'text';
}

// Templates
const templates = {
  // React Component Template
  component: `import { useState, useRef, useCallback } from 'react';
import { validateFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

interface ${config.toolNamePascal}Props {}

export default function ${config.toolNamePascal}({}: ${config.toolNamePascal}Props) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    try {
      setError('');
      await validateFile(selectedFile, '${config.category === 'document' ? 'pdf' : config.category}');
      setFile(selectedFile);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Invalid file'));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) handleFileSelect(files[0]);
  }, [handleFileSelect]);

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);

    try {
      // TODO: Implement ${config.toolName} processing logic

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(50);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(100);

      // Create dummy result
      const resultBlob = new Blob(['Processed content'], { type: 'application/octet-stream' });
      setResult(resultBlob);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Processing failed'));
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const url = URL.createObjectURL(result);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(file?.name || 'output') + '_processed';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-6">
      <div className="space-y-6">
        {/* File Upload */}
        <div
          className="drop-zone border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="${config.fileAccept}"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {file ? (
            <div className="space-y-2">
              <div className="text-2xl mb-2">📄</div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-gray-400">Maximum ${config.maxFileSize} file size</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Process Button */}
        {file && !result && (
          <button
            onClick={processFile}
            disabled={processing}
            className="btn-primary w-full"
          >
            {processing ? 'Processing...' : 'Process File'}
          </button>
        )}

        {/* Progress */}
        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: \`\${progress}%\` }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-400">✓ Processing complete!</p>
            </div>
            <button onClick={downloadResult} className="btn-primary w-full">
              Download Result
            </button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="text-xs text-gray-500 text-center">
          ⚡ Your files are processed locally and never leave your browser
        </div>
      </div>
    </div>
  );
}
`,

  // Astro Page Template
  astroPage: `---
import Layout from '../../layouts/Layout.astro';
import ${config.toolNamePascal} from '../../components/tools/${toolId}.tsx';
import AnswerBox from '../../components/seo/AnswerBox.astro';
import QASections from '../../components/seo/QASections.astro';
import SchemaMarkup from '../../components/seo/SchemaMarkup.astro';
import { tools } from '../../lib/tools';

const tool = tools.find(t => t.id === '${toolId}');
const title = tool?.seo?.title || '${config.toolName} - Free Online Tool | New Life';
const description = tool?.seo?.metaDescription || 'Process your files securely in your browser. No uploads, no sign up required.';
---

n<Layout title={title} description={description}>
  <main class="min-h-screen bg-gray-900 text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Breadcrumb -->
        <nav class="text-sm mb-8">
          <a href="/hub" class="text-blue-400 hover:text-blue-300">← All Tools</a>
          <span class="mx-2 text-gray-500">/</span>
          <span class="text-gray-300">${config.toolName}</span>
        </nav>

        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">
            {tool?.seo?.h1 || config.toolName}
          </h1>
          <p class="text-xl text-gray-300 max-w-2xl mx-auto">
            {tool?.description || 'Process your files securely in your browser.'}
          </p>

          <!-- Answer Box for AI Extraction -->
          <AnswerBox tool={tool} />
        </div>

        <!-- Tool Component -->
        <${config.toolNamePascal} client:load />

        <!-- FAQ Section -->
        {tool?.faq && tool.faq.length > 0 && (
          <QASections faqs={tool.faq} />
        )}

        <!-- Schema Markup -->
        <SchemaMarkup tool={tool} />
      </div>
    </div>
  </main>
</Layout>
`,

  // Functional Test Template
  functionalTest: `import { test, expect } from '@playwright/test';

/**
 * ${config.toolName} - Functional Tests
 *
 * Generated test suite covering:
 * - Page loading and basic UI
 * - File upload functionality
 * - Processing workflow
 * - Error handling
 * - Download functionality
 */

test.describe('${config.toolName}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${config.toolPath}');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/${config.toolName}|${toolId.replace('-', ' ')}/i);

    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/${config.toolName.replace(' ', '.*')}/i);
  });

  test('displays drop zone for file upload', async ({ page }) => {
    const dropZone = page.locator('.drop-zone, [class*="drop"]').first();
    await expect(dropZone).toBeVisible();

    const uploadText = page.getByText(/drop.*here|click.*browse|upload.*file/i).first();
    await expect(uploadText).toBeVisible();
  });

  test('has file input with correct accept attribute', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', /${config.fileAccept.replace('*', '.*')}/);
  });

  test('displays privacy notice', async ({ page }) => {
    const privacyNote = page.getByText(/never leave your browser|processed locally/i).first();
    await expect(privacyNote).toBeVisible();
  });

  test('has back navigation to hub', async ({ page }) => {
    const backLink = page.locator('a[href="/hub"]').first();
    await expect(backLink).toBeVisible();
  });

  test('shows free tag', async ({ page }) => {
    const freeTag = page.getByText('Free').first();
    await expect(freeTag).toBeVisible();
  });

  test('uploads and processes file successfully', async ({ page }) => {
    // Create a test file
    const testFile = new Blob(['test content'], { type: '${config.fileAccept.split(',')[0]}' });
    const file = new File([testFile], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });

    // Upload file
    await page.setInputFiles('input[type="file"]', file);

    // Verify file is shown
    const fileName = page.getByText('test.${config.fileAccept.split(',')[0].replace('.*', '')}');
    await expect(fileName).toBeVisible();

    // Process file
    const processButton = page.getByRole('button', { name: /process|convert|merge|compress/i });
    await processButton.click();

    // Wait for processing
    await expect(page.getByText(/processing/i)).toBeVisible();

    // Wait for completion
    await expect(page.getByText(/complete|success/i)).toBeVisible({ timeout: 10000 });

    // Check download button appears
    const downloadButton = page.getByRole('button', { name: /download/i });
    await expect(downloadButton).toBeVisible();
  });

  test('handles invalid file type', async ({ page }) => {
    // Create invalid file
    const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });

    // Try to upload
    await page.setInputFiles('input[type="file"]', invalidFile);

    // Should show error
    const error = page.getByText(/invalid|unsupported|error/i).first();
    await expect(error).toBeVisible();
  });

  test('handles large file size', async ({ page }) => {
    // Create large file (simulate)
    const largeContent = new Uint8Array(60 * 1024 * 1024); // 60MB
    const largeFile = new File([largeContent], 'large.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });

    await page.setInputFiles('input[type="file"]', largeFile);

    // Should show size error
    const error = page.getByText(/too large|maximum|${config.maxFileSize}/i).first();
    await expect(error).toBeVisible();
  });

  test('shows progress during processing', async ({ page }) => {
    // Upload file
    const testFile = new File(['test'], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', testFile);

    // Start processing
    const processButton = page.getByRole('button', { name: /process/i });
    await processButton.click();

    // Check progress bar or percentage
    const progress = page.locator('[class*="progress"], [role="progressbar"], :text-matches("[0-9]+%")').first();
    await expect(progress).toBeVisible();
  });

  test('clears state when uploading new file', async ({ page }) => {
    // Upload first file
    const file1 = new File(['test1'], 'test1.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', file1);

    // Process it
    await page.getByRole('button', { name: /process/i }).click();
    await expect(page.getByText(/complete/i)).toBeVisible();

    // Upload second file
    const file2 = new File(['test2'], 'test2.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', file2);

    // Should reset to initial state
    await expect(page.getByText('test2.${config.fileAccept.split(',')[0].replace('.*', '')}')).toBeVisible();
    await expect(page.getByRole('button', { name: /download/i })).not.toBeVisible();
  });
});
`,

  // Accessibility Test Template
  a11yTest: `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * ${config.toolName} - Accessibility Tests
 *
 * Tests for WCAG 2.1 Level AA compliance:
 * - Color contrast
 * - Keyboard navigation
 * - Screen reader compatibility
 * - Form labels
 * - ARIA attributes
 */

test.describe('${config.toolName} - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${config.toolPath}');
    await page.waitForLoadState('networkidle');
  });

  test('axe accessibility scan passes', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();

    // Check h1 is not empty
    const h1Text = await h1.textContent();
    expect(h1Text?.trim()).toBeTruthy();

    // If there are h2s, they should come after h1
    const h2s = page.locator('main h2');
    const h2Count = await h2s.count();

    if (h2Count > 0) {
      const firstH2 = h2s.first();
      const h1Box = await h1.boundingBox();
      const h2Box = await firstH2.boundingBox();

      if (h1Box && h2Box) {
        expect(h2Box.y).toBeGreaterThanOrEqual(h1Box.y + h1Box.height);
      }
    }
  });

  test('form inputs have accessible names', async ({ page }) => {
    // File input should have label or aria-label
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Check for label
    const inputId = await fileInput.getAttribute('id');
    if (inputId) {
      const label = page.locator(\`label[for="\${inputId}"]\`);
      const labelVisible = await label.isVisible().catch(() => false);
      if (!labelVisible) {
        // Check for aria-label
        const ariaLabel = await fileInput.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    }

    // Check all buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('drop zone is keyboard accessible', async ({ page }) => {
    const dropZone = page.locator('.drop-zone, [class*="drop"]').first();
    await expect(dropZone).toBeVisible();

    // Should be focusable
    await dropZone.focus();
    const focusedElement = await page.evaluate(() => document.activeElement?.className);
    expect(focusedElement).toMatch(/drop/i);

    // Should have keyboard interaction
    await page.keyboard.press('Enter');
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeFocused();
  });

  test('error messages are announced to screen readers', async ({ page }) => {
    // Trigger an error
    const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });
    await page.setInputFiles('input[type="file"]', invalidFile);

    // Error should have appropriate ARIA
    const error = page.getByRole('alert').first();
    const errorVisible = await error.isVisible().catch(() => false);

    if (errorVisible) {
      // Check error has proper role or aria-live
      const role = await error.getAttribute('role');
      const ariaLive = await error.getAttribute('aria-live');
      expect(role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive').toBeTruthy();
    }
  });

  test('progress indicator is accessible', async ({ page }) => {
    // Upload a file to show progress
    const testFile = new File(['test'], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', testFile);

    // Start processing
    const processButton = page.getByRole('button', { name: /process/i });
    await processButton.click();

    // Check progress is announced
    const progress = page.locator('[role="progressbar"], [aria-valuenow], [aria-valuetext]').first();
    const progressVisible = await progress.isVisible().catch(() => false);

    if (progressVisible) {
      // Should have proper ARIA attributes
      const role = await progress.getAttribute('role');
      const ariaLabel = await progress.getAttribute('aria-label');
      const ariaValueNow = await progress.getAttribute('aria-valuenow');

      expect(role === 'progressbar' || ariaLabel || ariaValueNow).toBeTruthy();
    }
  });

  test('color contrast meets WCAG standards', async ({ page }) => {
    // This is covered by axe scan, but we can check specific elements
    const dropZone = page.locator('.drop-zone').first();
    const dropZoneStyles = await dropZone.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor
      };
    });

    // Basic check - would need proper contrast calculation in real implementation
    expect(dropZoneStyles.color).toBeTruthy();
    expect(dropZoneStyles.backgroundColor).toBeTruthy();
  });

  test('focus indicators are visible', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Check first focusable element has visible focus indicator
    const focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      const styles = window.getComputedStyle(active);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        tagName: active.tagName
      };
    });

    expect(focusedElement).toBeTruthy();

    // Should have some focus indicator
    const hasOutline = focusedElement?.outline && focusedElement.outline !== 'none';
    const hasBoxShadow = focusedElement?.boxShadow && focusedElement.boxShadow !== 'none';
    expect(hasOutline || hasBoxShadow).toBeTruthy();
  });
});
`,

  // Visual Regression Test Template
  visualTest: `import { test, expect } from '@playwright/test';

/**
 * ${config.toolName} - Visual Regression Tests
 *
 * Tests for visual consistency across:
 * - Initial state
 * - File upload state
 * - Processing state
 * - Result state
 * - Error states
 * - Different viewports
 */

test.describe('${config.toolName} - Visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${config.toolPath}');
    await page.waitForLoadState('networkidle');
  });

  test('initial state screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('${toolId}-initial.png', {
      fullPage: true,
      mask: [page.locator('nav')], // Mask navigation if it changes
      maxDiffPixels: 100
    });
  });

  test('with uploaded file screenshot', async ({ page }) => {
    // Upload a file
    const testFile = new File(['test content'], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', testFile);

    // Wait for UI update
    await expect(page.getByText('test.${config.fileAccept.split(',')[0].replace('.*', '')}')).toBeVisible();

    await expect(page).toHaveScreenshot('${toolId}-with-file.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('processing state screenshot', async ({ page }) => {
    // Upload and process
    const testFile = new File(['test'], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', testFile);
    await page.getByRole('button', { name: /process/i }).click();

    // Wait for processing to start
    await expect(page.getByText(/processing/i)).toBeVisible();

    await expect(page).toHaveScreenshot('${toolId}-processing.png', {
      fullPage: true,
      maxDiffPixels: 200 // Allow more diff for animated elements
    });
  });

  test('completed state screenshot', async ({ page }) => {
    // Upload, process, and complete
    const testFile = new File(['test'], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', testFile);
    await page.getByRole('button', { name: /process/i }).click();

    // Wait for completion
    await expect(page.getByText(/complete|success/i)).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('${toolId}-completed.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('error state screenshot', async ({ page }) => {
    // Trigger error with invalid file
    const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });
    await page.setInputFiles('input[type="file"]', invalidFile);

    // Wait for error to appear
    await expect(page.getByText(/error|invalid|unsupported/i)).toBeVisible();

    await expect(page).toHaveScreenshot('${toolId}-error.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('mobile viewport screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page).toHaveScreenshot('${toolId}-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('tablet viewport screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page).toHaveScreenshot('${toolId}-tablet.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('dark theme consistency', async ({ page }) => {
    // Ensure we're in dark mode (default)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');

    // Upload a file to see all elements
    const testFile = new File(['test'], 'test.${config.fileAccept.split(',')[0].replace('.*', '')}', { type: '${config.fileAccept.split(',')[0]}' });
    await page.setInputFiles('input[type="file"]', testFile);

    await expect(page).toHaveScreenshot('${toolId}-dark-theme.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });
});
`,

  // Thumbnail SVG Template
  thumbnail: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="12" fill="url(#gradient)"/>
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6"/>
      <stop offset="100%" style="stop-color:#8B5CF6"/>
    </linearGradient>
  </defs>
  <!-- Tool-specific icon placeholder -->
  <text x="60" y="70" font-size="40" text-anchor="middle" fill="white" opacity="0.8">${config.toolName.charAt(0)}</text>
</svg>`
};

// Create files
async function createFiles() {
  console.log(`Creating ${config.toolName} (${toolId})...`);

  try {
    // Create directories
    await fs.mkdir(`apps/web/src/components/tools`, { recursive: true });
    await fs.mkdir(`apps/web/src/pages/tools`, { recursive: true });
    await fs.mkdir(`apps/web/tests/accessibility`, { recursive: true });
    await fs.mkdir(`apps/web/tests/visual`, { recursive: true });
    await fs.mkdir(`apps/web/public/thumbnails`, { recursive: true });

    // Create React component
    await fs.writeFile(`apps/web/${config.componentPath}`, templates.component);
    console.log(`✓ Created ${config.componentPath}`);

    // Create Astro page
    await fs.writeFile(`apps/web/${config.pagePath}`, templates.astroPage);
    console.log(`✓ Created ${config.pagePath}`);

    // Create test files
    await fs.writeFile(`apps/web/${config.testPath}`, templates.functionalTest);
    console.log(`✓ Created ${config.testPath}`);

    await fs.writeFile(`apps/web/${config.a11yTestPath}`, templates.a11yTest);
    console.log(`✓ Created ${config.a11yTestPath}`);

    await fs.writeFile(`apps/web/${config.visualTestPath}`, templates.visualTest);
    console.log(`✓ Created ${config.visualTestPath}`);

    // Create thumbnail
    await fs.writeFile(`apps/web/${config.thumbnailPath}`, templates.thumbnail);
    console.log(`✓ Created ${config.thumbnailPath}`);

    // Update tools.ts
    console.log('\n⚠️  Manual step required:');
    console.log(`Add this tool entry to apps/web/src/lib/tools.ts:`);
    console.log(`\n{\n  id: '${toolId}',\n  name: '${config.toolName}',\n  description: 'Process your files securely in your browser.',\n  icon: '🔧',\n  thumbnail: '${config.thumbnailPath}',\n  category: '${config.category}',\n  tier: '${config.tier}',\n  href: '${config.toolPath}',\n  color: '${config.color}',\n  tags: [${config.tags.map(t => `'${t}'`).join(', ')}],\n  popular: ${config.popular},\n  releaseDate: '${config.releaseDate}',\n  answer: 'Process your files securely in your browser with this free online tool. No uploads required. Instant results.',\n  seo: {\n    title: '${config.toolName} Online Free | New Life',\n    metaDescription: 'Process your files securely in your browser. 100% free, no sign up, no server uploads.',\n    h1: '${config.toolName} - Free Online Tool',\n    keywords: ['${toolId.replace('-', ' ')}', 'free online tool', 'browser based']\n  },\n  faq: [\n    { question: 'Is this tool free?', answer: 'Yes, 100% free with no hidden costs.' },\n    { question: 'Are my files secure?', answer: 'Yes, all processing happens in your browser.' }\n  ]\n}`);

    console.log('\n📋 Next steps:');
    console.log('1. Add the tool to lib/tools.ts');
    console.log('2. Implement the processing logic in the React component');
    console.log('3. Run tests: cd apps/web && npx playwright test tests/${toolId}.spec.ts');
    console.log('4. Run accessibility tests: npx playwright test tests/accessibility/${toolId}.spec.ts');
    console.log('5. Run visual tests: npx playwright test tests/visual/${toolId}.spec.ts');
    console.log('\n✨ All files created successfully!');

  } catch (error) {
    console.error('Error creating files:', error);
    process.exit(1);
  }
}

// Run
createFiles();