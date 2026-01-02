/**
 * Percy Visual Regression Tests
 *
 * These tests capture screenshots and send them to Percy's cloud for
 * AI-powered visual comparison. Percy detects meaningful visual changes
 * while ignoring irrelevant variations (anti-aliasing, minor shifts).
 *
 * Setup:
 * 1. Create account at percy.io (free tier: 5K screenshots/month)
 * 2. Create a project and get your PERCY_TOKEN
 * 3. Add PERCY_TOKEN to GitHub Secrets
 *
 * Local testing:
 *   PERCY_TOKEN=your_token npx percy exec -- npx playwright test tests/percy-visual.spec.ts
 *
 * CI runs automatically when PERCY_TOKEN is configured.
 *
 * @see https://docs.percy.io/docs/playwright
 */
import { test, type Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

// ============================================================================
// CONFIGURATION
// ============================================================================
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// Critical pages to test (highest traffic/impact)
const CRITICAL_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/hub', name: 'Tool Hub' },
  { path: '/tools/pdf-merge', name: 'PDF Merge' },
  { path: '/tools/image-compress', name: 'Image Compress' },
  { path: '/tools/qr-generator', name: 'QR Generator' },
  { path: '/tools/background-remover', name: 'Background Remover' },
  { path: '/games', name: 'Games Hub' },
];

// Helper to wait for page stability
async function waitForStable(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Disable animations for consistent screenshots
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

// ============================================================================
// CRITICAL PAGES - DESKTOP
// ============================================================================
test.describe('Percy Visual - Critical Pages (Desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
  });

  for (const { path, name } of CRITICAL_PAGES) {
    test(`${name} - desktop`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);

      await percySnapshot(page, `${name} - Desktop`, {
        widths: [1280],
        minHeight: 1024,
      });
    });
  }
});

// ============================================================================
// CRITICAL PAGES - MOBILE
// ============================================================================
test.describe('Percy Visual - Critical Pages (Mobile)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
  });

  for (const { path, name } of CRITICAL_PAGES) {
    test(`${name} - mobile`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);

      await percySnapshot(page, `${name} - Mobile`, {
        widths: [375],
        minHeight: 667,
      });
    });
  }
});

// ============================================================================
// TOOL INTERACTIONS - STATE CHANGES
// ============================================================================
test.describe('Percy Visual - Tool Interactions', () => {
  test('QR Generator - with generated code', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await waitForStable(page);

    // Generate a QR code
    const input = page.locator('input[type="text"], input[type="url"], textarea').first();
    if (await input.isVisible()) {
      await input.fill('https://newlifesolutions.dev');
      await page.waitForTimeout(1000);
    }

    await percySnapshot(page, 'QR Generator - With Code', {
      widths: [1280, 375],
    });
  });

  test('Hub - search filtered', async ({ page }) => {
    await page.goto('/hub');
    await waitForStable(page);

    // Search for PDF tools
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('PDF');
      await page.waitForTimeout(500);
    }

    await percySnapshot(page, 'Hub - Search Results for PDF', {
      widths: [1280],
    });
  });

  test('Hub - category filtered', async ({ page }) => {
    await page.goto('/hub');
    await waitForStable(page);

    // Click on a category filter if available
    const categoryButton = page.locator('button:has-text("Document"), [data-category="document"]').first();
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForTimeout(500);
    }

    await percySnapshot(page, 'Hub - Document Category Filter', {
      widths: [1280],
    });
  });
});

// ============================================================================
// DARK MODE
// ============================================================================
test.describe('Percy Visual - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('Hub - dark mode', async ({ page }) => {
    await page.goto('/hub');
    await waitForStable(page);

    await percySnapshot(page, 'Hub - Dark Mode', {
      widths: [1280, 375],
    });
  });

  test('PDF Merge - dark mode', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForStable(page);

    await percySnapshot(page, 'PDF Merge - Dark Mode', {
      widths: [1280],
    });
  });
});

// ============================================================================
// UI COMPONENTS
// ============================================================================
test.describe('Percy Visual - UI Components', () => {
  test('Navigation bar', async ({ page }) => {
    await page.goto('/hub');
    await waitForStable(page);

    // Focus on navbar
    const navbar = page.locator('nav').first();
    if (await navbar.isVisible()) {
      await percySnapshot(page, 'Navbar Component', {
        widths: [1280, 768, 375],
        scope: 'nav',
      });
    }
  });

  test('Footer', async ({ page }) => {
    await page.goto('/hub');
    await waitForStable(page);

    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await percySnapshot(page, 'Footer Component', {
      widths: [1280, 375],
    });
  });

  test('Tool card hover state', async ({ page }) => {
    await page.goto('/hub');
    await waitForStable(page);

    // Hover over first tool card
    const toolCard = page.locator('a[href*="/tools/"]').first();
    if (await toolCard.isVisible()) {
      await toolCard.hover();
      await page.waitForTimeout(300);

      await percySnapshot(page, 'Tool Card - Hover State', {
        widths: [1280],
      });
    }
  });
});

// ============================================================================
// GAMES SECTION
// ============================================================================
test.describe('Percy Visual - Games', () => {
  const GAMES = [
    { path: '/games/color-match', name: 'Color Match' },
    { path: '/games/word-guess', name: 'Word Guess' },
    { path: '/games/typing-speed', name: 'Typing Speed' },
    { path: '/games/solitaire', name: 'Solitaire' },
  ];

  for (const { path, name } of GAMES) {
    test(`${name} - initial state`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);

      await percySnapshot(page, `Game - ${name}`, {
        widths: [1280, 375],
      });
    });
  }
});

// ============================================================================
// LANDING PAGES & SEO
// ============================================================================
test.describe('Percy Visual - Landing Pages', () => {
  const LANDING_PAGES = [
    { path: '/guides/how-to-merge-pdf-files', name: 'Guide - Merge PDF' },
    { path: '/use-cases/compress-images-for-email', name: 'Use Case - Compress Images' },
  ];

  for (const { path, name } of LANDING_PAGES) {
    test(`${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForStable(page);

      await percySnapshot(page, name, {
        widths: [1280],
        minHeight: 1024,
      });
    });
  }
});
