import { test, expect } from '@playwright/test';

/**
 * TIER 1 LIGHTNING: ULTRA-FAST SMOKE TESTS
 * Run: npx playwright test tools-smoke-light --project=chromium
 * Time: ~2-3 minutes
 *
 * This is the FASTEST way to test all tools.
 * Only checks: page loads + HTTP 200 + title exists
 */

const TOOL_PATHS = [
  // Document (10)
  '/tools/pdf-merge', '/tools/pdf-compress', '/tools/pdf-split', '/tools/pdf-redactor',
  '/tools/pdf-form-filler', '/tools/ocr', '/tools/document-scanner', '/tools/pdf-to-word',
  '/tools/resume-builder', '/tools/pdf-organize',
  // Media (16)
  '/tools/jpg-to-pdf', '/tools/pdf-to-jpg', '/tools/image-compress', '/tools/file-converter',
  '/tools/background-remover', '/tools/exif-editor', '/tools/video-compressor',
  '/tools/video-trimmer', '/tools/gif-maker', '/tools/remove-vocals',
  '/tools/audio-transcription', '/tools/subtitle-generator', '/tools/audio-editor',
  '/tools/screen-recorder', '/tools/audiogram-maker', '/tools/subtitle-editor',
  '/tools/image-resize',
  // Utility (15)
  '/tools/qr-generator', '/tools/json-formatter', '/tools/text-case', '/tools/word-counter',
  '/tools/lorem-ipsum', '/tools/hash-generator', '/tools/color-converter',
  '/tools/password-generator', '/tools/qr-reader', '/tools/unit-converter',
  '/tools/diff-checker', '/tools/code-beautifier', '/tools/svg-editor', '/tools/markdown-editor',
  // AI (8)
  '/tools/sentiment-analysis', '/tools/object-detection', '/tools/image-captioning',
  '/tools/text-summarization', '/tools/grammar-checker', '/tools/image-upscaler',
  '/tools/object-remover', '/tools/ai-summary',
];

test.describe('⚡ Lightning Smoke Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const path of TOOL_PATHS) {
    const toolName = path.split('/').pop() || path;

    test(`${toolName}`, async ({ page }) => {
      test.setTimeout(15000); // 15s max per tool

      // Navigate and wait for basic load
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

      // Check HTTP 200
      expect(response?.status(), `${toolName} should return HTTP 200`).toBe(200);

      // Check title exists and is not empty
      const title = await page.title();
      expect(title.length, `${toolName} should have a title`).toBeGreaterThan(0);

      // Check main content exists
      const main = page.locator('main');
      await expect(main, `${toolName} should have visible main content`).toBeVisible();
    });
  }
});

test.describe('📊 Lightning Summary', () => {
  test('all pages return 200', async ({ page }) => {
    const results: { path: string; status: number; ok: boolean }[] = [];

    for (const path of TOOL_PATHS) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      const status = response?.status() || 0;
      results.push({ path, status, ok: status === 200 });
    }

    const failed = results.filter(r => !r.ok);
    const ok = results.filter(r => r.ok);

    console.log(`\n⚡ LIGHTNING RESULTS:`);
    console.log(`   ✅ ${ok.length}/${results.length} pages OK`);
    if (failed.length > 0) {
      console.log(`   ❌ Failed: ${failed.map(f => `${f.path} (${f.status})`).join(', ')}`);
    }

    expect(failed.length, `${failed.length} pages failed`).toBe(0);
  });
});
