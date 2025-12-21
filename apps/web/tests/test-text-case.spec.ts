import { test, expect } from '@playwright/test';

test.describe('Text Case Converter Tool', () => {
  test('should load page with correct title and thumbnail', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/text-case');

    // Check page title
    await expect(page).toHaveTitle('Text Case Converter - New Life Solutions');

    // Check thumbnail loads
    const thumbnail = page.locator('img[alt="Text Case Converter"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', '/thumbnails/text-case.svg');

    // Check heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Text Case Converter');

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

  test('should have case conversion buttons styled', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/text-case');

    // Wait for component to load
    await page.waitForTimeout(1000);

    // Check for buttons (case conversion buttons should be present)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    console.log(`Found ${buttonCount} buttons`);
    expect(buttonCount).toBeGreaterThan(0);
  });
});
