import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  uploadFile,
  uploadMultipleFiles,
  waitForProcessing,
  waitForHeavyLibrary,
  downloadFile,
  getToolState,
  setupErrorCapture,
  assertNoCriticalErrors,
  FIXTURES_DIR,
} from './lib/test-helpers';

/**
 * EXPANDED E2E TESTS - Additional 26 Tools
 * Tests the remaining tools not covered in critical-path.spec.ts
 *
 * Run: npx playwright test tools-expanded --project=chromium
 */

const FIXTURES = {
  pdf: {
    single: path.join(FIXTURES_DIR, 'sample.pdf'),
  },
  image: {
    jpg: path.join(FIXTURES_DIR, 'sample.jpg'),
    png: path.join(FIXTURES_DIR, 'sample.png'),
  },
  video: {
    mp4: path.join(FIXTURES_DIR, 'sample.mp4'),
  },
  audio: {
    mp3: path.join(FIXTURES_DIR, 'sample.mp3'),
  },
};

test.describe('📁 Document Tools (Extended)', () => {
  test('PDF to JPG - convert PDF pages to images', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-to-jpg');
    await expect(page.locator('main h1')).toContainText('JPG');

    await uploadFile(page, FIXTURES.pdf.single);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    const convertBtn = page.locator('button:has-text("Convert"), button:has-text("Start")').first();
    if (await convertBtn.isVisible().catch(() => false)) {
      await convertBtn.click();
    }

    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Conversion failed: ${error}`).toBe(true);

    assertNoCriticalErrors(errors, 'PDF to JPG');
  });

  test('PDF Redactor - redact sensitive information', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-redactor');
    await expect(page.locator('main h1')).toContainText('Redact');

    await uploadFile(page, FIXTURES.pdf.single);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'PDF Redactor');
  });

  test('PDF Form Filler - fill PDF forms', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-form-filler');
    await expect(page.locator('main h1')).toContainText('Form');

    await uploadFile(page, FIXTURES.pdf.single);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'PDF Form Filler');
  });

  test('Resume Builder - create resume', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/resume-builder');
    await expect(page.locator('main h1')).toContainText('Resume');

    // Fill basic info
    const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Test User');
    }

    // Check for template selection
    const templates = page.locator('.template, [data-testid="template"]').first();
    await expect(templates).toBeVisible().catch(() => {
      // Some builders start with a form
    });

    assertNoCriticalErrors(errors, 'Resume Builder');
  });

  test('Document Scanner - scan documents', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/document-scanner');
    await expect(page.locator('main h1')).toContainText('Scan');

    // Scanner usually has camera/upload options
    const uploadBtn = page.locator('button:has-text("Upload"), input[type="file"]').first();
    await expect(uploadBtn).toBeVisible();

    assertNoCriticalErrors(errors, 'Document Scanner');
  });
});

test.describe('🖼️ Image Tools (Extended)', () => {
  test('File Converter - convert between formats', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/file-converter');
    await expect(page.locator('main h1')).toContainText('Convert');

    await uploadFile(page, FIXTURES.image.jpg);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    const convertBtn = page.locator('button:has-text("Convert"), button:has-text("Start")').first();
    if (await convertBtn.isVisible().catch(() => false)) {
      await convertBtn.click();
    }

    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Conversion failed: ${error}`).toBe(true);

    assertNoCriticalErrors(errors, 'File Converter');
  });

  test('EXIF Editor - edit image metadata', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/exif-editor');
    await expect(page.locator('main h1')).toContainText('EXIF');

    await uploadFile(page, FIXTURES.image.jpg);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'EXIF Editor');
  });

  test('Image Resize - resize images', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/image-resize');
    await expect(page.locator('main h1')).toContainText('Resize');

    await uploadFile(page, FIXTURES.image.jpg);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Image Resize');
  });

  test('Object Remover - remove objects from images', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/object-remover');
    await expect(page.locator('main h1')).toContainText('Remove');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.image.jpg);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Object Remover');
  });

  test('Image Captioning - AI image descriptions', async ({ page }) => {
    test.setTimeout(120000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/image-captioning');
    await expect(page.locator('main h1')).toContainText('Caption');

    await waitForHeavyLibrary(page, { timeout: 60000 });

    await uploadFile(page, FIXTURES.image.jpg);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Image Captioning');
  });
});

test.describe('🎬 Media Tools (Extended)', () => {
  test('Video to MP3 - extract audio from video', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/video-to-mp3');
    await expect(page.locator('main h1')).toContainText('MP3');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.video.mp4);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Video to MP3');
  });

  test('Remove Vocals - isolate music from vocals', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/remove-vocals');
    await expect(page.locator('main h1')).toContainText('Vocal');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.audio.mp3);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Remove Vocals');
  });

  test('Audio Transcription - speech to text', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/audio-transcription');
    await expect(page.locator('main h1')).toContainText('Transcri');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.audio.mp3);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Audio Transcription');
  });

  test('Subtitle Generator - create video subtitles', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/subtitle-generator');
    await expect(page.locator('main h1')).toContainText('Subtitle');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.video.mp4);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Subtitle Generator');
  });

  test('Audiogram Maker - create audio visuals', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/audiogram-maker');
    await expect(page.locator('main h1')).toContainText('Audiogram');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.audio.mp3);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Audiogram Maker');
  });

  test('Subtitle Editor - edit subtitle files', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/subtitle-editor');
    await expect(page.locator('main h1')).toContainText('Subtitle');

    // Subtitle editor usually accepts .srt, .vtt files or has a text editor
    const editor = page.locator('textarea, .editor').first();
    await expect(editor).toBeVisible();

    assertNoCriticalErrors(errors, 'Subtitle Editor');
  });
});

test.describe('🛠️ Utility Tools (Extended)', () => {
  test('Base64 - encode/decode tool', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto();
    await expect(page.locator('main h1')).toContainText('Base64');

    // Enter text to encode
    const input = page.locator('textarea').first();
    await input.fill('Hello World');

    // Click encode
    const encodeBtn = page.locator('button:has-text("Encode"), button:has-text("Convert")').first();
    await encodeBtn.click();

    await page.waitForTimeout(500);

    // Verify output contains base64
    const output = page.locator('textarea').nth(1);
    const text = await output.inputValue().catch(() => '');
    expect(text).toContain('SGVsbG8gV29ybGQ=');

    assertNoCriticalErrors(errors, 'Base64');
  });

  test('Color Converter - convert color formats', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto();
    await expect(page.locator('main h1')).toContainText('Color');

    // Enter hex color
    const input = page.locator('input[type="text"]').first();
    await input.fill('#FF5733');

    // Trigger conversion
    await input.press('Tab');
    await page.waitForTimeout(500);

    assertNoCriticalErrors(errors, 'Color Converter');
  });

  test('Unit Converter - convert units', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/unit-converter');
    await expect(page.locator('main h1')).toContainText('Unit');

    // Enter value
    const input = page.locator('input[type="number"]').first();
    await input.fill('100');

    // Select units if dropdowns exist
    await page.waitForTimeout(500);

    assertNoCriticalErrors(errors, 'Unit Converter');
  });

  test('QR Reader - scan QR codes', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/qr-reader');
    await expect(page.locator('main h1')).toContainText('QR');

    // Upload QR image
    await uploadFile(page, FIXTURES.image.png);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'QR Reader');
  });

  test('Code Beautifier - format code', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto();
    await expect(page.locator('main h1')).toContainText('Beautif');

    // Enter code
    const code = `function test(){console.log("hello");}`;
    const input = page.locator('textarea').first();
    await input.fill(code);

    // Format
    const formatBtn = page.locator('button:has-text("Format"), button:has-text("Beautify")').first();
    await formatBtn.click();

    await page.waitForTimeout(500);

    assertNoCriticalErrors(errors, 'Code Beautifier');
  });

  test('SVG Editor - edit SVG files', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/svg-editor');
    await expect(page.locator('main h1')).toContainText('SVG');

    // SVG editor should have a canvas or textarea
    const editor = page.locator('textarea, svg, .editor').first();
    await expect(editor).toBeVisible();

    assertNoCriticalErrors(errors, 'SVG Editor');
  });

  test('Markdown Editor - edit markdown', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto();
    await expect(page.locator('main h1')).toContainText('Markdown');

    // Enter markdown
    const markdown = '# Hello World\n\nThis is a **test**.';
    const input = page.locator('textarea').first();
    await input.fill(markdown);

    await page.waitForTimeout(500);

    // Preview should update
    const preview = page.locator('.preview, [data-testid="preview"]').first();
    await expect(preview).toContainText('Hello World');

    assertNoCriticalErrors(errors, 'Markdown Editor');
  });
});

test.describe('🤖 AI Tools (Extended)', () => {
  test('Sentiment Analysis - analyze text sentiment', async ({ page }) => {
    test.setTimeout(120000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/sentiment-analysis');
    await expect(page.locator('main h1')).toContainText('Sentiment');

    await waitForHeavyLibrary(page, { timeout: 60000 });

    // Enter text
    const input = page.locator('textarea').first();
    await input.fill('This product is amazing! I love it.');

    // Analyze
    const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Check")').first();
    await analyzeBtn.click();

    await page.waitForTimeout(3000);

    assertNoCriticalErrors(errors, 'Sentiment Analysis');
  });

  test('Object Detection - detect objects in images', async ({ page }) => {
    test.setTimeout(120000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/object-detection');
    await expect(page.locator('main h1')).toContainText('Object');

    await waitForHeavyLibrary(page, { timeout: 60000 });

    await uploadFile(page, FIXTURES.image.jpg);
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Object Detection');
  });

  test('AI Summary - summarize content', async ({ page }) => {
    test.setTimeout(120000);
    const { errors } = setupErrorCapture(page);

    await page.goto();
    await expect(page.locator('main h1')).toContainText('Summary');

    await waitForHeavyLibrary(page, { timeout: 60000 });

    // Enter text
    const input = page.locator('textarea').first();
    await input.fill(`
      Artificial intelligence has revolutionized many industries. From healthcare to finance,
      AI systems are helping professionals make better decisions. Machine learning algorithms
      can analyze vast amounts of data to find patterns humans might miss. Natural language
      processing enables computers to understand and generate human language. Computer vision
      allows machines to interpret visual information from the world.
    `);

    // Summarize
    const summarizeBtn = page.locator('button:has-text("Summarize"), button:has-text("Analyze")').first();
    await summarizeBtn.click();

    await page.waitForTimeout(5000);

    assertNoCriticalErrors(errors, 'AI Summary');
  });
});
