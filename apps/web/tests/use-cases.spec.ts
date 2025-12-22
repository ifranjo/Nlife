import { test, expect } from '@playwright/test';

/**
 * E2E tests for programmatic use-case landing pages
 */

test.describe('Use Cases Section', () => {
  test('use cases index page loads correctly', async ({ page }) => {
    await page.goto('/use-cases');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveTitle(/Use Cases/i);

    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Use Cases');

    // Check use case cards exist
    const cards = page.locator('a[href^="/use-cases/"]');
    await expect(cards.first()).toBeVisible();
  });

  const useCasePages = [
    { path: '/use-cases/pdf-merge-invoices', title: /Invoice|PDF|Merge/i, tool: '/tools/pdf-merge' },
    { path: '/use-cases/compress-video-email', title: /Email|Video|Compress/i, tool: '/tools/video-compressor' },
    { path: '/use-cases/compress-video-whatsapp', title: /WhatsApp|Video|Compress/i, tool: '/tools/video-compressor' },
    { path: '/use-cases/qr-code-wifi', title: /WiFi|QR/i, tool: '/tools/qr-generator' },
    { path: '/use-cases/ocr-screenshot', title: /Screenshot|Text|OCR/i, tool: '/tools/ocr-extractor' },
  ];

  for (const useCase of useCasePages) {
    test(`${useCase.path} loads correctly`, async ({ page }) => {
      await page.goto(useCase.path);
      await page.waitForLoadState('domcontentloaded');

      // Check title
      await expect(page).toHaveTitle(useCase.title);

      // Check main content
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Check H1 exists
      const h1 = page.locator('main h1').first();
      await expect(h1).toBeVisible();

      // Check CTA link to tool
      const ctaLink = page.locator(`a[href="${useCase.tool}"]`);
      await expect(ctaLink.first()).toBeVisible();

      // Check schema markup exists
      const schema = page.locator('script[type="application/ld+json"]');
      await expect(schema.first()).toBeAttached();
    });
  }

  test('use case pages have proper SEO structure', async ({ page }) => {
    await page.goto('/use-cases/pdf-merge-invoices');

    // Check meta description
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /.{50,}/);

    // Check breadcrumb navigation
    const breadcrumb = page.locator('nav').first();
    await expect(breadcrumb).toBeVisible();

    // Check schema is valid JSON-LD
    const schemaContent = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(schemaContent).toContain('@context');
    expect(schemaContent).toContain('schema.org');
  });

  test('use case page links work correctly', async ({ page }) => {
    await page.goto('/use-cases/compress-video-email');
    await page.waitForLoadState('domcontentloaded');

    // Click CTA to tool
    const ctaLink = page.locator('a[href="/tools/video-compressor"]').first();
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();

    await expect(page).toHaveURL(/video-compressor/);
  });
});
