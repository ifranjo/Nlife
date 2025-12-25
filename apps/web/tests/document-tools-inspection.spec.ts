import { test, expect } from '@playwright/test';

test.describe('Document Tools - Visual & Functional Inspection', () => {

  test('Hub page - Tool cards and thumbnails', async ({ page }) => {
    await page.goto('http://localhost:4321/hub');

    // Check page title
    await expect(page).toHaveTitle(/Hub.*New Life Solutions|Tool Hub/i);

    // Find all tool cards
    const toolCards = page.locator('[data-testid="tool-card"], .tool-card, article');
    const cardCount = await toolCards.count();
    console.log(`Found ${cardCount} tool cards`);

    // Check grid layout
    const gridContainer = page.locator('div[class*="grid"]').first();
    await expect(gridContainer).toBeVisible();

    // Check main navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('PDF Merge - Page inspection', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/pdf-merge');

    // Check page title
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    await expect(page).toHaveTitle(/PDF Merge|Merge PDF/i);

    // Check header elements (scope to main to avoid debug overlay)
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();

    // Check drag & drop zone
    const dropZone = page.locator('main [class*="border-dashed"], main [class*="drop"], main input[type="file"]').first();
    await expect(dropZone).toBeVisible();

    // Check back button
    const backButton = page.locator('main a[href="/hub"]').first();
    await expect(backButton).toBeVisible();

    // Check dark background
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log(`Body background color: ${bgColor}`);
  });

  test('PDF Split - Page inspection', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/pdf-split');

    // Check page title
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    await expect(page).toHaveTitle(/PDF Split|Split PDF/i);

    // Check header elements (scope to main)
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();

    // Check back button navigation
    const backButton = page.locator('main a[href="/hub"]').first();
    await expect(backButton).toBeVisible();

    // Check main container
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('Responsive layout - Mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:4321/hub');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:4321/tools/pdf-merge');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check that elements are still visible and properly sized (scope to main)
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();
  });

  test('Network requests and resource loading', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto('http://localhost:4321/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    if (failedRequests.length > 0) {
      console.log('FAILED REQUESTS:');
      failedRequests.forEach(req => console.log(req));
    } else {
      console.log('All resources loaded successfully');
    }
  });
});
