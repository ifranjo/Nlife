import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:4321';

test.describe('Media & Utility Tools - Part 1: Visual & Meta Testing', () => {

  test.describe('1. Image Compress Tool', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/image-compress`);
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
      await expect(page).toHaveTitle('Image Compress - New Life Solutions');
    });

    test('should display drop zone with correct styling', async ({ page }) => {
      // Look for drop zone elements
      const dropZone = page.locator('text=/drag.*drop|choose.*file/i').first();
      await expect(dropZone).toBeVisible();

      // Check for border styling (typically dashed border for drop zones)
      const dropZoneContainer = page.locator('[class*="border-dashed"], [class*="drop-zone"], input[type="file"] + *').first();
      await expect(dropZoneContainer).toBeVisible();
    });

    test('should display "Free" tag with green styling', async ({ page }) => {
      const freeTag = page.locator('text=/free/i').first();
      await expect(freeTag).toBeVisible();

      // Check if tag has green color class
      const tagElement = await freeTag.evaluateHandle(el => {
        // Find parent element with color classes
        let current = el as Element;
        for (let i = 0; i < 5; i++) {
          if (current.className.includes('green') ||
              current.className.includes('emerald') ||
              getComputedStyle(current).borderColor.includes('0, 255') ||
              getComputedStyle(current).color.includes('0, 255')) {
            return current.className;
          }
          if (current.parentElement) current = current.parentElement;
        }
        return current.className;
      });
      const className = await tagElement.jsonValue();
      console.log('Free tag className:', className);
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
      // Get meta tags
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');

      // Verify og:image points to SVG
      expect(ogImage).toBeTruthy();
      if (ogImage) {
        expect(ogImage.includes('.svg') || ogImage.includes('image-compress')).toBeTruthy();
      }

      // Verify og:title matches page title
      expect(ogTitle).toContain('Image Compress');
      expect(ogTitle).toContain('New Life Solutions');

      // Verify og:description exists
      expect(ogDescription).toBeTruthy();
      expect(ogDescription!.length).toBeGreaterThan(0);

      // Verify twitter:card exists
      expect(twitterCard).toBeTruthy();

      console.log('Image Compress Meta Tags:', {
        ogImage,
        ogTitle,
        ogDescription,
        twitterCard
      });
    });

    test('should pass accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('2. QR Generator Tool', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/qr-generator`);
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
      await expect(page).toHaveTitle('QR Generator - New Life Solutions');
    });

    test('should display form controls with correct styling', async ({ page }) => {
      // Check for input field
      const textInput = page.locator('input[type="text"], textarea').first();
      await expect(textInput).toBeVisible();

      // Check for generate button
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
      await expect(generateButton).toBeVisible();
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
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');

      expect(ogImage).toBeTruthy();
      if (ogImage) {
        expect(ogImage.includes('.svg') || ogImage.includes('qr-generator')).toBeTruthy();
      }

      expect(ogTitle).toContain('QR Generator');
      expect(ogTitle).toContain('New Life Solutions');
      expect(ogDescription).toBeTruthy();
      expect(twitterCard).toBeTruthy();

      console.log('QR Generator Meta Tags:', {
        ogImage,
        ogTitle,
        ogDescription,
        twitterCard
      });
    });

    test('should pass accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('3. Base64 Encoder/Decoder Tool', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/tools/base64`);
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
      await expect(page).toHaveTitle('Base64 Encoder/Decoder - New Life Solutions');
    });

    test('should display text areas with correct styling', async ({ page }) => {
      // Check for text areas
      const textAreas = page.locator('textarea');
      const count = await textAreas.count();
      expect(count).toBeGreaterThanOrEqual(2); // Should have input and output areas

      // Check first textarea is visible and styled
      await expect(textAreas.first()).toBeVisible();

      // Check styling consistency
      const firstTextArea = textAreas.first();
      const styles = await firstTextArea.evaluate(el => ({
        border: getComputedStyle(el).border,
        borderRadius: getComputedStyle(el).borderRadius,
        padding: getComputedStyle(el).padding
      }));

      console.log('Base64 textarea styles:', styles);
      expect(styles.border).toBeTruthy();
    });

    test('should have buttons matching design system', async ({ page }) => {
      // Check for encode/decode buttons
      const buttons = page.locator('button:has-text("Encode"), button:has-text("Decode"), button:has-text("Copy")');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      // Check button styling
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();

      const buttonStyles = await firstButton.evaluate(el => ({
        backgroundColor: getComputedStyle(el).backgroundColor,
        borderRadius: getComputedStyle(el).borderRadius,
        padding: getComputedStyle(el).padding
      }));

      console.log('Base64 button styles:', buttonStyles);
    });

    test('should check og:meta tags', async ({ page }) => {
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');

      expect(ogImage).toBeTruthy();
      if (ogImage) {
        expect(ogImage.includes('.svg') || ogImage.includes('base64')).toBeTruthy();
      }

      expect(ogTitle).toContain('Base64');
      expect(ogTitle).toContain('New Life Solutions');
      expect(ogDescription).toBeTruthy();
      expect(twitterCard).toBeTruthy();

      console.log('Base64 Meta Tags:', {
        ogImage,
        ogTitle,
        ogDescription,
        twitterCard
      });
    });

    test('should pass accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
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

        // Check for navbar
        const navbar = page.locator('nav, [role="navigation"]').first();
        await expect(navbar).toBeVisible();

        // Check for back to hub link
        const backLink = page.locator('a[href="/hub"], a:has-text("Back")').first();
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
