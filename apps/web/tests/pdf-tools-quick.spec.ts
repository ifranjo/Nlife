import { test, expect } from '@playwright/test';

/**
 * Quick Functional Tests for ALL 8 PDF Tools
 * Uses domcontentloaded instead of networkidle for reliability
 */

const PDF_TOOLS = [
  { path: '/tools/pdf-merge', name: 'PDF Merge' },
  { path: '/tools/pdf-split', name: 'PDF Split' },
  { path: '/tools/pdf-compress', name: 'PDF Compress' },
  { path: '/tools/pdf-redactor', name: 'PDF Redactor' },
  { path: '/tools/pdf-form-filler', name: 'PDF Form Filler' },
  { path: '/tools/pdf-to-word', name: 'PDF to Word' },
  { path: '/tools/pdf-to-jpg', name: 'PDF to JPG' },
  { path: '/tools/pdf-organize', name: 'PDF Organize' },
];

test.describe('PDF Tools - Quick Functional Tests', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - page loads`, async ({ page }) => {
      const response = await page.goto(tool.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
    });

    test(`${tool.name} - has content`, async ({ page }) => {
      await page.goto(tool.path, { waitUntil: 'domcontentloaded' });

      // Check page has content (not empty)
      const body = await page.content();
      expect(body.length).toBeGreaterThan(1000);
    });

    test(`${tool.name} - has PDF-related content`, async ({ page }) => {
      await page.goto(tool.path, { waitUntil: 'domcontentloaded' });

      const content = await page.content();
      expect(content.toLowerCase()).toMatch(/pdf/);
    });
  }
});

test.describe('PDF Tools - Hub Integration', () => {
  test('hub shows all 8 PDF tools', async ({ page }) => {
    await page.goto('/hub', { waitUntil: 'domcontentloaded' });

    const content = await page.content();

    // Check all tools are mentioned
    expect(content).toContain('pdf-merge');
    expect(content).toContain('pdf-split');
    expect(content).toContain('pdf-compress');
    expect(content).toContain('pdf-redactor');
    expect(content).toContain('pdf-form-filler');
    expect(content).toContain('pdf-to-word');
    expect(content).toContain('pdf-to-jpg');
    expect(content).toContain('pdf-organize');
  });
});

test.describe('PDF Tools - Quick Component Checks', () => {
  test('PDF Merge - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-merge', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF Split - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-split', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF Compress - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-compress', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF Redactor - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-redactor', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF Form Filler - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-form-filler', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF to Word - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-to-word', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF to JPG - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-to-jpg', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });

  test('PDF Organize - has drop zone', async ({ page }) => {
    await page.goto('/tools/pdf-organize', { waitUntil: 'domcontentloaded' });
    const dropzone = await page.locator('.drop-zone, [class*="drop"]').count();
    expect(dropzone).toBeGreaterThan(0);
  });
});

test.describe('PDF Tools - File Input Checks', () => {
  test('PDF Merge - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-merge', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF Split - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-split', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF Compress - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-compress', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF Redactor - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-redactor', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF Form Filler - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-form-filler', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF to Word - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-to-word', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF to JPG - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-to-jpg', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });

  test('PDF Organize - accepts PDF files', async ({ page }) => {
    await page.goto('/tools/pdf-organize', { waitUntil: 'domcontentloaded' });
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute('accept');
    expect(accept).toMatch(/pdf/i);
  });
});
