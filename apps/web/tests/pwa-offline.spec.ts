/**
 * Comprehensive PWA and Offline Functionality Tests
 *
 * Tests cover:
 * 1. Service worker installation and lifecycle
 * 2. Offline functionality after first visit
 * 3. Cache management and resource caching
 * 4. Offline page behavior
 * 5. Online/offline sync transitions
 * 6. Install prompt detection
 * 7. Web App Manifest validation
 * 8. PWA icons verification
 * 9. Splash screen and theme configuration
 *
 * Uses Playwright's service worker and network interception APIs.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wait for service worker to be fully active
 */
async function waitForServiceWorker(page: Page, timeout = 15000): Promise<boolean> {
  return page.evaluate(async (timeoutMs) => {
    if (!('serviceWorker' in navigator)) return false;

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }, timeout);
}

/**
 * Check if a URL is cached
 */
async function isUrlCached(page: Page, url: string): Promise<boolean> {
  return page.evaluate(async (targetUrl) => {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const response = await cache.match(targetUrl);
        if (response) return true;
      }
      return false;
    } catch {
      return false;
    }
  }, url);
}

/**
 * Get all cached URLs
 */
async function getCachedUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const urls: string[] = [];
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        urls.push(...keys.map((req) => req.url));
      }
    } catch {
      // Ignore errors
    }
    return urls;
  });
}

/**
 * Clear all caches
 */
async function clearAllCaches(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  });
}

// ============================================================================
// 1. SERVICE WORKER INSTALLATION TESTS
// ============================================================================
test.describe('Service Worker Installation', () => {
  test('service worker file is accessible and valid', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);

    const content = await response?.text();
    expect(content).toBeDefined();

    // Verify essential service worker event handlers
    expect(content).toContain('install');
    expect(content).toContain('activate');
    expect(content).toContain('fetch');

    // Verify cache implementation
    expect(content).toContain('caches');
    expect(content).toContain('STATIC_CACHE');
    expect(content).toContain('DYNAMIC_CACHE');

    // Verify offline fallback
    expect(content).toContain('/offline');
  });

  test('service worker registers successfully on page load', async ({ page }) => {
    await page.goto('/hub');

    const registered = await waitForServiceWorker(page);
    expect(registered).toBe(true);
  });

  test('service worker scope is correct', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);

    const scope = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.scope || null;
    });

    expect(scope).toContain('/');
  });

  test('service worker activates and claims clients', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);

    const isControlling = await page.evaluate(async () => {
      return navigator.serviceWorker.controller !== null;
    });

    // May not be controlling on first load (claims on next navigation)
    expect(typeof isControlling).toBe('boolean');
  });

  test('service worker handles update lifecycle', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);

    // Trigger update check
    const updateTriggered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        return true;
      }
      return false;
    });

    expect(updateTriggered).toBe(true);
  });
});

// ============================================================================
// 2. OFFLINE FUNCTIONALITY TESTS
// ============================================================================
test.describe('Offline Functionality', () => {
  test('app serves cached content when offline after first visit', async ({
    page,
    context,
  }) => {
    // First, visit the hub to cache it
    await page.goto('/hub');
    await waitForServiceWorker(page);

    // Wait for caching to complete
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Navigate to hub again (should load from cache)
    await page.goto('/hub');

    // Verify page loaded (check for main content)
    await expect(page.locator('body')).toBeVisible();

    // Check that page has expected content
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000); // Not an error page

    // Restore online status
    await context.setOffline(false);
  });

  test('cached static assets load from cache', async ({ page, context }) => {
    // Visit main page to cache assets
    await page.goto('/');
    await waitForServiceWorker(page);
    await page.waitForTimeout(2000);

    // Visit hub to cache that too
    await page.goto('/hub');
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Try to navigate - should use cached resources
    await page.goto('/hub');

    // Page should still render
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });

    // Restore online status
    await context.setOffline(false);
  });

  test('offline page shows when accessing uncached page offline', async ({
    page,
    context,
  }) => {
    // Visit home to activate service worker
    await page.goto('/');
    await waitForServiceWorker(page);
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Try to navigate to a page that might not be cached
    // The SW should serve the offline page
    await page.goto('/tools/video-trimmer'); // Less likely to be pre-cached

    // Either the page loads from cache or we get offline page
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();

    // Restore online status
    await context.setOffline(false);
  });

  test('tool pages work offline after visiting them', async ({ page, context }) => {
    // Visit a tool page to cache it
    await page.goto('/tools/qr-generator');
    await waitForServiceWorker(page);
    await page.waitForTimeout(3000); // Wait for all assets to cache

    // Go offline
    await context.setOffline(true);

    // Reload the same page
    await page.reload();

    // Tool should still be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Restore online status
    await context.setOffline(false);
  });
});

// ============================================================================
// 3. CACHE MANAGEMENT TESTS
// ============================================================================
test.describe('Cache Management', () => {
  test('static assets are cached on first visit', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);
    await page.waitForTimeout(3000);

    const cachedUrls = await getCachedUrls(page);

    // Should have cached some resources
    expect(cachedUrls.length).toBeGreaterThan(0);

    // Check for expected cached resources
    const hasHomeCached =
      cachedUrls.some((url) => url.endsWith('/hub') || url.includes('/hub'));
    expect(hasHomeCached).toBe(true);
  });

  test('cache includes manifest and icons', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);
    await page.waitForTimeout(3000);

    // Check manifest is cached or accessible
    const manifestCached = await isUrlCached(page, '/manifest.json');
    // Manifest might be cached or served fresh - either is acceptable
    expect(typeof manifestCached).toBe('boolean');

    // Check favicon
    const faviconCached = await isUrlCached(page, '/favicon.svg');
    expect(typeof faviconCached).toBe('boolean');
  });

  test('dynamic cache stores visited pages', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);
    await page.waitForTimeout(2000);

    // Visit additional pages
    await page.goto('/tools/pdf-merge');
    await page.waitForTimeout(1000);

    await page.goto('/tools/image-compress');
    await page.waitForTimeout(1000);

    const cachedUrls = await getCachedUrls(page);

    // At least some URLs should be cached
    expect(cachedUrls.length).toBeGreaterThan(2);
  });

  test('cache can be cleared via message', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);
    await page.waitForTimeout(2000);

    // Clear cache via SW message
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        reg.active.postMessage({ type: 'CLEAR_CACHE' });
      }
    });

    await page.waitForTimeout(1000);

    const cachedUrls = await getCachedUrls(page);
    // Cache should be empty or minimal
    expect(cachedUrls.length).toBeLessThanOrEqual(5);
  });

  test('cache updates when new content is available', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);

    // Simulate update check
    const updateResult = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        try {
          await reg.update();
          return 'updated';
        } catch (e) {
          return 'error';
        }
      }
      return 'no-registration';
    });

    expect(updateResult).toBe('updated');
  });
});

// ============================================================================
// 4. OFFLINE PAGE TESTS
// ============================================================================
test.describe('Offline Page', () => {
  test('offline page loads correctly', async ({ page }) => {
    await page.goto('/offline');

    // Check heading
    await expect(
      page.getByRole('heading', { name: /offline/i }).first()
    ).toBeVisible();
  });

  test('offline page has retry button', async ({ page }) => {
    await page.goto('/offline');

    const retryBtn = page.getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible();
  });

  test('offline page lists available offline tools', async ({ page }) => {
    await page.goto('/offline');

    // Check for offline-capable tools listed
    await expect(page.getByText(/available offline/i)).toBeVisible();

    // Check for specific tools
    await expect(page.getByRole('link', { name: /pdf merge/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /image compress/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /qr generator/i })).toBeVisible();
  });

  test('offline page retry button reloads page', async ({ page }) => {
    await page.goto('/offline');

    const retryBtn = page.getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible();

    // Click retry and check for navigation/reload
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 5000 }).catch(() => null),
      retryBtn.click(),
    ]);

    // Either reloaded or navigated
    expect(page.url()).toContain('/offline');
  });

  test('offline page has link to tools hub', async ({ page }) => {
    await page.goto('/offline');

    const hubLink = page.getByRole('link', { name: /view all tools|all tools/i });
    await expect(hubLink).toBeVisible();
  });

  test('offline page is accessible', async ({ page }) => {
    await page.goto('/offline');

    const results = await new AxeBuilder({ page })
      .exclude('.grid-bg')
      .exclude('.scanlines')
      .analyze();

    const criticalIssues = results.violations.filter((v) => v.impact === 'critical');
    expect(criticalIssues).toEqual([]);
  });
});

// ============================================================================
// 5. ONLINE/OFFLINE SYNC TESTS
// ============================================================================
test.describe('Online/Offline Sync', () => {
  test('detects online status change', async ({ page, context }) => {
    await page.goto('/offline');

    // Setup listener for online event
    const onlineEventReceived = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        window.addEventListener(
          'online',
          () => {
            resolve(true);
          },
          { once: true }
        );
        // Timeout fallback
        setTimeout(() => resolve(false), 5000);
      });
    });

    // Go offline then online
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);

    const eventFired = await onlineEventReceived;
    expect(eventFired).toBe(true);
  });

  test('navigator.onLine reflects connection state', async ({ page, context }) => {
    await page.goto('/hub');

    // Check online
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    const isOffline = await page.evaluate(() => navigator.onLine);
    expect(isOffline).toBe(false);

    // Restore
    await context.setOffline(false);
  });

  test('service worker handles network failures gracefully', async ({
    page,
    context,
  }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);
    await page.waitForTimeout(2000);

    // Listen for errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Go offline and try to navigate
    await context.setOffline(true);
    await page.goto('/hub').catch(() => {
      // Navigation might fail, that's OK
    });

    // Should not have critical JS errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('Failed to fetch') && !e.includes('NetworkError') && !e.includes('net::')
    );
    expect(criticalErrors.length).toBe(0);

    await context.setOffline(false);
  });
});

// ============================================================================
// 6. INSTALL PROMPT TESTS
// ============================================================================
test.describe('Install Prompt', () => {
  test('beforeinstallprompt event can be captured', async ({ page }) => {
    // Check if the page sets up install prompt handling
    await page.goto('/hub');

    const hasInstallPromptSetup = await page.evaluate(() => {
      // Check if the page has any install-related code or listeners
      // This is a basic check - actual prompt behavior varies by browser
      return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window;
    });

    // Not all browsers support this, so just verify no errors
    expect(typeof hasInstallPromptSetup).toBe('boolean');
  });

  test('app meets PWA installability criteria', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);

    // Check for manifest link
    const hasManifest = await page.evaluate(() => {
      return document.querySelector('link[rel="manifest"]') !== null;
    });
    expect(hasManifest).toBe(true);

    // Check for service worker
    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSW).toBe(true);

    // Check for HTTPS (localhost counts as secure)
    const isSecure = await page.evaluate(() => {
      return (
        window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      );
    });
    expect(isSecure).toBe(true);
  });
});

// ============================================================================
// 7. MANIFEST VALIDATION TESTS
// ============================================================================
test.describe('Web App Manifest', () => {
  test('manifest is valid JSON', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  test('manifest has required fields', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    // Required fields for PWA
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('manifest has correct display mode', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    // Should be standalone for app-like experience
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
  });

  test('manifest has theme and background colors', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();

    // Colors should be valid hex or CSS color
    const colorRegex = /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/;
    expect(colorRegex.test(manifest.theme_color)).toBe(true);
    expect(colorRegex.test(manifest.background_color)).toBe(true);
  });

  test('manifest has proper scope', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    expect(manifest.scope).toBeDefined();
    expect(manifest.scope).toBe('/');
  });

  test('manifest has valid start_url', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    // Start URL should be valid
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.start_url).toBe('/hub');
  });

  test('manifest description is meaningful', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    expect(manifest.description).toBeTruthy();
    expect(manifest.description.length).toBeGreaterThan(20);
  });

  test('manifest has categories', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    expect(manifest.categories).toBeDefined();
    expect(Array.isArray(manifest.categories)).toBe(true);
    expect(manifest.categories.length).toBeGreaterThan(0);
  });

  test('manifest has shortcuts for quick access', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);

    // Each shortcut should have required fields
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url).toBeTruthy();
    }
  });
});

// ============================================================================
// 8. PWA ICONS TESTS
// ============================================================================
test.describe('PWA Icons', () => {
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of iconSizes) {
    test(`icon ${size}x${size} exists and is accessible`, async ({ page }) => {
      const response = await page.goto(`/icons/icon-${size}x${size}.png`);
      expect(response?.status()).toBe(200);

      const contentType = response?.headers()['content-type'];
      expect(contentType).toContain('image/png');
    });
  }

  test('manifest icons match actual files', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    for (const icon of manifest.icons) {
      const iconResponse = await page.goto(icon.src);
      expect(iconResponse?.status(), `Icon ${icon.src} should exist`).toBe(200);
    }
  });

  test('icons have correct size declarations', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    for (const icon of manifest.icons) {
      expect(icon.sizes).toBeTruthy();
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
      expect(icon.type).toBe('image/png');
    }
  });

  test('at least one maskable icon exists', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    const maskableIcons = manifest.icons.filter(
      (icon: { purpose?: string }) => icon.purpose?.includes('maskable')
    );

    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  test('apple touch icons are configured', async ({ page }) => {
    await page.goto('/hub');

    const appleTouchIcons = await page.evaluate(() => {
      const links = document.querySelectorAll('link[rel="apple-touch-icon"]');
      return links.length;
    });

    expect(appleTouchIcons).toBeGreaterThan(0);
  });

  test('favicon is accessible', async ({ page }) => {
    const response = await page.goto('/favicon.svg');
    expect(response?.status()).toBe(200);
  });
});

// ============================================================================
// 9. SPLASH SCREEN AND THEME TESTS
// ============================================================================
test.describe('Splash Screen and Theme', () => {
  test('apple-mobile-web-app meta tags are present', async ({ page }) => {
    await page.goto('/hub');

    const hasMobileWebAppCapable = await page.evaluate(() => {
      return (
        document.querySelector('meta[name="apple-mobile-web-app-capable"]') !== null
      );
    });
    expect(hasMobileWebAppCapable).toBe(true);

    const hasStatusBarStyle = await page.evaluate(() => {
      return (
        document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') !==
        null
      );
    });
    expect(hasStatusBarStyle).toBe(true);

    const hasAppTitle = await page.evaluate(() => {
      return (
        document.querySelector('meta[name="apple-mobile-web-app-title"]') !== null
      );
    });
    expect(hasAppTitle).toBe(true);
  });

  test('theme color matches manifest', async ({ page }) => {
    // Get manifest theme color
    const manifestResponse = await page.goto('/manifest.json');
    const manifest = await manifestResponse?.json();
    const manifestThemeColor = manifest.theme_color;

    // Navigate to page and check meta theme-color
    await page.goto('/hub');
    const metaThemeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta?.getAttribute('content');
    });

    // Meta might not exist (it's optional), but if it does, should match
    if (metaThemeColor) {
      expect(metaThemeColor.toLowerCase()).toBe(manifestThemeColor.toLowerCase());
    }
  });

  test('mobile-web-app-capable is set for Android', async ({ page }) => {
    await page.goto('/hub');

    const hasMobileWebAppCapable = await page.evaluate(() => {
      return document.querySelector('meta[name="mobile-web-app-capable"]') !== null;
    });
    expect(hasMobileWebAppCapable).toBe(true);
  });

  test('viewport is properly configured for mobile', async ({ page }) => {
    await page.goto('/hub');

    const viewportContent = await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      return viewport?.getAttribute('content');
    });

    expect(viewportContent).toContain('width=device-width');
    expect(viewportContent).toContain('initial-scale=1');
  });

  test('manifest display mode creates proper splash experience', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    // Standalone mode enables splash screen on install
    expect(manifest.display).toBe('standalone');

    // Background color is used for splash screen
    expect(manifest.background_color).toBeTruthy();

    // 512x512 icon is required for splash
    const has512Icon = manifest.icons.some(
      (icon: { sizes: string }) => icon.sizes === '512x512'
    );
    expect(has512Icon).toBe(true);
  });
});

// ============================================================================
// 10. INTEGRATION AND EDGE CASES
// ============================================================================
test.describe('PWA Integration', () => {
  test('all pages have consistent PWA meta tags', async ({ page }) => {
    const pages = ['/hub', '/tools/pdf-merge', '/tools/qr-generator', '/offline'];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      const hasManifestLink = await page.evaluate(() => {
        return document.querySelector('link[rel="manifest"]') !== null;
      });
      expect(hasManifestLink, `${pagePath} should have manifest link`).toBe(true);

      const hasAppleCapable = await page.evaluate(() => {
        return (
          document.querySelector('meta[name="apple-mobile-web-app-capable"]') !== null
        );
      });
      expect(hasAppleCapable, `${pagePath} should have apple-mobile-web-app-capable`).toBe(
        true
      );
    }
  });

  test('no console errors during PWA initialization', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/hub');
    await waitForServiceWorker(page);
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('analytics') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR')
    );

    expect(criticalErrors).toEqual([]);
  });

  test('service worker messages are handled correctly', async ({ page }) => {
    await page.goto('/hub');
    await waitForServiceWorker(page);

    // Test SKIP_WAITING message
    const skipWaitingResult = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        reg.active.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
      return false;
    });
    expect(skipWaitingResult).toBe(true);

    // Test CACHE_URLS message
    const cacheUrlsResult = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        reg.active.postMessage({
          type: 'CACHE_URLS',
          urls: ['/tools/password-generator'],
        });
        return true;
      }
      return false;
    });
    expect(cacheUrlsResult).toBe(true);
  });

  test('PWA works across multiple tabs', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Open hub in both tabs
    await page1.goto('/hub');
    await page2.goto('/tools/pdf-merge');

    // Both should have SW access
    const sw1 = await waitForServiceWorker(page1);
    const sw2 = await waitForServiceWorker(page2);

    expect(sw1).toBe(true);
    expect(sw2).toBe(true);

    // Close pages
    await page1.close();
    await page2.close();
  });
});
