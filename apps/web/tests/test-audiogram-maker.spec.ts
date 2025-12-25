import { test, expect } from '@playwright/test';

test.describe('Audiogram Maker Tool', () => {
  test('page loads with correct metadata', async ({ page }) => {
    await page.goto('/tools/audiogram-maker');
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page).toHaveTitle(/Audiogram Maker/i);

    // Check main heading (use main to avoid debug overlay h1)
    const main = page.locator('main');
    await expect(main).toBeVisible();
    const h1 = main.locator('h1').first();
    await expect(h1).toContainText(/Audiogram/i);
  });

  test('tool component renders', async ({ page }) => {
    await page.goto('/tools/audiogram-maker');
    await page.waitForLoadState('networkidle');

    // Check for upload area
    const uploadArea = page.getByText(/Drop audio file or click to browse/i);
    await expect(uploadArea).toBeVisible();

    // Check for supported formats message
    const formatsMessage = page.getByText(/MP3, WAV, M4A, OGG/i);
    await expect(formatsMessage).toBeVisible();
  });

  test('schema markup exists', async ({ page }) => {
    await page.goto('/tools/audiogram-maker');
    await page.waitForLoadState('networkidle');

    // Check for JSON-LD schema
    const schema = page.locator('script[type="application/ld+json"]');
    await expect(schema.first()).toBeAttached();
  });

  test('FAQ section exists', async ({ page }) => {
    await page.goto('/tools/audiogram-maker');
    await page.waitForLoadState('networkidle');

    // Check for FAQ heading
    const faqHeading = page.getByText('Frequently Asked Questions');
    await expect(faqHeading).toBeVisible();

    // Check for at least one FAQ item
    const faqItem = page.getByText(/What is an audiogram?/i);
    await expect(faqItem).toBeVisible();
  });

  test('SEO components render', async ({ page }) => {
    await page.goto('/tools/audiogram-maker');
    await page.waitForLoadState('networkidle');

    // Check for Answer Box
    const answerBox = page.locator('[data-answer-box], .answer-box').first();

    // Check for Q&A sections
    const qaSection = page.getByText(/What is an Audiogram?/i);
    await expect(qaSection).toBeVisible();
  });

  test('breadcrumb navigation exists', async ({ page }) => {
    await page.goto('/tools/audiogram-maker');
    await page.waitForLoadState('networkidle');

    // Check breadcrumb
    const breadcrumb = page.getByRole('navigation').first();
    await expect(breadcrumb).toContainText('Home');
    await expect(breadcrumb).toContainText('Tools');
    await expect(breadcrumb).toContainText('Audiogram Maker');
  });
});
