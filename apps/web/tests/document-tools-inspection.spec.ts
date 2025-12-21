import { test, expect } from '@playwright/test';

test.describe('Document Tools - Visual & Functional Inspection', () => {

  test('Hub page - Tool cards and thumbnails', async ({ page }) => {
    await page.goto('http://localhost:4321/hub');

    // Check page title
    await expect(page).toHaveTitle(/Hub.*New Life Solutions/);

    // Take full page screenshot
    await page.screenshot({ path: 'E:/scripts/NEW_LIFE/test-results/hub-page.png', fullPage: true });

    // Find all tool cards
    const toolCards = page.locator('[data-testid="tool-card"], .tool-card, article');
    const cardCount = await toolCards.count();
    console.log(`Found ${cardCount} tool cards`);

    // Check for SVG thumbnails (not emojis)
    const svgThumbnails = page.locator('svg[class*="w-8"], svg[class*="h-8"]');
    const svgCount = await svgThumbnails.count();
    console.log(`Found ${svgCount} SVG thumbnails`);

    // Verify no emoji icons (span with role="img" would indicate emoji)
    const emojiIcons = page.locator('span[role="img"]');
    const emojiCount = await emojiIcons.count();
    console.log(`Found ${emojiCount} emoji icons (should be 0)`);

    // Check grid layout
    const gridContainer = page.locator('div[class*="grid"]').first();
    await expect(gridContainer).toBeVisible();

    // Log all console messages
    page.on('console', msg => console.log(`CONSOLE: ${msg.text()}`));

    // Check for errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('PAGE ERRORS:', errors);
    }
  });

  test('PDF Merge - Page inspection', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/pdf-merge');

    // Check page title
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    await expect(page).toHaveTitle('PDF Merge - New Life Solutions');

    // Screenshot
    await page.screenshot({ path: 'E:/scripts/NEW_LIFE/test-results/pdf-merge-page.png', fullPage: true });

    // Check for SVG thumbnail/icon
    const svgIcon = page.locator('svg').first();
    await expect(svgIcon).toBeVisible();

    // Check header elements
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    console.log(`H1 text: "${headingText}"`);

    // Check for "Free" tag
    const freeTag = page.getByText('Free', { exact: true });
    const freeTagVisible = await freeTag.isVisible().catch(() => false);
    console.log(`Free tag visible: ${freeTagVisible}`);

    // Check drag & drop zone
    const dropZone = page.locator('[class*="border-dashed"], [class*="drag"], input[type="file"]').first();
    await expect(dropZone).toBeVisible();

    // Check back button
    const backButton = page.locator('a[href="/hub"]');
    await expect(backButton).toBeVisible();

    // Check dark background
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log(`Body background color: ${bgColor}`);

    // Log computed styles of main container
    const main = page.locator('main').first();
    const mainStyles = await main.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom
      };
    });
    console.log('Main container styles:', mainStyles);

    // Check for console errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`CONSOLE ERROR: ${msg.text()}`);
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('PAGE ERRORS:', errors);
    }
  });

  test('PDF Split - Page inspection', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/pdf-split');

    // Check page title
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    await expect(page).toHaveTitle('PDF Split - New Life Solutions');

    // Screenshot
    await page.screenshot({ path: 'E:/scripts/NEW_LIFE/test-results/pdf-split-page.png', fullPage: true });

    // Check for SVG thumbnail/icon
    const svgIcon = page.locator('svg').first();
    await expect(svgIcon).toBeVisible();

    // Check header elements
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    console.log(`H1 text: "${headingText}"`);

    // Check back button navigation
    const backButton = page.locator('a[href="/hub"]');
    await expect(backButton).toBeVisible();

    // Check for consistency with design system
    const main = page.locator('main').first();
    const mainStyles = await main.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: styles.fontFamily
      };
    });
    console.log('Main container styles:', mainStyles);

    // Check for monospace font (should contain 'mono' or specific font name)
    const usesMonospace = mainStyles.fontFamily.toLowerCase().includes('mono') ||
                          mainStyles.fontFamily.toLowerCase().includes('jetbrains');
    console.log(`Uses monospace font: ${usesMonospace}`);

    // Check for console errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`CONSOLE ERROR: ${msg.text()}`);
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('PAGE ERRORS:', errors);
    }
  });

  test('Responsive layout - Mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:4321/hub');
    await page.screenshot({ path: 'E:/scripts/NEW_LIFE/test-results/hub-mobile.png', fullPage: true });

    await page.goto('http://localhost:4321/tools/pdf-merge');
    await page.screenshot({ path: 'E:/scripts/NEW_LIFE/test-results/pdf-merge-mobile.png', fullPage: true });

    // Check that elements are still visible and properly sized
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('Network requests and resource loading', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto('http://localhost:4321/tools/pdf-merge');
    await page.waitForTimeout(3000);

    if (failedRequests.length > 0) {
      console.log('FAILED REQUESTS:');
      failedRequests.forEach(req => console.log(req));
    } else {
      console.log('All resources loaded successfully');
    }
  });
});
