import { test, expect, Page } from '@playwright/test';

/**
 * TIER 1: TOOLS SMOKE TESTS
 * Fast health checks for all 57 tools
 * Run: npx playwright test tools-smoke --project=chromium
 * Time: ~5-8 minutes for all tools
 */

// Tool registry - source of truth for all tools
const TOOLS = [
  // Document Tools
  { id: 'pdf-merge', name: 'PDF Merge', category: 'document', hasHeavyLib: false },
  { id: 'pdf-compress', name: 'PDF Compress', category: 'document', hasHeavyLib: false },
  { id: 'pdf-split', name: 'PDF Split', category: 'document', hasHeavyLib: false },
  { id: 'pdf-redactor', name: 'PDF Redactor', category: 'document', hasHeavyLib: false },
  { id: 'pdf-form-filler', name: 'PDF Form Filler', category: 'document', hasHeavyLib: false },
  { id: 'ocr', name: 'OCR', category: 'document', hasHeavyLib: true }, // Tesseract.js
  { id: 'document-scanner', name: 'Document Scanner', category: 'document', hasHeavyLib: true },
  { id: 'pdf-to-word', name: 'PDF to Word', category: 'document', hasHeavyLib: false },
  { id: 'resume-builder', name: 'Resume Builder', category: 'document', hasHeavyLib: false },
  { id: 'pdf-organize', name: 'PDF Organizer', category: 'document', hasHeavyLib: false },

  // Media Tools
  { id: 'jpg-to-pdf', name: 'JPG to PDF', category: 'media', hasHeavyLib: false },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', category: 'media', hasHeavyLib: false },
  { id: 'image-compress', name: 'Image Compress', category: 'media', hasHeavyLib: false },
  { id: 'file-converter', name: 'File Converter', category: 'media', hasHeavyLib: false },
  { id: 'background-remover', name: 'Background Remover', category: 'media', hasHeavyLib: true }, // ~180MB
  { id: 'exif-editor', name: 'EXIF Editor', category: 'media', hasHeavyLib: false },
  { id: 'video-compressor', name: 'Video Compressor', category: 'media', hasHeavyLib: true }, // FFmpeg
  { id: 'video-trimmer', name: 'Video Trimmer', category: 'media', hasHeavyLib: true }, // FFmpeg
  { id: 'gif-maker', name: 'GIF Maker', category: 'media', hasHeavyLib: true }, // FFmpeg
  { id: 'remove-vocals', name: 'Remove Vocals', category: 'media', hasHeavyLib: true }, // FFmpeg
  { id: 'audio-transcription', name: 'Audio Transcription', category: 'media', hasHeavyLib: true }, // Whisper
  { id: 'subtitle-generator', name: 'Subtitle Generator', category: 'media', hasHeavyLib: true }, // Whisper
  { id: 'audio-editor', name: 'Audio Editor', category: 'media', hasHeavyLib: true }, // FFmpeg
  { id: 'screen-recorder', name: 'Screen Recorder', category: 'media', hasHeavyLib: false },
  { id: 'audiogram-maker', name: 'Audiogram Maker', category: 'media', hasHeavyLib: true },
  { id: 'subtitle-editor', name: 'Subtitle Editor', category: 'media', hasHeavyLib: false },
  { id: 'image-resize', name: 'Image Resize', category: 'media', hasHeavyLib: false },

  // Utility Tools
  { id: 'qr-generator', name: 'QR Generator', category: 'utility', hasHeavyLib: false },
  { id: 'json-formatter', name: 'JSON Formatter', category: 'utility', hasHeavyLib: false },

  { id: 'password-generator', name: 'Password Generator', category: 'utility', hasHeavyLib: false },
  { id: 'qr-reader', name: 'QR Reader', category: 'utility', hasHeavyLib: false },
  { id: 'unit-converter', name: 'Unit Converter', category: 'utility', hasHeavyLib: false },

  { id: 'svg-editor', name: 'SVG Editor', category: 'utility', hasHeavyLib: false },

  // AI Tools
  { id: 'sentiment-analysis', name: 'Sentiment Analysis', category: 'ai', hasHeavyLib: true },
  { id: 'object-detection', name: 'Object Detection', category: 'ai', hasHeavyLib: true },
  { id: 'image-captioning', name: 'Image Captioning', category: 'ai', hasHeavyLib: true },
  { id: 'text-summarization', name: 'Text Summarization', category: 'ai', hasHeavyLib: true },
  { id: 'grammar-checker', name: 'Grammar Checker', category: 'ai', hasHeavyLib: true },
  { id: 'image-upscaler', name: 'Image Upscaler', category: 'ai', hasHeavyLib: true },
  { id: 'object-remover', name: 'Object Remover', category: 'ai', hasHeavyLib: true },

];

// Test configuration
const CONFIG = {
  // Standard timeout for most tools
  standardTimeout: 30000,
  // Extended timeout for tools with heavy libraries (FFmpeg, Whisper, etc.)
  heavyLibTimeout: 120000,
  // Parallel execution batch size (to manage memory)
  batchSize: 5,
};

interface ConsoleError {
  type: string;
  text: string;
  location?: string;
}

/**
 * Helper: Setup console error capture
 */
async function setupConsoleCapture(page: Page): Promise<ConsoleError[]> {
  const errors: ConsoleError[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url,
      });
    }
  });

  page.on('pageerror', (err) => {
    errors.push({
      type: 'pageerror',
      text: err.message,
    });
  });

  return errors;
}

/**
 * Helper: Validate schema markup
 */
async function validateSchemaMarkup(page: Page): Promise<{ valid: boolean; types: string[]; errors: string[] }> {
  const result = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const types: string[] = [];
    const errors: string[] = [];

    scripts.forEach((script, index) => {
      try {
        const data = JSON.parse(script.textContent || '{}');
        if (Array.isArray(data)) {
          data.forEach(item => types.push(item['@type'] || 'Unknown'));
        } else {
          types.push(data['@type'] || 'Unknown');
        }
      } catch (e) {
        errors.push(`Schema ${index + 1}: Invalid JSON`);
      }
    });

    return { types, errors, count: scripts.length };
  });

  return {
    valid: result.errors.length === 0 && result.count > 0,
    types: result.types,
    errors: result.errors,
  };
}

/**
 * Helper: Run smoke test for a single tool
 */
async function runToolSmokeTest(page: Page, tool: typeof TOOLS[0]): Promise<{
  passed: boolean;
  duration: number;
  checks: Record<string, boolean | string>;
}> {
  const startTime = Date.now();
  const checks: Record<string, boolean | string> = {};

  try {
    // Navigate to tool
    await page.goto(`/tools/${tool.id}`, { waitUntil: 'networkidle' });
    checks['page-load'] = true;

    // Check H1 exists and is visible
    const h1 = page.locator('main h1').first();
    const h1Visible = await h1.isVisible().catch(() => false);
    checks['h1-visible'] = h1Visible;

    if (h1Visible) {
      const h1Text = await h1.textContent() || '';
      checks['h1-text'] = h1Text.substring(0, 50);
      // H1 should contain tool name (case insensitive)
      checks['h1-contains-name'] = h1Text.toLowerCase().includes(tool.name.toLowerCase().split(' ')[0]);
    }

    // Check main content area exists
    const main = page.locator('main');
    checks['main-visible'] = await main.isVisible().catch(() => false);

    // Validate schema markup
    const schema = await validateSchemaMarkup(page);
    checks['schema-valid'] = schema.valid;
    checks['schema-types'] = schema.types.join(', ');
    if (schema.errors.length > 0) {
      checks['schema-errors'] = schema.errors.join('; ');
    }

    // Check for tool-specific elements
    // Most tools have a drop zone or file input
    const dropZone = page.locator('.drop-zone, [data-testid="drop-zone"], input[type="file"]').first();
    const hasDropZone = await dropZone.isVisible().catch(() => false);
    checks['has-file-input'] = hasDropZone;

    // Wait for React hydration (client:load components)
    if (tool.hasHeavyLib) {
      // Heavy libraries may take time to load
      await page.waitForTimeout(2000);
    }

    const duration = Date.now() - startTime;

    // Determine overall pass/fail
    const passed =
      checks['page-load'] === true &&
      checks['h1-visible'] === true &&
      checks['main-visible'] === true &&
      checks['schema-valid'] === true;

    return { passed, duration, checks };

  } catch (error) {
    const duration = Date.now() - startTime;
    checks['error'] = error instanceof Error ? error.message : 'Unknown error';
    return { passed: false, duration, checks };
  }
}

/**
 * MAIN TEST SUITE
 */
test.describe('🔥 Tools Smoke Tests - Tier 1', () => {
  test.describe.configure({ mode: 'parallel' });

  // Test each tool
  for (const tool of TOOLS) {
    test(`[${tool.category}] ${tool.name} (${tool.id})`, async ({ page }) => {
      // Set timeout based on tool type
      const timeout = tool.hasHeavyLib ? CONFIG.heavyLibTimeout : CONFIG.standardTimeout;
      test.setTimeout(timeout);

      // Capture console errors
      const consoleErrors = await setupConsoleCapture(page);

      // Run smoke test
      const result = await runToolSmokeTest(page, tool);

      // Build detailed failure message
      const failures = Object.entries(result.checks)
        .filter(([key, value]) => value === false || key === 'error')
        .map(([key, value]) => `  - ${key}: ${value}`);

      const failureMessage = failures.length > 0
        ? `\nFailed checks:\n${failures.join('\n')}`
        : '';

      // Assert pass
      expect(result.passed, `Smoke test failed for ${tool.name}${failureMessage}`).toBe(true);

      // Check for critical console errors (filter out known warnings)
      const criticalErrors = consoleErrors.filter(err => {
        // Filter out common non-critical warnings
        const nonCritical = [
          'Download the React DevTools',
          'Third-party cookie',
          'permissions policy',
          'Autoplay policy',
        ];
        return !nonCritical.some(nc => err.text.includes(nc));
      });

      expect(
        criticalErrors.length,
        `Console errors detected for ${tool.name}:\n${criticalErrors.map(e => e.text).join('\n')}`
      ).toBe(0);
    });
  }
});

/**
 * SUMMARY TEST
 * Runs after all individual tests to provide aggregate report
 */
test.describe('📊 Smoke Test Summary', () => {
  test('all critical tools pass smoke test', async ({ page }) => {
    // Critical tools that must always work
    const criticalTools = [
      'pdf-merge',
      'pdf-compress',
      'image-compress',
      'qr-generator',
      'password-generator',
      'json-formatter',
      'word-counter',
      'video-compressor',
      'ocr',
      'background-remover',
    ];

    const results: { id: string; passed: boolean; duration: number }[] = [];

    for (const toolId of criticalTools) {
      const tool = TOOLS.find(t => t.id === toolId);
      if (!tool) continue;

      const timeout = tool.hasHeavyLib ? CONFIG.heavyLibTimeout : CONFIG.standardTimeout;
      test.setTimeout(timeout);

      const result = await runToolSmokeTest(page, tool);
      results.push({ id: toolId, passed: result.passed, duration: result.duration });
    }

    const failed = results.filter(r => !r.passed);
    const passed = results.filter(r => r.passed);

    console.log(`\n📊 CRITICAL TOOLS SUMMARY:`);
    console.log(`   ✅ Passed: ${passed.length}/${results.length}`);
    console.log(`   ❌ Failed: ${failed.length}/${results.length}`);

    if (failed.length > 0) {
      console.log(`   Failed tools: ${failed.map(f => f.id).join(', ')}`);
    }

    expect(
      failed.length,
      `${failed.length} critical tools failed smoke test: ${failed.map(f => f.id).join(', ')}`
    ).toBe(0);
  });
});

/**
 * CATEGORY TESTS
 * Run smoke tests by category for targeted testing
 */
test.describe('📁 Category Smoke Tests', () => {
  const categories = ['document', 'media', 'utility', 'ai'] as const;

  for (const category of categories) {
    const categoryTools = TOOLS.filter(t => t.category === category);

    test(`${category} tools (${categoryTools.length} tools)`, async ({ page }) => {
      const results: { name: string; passed: boolean }[] = [];

      for (const tool of categoryTools) {
        const timeout = tool.hasHeavyLib ? CONFIG.heavyLibTimeout : CONFIG.standardTimeout;
        test.setTimeout(timeout);

        const result = await runToolSmokeTest(page, tool);
        results.push({ name: tool.name, passed: result.passed });
      }

      const passed = results.filter(r => r.passed).length;
      console.log(`\n📁 ${category.toUpperCase()}: ${passed}/${results.length} passed`);

      expect(passed).toBe(results.length);
    });
  }
});
