import { test, expect } from '@playwright/test';

/**
 * Performance Tests
 * Validates Core Web Vitals and performance budgets
 */

// Performance budgets (in milliseconds)
const BUDGETS = {
  fcp: 1800,    // First Contentful Paint
  lcp: 2500,    // Largest Contentful Paint
  fid: 100,     // First Input Delay
  cls: 0.1,     // Cumulative Layout Shift
  ttfb: 600,    // Time to First Byte
  tti: 3500,    // Time to Interactive
};

/**
 * Measure Core Web Vitals
 */
async function measureWebVitals(page: any) {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      let lcp = 0;
      let cls = 0;
      let fid = 0;

      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        lcp = entries[entries.length - 1].startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // CLS
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });

      // FID
      new PerformanceObserver((list) => {
        const entry = list.getEntries()[0] as any;
        if (entry) {
          fid = entry.processingStart - entry.startTime;
        }
      }).observe({ entryTypes: ['first-input'] });

      // Return metrics after 5 seconds
      setTimeout(() => {
        resolve({ lcp, cls, fid });
      }, 5000);
    });
  });

  return metrics;
}

test.describe('⚡ Core Web Vitals', () => {
  test('homepage LCP is under budget', async ({ page }) => {
    await page.goto('/hub');

    // Wait for page to settle
    await page.waitForLoadState('networkidle');

    const metrics = await measureWebVitals(page) as any;

    console.log(`   LCP: ${Math.round(metrics.lcp)}ms (budget: ${BUDGETS.lcp}ms)`);

    // LCP should be under 2.5s
    expect(metrics.lcp).toBeLessThan(BUDGETS.lcp);
  });

  test('homepage CLS is under budget', async ({ page }) => {
    await page.goto('/hub');

    // Scroll page to trigger any layout shifts
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    const metrics = await measureWebVitals(page) as any;

    console.log(`   CLS: ${metrics.cls.toFixed(3)} (budget: ${BUDGETS.cls})`);

    // CLS should be under 0.1
    expect(metrics.cls).toBeLessThan(BUDGETS.cls);
  });

  test('tool pages load within budget', async ({ page }) => {
    const tools = [
      '/tools/pdf-merge',
      '/tools/qr-generator',
      '/tools/password-generator',
    ];

    for (const tool of tools) {
      const start = Date.now();
      await page.goto(tool);
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - start;

      console.log(`   ${tool}: ${loadTime}ms`);

      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    }
  });
});

test.describe('📦 Resource Loading', () => {
  test('no render-blocking resources', async ({ page }) => {
    const blockingResources: string[] = [];

    page.on('response', async (response) => {
      const request = response.request();
      const resourceType = request.resourceType();
      const headers = response.headers();

      // Check for render-blocking CSS/JS
      if ((resourceType === 'stylesheet' || resourceType === 'script') &&
          !headers['cache-control']?.includes('max-age')) {
        blockingResources.push(request.url());
      }
    });

    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Log any blocking resources found
    if (blockingResources.length > 0) {
      console.log('   Blocking resources:', blockingResources.length);
    }

    // Should have minimal blocking resources
    expect(blockingResources.length).toBeLessThan(10);
  });

  test('images use lazy loading', async ({ page }) => {
    await page.goto('/hub');

    const imagesWithoutLazy = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images)
        .filter(img => !img.hasAttribute('loading') || img.getAttribute('loading') !== 'lazy')
        .filter(img => !img.classList.contains('hero-image')) // Exclude hero images
        .map(img => img.src);
    });

    console.log(`   Images without lazy loading: ${imagesWithoutLazy.length}`);

    // Most images should use lazy loading
    expect(imagesWithoutLazy.length).toBeLessThan(5);
  });
});

test.describe('🔧 Heavy Library Loading', () => {
  test('FFmpeg loads on demand', async ({ page }) => {
    await page.goto('/tools/video-compressor');

    // Check that FFmpeg isn't loaded initially
    const hasFFmpeg = await page.evaluate(() => {
      return (window as any).FFmpeg !== undefined;
    });

    // FFmpeg should not be loaded on page load
    expect(hasFFmpeg).toBe(false);

    console.log('   ✓ FFmpeg not loaded on initial page load');
  });

  test('Tesseract loads on demand', async ({ page }) => {
    await page.goto('/tools/ocr');

    // Check that Tesseract isn't loaded initially
    const hasTesseract = await page.evaluate(() => {
      return (window as any).Tesseract !== undefined;
    });

    // Tesseract should not be loaded on page load
    expect(hasTesseract).toBe(false);

    console.log('   ✓ Tesseract not loaded on initial page load');
  });

  test('AI models load on demand', async ({ page }) => {
    await page.goto('/tools/grammar-checker');

    // Check that AI models aren't loaded initially
    const hasTransformers = await page.evaluate(() => {
      return (window as any).transformers !== undefined;
    });

    // Transformers should not be loaded on page load
    expect(hasTransformers).toBe(false);

    console.log('   ✓ Transformers not loaded on initial page load');
  });
});

test.describe('📊 Performance Budgets', () => {
  test('JavaScript bundle size is under budget', async ({ page }) => {
    let totalJsSize = 0;

    page.on('response', async (response) => {
      if (response.request().resourceType() === 'script') {
        const headers = response.headers();
        const contentLength = headers['content-length'];
        if (contentLength) {
          totalJsSize += parseInt(contentLength, 10);
        }
      }
    });

    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    const jsSizeKB = Math.round(totalJsSize / 1024);
    console.log(`   Total JS size: ${jsSizeKB}KB`);

    // JavaScript should be under 500KB
    expect(jsSizeKB).toBeLessThan(500);
  });

  test('CSS bundle size is under budget', async ({ page }) => {
    let totalCssSize = 0;

    page.on('response', async (response) => {
      if (response.request().resourceType() === 'stylesheet') {
        const headers = response.headers();
        const contentLength = headers['content-length'];
        if (contentLength) {
          totalCssSize += parseInt(contentLength, 10);
        }
      }
    });

    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    const cssSizeKB = Math.round(totalCssSize / 1024);
    console.log(`   Total CSS size: ${cssSizeKB}KB`);

    // CSS should be under 100KB
    expect(cssSizeKB).toBeLessThan(100);
  });
});

test.describe('🌐 Network Performance', () => {
  test('critical resources are cached', async ({ page }) => {
    const uncachedResources: string[] = [];

    page.on('response', (response) => {
      const headers = response.headers();
      const url = response.request().url();

      // Check for static assets
      if (url.includes('/_astro/') || url.includes('/thumbnails/')) {
        if (!headers['cache-control'] || !headers['cache-control'].includes('max-age')) {
          uncachedResources.push(url);
        }
      }
    });

    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    console.log(`   Uncached resources: ${uncachedResources.length}`);

    // Should have minimal uncached resources
    expect(uncachedResources.length).toBeLessThan(5);
  });
});
