import { test, expect } from '@playwright/test';

test.describe('JSON Formatter Tool', () => {
  test('should load page with correct title and thumbnail', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/json-formatter');

    // Check page title
    await expect(page).toHaveTitle('JSON Formatter - New Life Solutions');

    // Check thumbnail loads
    const thumbnail = page.locator('img[alt="JSON Formatter"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', '/thumbnails/json-formatter.svg');

    // Check heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('JSON Formatter');

    // Check tag
    const freeTag = page.locator('.tag-free');
    await expect(freeTag).toContainText('Free');

    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  });

  test('should have proper styling and layout', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/json-formatter');

    // Check dark theme background
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check back link
    const backLink = page.locator('a:has-text("Back")');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/hub');
  });
});
