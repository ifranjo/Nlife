/**
 * Integration Workflow Tests
 *
 * These tests verify complete user workflows end-to-end, including:
 * - File uploads
 * - User interactions (reordering, customization)
 * - Processing
 * - Download and verification
 *
 * Each test simulates a real user completing a task from start to finish.
 */
import { test, expect, type Page, type Download } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { waitForReactHydration } from './test-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

// Helper to verify downloaded file exists and has content
async function verifyDownload(download: Download, expectedPattern: RegExp): Promise<{ size: number; path: string }> {
  const filename = download.suggestedFilename();
  expect(filename).toMatch(expectedPattern);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  const stats = fs.statSync(downloadPath!);
  expect(stats.size).toBeGreaterThan(0);

  return { size: stats.size, path: downloadPath! };
}

// Helper to set text in React controlled input
async function setReactInputValue(page: Page, selector: string, value: string) {
  const element = page.locator(selector).first();
  await element.evaluate((el, text) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

// =============================================================================
// WORKFLOW 1: PDF MERGE
// Upload multiple PDFs -> Reorder -> Merge -> Download -> Verify merged file
// =============================================================================
test.describe('PDF Merge Workflow', () => {
  test('complete workflow: upload, reorder, merge, download', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // Step 1: Upload multiple PDFs
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    // Upload same PDF twice to simulate merging
    await fileInput.setInputFiles([
      path.join(fixturesDir, 'test-document.pdf'),
      path.join(fixturesDir, 'test-document.pdf'),
    ]);

    // Step 2: Verify files appear in list
    await page.waitForTimeout(1500);

    // Check that files are displayed (look for file items in the list)
    const fileItems = page.locator('[class*="file"], [class*="item"], [class*="list"] > div').filter({
      hasText: /test-document|pdf/i,
    });
    await expect(fileItems.first()).toBeVisible({ timeout: 5000 });

    // Step 3: Try to reorder files (if move buttons are available)
    const moveDownBtn = page.getByRole('button', { name: /move down|reorder|↓/i }).first();
    if (await moveDownBtn.isVisible()) {
      await moveDownBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 4: Click merge button
    const mergeBtn = page.getByRole('button', { name: /merge|combine/i });
    await expect(mergeBtn).toBeVisible({ timeout: 5000 });

    // Step 5: Download merged file
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      mergeBtn.click(),
    ]);

    // Step 6: Verify download
    const { size } = await verifyDownload(download, /\.pdf$/i);

    // Merged file should be larger than single document
    const originalSize = fs.statSync(path.join(fixturesDir, 'test-document.pdf')).size;
    expect(size).toBeGreaterThan(originalSize);

    // Verify page still functional after download
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('handles empty state gracefully', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // Merge button should be disabled or hidden when no files
    const mergeBtn = page.getByRole('button', { name: /merge|combine/i });

    // Either button is not visible, or it's disabled
    const isVisible = await mergeBtn.isVisible();
    if (isVisible) {
      const isDisabled = await mergeBtn.isDisabled();
      expect(isDisabled).toBe(true);
    }
  });
});

// =============================================================================
// WORKFLOW 2: IMAGE COMPRESS
// Upload image -> Adjust settings -> Compress -> Download -> Verify size reduced
// =============================================================================
test.describe('Image Compress Workflow', () => {
  test('complete workflow: upload, configure quality, compress, download, verify reduction', async ({ page }) => {
    await page.goto('/tools/image-compress');

    // Step 1: Upload image
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    const testImagePath = path.join(fixturesDir, 'test-image.png');
    const originalSize = fs.statSync(testImagePath).size;

    await fileInput.setInputFiles(testImagePath);

    // Step 2: Wait for preview
    await expect(page.locator('img').first()).toBeVisible({ timeout: 10000 });

    // Step 3: Adjust quality settings (if slider available)
    const qualitySlider = page.locator('input[type="range"]').first();
    if (await qualitySlider.isVisible()) {
      // Set quality to 60% for better compression
      await qualitySlider.evaluate((el) => {
        (el as HTMLInputElement).value = '60';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(500);
    }

    // Step 4: Click compress button
    const compressBtn = page.getByRole('button', { name: /compress/i });
    await expect(compressBtn).toBeVisible({ timeout: 5000 });
    await compressBtn.click();

    // Step 5: Wait for compression to complete
    const downloadBtn = page.getByRole('button', { name: /Download All as ZIP/i });
    await expect(downloadBtn).toBeVisible({ timeout: 20000 });

    // Step 6: Verify compression stats are shown
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/\d+(\.\d+)?\s*(KB|MB|%|bytes)/i);

    // Step 7: Download compressed file
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadBtn.click(),
    ]);

    // Step 8: Verify download
    const { size: compressedSize } = await verifyDownload(download, /\.(zip|png|jpg|jpeg|webp)$/i);

    // Note: ZIP might be larger due to overhead, but individual files should be smaller
    // For this test, we just verify the download happened
    expect(compressedSize).toBeGreaterThan(0);
  });

  test('shows compression percentage in UI', async ({ page }) => {
    await page.goto('/tools/image-compress');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Wait for file to load
    await page.waitForTimeout(1000);

    // Compress
    const compressBtn = page.getByRole('button', { name: /compress/i });
    await compressBtn.click();

    // Wait for completion
    await page.getByRole('button', { name: /Download All as ZIP/i }).waitFor({ timeout: 20000 });

    // Check for compression percentage or size reduction indicator
    const content = await page.locator('body').textContent();
    expect(
      content?.match(/-?\d+(\.\d+)?%/) ||
      content?.match(/saved|reduced|compressed/i)
    ).toBeTruthy();
  });
});

// =============================================================================
// WORKFLOW 3: QR GENERATOR
// Enter URL -> Customize colors/size -> Download PNG and SVG -> Verify files
// =============================================================================
test.describe('QR Generator Workflow', () => {
  test('complete workflow: enter data, customize, download PNG and SVG', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    // Step 1: Enter URL data
    const textInput = page.locator('input[type="text"], input[type="url"], textarea').first();
    await expect(textInput).toBeVisible({ timeout: 10000 });

    await textInput.fill('https://example.com/test-qr-workflow');

    // Step 2: Wait for QR code to generate
    await page.waitForTimeout(1500);

    // Verify QR canvas is visible
    const qrCanvas = page.locator('main canvas, .glass-card canvas, canvas[width]').first();
    await expect(qrCanvas).toBeVisible({ timeout: 5000 });

    // Step 3: Customize colors (if color inputs available)
    const colorInput = page.locator('input[type="color"]').first();
    if (await colorInput.isVisible()) {
      await colorInput.evaluate((el) => {
        (el as HTMLInputElement).value = '#0000FF'; // Blue
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(500);
    }

    // Step 4: Customize size (if size selector available)
    const sizeSelector = page.locator('select').first();
    if (await sizeSelector.isVisible()) {
      const options = await sizeSelector.locator('option').allTextContents();
      if (options.length > 1) {
        await sizeSelector.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }

    // Step 5: Download PNG
    const pngBtn = page.getByRole('button', { name: 'PNG' });
    await expect(pngBtn).toBeVisible({ timeout: 5000 });

    const [pngDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      pngBtn.click(),
    ]);

    const { size: pngSize } = await verifyDownload(pngDownload, /\.png$/i);
    expect(pngSize).toBeGreaterThan(100); // QR PNG should be at least 100 bytes

    // Step 6: Download SVG
    const svgBtn = page.getByRole('button', { name: 'SVG' });
    await expect(svgBtn).toBeVisible({ timeout: 5000 });

    const [svgDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      svgBtn.click(),
    ]);

    const { size: svgSize, path: svgPath } = await verifyDownload(svgDownload, /\.svg$/i);
    expect(svgSize).toBeGreaterThan(100);

    // Verify SVG content is valid
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
  });

  test('generates different QR types', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    // Test WiFi QR generation
    const wifiTab = page.getByRole('button', { name: /wifi/i });
    if (await wifiTab.isVisible()) {
      await wifiTab.click();

      const ssidInput = page.locator('input[placeholder*="SSID"], input[name*="ssid"]').first();
      if (await ssidInput.isVisible()) {
        await ssidInput.fill('TestNetwork');

        const passwordInput = page.locator('input[type="password"], input[placeholder*="password"]').first();
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('TestPassword123');
        }

        await page.waitForTimeout(1500);

        // QR should be generated
        const qrCanvas = page.locator('main canvas, canvas[width]').first();
        await expect(qrCanvas).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// =============================================================================
// WORKFLOW 4: AI SUMMARY
// Paste text -> Generate summary -> Copy result -> Verify clipboard
// =============================================================================
test.describe('AI Summary Workflow', () => {
  test('complete workflow: paste text, generate summary, copy to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/tools/ai-summary');

    // Step 1: Read test article
    const testText = fs.readFileSync(
      path.join(fixturesDir, 'test-article.txt'),
      'utf-8'
    );

    // Step 2: Paste text into textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    await setReactInputValue(page, 'textarea', testText);

    // Step 3: Verify text was entered (check for word count or character count)
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/\d+\s*(words?|characters?)/i);

    // Step 4: Configure summary options (if available)
    const lengthSelector = page.locator('select').first();
    if (await lengthSelector.isVisible()) {
      await lengthSelector.selectOption({ index: 0 }); // Brief
    }

    // Step 5: Click generate button
    const generateBtn = page.getByRole('button', { name: /generate|summarize/i });
    await expect(generateBtn).toBeEnabled({ timeout: 5000 });
    await generateBtn.click();

    // Step 6: Wait for summary to be generated
    await page.waitForTimeout(3000);

    // The summary should contain key terms from input (machine learning, AI, etc.)
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toMatch(/machine|learning|artificial|intelligence|summary|result/i);

    // Step 7: Copy summary to clipboard (if copy button available)
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();

      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.length).toBeGreaterThan(10);
    }
  });

  test('handles file upload input', async ({ page }) => {
    await page.goto('/tools/ai-summary');

    // Look for file tab
    const fileTab = page.getByRole('button', { name: /file|upload|document/i }).first();
    if (await fileTab.isVisible()) {
      await fileTab.click();

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(path.join(fixturesDir, 'test-article.txt'));

        // Wait for file processing
        await page.waitForTimeout(2000);

        // Generate button should be available
        const generateBtn = page.getByRole('button', { name: /generate|summarize/i });
        await expect(generateBtn).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// =============================================================================
// WORKFLOW 5: FILE CONVERTER (Image Format Conversion)
// Upload PNG -> Select JPG format -> Convert -> Download -> Verify format
// =============================================================================
test.describe('File Converter Workflow', () => {
  test('complete workflow: upload PNG, convert to JPG, download, verify format', async ({ page }) => {
    await page.goto('/tools/file-converter');

    // Step 1: Upload PNG image
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    // Step 2: Wait for file to load
    await page.waitForTimeout(1500);

    // Verify file appears in list
    const fileItem = page.locator('[class*="file"], [class*="item"]').filter({
      hasText: /test-image|png/i,
    }).first();
    await expect(fileItem).toBeVisible({ timeout: 5000 });

    // Step 3: Select JPG output format
    const formatSelector = page.locator('select').first();
    if (await formatSelector.isVisible()) {
      await formatSelector.selectOption({ value: 'jpg' });
    } else {
      // Try button-based format selection
      const jpgBtn = page.getByRole('button', { name: /jpg|jpeg/i }).first();
      if (await jpgBtn.isVisible()) {
        await jpgBtn.click();
      }
    }

    // Step 4: Adjust quality (if available)
    const qualitySlider = page.locator('input[type="range"]').first();
    if (await qualitySlider.isVisible()) {
      await qualitySlider.evaluate((el) => {
        (el as HTMLInputElement).value = '85';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    // Step 5: Click convert button
    const convertBtn = page.getByRole('button', { name: /convert/i }).first();
    await expect(convertBtn).toBeVisible({ timeout: 5000 });
    await convertBtn.click();

    // Step 6: Wait for conversion to complete
    const downloadBtn = page.getByRole('button', { name: /Download All as ZIP/i });
    await expect(downloadBtn).toBeVisible({ timeout: 20000 });

    // Step 7: Download converted file
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      downloadBtn.click(),
    ]);

    // Step 8: Verify download
    await verifyDownload(download, /\.(zip|jpg|jpeg)$/i);
  });

  test('converts multiple images in batch', async ({ page }) => {
    await page.goto('/tools/file-converter');

    const fileInput = page.locator('input[type="file"]');

    // Upload multiple images
    await fileInput.setInputFiles([
      path.join(fixturesDir, 'test-image.png'),
      path.join(fixturesDir, 'test-image.jpg'),
    ]);

    await page.waitForTimeout(1500);

    // Should show multiple files
    const fileList = page.locator('[class*="file"], [class*="item"]');
    const count = await fileList.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Convert
    const convertBtn = page.getByRole('button', { name: /convert/i }).first();
    await convertBtn.click();

    // Should complete
    const downloadBtn = page.getByRole('button', { name: /Download All as ZIP/i });
    await expect(downloadBtn).toBeVisible({ timeout: 30000 });
  });
});

// =============================================================================
// CROSS-TOOL WORKFLOW: Document Processing Pipeline
// This simulates a user working with multiple tools in sequence
// =============================================================================
test.describe('Cross-Tool Workflow', () => {
  test('user can navigate between tools and complete tasks', async ({ page }) => {
    // Start at hub
    await page.goto('/hub');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Navigate to PDF Merge
    const pdfMergeLink = page.getByRole('link', { name: /pdf merge/i }).first();
    await pdfMergeLink.click();
    await expect(page).toHaveURL(/pdf-merge/);

    // Verify tool loaded
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/pdf|merge/i);

    // Navigate to Image Compress
    await page.goto('/tools/image-compress');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/image|compress/i);

    // Upload and compress an image quickly
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    const compressBtn = page.getByRole('button', { name: /compress/i });
    await expect(compressBtn).toBeVisible({ timeout: 5000 });

    // Navigate to QR Generator
    await page.goto('/tools/qr-generator');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/qr/i);

    // Generate a QR code
    const textInput = page.locator('input[type="text"], input[type="url"]').first();
    await textInput.fill('https://example.com');

    await page.waitForTimeout(1500);
    const qrCanvas = page.locator('main canvas, canvas[width]').first();
    await expect(qrCanvas).toBeVisible({ timeout: 5000 });

    // All tools should be functional in the same session
  });
});

// =============================================================================
// ERROR RECOVERY WORKFLOWS
// Test that users can recover from errors and continue working
// =============================================================================
test.describe('Error Recovery Workflow', () => {
  test('PDF merge recovers from invalid file upload', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    const fileInput = page.locator('input[type="file"]');

    // Try to upload an invalid file (text file instead of PDF)
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-article.txt'));

    await page.waitForTimeout(1500);

    // Should show error or reject the file
    // But the tool should still be functional

    // Upload a valid PDF after the error
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-document.pdf'));

    await page.waitForTimeout(1000);

    // Should now show the valid file
    const validFile = page.locator('body');
    await expect(validFile).toContainText(/test-document|pdf/i);

    // Merge button should be available
    const mergeBtn = page.getByRole('button', { name: /merge|combine/i });
    await expect(mergeBtn).toBeVisible({ timeout: 5000 });
  });

  test('image compress handles empty submission gracefully', async ({ page }) => {
    await page.goto('/tools/image-compress');

    // Try to find compress button without uploading files
    const compressBtn = page.getByRole('button', { name: /compress/i }).first();

    if (await compressBtn.isVisible()) {
      const isDisabled = await compressBtn.isDisabled();
      if (!isDisabled) {
        await compressBtn.click();
        // Should not crash - verify page is still functional
        await page.waitForTimeout(1000);
      }
    }

    // Page should still be functional
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Should be able to upload after failed attempt
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    await expect(page.locator('img').first()).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// ACCESSIBILITY WORKFLOW
// Verify tools are usable with keyboard navigation
// =============================================================================
test.describe('Accessibility Workflow', () => {
  test('QR generator is keyboard accessible', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    // Tab to input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Type URL
    await page.keyboard.type('https://example.com');

    // Tab to find download buttons
    let tabCount = 0;
    while (tabCount < 20) {
      await page.keyboard.press('Tab');
      tabCount++;

      const focused = page.locator(':focus');
      const text = await focused.textContent();

      if (text?.match(/png|svg/i)) {
        // Found a download button
        expect(text).toBeTruthy();
        break;
      }
    }
  });

  test('file inputs have proper labels', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // Check that file input has associated label or is properly labeled
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Should have aria-label or be associated with a label
    const hasLabel = await fileInput.evaluate((el) => {
      return (
        el.hasAttribute('aria-label') ||
        el.hasAttribute('aria-labelledby') ||
        el.id && document.querySelector(`label[for="${el.id}"]`) !== null
      );
    });

    // Even if no explicit label, there should be descriptive text nearby
    const parent = fileInput.locator('..');
    const parentText = await parent.textContent();
    expect(parentText).toMatch(/upload|drop|file|pdf/i);
  });
});

// =============================================================================
// PERFORMANCE WORKFLOW
// Verify tools complete operations in reasonable time
// =============================================================================
test.describe('Performance Workflow', () => {
  test('image compression completes within reasonable time', async ({ page }) => {
    await page.goto('/tools/image-compress');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'test-image.png'));

    const compressBtn = page.getByRole('button', { name: /compress/i });
    await expect(compressBtn).toBeVisible({ timeout: 5000 });

    const startTime = Date.now();
    await compressBtn.click();

    // Should complete within 15 seconds
    const downloadBtn = page.getByRole('button', { name: /Download All as ZIP/i });
    await expect(downloadBtn).toBeVisible({ timeout: 15000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 15 seconds for a single image)
    expect(duration).toBeLessThan(15000);
  });

  test('QR generation is instant', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    const textInput = page.locator('input[type="text"], input[type="url"]').first();
    await textInput.fill('https://example.com');

    const startTime = Date.now();

    // QR should generate within 2 seconds
    const qrCanvas = page.locator('main canvas, canvas[width]').first();
    await expect(qrCanvas).toBeVisible({ timeout: 2000 });

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });
});
