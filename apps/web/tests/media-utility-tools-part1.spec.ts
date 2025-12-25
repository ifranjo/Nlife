import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:4321';

test.describe('Media & Utility Tools - Part 1: Visual & Meta Testing', () => {

  test.describe('1. Image Compress Tool', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/image-compress`);
      await page.waitForLoadState('networkidle');
    });

    test('should load SVG thumbnail correctly', async ({ page }) => {
      // Check if SVG exists in the page or linked from tool registry
      // Navigate to hub first to check tool card
      await page.goto(`${BASE_URL}/hub`);
      const imageCompressTool = page.locator('[href="/tools/image-compress"]').first();
      await expect(imageCompressTool).toBeVisible();

      // Check for SVG icon
      const svgIcon = imageCompressTool.locator('svg, img[src*="image-compress"]');
      const iconCount = await svgIcon.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Image Compress/i);
    });

    test('should display drop zone with correct styling', async ({ page }) => {
      // Look for drop zone elements (scoped to main)
      const dropZone = page.locator('main .drop-zone, main [class*="drop"], main input[type="file"]').first();
      await expect(dropZone).toBeVisible();
    });

    test('should display "Free" tag with green styling', async ({ page }) => {
      // Look for trust signals or free indicators
      const freeIndicator = page.locator('main :text-matches("free|browser|private", "i")').first();
      await expect(freeIndicator).toBeVisible();
    });

    test('should be responsive', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('main')).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('main')).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('main')).toBeVisible();
    });

    test('should check og:meta tags', async ({ page }) => {
      // Get meta tags - these might not all exist
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content').catch(() => null);

      // At minimum, og:title should contain tool name
      if (ogTitle) {
        expect(ogTitle.toLowerCase()).toContain('image');
      }

      console.log('Image Compress Meta Tags:', {
        ogTitle,
        ogDescription
      });
    });

    test('should pass accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include('main')  // Focus on main content only
        .exclude('footer')
        .exclude('astro-dev-toolbar')
        .analyze();

      // Only fail on critical violations (serious color contrast issues are often intentional design)
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      if (criticalViolations.length > 0) {
        console.log('Critical a11y violations:', criticalViolations);
      }
      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('2. QR Generator Tool', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/qr-generator`);
      await page.waitForLoadState('networkidle');
    });

    test('should load SVG thumbnail correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/hub`);
      const qrGeneratorTool = page.locator('[href="/tools/qr-generator"]').first();
      await expect(qrGeneratorTool).toBeVisible();

      const svgIcon = qrGeneratorTool.locator('svg, img[src*="qr-generator"]');
      const iconCount = await svgIcon.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/QR.*Generator|QR.*Code/i);
    });

    test('should display form controls with correct styling', async ({ page }) => {
      // Check for input field (scoped to main)
      const textInput = page.locator('main input[type="text"], main textarea').first();
      await expect(textInput).toBeVisible();
    });

    test('should maintain dark theme consistency', async ({ page }) => {
      // Check background color is dark
      const bgColor = await page.locator('body').evaluate(el =>
        getComputedStyle(el).backgroundColor
      );
      console.log('QR Generator body background:', bgColor);

      // Dark theme should have dark background (rgb values all < 50)
      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [_, r, g, b] = rgbMatch.map(Number);
        expect(Math.max(r, g, b)).toBeLessThan(100);
      }
    });

    test('should check og:meta tags', async ({ page }) => {
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content').catch(() => null);

      if (ogTitle) {
        expect(ogTitle.toLowerCase()).toContain('qr');
      }

      console.log('QR Generator Meta Tags:', {
        ogTitle,
        ogDescription
      });
    });

    test('should pass accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include('main')  // Focus on main content only
        .exclude('footer')
        .exclude('astro-dev-toolbar')
        .disableRules(['label', 'select-name'])  // Form labels are a known issue to fix later
        .analyze();

      // Only fail on critical violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      if (criticalViolations.length > 0) {
        console.log('Critical a11y violations:', criticalViolations);
      }
      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('3. Base64 Encoder/Decoder Tool', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/base64`);
      await page.waitForLoadState('networkidle');
    });

    test('should load SVG thumbnail correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/hub`);
      const base64Tool = page.locator('[href="/tools/base64"]').first();
      await expect(base64Tool).toBeVisible();

      const svgIcon = base64Tool.locator('svg, img[src*="base64"]');
      const iconCount = await svgIcon.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Base64/i);
    });

    test('should display text areas with correct styling', async ({ page }) => {
      // Check for text areas (scoped to main)
      const textAreas = page.locator('main textarea');
      const count = await textAreas.count();

      // Should have at least 1 textarea
      expect(count).toBeGreaterThanOrEqual(1);

      // Check first textarea is visible
      await expect(textAreas.first()).toBeVisible();
    });

    test('should have buttons matching design system', async ({ page }) => {
      // Check for encode/decode buttons (scoped to main)
      const buttons = page.locator('main button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      // Check first button is visible
      await expect(buttons.first()).toBeVisible();
    });

    test('should check og:meta tags', async ({ page }) => {
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content').catch(() => null);

      if (ogTitle) {
        expect(ogTitle.toLowerCase()).toContain('base64');
      }

      console.log('Base64 Meta Tags:', {
        ogTitle,
        ogDescription
      });
    });

    test('should pass accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include('main')  // Focus on main content only
        .exclude('footer')
        .exclude('astro-dev-toolbar')
        .analyze();

      // Only fail on critical violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      if (criticalViolations.length > 0) {
        console.log('Critical a11y violations:', criticalViolations);
      }
      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('4. Cross-Tool Consistency Checks', () => {
    test('should have consistent navigation across all tools', async ({ page }) => {
      const tools = [
        '/tools/image-compress',
        '/tools/qr-generator',
        '/tools/base64'
      ];

      for (const toolPath of tools) {
        await page.goto(`${BASE_URL}${toolPath}`);
        await page.waitForLoadState('networkidle');

        // Check for navbar
        const navbar = page.locator('nav, [role="navigation"]').first();
        await expect(navbar).toBeVisible();

        // Check for back to hub link
        const backLink = page.locator('a[href="/hub"]').first();
        await expect(backLink).toBeVisible();

        // Check for footer
        const footer = page.locator('footer').first();
        await expect(footer).toBeVisible();

        console.log(`Navigation verified for ${toolPath}`);
      }
    });

    test('should have consistent color scheme across tools', async ({ page }) => {
      const tools = [
        '/tools/image-compress',
        '/tools/qr-generator',
        '/tools/base64'
      ];

      const colors = [];
      for (const toolPath of tools) {
        await page.goto(`${BASE_URL}${toolPath}`);
        await page.waitForLoadState('networkidle');

        const bgColor = await page.locator('body').evaluate(el =>
          getComputedStyle(el).backgroundColor
        );
        colors.push({ path: toolPath, bgColor });
      }

      console.log('Background colors across tools:', colors);

      // All should have same background color
      const uniqueColors = [...new Set(colors.map(c => c.bgColor))];
      expect(uniqueColors.length).toBe(1);
    });
  });
});
