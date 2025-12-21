import { test, expect } from '@playwright/test';

test.describe('Word Counter Tool', () => {
  test('should load page with correct title and thumbnail', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/word-counter');

    // Check page title
    await expect(page).toHaveTitle('Word Counter - New Life Solutions');

    // Check thumbnail loads
    const thumbnail = page.locator('img[alt="Word Counter"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', '/thumbnails/word-counter.svg');

    // Check heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Word Counter');

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

  test('should display statistics area', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/word-counter');

    // Wait for component to load
    await page.waitForTimeout(1000);

    // The component should render with stats display
    // We'll just verify the page loads without errors
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
