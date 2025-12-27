/**
 * Visual Regression Tests for New Life Solutions
 *
 * These tests capture screenshots of key pages and compare them against
 * baseline snapshots to detect unintended visual changes.
 *
 * First run: Creates baseline snapshots in tests/visual-regression.spec.ts-snapshots/
 * Subsequent runs: Compares against baselines, fails if differences exceed threshold
 *
 * To update baselines after intentional changes:
 *   npx playwright test visual-regression --update-snapshots
 */
import { test, expect } from '@playwright/test';

// Helper to wait for page to be fully loaded and stable
async function waitForPageStable(page: import('@playwright/test').Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for any animations to complete
  await page.waitForTimeout(500);

  // Hide dynamic content that changes between runs
  await page.evaluate(() => {
    // Hide any elements with live timestamps or counters
    document.querySelectorAll('[data-testid="timestamp"], [data-testid="live-counter"]')
      .forEach(el => (el as HTMLElement).style.visibility = 'hidden');
  });
}

// ============================================================================
// HUB PAGE - Main tools directory
// ============================================================================
test.describe('Visual Regression - Hub Page', () => {
  test('hub page - full page screenshot', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('hub-full-page.png', {
      fullPage: true,
    });
  });

  test('hub page - above the fold', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('hub-above-fold.png');
  });

  test('hub page - tool cards grid', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    // Screenshot just the tools grid section
    const toolsGrid = page.locator('main').first();
    if (await toolsGrid.isVisible()) {
      await expect(toolsGrid).toHaveScreenshot('hub-tools-grid.png');
    }
  });
});

// ============================================================================
// PDF MERGE TOOL
// ============================================================================
test.describe('Visual Regression - PDF Merge', () => {
  test('pdf-merge - initial state', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('pdf-merge-initial.png', {
      fullPage: true,
    });
  });

  test('pdf-merge - upload area', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageStable(page);

    // Find the upload/drop zone area
    const uploadZone = page.locator('[class*="drop"], [class*="upload"], .glass-card').first();
    if (await uploadZone.isVisible()) {
      await expect(uploadZone).toHaveScreenshot('pdf-merge-upload-zone.png');
    }
  });

  test('pdf-merge - header and description', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageStable(page);

    // Screenshot the header section with tool icon and description
    const header = page.locator('main > div').first();
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('pdf-merge-header.png');
    }
  });
});

// ============================================================================
// IMAGE COMPRESS TOOL
// ============================================================================
test.describe('Visual Regression - Image Compress', () => {
  test('image-compress - initial state', async ({ page }) => {
    await page.goto('/tools/image-compress');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('image-compress-initial.png', {
      fullPage: true,
    });
  });

  test('image-compress - upload interface', async ({ page }) => {
    await page.goto('/tools/image-compress');
    await waitForPageStable(page);

    const mainContent = page.locator('main').first();
    if (await mainContent.isVisible()) {
      await expect(mainContent).toHaveScreenshot('image-compress-main.png');
    }
  });

  test('image-compress - quality controls visible', async ({ page }) => {
    await page.goto('/tools/image-compress');
    await waitForPageStable(page);

    // Look for slider/quality controls
    const controls = page.locator('[class*="slider"], [class*="quality"], [class*="control"]').first();
    if (await controls.isVisible()) {
      await expect(controls).toHaveScreenshot('image-compress-controls.png');
    }
  });
});

// ============================================================================
// QR GENERATOR TOOL
// ============================================================================
test.describe('Visual Regression - QR Generator', () => {
  test('qr-generator - initial state', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('qr-generator-initial.png', {
      fullPage: true,
    });
  });

  test('qr-generator - with generated QR code', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await waitForPageStable(page);

    // Enter text to generate QR
    const textInput = page.locator('input[type="text"], input[type="url"], textarea').first();
    if (await textInput.isVisible()) {
      await textInput.fill('https://newlifesolutions.dev');
      await page.waitForTimeout(1000); // Wait for QR to generate
    }

    await expect(page).toHaveScreenshot('qr-generator-with-code.png', {
      fullPage: true,
    });
  });

  test('qr-generator - QR canvas area', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await waitForPageStable(page);

    const textInput = page.locator('input[type="text"], input[type="url"], textarea').first();
    if (await textInput.isVisible()) {
      await textInput.fill('https://example.com');
      await page.waitForTimeout(1000);
    }

    // Screenshot the QR code canvas specifically
    const qrCanvas = page.locator('main canvas, .glass-card canvas').first();
    if (await qrCanvas.isVisible()) {
      await expect(qrCanvas).toHaveScreenshot('qr-generator-canvas.png');
    }
  });
});

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================
test.describe('Visual Regression - UI Components', () => {
  test('navbar - desktop view', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    const navbar = page.locator('nav').first();
    if (await navbar.isVisible()) {
      await expect(navbar).toHaveScreenshot('navbar-desktop.png');
    }
  });

  test('footer - component', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    const footer = page.locator('footer').first();
    if (await footer.isVisible()) {
      await expect(footer).toHaveScreenshot('footer.png');
    }
  });
});

// ============================================================================
// RESPONSIVE VIEWS
// ============================================================================
test.describe('Visual Regression - Responsive', () => {
  test('hub page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/hub');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('hub-mobile.png', {
      fullPage: true,
    });
  });

  test('hub page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/hub');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('hub-tablet.png', {
      fullPage: true,
    });
  });

  test('pdf-merge - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tools/pdf-merge');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('pdf-merge-mobile.png', {
      fullPage: true,
    });
  });
});

// ============================================================================
// DARK MODE (if applicable)
// ============================================================================
test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('hub page - dark mode', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('hub-dark-mode.png', {
      fullPage: true,
    });
  });

  test('pdf-merge - dark mode', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('pdf-merge-dark-mode.png', {
      fullPage: true,
    });
  });
});

// ============================================================================
// INTERACTION STATES
// ============================================================================
test.describe('Visual Regression - Interaction States', () => {
  test('hub page - tool card hover state', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageStable(page);

    // Find a tool card and hover over it
    const toolCard = page.locator('a[href*="/tools/"]').first();
    if (await toolCard.isVisible()) {
      await toolCard.hover();
      await page.waitForTimeout(300); // Wait for hover animation

      await expect(toolCard).toHaveScreenshot('tool-card-hover.png');
    }
  });

  test('qr-generator - button focus state', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await waitForPageStable(page);

    // Fill input first
    const textInput = page.locator('input[type="text"], input[type="url"], textarea').first();
    if (await textInput.isVisible()) {
      await textInput.fill('https://test.com');
      await page.waitForTimeout(500);
    }

    // Find and focus a download button
    const downloadBtn = page.getByRole('button', { name: /PNG|download/i }).first();
    if (await downloadBtn.isVisible()) {
      await downloadBtn.focus();
      await expect(downloadBtn).toHaveScreenshot('qr-download-button-focus.png');
    }
  });
});
