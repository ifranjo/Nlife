import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Part 3 Testing Suite: Lorem Ipsum, Hash Generator, Color Converter + Layout Validation
 *
 * Tests:
 * 1. Lorem Ipsum Generator page
 * 2. Hash Generator page
 * 3. Color Converter page
 * 4. Global layout consistency (Navbar, Footer, Back button)
 * 5. Visual effects (grid, scanlines)
 * 6. Typography (monospace font)
 * 7. Thumbnails directory validation
 */

test.describe('Part 3: Utility Tools Testing', () => {

  // ===========================
  // Lorem Ipsum Generator Tests
  // ===========================

  test.describe('Lorem Ipsum Generator', () => {
    test('should load page with correct title', async ({ page }) => {
      await page.goto('/tools/lorem-ipsum');
      await expect(page).toHaveTitle(/Lorem Ipsum/i);
    });

    test('should display SVG thumbnail in hub', async ({ page }) => {
      await page.goto('/hub');
      const thumbnail = page.locator('img[src="/thumbnails/lorem-ipsum.svg"]');
      await expect(thumbnail).toBeVisible();

      // Verify SVG loads successfully
      const response = await page.request.get('/thumbnails/lorem-ipsum.svg');
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/svg+xml');
    });

    test('should have Navbar and Footer', async ({ page }) => {
      await page.goto('/tools/lorem-ipsum');

      // Check Navbar
      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible();

      // Check Footer
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('should have back button to /hub', async ({ page }) => {
      await page.goto('/tools/lorem-ipsum');
      await page.waitForLoadState('networkidle');

      // Just check that there's a link back to hub
      const backButton = page.locator('a[href="/hub"]').first();
      await expect(backButton).toBeVisible();
    });

    test('should have generation controls with proper styling', async ({ page }) => {
      await page.goto('/tools/lorem-ipsum');

      // Look for typical Lorem Ipsum controls
      const controls = page.locator('select, input[type="number"], button').first();
      await expect(controls).toBeVisible();

      // Check for styling classes (Tailwind)
      const hasStyledElement = await page.locator('[class*="bg-"], [class*="border-"], [class*="rounded-"]').count();
      expect(hasStyledElement).toBeGreaterThan(0);
    });
  });

  // ===========================
  // Hash Generator Tests
  // ===========================

  test.describe('Hash Generator', () => {
    test('should load page with correct title', async ({ page }) => {
      await page.goto('/tools/hash-generator');
      await expect(page).toHaveTitle(/Hash Generator/i);
    });

    test('should display SVG thumbnail in hub', async ({ page }) => {
      await page.goto('/hub');
      const thumbnail = page.locator('img[src="/thumbnails/hash-generator.svg"]');
      await expect(thumbnail).toBeVisible();

      // Verify SVG loads successfully
      const response = await page.request.get('/thumbnails/hash-generator.svg');
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/svg+xml');
    });

    test('should have Navbar and Footer', async ({ page }) => {
      await page.goto('/tools/hash-generator');

      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible();

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('should have back button to /hub', async ({ page }) => {
      await page.goto('/tools/hash-generator');

      const backButton = page.locator('a[href="/hub"]').first();
      await expect(backButton).toBeVisible();
    });

    test('should have hash output area with proper styling', async ({ page }) => {
      await page.goto('/tools/hash-generator');

      // Look for input area and hash output
      const textInputOrOutput = page.locator('textarea, input[type="text"], code, pre').first();
      await expect(textInputOrOutput).toBeVisible();

      // Check for monospace font styling
      const monoElement = page.locator('code, pre, [class*="font-mono"]').first();
      if (await monoElement.count() > 0) {
        await expect(monoElement).toBeVisible();
      }
    });
  });

  // ===========================
  // Color Converter Tests
  // ===========================

  test.describe('Color Converter', () => {
    test('should load page with correct title', async ({ page }) => {
      await page.goto('/tools/color-converter');
      await expect(page).toHaveTitle(/Color Converter/i);
    });

    test('should display SVG thumbnail in hub', async ({ page }) => {
      await page.goto('/hub');
      const thumbnail = page.locator('img[src="/thumbnails/color-converter.svg"]');
      await expect(thumbnail).toBeVisible();

      // Verify SVG loads successfully
      const response = await page.request.get('/thumbnails/color-converter.svg');
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/svg+xml');
    });

    test('should have Navbar and Footer', async ({ page }) => {
      await page.goto('/tools/color-converter');

      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible();

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('should have back button to /hub', async ({ page }) => {
      await page.goto('/tools/color-converter');

      const backButton = page.locator('a[href="/hub"]').first();
      await expect(backButton).toBeVisible();
    });

    test('should have color picker or input with proper styling', async ({ page }) => {
      await page.goto('/tools/color-converter');

      // Look for color input or text inputs for color values
      const colorControl = page.locator('input[type="color"], input[type="text"]').first();
      await expect(colorControl).toBeVisible();

      // Check for styled elements
      const hasStyledElement = await page.locator('[class*="bg-"], [class*="border-"]').count();
      expect(hasStyledElement).toBeGreaterThan(0);
    });
  });
});

// ===========================
// Global Layout Tests
// ===========================

test.describe('Global Layout & Navigation', () => {
  const toolPages = [
    '/tools/lorem-ipsum',
    '/tools/hash-generator',
    '/tools/color-converter',
    '/tools/pdf-merge',
    '/tools/pdf-split',
    '/tools/qr-generator',
    '/tools/image-compress',
    '/tools/base64',
    '/tools/json-formatter',
    '/tools/text-case',
    '/tools/word-counter',
  ];

  test('all tool pages should have Navbar', async ({ page }) => {
    for (const toolPath of toolPages) {
      await page.goto(toolPath);
      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible({ timeout: 5000 });
    }
  });

  test('all tool pages should have Footer', async ({ page }) => {
    for (const toolPath of toolPages) {
      await page.goto(toolPath);
      const footer = page.locator('footer');
      await expect(footer).toBeVisible({ timeout: 5000 });
    }
  });

  test('all tool pages should have back button to /hub', async ({ page }) => {
    for (const toolPath of toolPages) {
      await page.goto(toolPath);
      const backButton = page.locator('a[href="/hub"]').first();
      await expect(backButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have grid background effect visible', async ({ page }) => {
    await page.goto('/hub');

    // Check for grid pattern in CSS or background elements
    const bodyStyles = await page.locator('body').evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background,
        backgroundImage: styles.backgroundImage,
      };
    });

    // Grid should be implemented via CSS or pseudo-elements
    const hasGridEffect =
      bodyStyles.background.includes('linear-gradient') ||
      bodyStyles.backgroundImage !== 'none' ||
      await page.locator('[class*="grid"], [style*="grid"]').count() > 0;

    expect(hasGridEffect).toBeTruthy();
  });

  test('should have dark theme with proper styling', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Check for dark background color
    const bgColor = await page.locator('body').evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    // Dark theme should have dark background (rgb values all < 50)
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch.map(Number);
      expect(Math.max(r, g, b)).toBeLessThan(50);
    }
  });

  test('should use monospace font (Courier New)', async ({ page }) => {
    await page.goto('/hub');

    // Check font family on body or main headings
    const fonts = await page.evaluate(() => {
      const body = document.querySelector('body');
      const heading = document.querySelector('h1, h2');

      return {
        bodyFont: body ? window.getComputedStyle(body).fontFamily : '',
        headingFont: heading ? window.getComputedStyle(heading).fontFamily : '',
      };
    });

    // Should contain Courier New or monospace
    const hasMonospace =
      fonts.bodyFont.toLowerCase().includes('courier') ||
      fonts.bodyFont.toLowerCase().includes('monospace') ||
      fonts.headingFont.toLowerCase().includes('courier') ||
      fonts.headingFont.toLowerCase().includes('monospace');

    expect(hasMonospace).toBeTruthy();
  });
});

// ===========================
// Thumbnails Directory Validation
// ===========================

test.describe('Thumbnails Directory Validation', () => {
  const expectedThumbnails = [
    'pdf-merge.svg',
    'pdf-split.svg',
    'qr-generator.svg',
    'image-compress.svg',
    'base64.svg',
    'json-formatter.svg',
    'text-case.svg',
    'word-counter.svg',
    'lorem-ipsum.svg',
    'hash-generator.svg',
    'color-converter.svg',
  ];

  test('all 11+ SVG thumbnails should exist', async ({ page }) => {
    for (const thumbnail of expectedThumbnails) {
      const response = await page.request.get(`/thumbnails/${thumbnail}`);
      expect(response.ok(), `Missing thumbnail: ${thumbnail}`).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/svg+xml');
    }
  });

  test('manifest.json should exist and be valid', async ({ page }) => {
    const response = await page.request.get('/thumbnails/manifest.json');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const manifest = await response.json();
    expect(manifest).toBeTruthy();
    expect(Array.isArray(manifest.thumbnails) || typeof manifest === 'object').toBeTruthy();
  });

  test('SVG thumbnails should use stroke="#e0e0e0" (design system)', async ({ page }) => {
    for (const thumbnail of expectedThumbnails.slice(0, 3)) { // Sample check
      const response = await page.request.get(`/thumbnails/${thumbnail}`);
      const svgContent = await response.text();

      // Check if stroke color matches design system
      const hasCorrectStroke =
        svgContent.includes('stroke="#e0e0e0"') ||
        svgContent.includes('stroke="#E0E0E0"') ||
        svgContent.includes('stroke="rgb(224, 224, 224)');

      expect(hasCorrectStroke, `${thumbnail} should use stroke="#e0e0e0"`).toBeTruthy();
    }
  });
});

// ===========================
// Accessibility Tests
// ===========================

test.describe('Accessibility Validation', () => {
  test('tool pages should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/tools/lorem-ipsum');
    await page.waitForLoadState('networkidle');

    // Check H1 in main content (excluding debug overlays)
    const h1Count = await page.locator('main h1').count();
    expect(h1Count).toBeGreaterThan(0);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/hub');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/tools/lorem-ipsum');

    // All buttons and links should be focusable
    const interactiveElements = page.locator('button, a[href], input, select, textarea');
    const count = await interactiveElements.count();

    expect(count).toBeGreaterThan(0);

    // Sample check: first button should be focusable
    if (count > 0) {
      await interactiveElements.first().focus();
      await expect(interactiveElements.first()).toBeFocused();
    }
  });
});
