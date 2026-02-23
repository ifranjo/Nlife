import { test, expect } from '@playwright/test';

test.describe('Core UX and Compliance Gaps', () => {
  test('hub page uses a self canonical URL', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('domcontentloaded');

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', 'https://www.newlifesolutions.dev/hub');
  });

  test('legal pages are reachable', async ({ request }) => {
    const privacy = await request.get('/privacy');
    const terms = await request.get('/terms');
    const accessibility = await request.get('/accessibility');

    expect(privacy.status(), 'privacy page status').toBe(200);
    expect(terms.status(), 'terms page status').toBe(200);
    expect(accessibility.status(), 'accessibility page status').toBe(200);
  });

  test('skip link target exists on key routes', async ({ page }) => {
    const routes = ['/hub', '/tools/pdf-merge', '/pdf-tools'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const skipLink = page.locator('a.skip-link');
      await expect(skipLink, `missing skip link on ${route}`).toHaveCount(1);

      const href = await skipLink.getAttribute('href');
      expect(href, `skip href missing on ${route}`).toBeTruthy();
      expect(href?.startsWith('#'), `skip href should be fragment on ${route}`).toBe(true);

      const targetId = href!.slice(1);
      const target = page.locator(`#${targetId}`);
      await expect(target, `missing skip target #${targetId} on ${route}`).toHaveCount(1);
    }
  });

  test('mobile menu closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/hub');
    await page.waitForLoadState('domcontentloaded');

    const menuButton = page.locator('#mobile-menu-btn');
    const menu = page.locator('#mobile-menu');

    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toHaveClass(/(^|\s)hidden(\s|$)/);

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).not.toHaveClass(/(^|\s)hidden(\s|$)/);

    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toHaveClass(/(^|\s)hidden(\s|$)/);
  });
});
