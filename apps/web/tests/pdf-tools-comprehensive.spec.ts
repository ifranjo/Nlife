import { test, expect } from '@playwright/test';

/**
 * Comprehensive Tests for ALL 8 PDF Tools
 * 1. /tools/pdf-merge - Merge 2+ PDF files
 * 2. /tools/pdf-split - Split PDF by page ranges
 * 3. /tools/pdf-compress - Compress PDF file size
 * 4. /tools/pdf-redactor - Redact/sanitize PDF content
 * 5. /tools/pdf-form-filler - Fill PDF form fields
 * 6. /tools/pdf-to-word - Convert PDF to DOCX
 * 7. /tools/pdf-to-jpg - Convert PDF pages to images
 * 8. /tools/pdf-organize - Reorder/rotate PDF pages
 */

const pdfTools = [
  { path: '/tools/pdf-merge', name: 'PDF Merge' },
  { path: '/tools/pdf-split', name: 'PDF Split' },
  { path: '/tools/pdf-compress', name: 'PDF Compress' },
  { path: '/tools/pdf-redactor', name: 'PDF Redactor' },
  { path: '/tools/pdf-form-filler', name: 'PDF Form Filler' },
  { path: '/tools/pdf-to-word', name: 'PDF to Word' },
  { path: '/tools/pdf-to-jpg', name: 'PDF to JPG' },
  { path: '/tools/pdf-organize', name: 'PDF Organize' },
];

// ============================================================================
// Basic Page Load Tests - All 8 Tools
// ============================================================================

test.describe('All 8 PDF Tools - Page Load Tests', () => {
  for (const tool of pdfTools) {
    test(`${tool.name} - page loads without crash`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      // Check page loaded
      expect(page.url()).toContain(tool.path);

      // No critical console errors
      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('Warning') &&
        !e.includes('DevTools') &&
        !e.includes('audit') && // Astro audit errors during dev
        !e.includes('match function') // Astro audit function errors
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test(`${tool.name} - has correct page title`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      // Title should contain PDF-related text
      expect(title.toLowerCase()).toMatch(/pdf/);
    });

    test(`${tool.name} - has h1 heading in main content`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      // Use main h1 to avoid debug overlay duplicates
      const mainH1 = page.locator('main h1').first();
      await expect(mainH1).toBeVisible();
      await expect(mainH1).not.toBeEmpty();
    });
  }
});

// ============================================================================
// Upload Zone Tests - All 8 Tools
// ============================================================================

test.describe('All 8 PDF Tools - Upload Zone Tests', () => {
  for (const tool of pdfTools) {
    test(`${tool.name} - has drop zone visible`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const dropZone = page.locator('.drop-zone, [class*="drop"]').first();
      await expect(dropZone).toBeVisible();
    });

    test(`${tool.name} - has file input`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
    });

    test(`${tool.name} - accepts PDF files`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');
      // Should accept PDF files
      expect(acceptAttr).toMatch(/\.pdf|pdf|application\/pdf/i);
    });
  }
});

// ============================================================================
// Privacy and Navigation Tests - All 8 Tools
// ============================================================================

test.describe('All 8 PDF Tools - Privacy and Navigation', () => {
  for (const tool of pdfTools) {
    test(`${tool.name} - displays privacy notice`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const privacyNote = page.getByText(/never leave your browser|processed locally|100% client-side|files never leave/i).first();
      await expect(privacyNote).toBeVisible();
    });

    test(`${tool.name} - has back navigation to hub`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const backLink = page.locator('a[href="/hub"]').first();
      await expect(backLink).toBeVisible();
    });

    test(`${tool.name} - shows free tag`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const freeTag = page.getByText(/\bFree\b/).first();
      await expect(freeTag).toBeVisible();
    });
  }
});

// ============================================================================
// SEO Tests - All 8 Tools
// ============================================================================

test.describe('All 8 PDF Tools - SEO Tests', () => {
  for (const tool of pdfTools) {
    test(`${tool.name} - has meta description`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const metaDesc = page.locator('meta[name="description"]');
      await expect(metaDesc).toHaveAttribute('content', /.{30,}/);
    });

    test(`${tool.name} - has canonical URL`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', /https?:\/\//);
    });

    test(`${tool.name} - has JSON-LD schema`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const schema = page.locator('script[type="application/ld+json"]');
      const count = await schema.count();
      expect(count).toBeGreaterThan(0);
    });
  }
});

// ============================================================================
// Accessibility Tests - All 8 Tools
// ============================================================================

test.describe('All 8 PDF Tools - Accessibility Tests', () => {
  for (const tool of pdfTools) {
    test(`${tool.name} - has lang attribute`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', /^[a-z]{2}/i);
    });

    test(`${tool.name} - main landmark exists`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const main = page.locator('main');
      await expect(main).toBeVisible();
    });
  }
});

// ============================================================================
// Mobile Responsiveness - All 8 Tools
// ============================================================================

test.describe('All 8 PDF Tools - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  for (const tool of pdfTools) {
    test(`${tool.name} - is usable on mobile`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      // Check drop zone is visible
      const dropZone = page.locator('.drop-zone, [class*="drop"]').first();
      await expect(dropZone).toBeVisible();

      // Check it's not overflowing
      const box = await dropZone.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    });
  }
});

// ============================================================================
// Hub Integration - All 8 Tools
// ============================================================================

test.describe('Hub Integration - All PDF Tools', () => {
  test('all PDF tools appear in the hub', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    const toolLinks = [
      'pdf-merge',
      'pdf-split',
      'pdf-compress',
      'pdf-redactor',
      'pdf-form-filler',
      'pdf-to-word',
      'pdf-to-jpg',
      'pdf-organize',
    ];

    for (const toolSlug of toolLinks) {
      const link = page.locator(`a[href*="${toolSlug}"]`);
      const exists = await link.count() > 0;
      expect(exists, `Link for ${toolSlug} should exist in hub`).toBe(true);
    }
  });
});

// ============================================================================
// Individual Tool-Specific Tests
// ============================================================================

test.describe('PDF Merge Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');
  });

  test('allows multiple file selection', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('multiple', '');
  });

  test('shows merge instructions', async ({ page }) => {
    const mergeText = page.getByText(/merge|combine|join/i).first();
    await expect(mergeText).toBeVisible();
  });
});

test.describe('PDF Split Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-split');
    await page.waitForLoadState('networkidle');
  });

  test('has page range input', async ({ page }) => {
    const rangeInput = page.getByText(/range|pages|split/i).first();
    await expect(rangeInput).toBeVisible();
  });
});

test.describe('PDF Compress Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-compress');
    await page.waitForLoadState('networkidle');
  });

  test('shows compression options', async ({ page }) => {
    const compressText = page.getByText(/compress|reduce|size|optimization/i).first();
    await expect(compressText).toBeVisible();
  });
});

test.describe('PDF Redactor Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-redactor');
    await page.waitForLoadState('networkidle');
  });

  test('shows redaction options', async ({ page }) => {
    const redactText = page.getByText(/redact|remove|sensitive|confidential/i).first();
    await expect(redactText).toBeVisible();
  });
});

test.describe('PDF Form Filler Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-form-filler');
    await page.waitForLoadState('networkidle');
  });

  test('shows form field options', async ({ page }) => {
    const formText = page.getByText(/form|field|fill|signature/i).first();
    await expect(formText).toBeVisible();
  });
});

test.describe('PDF to Word Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-word');
    await page.waitForLoadState('networkidle');
  });

  test('shows conversion options', async ({ page }) => {
    const convertText = page.getByText(/word|docx|convert|export/i).first();
    await expect(convertText).toBeVisible();
  });
});

test.describe('PDF to JPG Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-jpg');
    await page.waitForLoadState('networkidle');
  });

  test('shows image format options', async ({ page }) => {
    const imageText = page.getByText(/jpg|png|image|convert/i).first();
    await expect(imageText).toBeVisible();
  });
});

test.describe('PDF Organize Tool - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-organize');
    await page.waitForLoadState('networkidle');
  });

  test('shows organization options', async ({ page }) => {
    const organizeText = page.getByText(/reorder|rotate|move|organize|delete/i).first();
    await expect(organizeText).toBeVisible();
  });
});
