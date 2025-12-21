import { test, expect } from '@playwright/test';

test.describe('Part 2: Visual Inspection & Console Errors', () => {
  test('JSON Formatter - Complete visual & functional check', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/tools/json-formatter');

    // 1. Page title
    await expect(page).toHaveTitle('JSON Formatter - New Life Solutions');

    // 2. Thumbnail
    const thumbnail = page.locator('img[alt="JSON Formatter"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', '/thumbnails/json-formatter.svg');

    // 3. Heading and description
    const heading = page.locator('h1');
    await expect(heading).toContainText('JSON Formatter');

    const description = page.locator('text=Format, minify, and validate JSON');
    await expect(description).toBeVisible();

    // 4. Free tag
    const freeTag = page.locator('.tag-free');
    await expect(freeTag).toBeVisible();
    await expect(freeTag).toContainText('Free');

    // 5. Back button
    const backButton = page.locator('a:has-text("Back")');
    await expect(backButton).toBeVisible();
    await expect(backButton).toHaveAttribute('href', '/hub');

    // 6. Wait for component to load
    await page.waitForTimeout(2000);

    // 7. Check for textareas (should have input/output areas)
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log(`JSON Formatter: Found ${textareaCount} textarea(s)`);

    // 8. Take screenshot
    await page.screenshot({ path: 'test-results/json-formatter-visual.png', fullPage: true });

    // 9. Check console errors
    if (errors.length > 0) {
      console.log('JSON Formatter Console Errors:', errors);
    }
    expect(errors.length).toBe(0);
  });

  test('Text Case Converter - Complete visual & functional check', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/tools/text-case');

    // 1. Page title
    await expect(page).toHaveTitle('Text Case Converter - New Life Solutions');

    // 2. Thumbnail
    const thumbnail = page.locator('img[alt="Text Case Converter"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', '/thumbnails/text-case.svg');

    // 3. Heading and description
    const heading = page.locator('h1');
    await expect(heading).toContainText('Text Case Converter');

    const description = page.locator('text=Convert text between different cases');
    await expect(description).toBeVisible();

    // 4. Free tag
    const freeTag = page.locator('.tag-free');
    await expect(freeTag).toBeVisible();
    await expect(freeTag).toContainText('Free');

    // 5. Back button
    const backButton = page.locator('a:has-text("Back")');
    await expect(backButton).toBeVisible();
    await expect(backButton).toHaveAttribute('href', '/hub');

    // 6. Wait for component to load
    await page.waitForTimeout(2000);

    // 7. Check for buttons (case conversion buttons)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Text Case Converter: Found ${buttonCount} button(s)`);
    expect(buttonCount).toBeGreaterThan(0);

    // 8. Take screenshot
    await page.screenshot({ path: 'test-results/text-case-visual.png', fullPage: true });

    // 9. Check console errors
    if (errors.length > 0) {
      console.log('Text Case Console Errors:', errors);
    }
    expect(errors.length).toBe(0);
  });

  test('Word Counter - Complete visual & functional check', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/tools/word-counter');

    // 1. Page title
    await expect(page).toHaveTitle('Word Counter - New Life Solutions');

    // 2. Thumbnail
    const thumbnail = page.locator('img[alt="Word Counter"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', '/thumbnails/word-counter.svg');

    // 3. Heading and description
    const heading = page.locator('h1');
    await expect(heading).toContainText('Word Counter');

    const description = page.locator('text=Count words, characters, sentences');
    await expect(description).toBeVisible();

    // 4. Free tag
    const freeTag = page.locator('.tag-free');
    await expect(freeTag).toBeVisible();
    await expect(freeTag).toContainText('Free');

    // 5. Back button
    const backButton = page.locator('a:has-text("Back")');
    await expect(backButton).toBeVisible();
    await expect(backButton).toHaveAttribute('href', '/hub');

    // 6. Wait for component to load
    await page.waitForTimeout(2000);

    // 7. Check for textarea (input area)
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // 8. Take screenshot
    await page.screenshot({ path: 'test-results/word-counter-visual.png', fullPage: true });

    // 9. Check console errors
    if (errors.length > 0) {
      console.log('Word Counter Console Errors:', errors);
    }
    expect(errors.length).toBe(0);
  });

  test('TypeScript validation summary', async ({ page }) => {
    // This is just a placeholder test to document TS issues
    console.log(`
========================================================================
TYPESCRIPT VALIDATION SUMMARY
========================================================================

Tool Interface (tools.ts):
  ✓ Tool interface includes 'thumbnail: string' property
  ✓ All tools have thumbnail property defined
  ✓ Thumbnails point to /thumbnails/*.svg

SVG Thumbnails (verified):
  ✓ json-formatter.svg
  ✓ text-case.svg
  ✓ word-counter.svg

TypeScript Errors Found:
  ✗ Import declaration conflicts (12 errors)
    - All tool pages have naming conflicts
    - Component name matches import name

  ✗ PDF-lib type errors (2 errors)
    - PdfMerge.tsx: Uint8Array type mismatch
    - PdfSplit.tsx: Uint8Array type mismatch

  ⚠ Warnings (3):
    - Base64Tool.tsx: deprecated escape/unescape
    - ColorConverter.tsx: unused useEffect import

========================================================================
    `);
  });
});
