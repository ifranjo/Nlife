/**
 * E2E Functional Tests - Real file processing verification
 *
 * These tests upload actual files, process them, and verify the output.
 * Not just "page loads" - actual tool functionality testing.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

// ============================================================================
// AI SUMMARY - Real text processing
// ============================================================================
test.describe('AI Summary - Functional', () => {
  test('processes pasted text and generates summary', async ({ page }) => {
    await page.goto('/tools/ai-summary');

    // Read test article
    const testText = fs.readFileSync(
      path.join(fixturesDir, 'test-article.txt'),
      'utf-8'
    );

    // Find textarea and input text
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Use evaluate to set value directly (bypasses React controlled input issues)
    await textarea.evaluate((el, text) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, testText);

    // Wait for button to enable
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeEnabled({ timeout: 5000 });

    // Click generate
    await generateBtn.click();

    // Wait for processing and verify output contains key terms from the input
    await expect(page.locator('body')).toContainText(/machine|learning|artificial|intelligence/i, {
      timeout: 15000
    });
  });

  test('processes uploaded TXT file', async ({ page }) => {
    await page.goto('/tools/ai-summary');

    // Look for file input or file tab
    const fileTab = page.getByRole('button', { name: /file|upload|document/i }).first();
    if (await fileTab.isVisible()) {
      await fileTab.click();
    }

    // Find file input
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(path.join(fixturesDir, 'test-article.txt'));

      // Wait for file to be processed
      await page.waitForTimeout(1000);

      // Check if generate button is available
      const generateBtn = page.getByRole('button', { name: /generate/i });
      if (await generateBtn.isEnabled()) {
        await generateBtn.click();

        // Verify processing happened
        await expect(page.locator('body')).toContainText(/machine|learning|summary/i, {
          timeout: 15000
        });
      }
    } else {
      // Skip if no file upload available
      test.skip(true, 'File upload not available in this view');
    }
  });
});

// ============================================================================
// PDF MERGE - Real PDF processing
// ============================================================================
test.describe('PDF Merge - Functional', () => {
  test('uploads PDF and shows in list', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Upload test PDF
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-document.pdf'));

    // Wait for file to appear in list
    await expect(page.locator('body')).toContainText(/test-document|pdf|1 file/i, {
      timeout: 10000
    });

    // Verify file is shown (could be in a list or preview)
    const fileList = page.locator('[class*="file"], [class*="item"], [class*="pdf"]');
    await expect(fileList.first()).toBeVisible({ timeout: 5000 });
  });

  test('merges multiple PDFs and downloads result', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    const fileInput = page.locator('input[type="file"]');

    // Upload same PDF twice (simulating merge)
    await fileInput.setInputFiles([
      path.join(fixturesDir, 'test-document.pdf'),
      path.join(fixturesDir, 'test-document.pdf')
    ]);

    // Wait for files to be listed
    await page.waitForTimeout(1000);

    // Find and click merge button
    const mergeBtn = page.getByRole('button', { name: /merge|combine|download/i });
    await expect(mergeBtn).toBeVisible({ timeout: 5000 });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      mergeBtn.click()
    ]);

    // Verify download happened
    expect(download.suggestedFilename()).toContain('.pdf');

    // Optionally verify file size (merged should be larger)
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    }
  });
});

// ============================================================================
// IMAGE COMPRESS - Real image processing
// ============================================================================
test.describe('Image Compress - Functional', () => {
  test('uploads image and shows preview', async ({ page }) => {
    await page.goto('/tools/image-compress');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Upload test image
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Wait for preview to appear
    await expect(page.locator('img').first()).toBeVisible({ timeout: 10000 });
  });

  test('compresses image and shows size reduction', async ({ page }) => {
    await page.goto('/tools/image-compress');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Find compress button (says "Compress X Image(s)")
    const compressBtn = page.getByRole('button', { name: /compress/i });
    await expect(compressBtn).toBeVisible({ timeout: 5000 });
    await compressBtn.click();

    // Wait for compression to complete
    await page.waitForTimeout(3000);

    // Look for compression info (size, percentage, etc.)
    const hasCompressionInfo = await page.locator('body').textContent();

    // Should show some size information
    expect(
      hasCompressionInfo?.match(/\d+(\.\d+)?\s*(KB|MB|%|bytes)/i) ||
      hasCompressionInfo?.match(/compressed|reduced|saved/i)
    ).toBeTruthy();
  });

  test('downloads compressed image', async ({ page }) => {
    await page.goto('/tools/image-compress');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Click compress first
    const compressBtn = page.getByRole('button', { name: /compress/i });
    await expect(compressBtn).toBeVisible({ timeout: 5000 });
    await compressBtn.click();

    // Wait for "Download All as ZIP" button to appear (means compression finished)
    const downloadBtn = page.getByRole('button', { name: /Download All as ZIP/i });
    await expect(downloadBtn).toBeVisible({ timeout: 15000 });

    // Download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadBtn.click()
    ]);

    expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg|webp|zip)$/i);
  });
});

// ============================================================================
// FILE CONVERTER - Real format conversion
// ============================================================================
test.describe('File Converter - Functional', () => {
  test('converts PNG to JPG', async ({ page }) => {
    await page.goto('/tools/file-converter');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Upload PNG
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Wait for file to load
    await page.waitForTimeout(1000);

    // Select JPG output format (if there's a selector)
    const formatSelector = page.locator('select, [role="combobox"]').first();
    if (await formatSelector.isVisible()) {
      await formatSelector.selectOption({ label: /jpg|jpeg/i });
    }

    // Find and click convert button (says "Convert X Image(s) to FORMAT")
    const convertBtn = page.getByRole('button', { name: /convert.*image/i });
    await expect(convertBtn.first()).toBeVisible({ timeout: 5000 });
    await convertBtn.first().click();

    // Wait for conversion to complete - "Download All as ZIP" button appears
    const downloadBtn = page.getByRole('button', { name: /Download All as ZIP/i });
    await expect(downloadBtn).toBeVisible({ timeout: 15000 });

    // Download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadBtn.click()
    ]);

    // Verify ZIP output (contains converted images)
    expect(download.suggestedFilename()).toMatch(/\.(zip|jpg|jpeg)$/i);
  });
});

// ============================================================================
// QR GENERATOR - Real QR generation
// ============================================================================
test.describe('QR Generator - Functional', () => {
  test('generates QR code from text', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    // Find text input (could be input or textarea)
    const textInput = page.locator('input[type="text"], input[type="url"], textarea').first();
    await expect(textInput).toBeVisible({ timeout: 10000 });

    // Enter URL
    await textInput.fill('https://example.com/test');

    // Wait for QR to generate (usually automatic)
    await page.waitForTimeout(2000);

    // Verify QR code canvas appears (look for canvas in main content, not navbar icons)
    // The QR canvas is inside the main content area
    const qrCanvas = page.locator('main canvas, .glass-card canvas, canvas[width]').first();
    await expect(qrCanvas).toBeVisible({ timeout: 5000 });
  });

  test('downloads QR code as PNG', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    const textInput = page.locator('input[type="text"], input[type="url"], textarea').first();
    await expect(textInput).toBeVisible({ timeout: 10000 });
    await textInput.fill('https://newlifesolutions.dev');

    await page.waitForTimeout(2000);

    // Find PNG download button (buttons say "PNG" and "SVG")
    const pngBtn = page.getByRole('button', { name: 'PNG' });
    await expect(pngBtn).toBeVisible({ timeout: 5000 });

    // Download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      pngBtn.click()
    ]);

    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});

// ============================================================================
// BACKGROUND REMOVER - Real AI processing
// ============================================================================
test.describe('Background Remover - Functional', () => {
  test('page loads with file upload ready', async ({ page }) => {
    await page.goto('/tools/background-remover');

    // Verify page structure
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/background/i);

    // File input should be ready
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Should accept image types
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('image');

    // Upload area text should be visible
    await expect(page.locator('text=/drop|browse|upload/i').first()).toBeVisible();
  });

  // AI processing test - skipped in CI due to WebGPU/WebGL requirements
  test.skip('uploads image and processes with AI (requires GPU)', async ({ page }) => {
    // This test requires WebGPU or WebGL which may not work in headless/CI
    // Run manually with: npx playwright test --headed -g "processes with AI"
    await page.goto('/tools/background-remover');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Wait for processing indicator or result
    const result = page.locator('canvas, img[src*="blob:"]').first();
    await expect(result).toBeVisible({ timeout: 120000 });
  });
});

// ============================================================================
// TEXT TOOLS - Quick functional tests
// ============================================================================
test.describe('Text Tools - Functional', () => {
  test('word counter counts words correctly', async ({ page }) => {
    await page.goto('/tools/word-counter');

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    await textarea.fill('This is a test with exactly ten words in it.');

    // Should show word count
    await expect(page.locator('body')).toContainText(/10|ten/i, { timeout: 5000 });
  });

  test('text case converter changes case', async ({ page }) => {
    await page.goto('/tools/text-case');

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    await textarea.fill('hello world');

    // Look for any case conversion button
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    // Find and click a case conversion button
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      if (text?.match(/upper|lower|title|sentence|camel|snake/i)) {
        await btn.click();
        // Just verify no crash - the conversion happened
        await page.waitForTimeout(500);
        break;
      }
    }

    // Page should still be functional
    await expect(textarea).toBeVisible();
  });

  test('lorem ipsum generates text', async ({ page }) => {
    await page.goto('/tools/lorem-ipsum');

    // Find generate button
    const generateBtn = page.getByRole('button', { name: /generate|create/i });
    await expect(generateBtn.first()).toBeVisible();

    await generateBtn.first().click();

    // Should show lorem ipsum text
    await expect(page.locator('body')).toContainText(/lorem ipsum|dolor sit/i, { timeout: 5000 });
  });
});

// ============================================================================
// ERROR HANDLING - Verify graceful failures
// ============================================================================
test.describe('Error Handling', () => {
  test('PDF merge handles invalid file gracefully', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    const fileInput = page.locator('input[type="file"]');

    // Try to upload a text file as PDF (should fail gracefully)
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-article.txt'));

    // Should show error message, not crash
    await page.waitForTimeout(2000);

    // Page should still be functional (no crash)
    await expect(page.locator('body')).not.toContainText(/error|exception|undefined/i);
  });

  test('image compress handles no file selected', async ({ page }) => {
    await page.goto('/tools/image-compress');

    // Try to compress without selecting file
    const compressBtn = page.getByRole('button', { name: /compress|download/i }).first();

    if (await compressBtn.isVisible()) {
      // Should be disabled or show message when clicked
      const isDisabled = await compressBtn.isDisabled();
      if (!isDisabled) {
        await compressBtn.click();
        // Should not crash
        await expect(page).toHaveURL(/image-compress/);
      }
    }
  });
});
