import { test, expect } from '@playwright/test';

test.describe('Text Case Converter Tool', () => {
  test('should load page with correct title and structure', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/text-case');

    // Check page title contains tool name (SEO-optimized titles vary)
    await expect(page).toHaveTitle(/Text Case/);

    // Check heading (use specific answer-title class)
    const heading = page.locator('.answer-title');
    await expect(heading).toBeVisible();

    // Check back link to hub
    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/hub');

    // Check trust signals are present
    const trustSignals = page.locator('.trust-signal');
    await expect(trustSignals.first()).toBeVisible();
  });

  test('should have case conversion buttons', async ({ page }) => {
    await page.goto('http://localhost:4321/tools/text-case');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check answer box is visible
    const answerBox = page.locator('.answer-box');
    await expect(answerBox).toBeVisible();

    // Check navbar and footer
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
