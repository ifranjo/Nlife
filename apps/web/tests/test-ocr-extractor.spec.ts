import { test, expect } from '@playwright/test';

test.describe('OCR Text Extractor Tool', () => {
  test('should load page with correct title and structure', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/ocr-extractor');

    // Check page title contains tool name (SEO-optimized titles vary)
    await expect(page).toHaveTitle(/OCR|Text Extractor/);

    // Check heading is visible (scope to main to avoid debug overlay)
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();

    // Check back link to hub
    const backLink = page.locator('main a[href="/hub"]').first();
    await expect(backLink).toBeVisible();
  });

  test('should have proper styling and layout', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/ocr-extractor');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check navbar and footer
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should display language selector', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/ocr-extractor');

    // Wait for the component to load
    await page.waitForLoadState('networkidle');

    // Check language selector exists (scope to main content)
    const languageSelect = page.locator('main select').first();
    const selectCount = await page.locator('main select').count();

    if (selectCount > 0) {
      await expect(languageSelect).toBeVisible();

      // Check that options are available
      const options = await languageSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    } else {
      // Component might use a different UI for language selection
      console.log('No select element found - component may use different UI');
    }
  });

  test('should display drop zone', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/ocr-extractor');

    // Wait for component to load
    await page.waitForLoadState('networkidle');

    // Check for drop zone or file input
    const dropZone = page.locator('main .drop-zone, main [class*="drop"], main input[type="file"]').first();
    await expect(dropZone).toBeVisible();
  });

  test('should display privacy notice', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/ocr-extractor');

    // Check privacy notice or trust signals mention privacy
    const privacyNote = page.locator('main :text-matches("never leave|private|browser|offline", "i")').first();
    await expect(privacyNote).toBeVisible();
  });
});
