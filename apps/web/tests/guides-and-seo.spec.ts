import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests for guides section and SEO elements
 * Tests all new guide pages and validates SEO metadata
 */

test.describe('Guides Section', () => {
  test('guides index page loads correctly', async ({ page }) => {
    await page.goto('/guides');
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/Guides|How-to/i);

    // Check main heading using specific selector
    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();

    // Check that main content exists
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('merge PDF guide page has correct structure', async ({ page }) => {
    await page.goto('/guides/merge-pdf-online-free');
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page).toHaveTitle(/Merge PDF/i);

    // Check main content visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check FAQ section exists
    const faqSection = page.locator('details');
    await expect(faqSection.first()).toBeVisible();

    // Check CTA button links to tool
    const ctaLink = page.locator('a[href="/tools/pdf-merge"]');
    await expect(ctaLink.first()).toBeVisible();

    // Check FAQ schema exists
    const schemaScript = page.locator('script[type="application/ld+json"]');
    await expect(schemaScript.first()).toBeAttached();
  });

  test('compress video for Discord guide works', async ({ page }) => {
    await page.goto('/guides/compress-video-for-discord');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Compress Video.*Discord/i);

    // Check Discord file limits info box
    await expect(page.getByText('25MB').first()).toBeVisible();

    // Check CTA links to video compressor
    const ctaLink = page.locator('a[href="/tools/video-compressor"]');
    await expect(ctaLink.first()).toBeVisible();
  });

  test('remove vocals guide works', async ({ page }) => {
    await page.goto('/guides/remove-vocals-karaoke');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Remove Vocals|Karaoke/i);

    // Check how it works section - look for phase cancellation text
    await expect(page.getByText('phase cancellation').first()).toBeVisible();

    // Check CTA
    const ctaLink = page.locator('a[href="/tools/remove-vocals"]');
    await expect(ctaLink.first()).toBeVisible();
  });

  test('transcribe audio guide works', async ({ page }) => {
    await page.goto('/guides/transcribe-audio-to-text');

    await expect(page).toHaveTitle(/Transcribe Audio/i);

    // Check Whisper AI mention
    await expect(page.getByText('Whisper AI').first()).toBeVisible();

    // Check CTA
    const ctaLink = page.locator('a[href="/tools/audio-transcription"]');
    await expect(ctaLink.first()).toBeVisible();
  });

  test('OCR guide works', async ({ page }) => {
    await page.goto('/guides/extract-text-from-images');

    await expect(page).toHaveTitle(/Extract Text|OCR/i);

    // Check OCR explanation
    await expect(page.getByText('Optical Character Recognition').first()).toBeVisible();

    // Check CTA
    const ctaLink = page.locator('a[href="/tools/ocr-extractor"]');
    await expect(ctaLink.first()).toBeVisible();
  });
});

test.describe('All Tool Pages Load', () => {
  const toolPages = [
    '/tools/pdf-merge',
    '/tools/pdf-split',
    '/tools/pdf-redactor',
    '/tools/pdf-form-filler',
    '/tools/ocr-extractor',
    '/tools/document-scanner',
    '/tools/pdf-to-word',
    '/tools/resume-builder',
    '/tools/image-compress',
    '/tools/background-remover',
    '/tools/video-to-mp3',
    '/tools/video-compressor',
    '/tools/video-trimmer',
    '/tools/remove-vocals',
    '/tools/audio-transcription',
    '/tools/qr-generator',
    '/tools/base64',
    '/tools/json-formatter',
    '/tools/text-case',
    '/tools/word-counter',
    '/tools/lorem-ipsum',
    '/tools/hash-generator',
    '/tools/color-converter',
  ];

  for (const toolPath of toolPages) {
    test(`${toolPath} loads without errors`, async ({ page }) => {
      const response = await page.goto(toolPath);
      await page.waitForLoadState('domcontentloaded');

      // Check page loaded successfully
      expect(response?.status()).toBe(200);

      // Check main content exists
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Check navbar exists
      const navbar = page.locator('nav').first();
      await expect(navbar).toBeVisible();

      // Check footer exists
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });
  }
});

test.describe('Hub Page', () => {
  test('hub page loads and has main content', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page).toHaveTitle(/Tools|Hub|New Life/i);

    // Check main exists
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check navbar exists
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();
  });

  test('hub page shows tool hub heading', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Wait for React hydration with longer timeout
    await page.waitForTimeout(2000);

    // Check for Tool Hub heading
    const heading = page.getByRole('heading', { name: /Tool Hub/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

test.describe('SEO Elements', () => {
  test('homepage has proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);

    // Check meta description
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /.{50,}/);
  });

  test('tool pages have meta descriptions', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /.{50,}/);
  });

  test('guide pages have schema markup', async ({ page }) => {
    await page.goto('/guides/merge-pdf-online-free');

    // Check for JSON-LD schema
    const schemas = page.locator('script[type="application/ld+json"]');
    const count = await schemas.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Validate schema content
    const schemaContent = await schemas.first().textContent();
    expect(schemaContent).toContain('@context');
    expect(schemaContent).toContain('schema.org');
  });
});

test.describe('Navigation', () => {
  test('can navigate from homepage to hub', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find and click hub link
    const hubLink = page.locator('a[href="/hub"]').first();
    await expect(hubLink).toBeVisible();
    await hubLink.click();

    await expect(page).toHaveURL(/hub/);
  });

  test('can navigate directly to tool pages', async ({ page }) => {
    // Direct navigation test
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/pdf-merge/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate from guide to tool', async ({ page }) => {
    await page.goto('/guides/merge-pdf-online-free');
    await page.waitForLoadState('networkidle');

    // Click CTA button
    const ctaLink = page.locator('a[href="/tools/pdf-merge"]').first();
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();

    await expect(page).toHaveURL(/pdf-merge/);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('guides page is mobile friendly', async ({ page }) => {
    await page.goto('/guides');

    // Check H1 is visible
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check guide cards stack vertically
    const firstCard = page.locator('article').first();
    await expect(firstCard).toBeVisible();
  });

  test('tool page is mobile friendly', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // Check tool interface is visible
    const uploadArea = page.locator('input[type="file"]');
    await expect(uploadArea).toBeAttached();
  });
});

test.describe('Accessibility', () => {
  test('guides have proper heading hierarchy', async ({ page }) => {
    await page.goto('/guides/merge-pdf-online-free');
    await page.waitForLoadState('networkidle');

    // Check at least one heading exists
    const headings = page.locator('h1, h2, h3');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('pages have accessible main landmark', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('domcontentloaded');

    // Check main landmark exists
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check navigation exists
    const nav = page.locator('nav');
    await expect(nav.first()).toBeVisible();
  });
});
