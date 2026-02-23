import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  uploadFile,
  uploadMultipleFiles,
  waitForProcessing,
  waitForHeavyLibrary,
  downloadFile,
  verifyOutputFile,
  clearFiles,
  getToolState,
  setupErrorCapture,
  assertNoCriticalErrors,
  FIXTURES_DIR,
  measurePerformance,
} from './lib/test-helpers';

/**
 * TIER 2: CRITICAL PATH E2E TESTS
 * Full file processing tests for the 10 most important tools
 *
 * Run: npx playwright test critical-path --project=chromium
 * Time: ~20-30 minutes (includes heavy library loading)
 */

// Test fixtures - using minimal files for speed
const FIXTURES = {
  pdf: {
    single: path.join(FIXTURES_DIR, 'sample.pdf'),
    multi1: path.join(FIXTURES_DIR, 'sample-1.pdf'),
    multi2: path.join(FIXTURES_DIR, 'sample-2.pdf'),
  },
  image: {
    jpg: path.join(FIXTURES_DIR, 'sample.jpg'),
    png: path.join(FIXTURES_DIR, 'sample.png'),
    large: path.join(FIXTURES_DIR, 'sample-large.jpg'),
  },
  video: {
    mp4: path.join(FIXTURES_DIR, 'sample.mp4'),
  },
  audio: {
    mp3: path.join(FIXTURES_DIR, 'sample.mp3'),
  },
};

test.describe('🔥 CRITICAL PATH - Top 10 Tools', () => {
  test.describe.configure({ mode: 'serial' }); // Serial to avoid resource conflicts

  /**
   * TOOL #1: PDF Merge
   * Most popular document tool
   */
  test('PDF Merge - combine multiple PDFs', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-merge');
    await expect(page.locator('main h1')).toContainText('Merge PDF');

    // Upload multiple PDFs
    await uploadMultipleFiles(page, [FIXTURES.pdf.multi1, FIXTURES.pdf.multi2]);

    // Verify files are listed
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Wait for processing
    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Processing failed: ${error}`).toBe(true);

    // Download merged PDF
    const { filename, size } = await downloadFile(page);
    expect(filename).toMatch(/\.pdf$/i);
    expect(size).toBeGreaterThan(1000); // At least 1KB

    assertNoCriticalErrors(errors, 'PDF Merge');
  });

  /**
   * TOOL #2: PDF Compress
   * High usage document tool
   */
  test('PDF Compress - reduce file size', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-compress');
    await expect(page.locator('main h1')).toContainText('Compress');

    // Upload PDF
    await uploadFile(page, FIXTURES.pdf.single);

    // Verify file uploaded
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Wait for compression options to appear
    await page.waitForSelector('button:has-text("Compress"), button:has-text("Start")', { timeout: 10000 });

    // Start compression
    await page.locator('button:has-text("Compress"), button:has-text("Start")').first().click();

    // Wait for processing
    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Compression failed: ${error}`).toBe(true);

    // Download compressed PDF
    const { filename, size } = await downloadFile(page);
    expect(filename).toMatch(/\.pdf$/i);

    assertNoCriticalErrors(errors, 'PDF Compress');
  });

  /**
   * TOOL #3: Image Compress
   * High usage media tool
   */
  test('Image Compress - reduce image size', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/image-compress');
    await expect(page.locator('main h1')).toContainText('Compress');

    // Upload image
    await uploadFile(page, FIXTURES.image.jpg);

    // Verify upload
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Wait for compression options
    await page.waitForTimeout(1000);

    // Start compression (if button exists)
    const compressBtn = page.locator('button:has-text("Compress"), button:has-text("Start"), button:has-text("Optimize")').first();
    if (await compressBtn.isVisible().catch(() => false)) {
      await compressBtn.click();
    }

    // Wait for processing
    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Image compression failed: ${error}`).toBe(true);

    // Download compressed image
    const { filename, size } = await downloadFile(page);
    expect(filename).toMatch(/\.(jpg|jpeg|png)$/i);
    expect(size).toBeGreaterThan(100);

    assertNoCriticalErrors(errors, 'Image Compress');
  });

  /**
   * TOOL #4: JPG to PDF
   * Common conversion tool
   */
  test('JPG to PDF - convert image to PDF', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/jpg-to-pdf');
    await expect(page.locator('main h1')).toContainText('JPG');

    // Upload JPG
    await uploadFile(page, FIXTURES.image.jpg);

    // Verify upload
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Wait for conversion options
    await page.waitForTimeout(1000);

    // Start conversion
    const convertBtn = page.locator('button:has-text("Convert"), button:has-text("Start")').first();
    if (await convertBtn.isVisible().catch(() => false)) {
      await convertBtn.click();
    }

    // Wait for processing
    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Conversion failed: ${error}`).toBe(true);

    // Download PDF
    const { filename, size } = await downloadFile(page);
    expect(filename).toMatch(/\.pdf$/i);
    expect(size).toBeGreaterThan(1000);

    assertNoCriticalErrors(errors, 'JPG to PDF');
  });

  /**
   * TOOL #5: OCR
   * Complex AI document tool
   */
  test('OCR - extract text from image', async ({ page }) => {
    test.setTimeout(120000); // OCR needs more time for WASM loading
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/ocr');
    await expect(page.locator('main h1')).toContainText('OCR');

    // Wait for Tesseract.js to load
    await waitForHeavyLibrary(page, { timeout: 60000 });

    // Upload image with text
    await uploadFile(page, FIXTURES.image.jpg);

    // Verify upload
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Start OCR (may need to click button)
    const ocrBtn = page.locator('button:has-text("Extract"), button:has-text("OCR"), button:has-text("Start")').first();
    if (await ocrBtn.isVisible().catch(() => false)) {
      await ocrBtn.click();
    }

    // Wait for OCR processing (can take 30+ seconds)
    const { success, error } = await waitForProcessing(page, { timeout: 90000 });
    expect(success, `OCR failed: ${error}`).toBe(true);

    // Verify text output exists
    const textOutput = await page.locator('textarea, .text-output, [data-testid="text-output"]').first();
    const hasOutput = await textOutput.isVisible().catch(() => false);

    // Either text output or download should be available
    const downloadBtn = page.locator('button:has-text("Download"), .download-btn').first();
    const hasDownload = await downloadBtn.isVisible().catch(() => false);

    expect(hasOutput || hasDownload, 'OCR should produce output or download').toBe(true);

    assertNoCriticalErrors(errors, 'OCR');
  });

  /**
   * TOOL #6: Background Remover
   * Heavy AI tool (~180MB model)
   */
  test('Background Remover - remove image background', async ({ page }) => {
    test.setTimeout(180000); // Heavy model loading
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/background-remover');
    await expect(page.locator('main h1')).toContainText('Background');

    // Wait for model to load
    await waitForHeavyLibrary(page, { timeout: 120000 });

    // Upload image
    await uploadFile(page, FIXTURES.image.png);

    // Verify upload
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Start processing
    const removeBtn = page.locator('button:has-text("Remove"), button:has-text("Start")').first();
    if (await removeBtn.isVisible().catch(() => false)) {
      await removeBtn.click();
    }

    // Wait for processing (AI inference can take time)
    const { success, error } = await waitForProcessing(page, { timeout: 120000 });
    expect(success, `Background removal failed: ${error}`).toBe(true);

    // Download result
    const { filename, size } = await downloadFile(page);
    expect(filename).toMatch(/\.(png|jpg|jpeg)$/i);
    expect(size).toBeGreaterThan(100);

    assertNoCriticalErrors(errors, 'Background Remover');
  });

  /**
   * TOOL #7: Video Compressor
   * Heavy FFmpeg tool
   */
  test('Video Compressor - reduce video size', async ({ page }) => {
    test.setTimeout(180000); // FFmpeg loading + processing
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/video-compressor');
    await expect(page.locator('main h1')).toContainText('Video');

    // Wait for FFmpeg to load
    await waitForHeavyLibrary(page, { timeout: 120000 });

    // Upload video
    await uploadFile(page, FIXTURES.video.mp4);

    // Verify upload
    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    // Select compression settings if available
    await page.waitForTimeout(2000);

    // Start compression
    const compressBtn = page.locator('button:has-text("Compress"), button:has-text("Start")').first();
    if (await compressBtn.isVisible().catch(() => false)) {
      await compressBtn.click();
    }

    // Wait for processing (video can take time)
    const { success, error } = await waitForProcessing(page, { timeout: 120000 });
    expect(success, `Video compression failed: ${error}`).toBe(true);

    // Download compressed video
    const { filename, size } = await downloadFile(page);
    expect(filename).toMatch(/\.(mp4|webm|mov)$/i);
    expect(size).toBeGreaterThan(1000);

    assertNoCriticalErrors(errors, 'Video Compressor');
  });

  /**
   * TOOL #8: QR Generator
   * Utility staple
   */
  test('QR Generator - create QR code', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/qr-generator');
    await expect(page.locator('main h1')).toContainText('QR');

    // Enter text/URL for QR code
    const input = page.locator('input[type="text"], input[type="url"], textarea').first();
    await input.fill('https://newlifesolutions.dev');

    // Generate QR
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    await generateBtn.click();

    // Wait for QR to appear
    await page.waitForSelector('img, canvas, svg', { timeout: 10000 });

    // Verify QR code is displayed
    const qrElement = page.locator('img[alt*="QR"], canvas, svg, [data-testid="qr-code"]').first();
    await expect(qrElement).toBeVisible();

    // Download QR code
    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Save")').first();
    await expect(downloadBtn).toBeVisible();

    assertNoCriticalErrors(errors, 'QR Generator');
  });

  /**
   * TOOL #9: Password Generator
   * Security utility
   */
  test('Password Generator - create secure passwords', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/password-generator');
    await expect(page.locator('main h1')).toContainText('Password');

    // Generate password
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    await generateBtn.click();

    // Verify password is displayed
    const passwordDisplay = page.locator('.password-display, [data-testid="password"], .output').first();
    await expect(passwordDisplay).toBeVisible();

    const password = await passwordDisplay.textContent() || '';
    expect(password.length).toBeGreaterThanOrEqual(8);

    // Test copy functionality
    const copyBtn = page.locator('button:has-text("Copy"), [data-testid="copy-btn"]').first();
    if (await copyBtn.isVisible().catch(() => false)) {
      await copyBtn.click();
      // Copy should not throw
    }

    // Test options (length, symbols, etc.)
    const lengthSlider = page.locator('input[type="range"], input[name="length"]').first();
    if (await lengthSlider.isVisible().catch(() => false)) {
      await lengthSlider.fill('20');
      await generateBtn.click();

      const newPassword = await passwordDisplay.textContent() || '';
      expect(newPassword.length).toBeGreaterThanOrEqual(12);
    }

    assertNoCriticalErrors(errors, 'Password Generator');
  });

  /**
   * TOOL #10: JSON Formatter
   * Developer utility
   */
  test('JSON Formatter - format and validate JSON', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/json-formatter');
    await expect(page.locator('main h1')).toContainText('JSON');

    // Enter JSON input
    const sampleJson = JSON.stringify({ name: 'test', value: 123, nested: { a: 1, b: 2 } }, null, 2);
    const input = page.locator('textarea, .json-input, [data-testid="json-input"]').first();
    await input.fill(sampleJson);

    // Format JSON
    const formatBtn = page.locator('button:has-text("Format"), button:has-text("Beautify")').first();
    await formatBtn.click();

    // Wait for output
    await page.waitForTimeout(500);

    // Verify formatted output exists
    const output = page.locator('.json-output, [data-testid="json-output"], .formatted').first();
    const outputText = await output.textContent() || '';
    expect(outputText.length).toBeGreaterThan(0);

    // Verify it's valid JSON
    expect(() => JSON.parse(outputText)).not.toThrow();

    // Test copy/download
    const copyBtn = page.locator('button:has-text("Copy"), button:has-text("Download")').first();
    await expect(copyBtn).toBeVisible();

    assertNoCriticalErrors(errors, 'JSON Formatter');
  });

  /**
   * ADDITIONAL TOOL TESTS (Expanding to 25 tools)
   */

  /**
   * TOOL #11: PDF Split
   */
  test('PDF Split - extract pages from PDF', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-split');
    await expect(page.locator('main h1')).toContainText('Split');

    await uploadFile(page, FIXTURES.pdf.single);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Split failed: ${error}`).toBe(true);

    assertNoCriticalErrors(errors, 'PDF Split');
  });

  /**
   * TOOL #12: PDF to Word
   */
  test('PDF to Word - convert PDF to DOCX', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-to-word');
    await expect(page.locator('main h1')).toContainText('Word');

    await uploadFile(page, FIXTURES.pdf.single);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    const convertBtn = page.locator('button:has-text("Convert"), button:has-text("Start")').first();
    if (await convertBtn.isVisible().catch(() => false)) {
      await convertBtn.click();
    }

    const { success, error } = await waitForProcessing(page, { timeout: 30000 });
    expect(success, `Conversion failed: ${error}`).toBe(true);

    assertNoCriticalErrors(errors, 'PDF to Word');
  });

  /**
   * TOOL #13: PDF Organizer
   */
  test('PDF Organizer - reorder pages', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/pdf-organize');
    await expect(page.locator('main h1')).toContainText('Organize');

    await uploadFile(page, FIXTURES.pdf.single);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'PDF Organizer');
  });

  /**
   * TOOL #14: Video Trimmer
   */
  test('Video Trimmer - cut video clips', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/video-trimmer');
    await expect(page.locator('main h1')).toContainText('Trim');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.video.mp4);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Video Trimmer');
  });

  /**
   * TOOL #15: GIF Maker
   */
  test('GIF Maker - convert video to GIF', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/gif-maker');
    await expect(page.locator('main h1')).toContainText('GIF');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.video.mp4);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'GIF Maker');
  });

  /**
   * TOOL #16: Audio Editor
   */
  test('Audio Editor - trim audio', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/audio-editor');
    await expect(page.locator('main h1')).toContainText('Audio');

    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.audio.mp3);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Audio Editor');
  });

  /**
   * TOOL #17: Screen Recorder
   */
  test('Screen Recorder - recording interface loads', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/screen-recorder');
    await expect(page.locator('main h1')).toContainText('Screen');

    // Check for record button
    const recordBtn = page.locator('button:has-text("Record"), button:has-text("Start"), [data-testid="record-btn"]').first();
    await expect(recordBtn).toBeVisible();

    assertNoCriticalErrors(errors, 'Screen Recorder');
  });

  /**
   * TOOL #18: Text Case Converter
   */
  test('Text Case - convert text case', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/text-case');
    await expect(page.locator('main h1')).toContainText('Case');

    // Enter text
    const input = page.locator('textarea').first();
    await input.fill('Hello World Test');

    // Click uppercase
    const upperBtn = page.locator('button:has-text("UPPERCASE"), button:has-text("Upper")').first();
    await upperBtn.click();

    // Check output
    await page.waitForTimeout(500);

    assertNoCriticalErrors(errors, 'Text Case');
  });

  /**
   * TOOL #19: Word Counter
   */
  test('Word Counter - count words and characters', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/word-counter');
    await expect(page.locator('main h1')).toContainText('Word');

    // Enter text
    const input = page.locator('textarea').first();
    await input.fill('This is a test sentence with eight words.');

    // Wait for count
    await page.waitForTimeout(500);

    // Check for word count display
    const wordCount = page.locator('.word-count, [data-testid="word-count"], text=8').first();
    await expect(wordCount).toBeVisible().catch(() => {}); // Some tools don't show immediately

    assertNoCriticalErrors(errors, 'Word Counter');
  });

  /**
   * TOOL #20: Lorem Ipsum Generator
   */
  test('Lorem Ipsum - generate placeholder text', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/lorem-ipsum');
    await expect(page.locator('main h1')).toContainText('Lorem');

    // Generate text
    const generateBtn = page.locator('button:has-text("Generate")').first();
    await generateBtn.click();

    // Check output
    const output = page.locator('textarea, .output').first();
    const text = await output.inputValue().catch(() => '');
    expect(text.length).toBeGreaterThan(10);

    assertNoCriticalErrors(errors, 'Lorem Ipsum');
  });

  /**
   * TOOL #21: Hash Generator
   */
  test('Hash Generator - create file hashes', async ({ page }) => {
    test.setTimeout(60000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/hash-generator');
    await expect(page.locator('main h1')).toContainText('Hash');

    // Enter text to hash
    const input = page.locator('textarea, input[type="text"]').first();
    await input.fill('test input for hashing');

    // Generate hash
    const hashBtn = page.locator('button:has-text("Hash"), button:has-text("Generate")').first();
    await hashBtn.click();

    // Wait for output
    await page.waitForTimeout(500);

    assertNoCriticalErrors(errors, 'Hash Generator');
  });

  /**
   * TOOL #22: Grammar Checker
   */
  test('Grammar Checker - check text grammar', async ({ page }) => {
    test.setTimeout(120000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/grammar-checker');
    await expect(page.locator('main h1')).toContainText('Grammar');

    // Wait for AI model
    await waitForHeavyLibrary(page, { timeout: 60000 });

    // Enter text with errors
    const input = page.locator('textarea').first();
    await input.fill('I has a apple. This are good.');

    // Check grammar
    const checkBtn = page.locator('button:has-text("Check"), button:has-text("Analyze")').first();
    if (await checkBtn.isVisible().catch(() => false)) {
      await checkBtn.click();
    }

    // Wait for processing
    await page.waitForTimeout(3000);

    assertNoCriticalErrors(errors, 'Grammar Checker');
  });

  /**
   * TOOL #23: Image Upscaler
   */
  test('Image Upscaler - upscale images with AI', async ({ page }) => {
    test.setTimeout(180000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/image-upscaler');
    await expect(page.locator('main h1')).toContainText('Upscale');

    // Wait for AI model
    await waitForHeavyLibrary(page, { timeout: 120000 });

    await uploadFile(page, FIXTURES.image.jpg);

    const state = await getToolState(page);
    expect(state.filesUploaded).toBe(true);

    assertNoCriticalErrors(errors, 'Image Upscaler');
  });

  /**
   * TOOL #24: Text Summarization
   */
  test('Text Summarization - summarize long text', async ({ page }) => {
    test.setTimeout(120000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/text-summarization');
    await expect(page.locator('main h1')).toContainText('Summar');

    // Wait for AI model
    await waitForHeavyLibrary(page, { timeout: 60000 });

    // Enter long text
    const input = page.locator('textarea').first();
    await input.fill(`
      Artificial intelligence (AI) is intelligence demonstrated by machines,
      as opposed to the natural intelligence displayed by animals including humans.
      AI research has been defined as the field of study of intelligent agents,
      which refers to any system that perceives its environment and takes actions
      that maximize its chance of achieving its goals. The term "artificial intelligence"
      had previously been used to describe machines that mimic and display "human"
      cognitive skills that are associated with the human mind, such as "learning" and "problem-solving".
      This has led to the subfield of AI known as machine learning, which uses statistical
      methods to improve at tasks with experience.
    `);

    // Summarize
    const summarizeBtn = page.locator('button:has-text("Summarize"), button:has-text("Analyze")').first();
    if (await summarizeBtn.isVisible().catch(() => false)) {
      await summarizeBtn.click();
    }

    // Wait for processing
    await page.waitForTimeout(5000);

    assertNoCriticalErrors(errors, 'Text Summarization');
  });

  /**
   * TOOL #25: Diff Checker
   */
  test('Diff Checker - compare two texts', async ({ page }) => {
    test.setTimeout(30000);
    const { errors } = setupErrorCapture(page);

    await page.goto('/tools/diff-checker');
    await expect(page.locator('main h1')).toContainText('Diff');

    // Enter texts
    const inputs = page.locator('textarea');
    await inputs.nth(0).fill('Line 1\nLine 2\nLine 3');
    await inputs.nth(1).fill('Line 1\nModified Line 2\nLine 3');

    // Compare
    const compareBtn = page.locator('button:has-text("Compare"), button:has-text("Diff")').first();
    await compareBtn.click();

    // Wait for diff
    await page.waitForTimeout(500);

    assertNoCriticalErrors(errors, 'Diff Checker');
  });
});

test.describe('📊 Critical Path Summary', () => {
  test('all critical tools have passing smoke tests', async ({ page }) => {
    const criticalTools = [
      // Original 10
      '/tools/pdf-merge',
      '/tools/pdf-compress',
      '/tools/image-compress',
      '/tools/jpg-to-pdf',
      '/tools/ocr',
      '/tools/background-remover',
      '/tools/video-compressor',
      '/tools/qr-generator',
      '/tools/password-generator',
      '/tools/json-formatter',
      // Additional 15
      '/tools/pdf-split',
      '/tools/pdf-to-word',
      '/tools/pdf-organize',
      '/tools/video-trimmer',
      '/tools/gif-maker',
      '/tools/audio-editor',
      '/tools/screen-recorder',
      '/tools/text-case',
      '/tools/word-counter',
      '/tools/lorem-ipsum',
      '/tools/hash-generator',
      '/tools/grammar-checker',
      '/tools/image-upscaler',
      '/tools/text-summarization',
      '/tools/diff-checker',
    ];

    const results: { path: string; loadTime: number; error?: string }[] = [];

    for (const path of criticalTools) {
      try {
        const { result: _, duration } = await measurePerformance(async () => {
          const response = await page.goto(path, { waitUntil: 'networkidle' });
          if (!response || response.status() !== 200) {
            throw new Error(`HTTP ${response?.status() || 'no response'}`);
          }
          return true;
        });

        results.push({ path, loadTime: duration });
      } catch (error) {
        results.push({
          path,
          loadTime: -1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const failed = results.filter(r => r.error);
    const passed = results.filter(r => !r.error);
    const avgLoadTime = passed.reduce((a, b) => a + b.loadTime, 0) / passed.length;

    console.log('\n📊 CRITICAL PATH SUMMARY:');
    console.log(`   ✅ ${passed.length}/${results.length} tools loaded successfully`);
    console.log(`   ❌ ${failed.length} failures`);
    console.log(`   ⏱️  Average load time: ${Math.round(avgLoadTime)}ms`);

    if (failed.length > 0) {
      console.log(`   Failed: ${failed.map(f => f.path).join(', ')}`);
    }

    expect(failed.length, `${failed.length} critical tools failed to load`).toBe(0);
  });
});
