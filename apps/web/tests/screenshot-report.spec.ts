import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4321';

test.describe('Visual Screenshot Report - Media & Utility Tools Part 1', () => {
  test('capture all tool screenshots', async ({ page }) => {
    const tools = [
      { path: '/tools/image-compress', name: 'image-compress' },
      { path: '/tools/qr-generator', name: 'qr-generator' },
      { path: '/tools/base64', name: 'base64' },
      { path: '/hub', name: 'hub-view' }
    ];

    for (const tool of tools) {
      await page.goto(`${BASE_URL}${tool.path}`);
      await page.waitForLoadState('networkidle');

      // Full page screenshot
      await page.screenshot({
        path: `test-results/screenshots/${tool.name}-full.png`,
        fullPage: true
      });

      // Viewport screenshot
      await page.screenshot({
        path: `test-results/screenshots/${tool.name}-viewport.png`,
        fullPage: false
      });

      console.log(`Screenshot captured for ${tool.name}`);
    }
  });

  test('capture mobile screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const tools = [
      { path: '/tools/image-compress', name: 'image-compress' },
      { path: '/tools/qr-generator', name: 'qr-generator' },
      { path: '/tools/base64', name: 'base64' }
    ];

    for (const tool of tools) {
      await page.goto(`${BASE_URL}${tool.path}`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/screenshots/${tool.name}-mobile.png`,
        fullPage: true
      });

      console.log(`Mobile screenshot captured for ${tool.name}`);
    }
  });
});
