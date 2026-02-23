import { test, expect } from '@playwright/test';

/**
 * Comprehensive Tests for ALL 8 PDF Tools
 *
 * Tools tested:
 * 1. PDF Merge - Merge 2+ PDF files
 * 2. PDF Split - Split PDF by page ranges
 * 3. PDF Compress - Compress PDF file size
 * 4. PDF Redactor - Redact/sanitize PDF content
 * 5. PDF Form Filler - Fill PDF form fields
 * 6. PDF to Word - Convert PDF to DOCX
 * 7. PDF to JPG - Convert PDF pages to images
 * 8. PDF Organize - Reorder/rotate PDF pages
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

// ============================================================================
// Test Suite: All PDF Tools Page Load
// ============================================================================

test.describe('All PDF Tools - Page Load Tests', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - page loads without crash`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      // Page should load without crashing
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    test(`${tool.name} - has correct title`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      // Title should contain tool name
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/pdf/);
    });

    test(`${tool.name} - has main heading`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const h1 = page.locator('main h1').first();
      await expect(h1).toBeVisible();
      const text = await h1.textContent();
      expect(text).toBeTruthy();
    });
  }
});

// ============================================================================
// Test Suite: All PDF Tools - Upload Zone
// ============================================================================

test.describe('All PDF Tools - Upload Zone Tests', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - has drop zone`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const dropZone = page.locator('.drop-zone').first();
      await expect(dropZone).toBeVisible();
    });

    test(`${tool.name} - has file input`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
    });

    test(`${tool.name} - file input accepts PDF`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"]');
      const accept = await fileInput.getAttribute('accept');
      expect(accept).toMatch(/pdf|application\/pdf/);
    });
  }
});

// ============================================================================
// Test Suite: All PDF Tools - Navigation & UI
// ============================================================================

test.describe('All PDF Tools - Navigation & UI Tests', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - has navbar`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    });

    test(`${tool.name} - has footer`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test(`${tool.name} - displays privacy notice`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const privacyText = page.getByText(/never leave|processed locally|browser/i).first();
      await expect(privacyText).toBeVisible();
    });

    test(`${tool.name} - has back to hub link`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const hubLink = page.locator('a[href="/hub"]').first();
      const count = await hubLink.count();
      expect(count).toBeGreaterThan(0);
    });

    test(`${tool.name} - shows free tag`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const freeTag = page.getByText('Free').first();
      await expect(freeTag).toBeVisible();
    });
  }
});

// ============================================================================
// Test Suite: All PDF Tools - SEO
// ============================================================================

test.describe('All PDF Tools - SEO Tests', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - has meta description`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const metaDesc = page.locator('meta[name="description"]');
      const content = await metaDesc.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(50);
    });

    test(`${tool.name} - has Open Graph tags`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /.+/);

      const ogDesc = page.locator('meta[property="og:description"]');
      await expect(ogDesc).toHaveAttribute('content', /.+/);
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
// Test Suite: All PDF Tools - Accessibility
// ============================================================================

test.describe('All PDF Tools - Accessibility Tests', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - has lang attribute`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('domcontentloaded');

      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', /^[a-z]{2}/);
    });

    test(`${tool.name} - h1 is in main content`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const mainH1 = page.locator('main h1').first();
      await expect(mainH1).toBeVisible();
      await expect(mainH1).not.toBeEmpty();
    });
  }
});

// ============================================================================
// Test Suite: Mobile Responsiveness
// ============================================================================

test.describe('All PDF Tools - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - is usable on mobile`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const dropZone = page.locator('.drop-zone').first();
      await expect(dropZone).toBeVisible();

      const box = await dropZone.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    });
  }
});

// ============================================================================
// Test Suite: Console Error Check
// ============================================================================

test.describe('All PDF Tools - Console Error Check', () => {
  for (const tool of PDF_TOOLS) {
    test(`${tool.name} - no critical console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      // Filter out non-critical errors (e.g., favicon, etc.)
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('net::ERR')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  }
});

// ============================================================================
// Individual Tool-Specific Tests
// ============================================================================

test.describe('PDF Merge - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');
  });

  test('allows multiple file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('multiple', '');
  });

  test('has merge button or action', async ({ page }) => {
    const mergeButton = page.getByText(/merge|combine/i).first();
    await expect(mergeButton).toBeVisible();
  });
});

test.describe('PDF Split - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-split');
    await page.waitForLoadState('networkidle');
  });

  test('has page range input', async ({ page }) => {
    const rangeInput = page.getByText(/page range|split by/i).first();
    await expect(rangeInput).toBeVisible();
  });
});

test.describe('PDF Compress - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-compress');
    await page.waitForLoadState('networkidle');
  });

  test('has compression settings', async ({ page }) => {
    const settings = page.getByText(/compression|quality/i).first();
    await expect(settings).toBeVisible();
  });
});

test.describe('PDF Redactor - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-redactor');
    await page.waitForLoadState('networkidle');
  });

  test('has redaction options', async ({ page }) => {
    const redactText = page.getByText(/redact|remove|sanitize/i).first();
    await expect(redactText).toBeVisible();
  });
});

test.describe('PDF Form Filler - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-form-filler');
    await page.waitForLoadState('networkidle');
  });

  test('has form field indicators', async ({ page }) => {
    const formText = page.getByText(/form|field|fill/i).first();
    await expect(formText).toBeVisible();
  });
});

test.describe('PDF to Word - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-word');
    await page.waitForLoadState('networkidle');
  });

  test('shows output format info', async ({ page }) => {
    const wordText = page.getByText(/word|docx|document/i).first();
    await expect(wordText).toBeVisible();
  });
});

test.describe('PDF to JPG - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-jpg');
    await page.waitForLoadState('networkidle');
  });

  test('shows output format options', async ({ page }) => {
    const jpgText = page.getByText(/jpg|png|image|output/i).first();
    await expect(jpgText).toBeVisible();
  });
});

test.describe('PDF Organize - Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-organize');
    await page.waitForLoadState('networkidle');
  });

  test('has page reordering controls', async ({ page }) => {
    const organizeText = page.getByText(/reorder|organize|rotate|page/i).first();
    await expect(organizeText).toBeVisible();
  });
});

// ============================================================================
// Hub Integration Test
// ============================================================================

test.describe('Hub Integration', () => {
  test('all 8 PDF tools are accessible from hub', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    const tools = [
      'pdf-merge',
      'pdf-split',
      'pdf-compress',
      'pdf-redactor',
      'pdf-form-filler',
      'pdf-to-word',
      'pdf-to-jpg',
      'pdf-organize',
    ];

    for (const toolSlug of tools) {
      const toolLink = page.locator(`a[href*="${toolSlug}"]`).first();
      const exists = await toolLink.count() > 0;
      expect(exists).toBe(true);
    }
  });
});
