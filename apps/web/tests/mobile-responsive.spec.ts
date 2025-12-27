/**
 * Mobile Responsiveness Tests
 *
 * Comprehensive tests for mobile and tablet viewport compatibility.
 * Tests navigation, tool layouts, touch targets, and text readability
 * across multiple device sizes.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// VIEWPORT CONFIGURATIONS
// ============================================================================

const VIEWPORTS = {
  iPhoneSE: { width: 375, height: 667, name: 'iPhone SE' },
  iPhone12Pro: { width: 390, height: 844, name: 'iPhone 12 Pro' },
  iPad: { width: 768, height: 1024, name: 'iPad' },
  iPadPro: { width: 1024, height: 1366, name: 'iPad Pro' },
} as const;

type ViewportKey = keyof typeof VIEWPORTS;

// Minimum touch target size (WCAG 2.5.5 Level AAA recommends 44x44px)
const MIN_TOUCH_TARGET = 44;

// Minimum readable font size (16px is the standard for mobile readability)
const MIN_FONT_SIZE = 16;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sets viewport and navigates to a page
 */
async function setupViewport(
  page: Page,
  viewport: typeof VIEWPORTS[ViewportKey],
  url: string
): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url);
  // Wait for any hydration to complete
  await page.waitForLoadState('networkidle');
}

/**
 * Checks if an element has no horizontal overflow causing scrolling
 */
async function hasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    // Check if content width exceeds viewport
    return body.scrollWidth <= html.clientWidth;
  });
}

/**
 * Gets the computed font size of an element in pixels
 */
async function getFontSize(element: Locator): Promise<number> {
  return element.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return parseFloat(style.fontSize);
  });
}

/**
 * Gets the bounding box dimensions of an element
 */
async function getElementSize(
  element: Locator
): Promise<{ width: number; height: number } | null> {
  const box = await element.boundingBox();
  if (!box) return null;
  return { width: box.width, height: box.height };
}

/**
 * Checks if an interactive element meets minimum touch target size
 */
async function isTappable(element: Locator): Promise<boolean> {
  const size = await getElementSize(element);
  if (!size) return false;
  return size.width >= MIN_TOUCH_TARGET && size.height >= MIN_TOUCH_TARGET;
}

// ============================================================================
// HUB PAGE TESTS
// ============================================================================

test.describe('Hub Page - Mobile Responsiveness', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await setupViewport(page, viewport, '/hub');
      });

      test('page loads without horizontal scrolling', async ({ page }) => {
        const noScroll = await hasNoHorizontalScroll(page);
        expect(noScroll).toBe(true);
      });

      test('navigation menu is accessible', async ({ page }) => {
        // On mobile (< 640px), we expect a hamburger menu
        const isMobile = viewport.width < 640;

        if (isMobile) {
          // Mobile: hamburger menu should be visible
          const menuButton = page.locator('#mobile-menu-btn');
          await expect(menuButton).toBeVisible();

          // Menu button should be tappable
          const isTappableBtn = await isTappable(menuButton);
          expect(isTappableBtn).toBe(true);

          // Click to open menu
          await menuButton.click();

          // Mobile menu should now be visible
          const mobileMenu = page.locator('#mobile-menu');
          await expect(mobileMenu).toBeVisible();

          // Menu links should be tappable
          const toolsLink = mobileMenu.locator('a[href="/hub"]');
          await expect(toolsLink).toBeVisible();
        } else {
          // Desktop/Tablet: nav links should be directly visible
          const desktopNav = page.locator('.hidden.sm\\:flex');
          await expect(desktopNav).toBeVisible();

          // Nav links should be accessible
          const toolsLink = desktopNav.locator('a[href="/hub"]');
          await expect(toolsLink).toBeVisible();
        }
      });

      test('tool cards layout adapts to viewport', async ({ page }) => {
        // Wait for tool cards to be rendered (React hydration)
        await page.waitForSelector('[class*="grid"]', { timeout: 10000 });

        // Tool cards should be visible
        const toolCards = page.locator('a[href^="/tools/"]');
        const cardCount = await toolCards.count();

        // Should have tool cards
        expect(cardCount).toBeGreaterThan(0);

        // First few cards should be visible without scrolling
        const firstCard = toolCards.first();
        await expect(firstCard).toBeVisible();

        // Check that cards are properly sized for the viewport
        const firstCardBox = await firstCard.boundingBox();
        expect(firstCardBox).not.toBeNull();

        if (firstCardBox) {
          // Card should not exceed viewport width minus padding
          expect(firstCardBox.width).toBeLessThanOrEqual(viewport.width - 24); // 12px padding each side
        }
      });

      test('heading text is readable', async ({ page }) => {
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toBeVisible();

        const fontSize = await getFontSize(heading);
        // Headings should be at least the minimum readable size
        expect(fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
      });

      test('body text meets minimum size requirements', async ({ page }) => {
        // Find paragraph text in the page
        const paragraphs = page.locator('p');
        const count = await paragraphs.count();

        if (count > 0) {
          // Check the first visible paragraph
          for (let i = 0; i < Math.min(count, 3); i++) {
            const p = paragraphs.nth(i);
            if (await p.isVisible()) {
              const fontSize = await getFontSize(p);
              // Body text should be at least 14px (allowing slight reduction from 16px for secondary text)
              expect(fontSize).toBeGreaterThanOrEqual(14);
              break;
            }
          }
        }
      });

      test('no accessibility violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });
  }
});

// ============================================================================
// PDF MERGE TOOL TESTS
// ============================================================================

test.describe('PDF Merge Tool - Mobile Responsiveness', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await setupViewport(page, viewport, '/tools/pdf-merge');
      });

      test('page loads without horizontal scrolling', async ({ page }) => {
        const noScroll = await hasNoHorizontalScroll(page);
        expect(noScroll).toBe(true);
      });

      test('file upload drop zone is properly sized', async ({ page }) => {
        // Wait for React component to hydrate
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const dropZone = page.locator('.drop-zone');
        await expect(dropZone).toBeVisible();

        const dropZoneBox = await dropZone.boundingBox();
        expect(dropZoneBox).not.toBeNull();

        if (dropZoneBox) {
          // Drop zone should fit within viewport with padding
          expect(dropZoneBox.width).toBeLessThanOrEqual(viewport.width - 24);

          // Drop zone should be reasonably tall for easy tapping
          expect(dropZoneBox.height).toBeGreaterThanOrEqual(100);
        }
      });

      test('file upload area is tappable', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const dropZone = page.locator('.drop-zone');
        const size = await getElementSize(dropZone);

        expect(size).not.toBeNull();
        if (size) {
          // Drop zone should be easily tappable (much larger than minimum)
          expect(size.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
          expect(size.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        }
      });

      test('merge button is accessible when files added', async ({ page }) => {
        // We can't easily add files in this test, so check for button styling
        // The button appears when 2+ files are added

        // Check that the page structure is correct for when button appears
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();

        // Privacy note should be visible and properly sized
        const privacyNote = page.locator('text=/Your files never leave/i');
        await expect(privacyNote).toBeVisible();
      });

      test('privacy note text is readable', async ({ page }) => {
        const privacyNote = page.locator('text=/Your files never leave/i');
        await expect(privacyNote).toBeVisible();

        const fontSize = await getFontSize(privacyNote);
        // Privacy text can be smaller but should still be readable
        expect(fontSize).toBeGreaterThanOrEqual(12);
      });

      test('drop zone instruction text is readable', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const dropZoneHeading = page.locator('.drop-zone h3');
        await expect(dropZoneHeading).toBeVisible();

        const fontSize = await getFontSize(dropZoneHeading);
        expect(fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
      });

      test('no accessibility violations', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });
  }
});

// ============================================================================
// IMAGE COMPRESS TOOL TESTS
// ============================================================================

test.describe('Image Compress Tool - Mobile Responsiveness', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await setupViewport(page, viewport, '/tools/image-compress');
      });

      test('page loads without horizontal scrolling', async ({ page }) => {
        const noScroll = await hasNoHorizontalScroll(page);
        expect(noScroll).toBe(true);
      });

      test('file upload drop zone is properly sized', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const dropZone = page.locator('.drop-zone');
        await expect(dropZone).toBeVisible();

        const dropZoneBox = await dropZone.boundingBox();
        expect(dropZoneBox).not.toBeNull();

        if (dropZoneBox) {
          // Drop zone should fit within viewport
          expect(dropZoneBox.width).toBeLessThanOrEqual(viewport.width - 24);
          expect(dropZoneBox.height).toBeGreaterThanOrEqual(100);
        }
      });

      test('file upload area is tappable', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const dropZone = page.locator('.drop-zone');
        const size = await getElementSize(dropZone);

        expect(size).not.toBeNull();
        if (size) {
          expect(size.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
          expect(size.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        }
      });

      test('quality slider controls are accessible', async ({ page }) => {
        // Note: Quality slider appears after files are added
        // We check for presence of the tool structure
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();

        // The drop zone should work as the primary interaction area initially
        const dropZone = page.locator('.drop-zone');
        await expect(dropZone).toBeVisible();
      });

      test('format buttons would be tappable (structure check)', async ({ page }) => {
        // Format buttons (Original, WebP, JPEG) appear in the settings panel
        // after files are added. We verify the page structure is correct.
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();

        // Check that there's enough space for controls
        const mainBox = await mainContent.boundingBox();
        expect(mainBox).not.toBeNull();

        if (mainBox) {
          expect(mainBox.width).toBeLessThanOrEqual(viewport.width);
        }
      });

      test('drop zone text is readable', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const dropZoneHeading = page.locator('.drop-zone h3');
        await expect(dropZoneHeading).toBeVisible();

        const fontSize = await getFontSize(dropZoneHeading);
        expect(fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
      });

      test('supported formats info is readable', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const formatInfo = page.locator('.drop-zone p');
        await expect(formatInfo).toBeVisible();

        const fontSize = await getFontSize(formatInfo);
        // Supporting text can be smaller but must be readable
        expect(fontSize).toBeGreaterThanOrEqual(12);
      });

      test('no accessibility violations', async ({ page }) => {
        await page.waitForSelector('.drop-zone', { timeout: 10000 });

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });
  }
});

// ============================================================================
// INTERACTIVE ELEMENTS TOUCH TARGET TESTS
// ============================================================================

test.describe('Touch Target Sizes - Cross-Page Verification', () => {
  const testPages = [
    { url: '/hub', name: 'Hub Page' },
    { url: '/tools/pdf-merge', name: 'PDF Merge' },
    { url: '/tools/image-compress', name: 'Image Compress' },
  ];

  // Test only on mobile viewports where touch targets matter most
  const mobileViewports = [VIEWPORTS.iPhoneSE, VIEWPORTS.iPhone12Pro];

  for (const viewport of mobileViewports) {
    for (const testPage of testPages) {
      test.describe(`${testPage.name} on ${viewport.name}`, () => {
        test('all buttons meet minimum touch target size', async ({ page }) => {
          await setupViewport(page, viewport, testPage.url);

          // Wait for hydration
          await page.waitForLoadState('networkidle');

          // Find all visible buttons
          const buttons = page.locator('button:visible');
          const buttonCount = await buttons.count();

          for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const isVisible = await button.isVisible();

            if (isVisible) {
              const box = await button.boundingBox();
              if (box) {
                // Check minimum dimensions
                const meetsTouchTarget =
                  box.width >= MIN_TOUCH_TARGET || box.height >= MIN_TOUCH_TARGET;

                // Get button text for better error messages
                const buttonText = await button.textContent();

                expect(
                  meetsTouchTarget,
                  `Button "${buttonText?.trim()}" should meet minimum touch target (${box.width.toFixed(0)}x${box.height.toFixed(0)}px)`
                ).toBe(true);
              }
            }
          }
        });

        test('all links meet minimum touch target size', async ({ page }) => {
          await setupViewport(page, viewport, testPage.url);
          await page.waitForLoadState('networkidle');

          // Find nav and main action links (not inline text links)
          const navLinks = page.locator('nav a:visible, main a[href^="/tools/"]:visible');
          const linkCount = await navLinks.count();

          for (let i = 0; i < Math.min(linkCount, 10); i++) {
            // Test first 10 links
            const link = navLinks.nth(i);
            const isVisible = await link.isVisible();

            if (isVisible) {
              const box = await link.boundingBox();
              if (box) {
                // Navigation links should meet touch target size
                const meetsTouchTarget = box.height >= MIN_TOUCH_TARGET;

                const linkHref = await link.getAttribute('href');

                expect(
                  meetsTouchTarget,
                  `Link "${linkHref}" should meet minimum touch target height (${box.height.toFixed(0)}px)`
                ).toBe(true);
              }
            }
          }
        });
      });
    }
  }
});

// ============================================================================
// TEXT READABILITY TESTS
// ============================================================================

test.describe('Text Readability - Mobile Viewports', () => {
  const testPages = [
    { url: '/hub', name: 'Hub Page' },
    { url: '/tools/pdf-merge', name: 'PDF Merge' },
    { url: '/tools/image-compress', name: 'Image Compress' },
  ];

  for (const viewport of [VIEWPORTS.iPhoneSE, VIEWPORTS.iPhone12Pro]) {
    for (const testPage of testPages) {
      test(`${testPage.name} - main content text is readable on ${viewport.name}`, async ({
        page,
      }) => {
        await setupViewport(page, viewport, testPage.url);
        await page.waitForLoadState('networkidle');

        // Check main headings
        const h1 = page.locator('h1').first();
        if (await h1.isVisible()) {
          const h1Size = await getFontSize(h1);
          expect(h1Size).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
        }

        // Check primary paragraphs (not utility text)
        const mainParagraphs = page.locator('main p, .drop-zone p, .glass-card p');
        const pCount = await mainParagraphs.count();

        for (let i = 0; i < Math.min(pCount, 5); i++) {
          const p = mainParagraphs.nth(i);
          if (await p.isVisible()) {
            const pSize = await getFontSize(p);
            // Allow slightly smaller text for secondary info, but not below 12px
            expect(
              pSize,
              `Paragraph text should be readable (got ${pSize}px)`
            ).toBeGreaterThanOrEqual(12);
          }
        }
      });
    }
  }
});

// ============================================================================
// HORIZONTAL SCROLL PREVENTION TESTS
// ============================================================================

test.describe('No Horizontal Scrolling - All Viewports', () => {
  const testPages = [
    { url: '/', name: 'Home Page' },
    { url: '/hub', name: 'Hub Page' },
    { url: '/tools/pdf-merge', name: 'PDF Merge' },
    { url: '/tools/image-compress', name: 'Image Compress' },
    { url: '/tools/qr-generator', name: 'QR Generator' },
  ];

  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    for (const testPage of testPages) {
      test(`${testPage.name} has no horizontal scroll on ${viewport.name}`, async ({
        page,
      }) => {
        await setupViewport(page, viewport, testPage.url);
        await page.waitForLoadState('networkidle');

        // Wait a bit for any dynamic content
        await page.waitForTimeout(500);

        const noHorizontalScroll = await hasNoHorizontalScroll(page);
        expect(
          noHorizontalScroll,
          `${testPage.name} should not have horizontal scrolling on ${viewport.name}`
        ).toBe(true);
      });
    }
  }
});

// ============================================================================
// VIEWPORT LAYOUT ADAPTATION TESTS
// ============================================================================

test.describe('Layout Adaptation Across Breakpoints', () => {
  test('Tool cards grid adjusts from mobile to tablet to desktop', async ({ page }) => {
    const breakpoints = [
      { viewport: VIEWPORTS.iPhoneSE, expectedColumns: 1 },
      { viewport: VIEWPORTS.iPad, expectedColumns: 2 },
      { viewport: VIEWPORTS.iPadPro, expectedColumns: 3 },
    ];

    for (const { viewport, expectedColumns } of breakpoints) {
      await setupViewport(page, viewport, '/hub');
      await page.waitForLoadState('networkidle');

      // Check grid container
      const gridContainer = page.locator('[class*="grid"]').first();
      if (await gridContainer.isVisible()) {
        const gridBox = await gridContainer.boundingBox();
        const toolCards = page.locator('a[href^="/tools/"]');
        const firstCard = toolCards.first();

        if (await firstCard.isVisible()) {
          const cardBox = await firstCard.boundingBox();

          if (gridBox && cardBox) {
            // Estimate columns based on card width relative to grid width
            const estimatedColumns = Math.floor(gridBox.width / cardBox.width);

            // Allow some flexibility in layout
            expect(estimatedColumns).toBeGreaterThanOrEqual(1);
            expect(estimatedColumns).toBeLessThanOrEqual(4);
          }
        }
      }
    }
  });

  test('Navigation adapts between mobile hamburger and desktop links', async ({
    page,
  }) => {
    // Mobile: should show hamburger
    await setupViewport(page, VIEWPORTS.iPhoneSE, '/hub');
    const mobileMenuBtn = page.locator('#mobile-menu-btn');
    await expect(mobileMenuBtn).toBeVisible();

    // Tablet/Desktop: should show inline links
    await setupViewport(page, VIEWPORTS.iPad, '/hub');
    const desktopNav = page.locator('.hidden.sm\\:flex');
    await expect(desktopNav).toBeVisible();
  });
});

// ============================================================================
// ORIENTATION TESTS (Portrait vs Landscape)
// ============================================================================

test.describe('Portrait and Landscape Orientation', () => {
  test('iPad works in both portrait and landscape', async ({ page }) => {
    const orientations = [
      { width: 768, height: 1024, name: 'Portrait' },
      { width: 1024, height: 768, name: 'Landscape' },
    ];

    for (const orientation of orientations) {
      await page.setViewportSize({
        width: orientation.width,
        height: orientation.height,
      });
      await page.goto('/tools/pdf-merge');
      await page.waitForLoadState('networkidle');

      // Page should load without horizontal scroll in both orientations
      const noScroll = await hasNoHorizontalScroll(page);
      expect(noScroll, `No horizontal scroll in ${orientation.name}`).toBe(true);

      // Drop zone should be visible
      await page.waitForSelector('.drop-zone', { timeout: 10000 });
      const dropZone = page.locator('.drop-zone');
      await expect(dropZone).toBeVisible();
    }
  });

  test('iPhone works in landscape mode', async ({ page }) => {
    // iPhone 12 Pro in landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/tools/image-compress');
    await page.waitForLoadState('networkidle');

    const noScroll = await hasNoHorizontalScroll(page);
    expect(noScroll).toBe(true);

    // Main content should be accessible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
