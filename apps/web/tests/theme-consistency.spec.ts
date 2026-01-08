/**
 * Theme and Dark Mode Consistency Tests
 *
 * Tests the design system's two themes:
 * - default: Dark enigmatic theme (monospace, dark backgrounds, glow effects)
 * - clean: Professional light theme (sans-serif, light backgrounds, subtle shadows)
 *
 * Verifies:
 * 1. Default theme applies correctly on most pages
 * 2. Clean theme applies on pdf-merge and similar tool pages
 * 3. CSS variables are consistent across themes
 * 4. No hardcoded colors (should use CSS vars)
 * 5. WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text/UI)
 * 6. Focus states visible in both themes
 * 7. No flash of wrong theme on load
 * 8. Theme persists across page navigation
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// CSS VARIABLE DEFINITIONS (from global.css)
// ============================================================================

const DEFAULT_THEME_VARS = {
  '--bg': '#0a0a0a',
  '--bg-secondary': '#0f0f0f',
  '--bg-card': '#111111',
  '--bg-hover': '#1a1a1a',
  '--text': '#e0e0e0',
  '--text-dim': '#888888',
  '--text-muted': '#707070',
  '--accent': '#ffffff',
  '--border': '#222222',
  '--border-hover': '#333333',
  '--border-accent': '#444444',
  '--success': '#00ff00',
  '--warning': '#ffaa00',
  '--error': '#ff4444',
  '--grid-color': '#1a1a1a',
};

const CLEAN_THEME_VARS = {
  '--bg': '#f8f9fa',
  '--bg-secondary': '#ffffff',
  '--bg-card': '#ffffff',
  '--bg-hover': '#f1f3f5',
  '--text': '#212529',
  '--text-dim': '#495057',
  '--text-muted': '#6c757d',
  '--accent': '#0066cc',
  '--border': '#dee2e6',
  '--border-hover': '#adb5bd',
  '--border-accent': '#0066cc',
  '--success': '#28a745',
  '--warning': '#ffc107',
  '--error': '#dc3545',
  '--grid-color': 'transparent',
};

// Pages that use clean theme
const CLEAN_THEME_PAGES = [
  '/tools/pdf-merge',
];

// Pages that use default theme
const DEFAULT_THEME_PAGES = [
  '/',
  '/hub',
  '/tools/image-compress',
  '/tools/qr-generator',
  '/tools/file-converter',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get computed CSS variable value from the document root
 */
async function getCSSVariable(page: Page, varName: string): Promise<string> {
  return page.evaluate((name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }, varName);
}

/**
 * Get the data-theme attribute from the html element
 */
async function getThemeAttribute(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return document.documentElement.getAttribute('data-theme');
  });
}

/**
 * Check if an element has adequate contrast ratio
 * Uses the WCAG formula for relative luminance
 */
async function checkContrastRatio(
  page: Page,
  selector: string,
  minRatio: number = 4.5
): Promise<{ passes: boolean; ratio: number; foreground: string; background: string }> {
  return page.evaluate(
    ({ sel, min }) => {
      const element = document.querySelector(sel);
      if (!element) {
        return { passes: false, ratio: 0, foreground: '', background: '' };
      }

      const style = getComputedStyle(element);
      const foreground = style.color;
      const background = style.backgroundColor;

      // Parse RGB values
      function parseRGB(color: string): [number, number, number] {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return [0, 0, 0];
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }

      // Calculate relative luminance
      function relativeLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
          c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      const [fr, fg, fb] = parseRGB(foreground);
      const [br, bg, bb] = parseRGB(background);

      const l1 = relativeLuminance(fr, fg, fb);
      const l2 = relativeLuminance(br, bg, bb);

      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

      return {
        passes: ratio >= min,
        ratio: Math.round(ratio * 100) / 100,
        foreground,
        background,
      };
    },
    { sel: selector, min: minRatio }
  );
}

/**
 * Wait for page to fully load and animations to complete
 */
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for CSS animations to settle
  await page.waitForTimeout(300);
}

/**
 * Check if element has visible focus indicator
 */
async function hasFocusIndicator(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel) as HTMLElement;
    if (!element) return false;

    element.focus();
    const style = getComputedStyle(element);

    // Check for outline or box-shadow focus indicators
    const hasOutline = style.outline !== 'none' && style.outline !== '';
    const hasBoxShadow = style.boxShadow !== 'none' && style.boxShadow !== '';
    const hasBorderChange = style.borderColor !== '';

    return hasOutline || hasBoxShadow || hasBorderChange;
  }, selector);
}

// ============================================================================
// TEST: DEFAULT THEME APPLIES CORRECTLY
// ============================================================================
test.describe('Default Theme (Dark/Enigmatic)', () => {
  for (const pagePath of DEFAULT_THEME_PAGES) {
    test(`default theme applies on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await waitForPageReady(page);

      // Check data-theme attribute
      const theme = await getThemeAttribute(page);
      expect(theme).toBe('default');

      // Verify key CSS variables
      const bgColor = await getCSSVariable(page, '--bg');
      expect(bgColor).toBe('#0a0a0a');

      const textColor = await getCSSVariable(page, '--text');
      expect(textColor).toBe('#e0e0e0');

      const accent = await getCSSVariable(page, '--accent');
      expect(accent).toBe('#ffffff');
    });

    test(`default theme body styles on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await waitForPageReady(page);

      // Check body background and text colors
      const bodyBg = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      expect(bodyBg).toMatch(/rgb\(10,\s*10,\s*10\)|#0a0a0a/);

      // Check font-family includes monospace
      const fontFamily = await page.evaluate(() => {
        return getComputedStyle(document.body).fontFamily;
      });
      expect(fontFamily.toLowerCase()).toMatch(/courier|monaco|monospace/);
    });
  }

  test('default theme shows grid background', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // Grid background should be visible
    const gridBg = page.locator('.grid-bg');
    await expect(gridBg).toBeVisible();

    // Scanlines should be visible
    const scanlines = page.locator('.scanlines');
    await expect(scanlines).toBeVisible();
  });
});

// ============================================================================
// TEST: CLEAN THEME APPLIES ON SPECIFIC PAGES
// ============================================================================
test.describe('Clean Theme (Professional/Light)', () => {
  for (const pagePath of CLEAN_THEME_PAGES) {
    test(`clean theme applies on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await waitForPageReady(page);

      // Check data-theme attribute
      const theme = await getThemeAttribute(page);
      expect(theme).toBe('clean');

      // Verify key CSS variables
      const bgColor = await getCSSVariable(page, '--bg');
      expect(bgColor).toBe('#f8f9fa');

      const textColor = await getCSSVariable(page, '--text');
      expect(textColor).toBe('#212529');

      const accent = await getCSSVariable(page, '--accent');
      expect(accent).toBe('#0066cc');
    });

    test(`clean theme body styles on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await waitForPageReady(page);

      // Check body background is light
      const bodyBg = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      expect(bodyBg).toMatch(/rgb\(248,\s*249,\s*250\)|#f8f9fa/);

      // Check font-family is sans-serif (not monospace)
      const fontFamily = await page.evaluate(() => {
        return getComputedStyle(document.body).fontFamily;
      });
      expect(fontFamily.toLowerCase()).toMatch(/inter|system|sans-serif/);
    });
  }

  test('clean theme hides grid background', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    // Grid background should be hidden in clean theme
    const gridBg = page.locator('.grid-bg');
    await expect(gridBg).toBeHidden();

    // Scanlines should be hidden
    const scanlines = page.locator('.scanlines');
    await expect(scanlines).toBeHidden();
  });
});

// ============================================================================
// TEST: CSS VARIABLES CONSISTENCY
// ============================================================================
test.describe('CSS Variables Consistency', () => {
  test('all default theme variables are defined', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    for (const [varName, expectedValue] of Object.entries(DEFAULT_THEME_VARS)) {
      const value = await getCSSVariable(page, varName);
      expect(value, `Variable ${varName} should be ${expectedValue}`).toBe(expectedValue);
    }
  });

  test('all clean theme variables are defined', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    for (const [varName, expectedValue] of Object.entries(CLEAN_THEME_VARS)) {
      const value = await getCSSVariable(page, varName);
      expect(value, `Variable ${varName} should be ${expectedValue}`).toBe(expectedValue);
    }
  });

  test('glow effects are properly themed', async ({ page }) => {
    // Default theme uses light-based glows
    await page.goto('/hub');
    await waitForPageReady(page);

    const defaultGlow = await getCSSVariable(page, '--glow-subtle');
    expect(defaultGlow).toMatch(/rgba\(255,\s*255,\s*255/);

    // Clean theme uses shadow-based elevation
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    const cleanGlow = await getCSSVariable(page, '--glow-subtle');
    expect(cleanGlow).toMatch(/rgba\(0,\s*0,\s*0/);
  });
});

// ============================================================================
// TEST: NO HARDCODED COLORS
// ============================================================================
test.describe('No Hardcoded Colors', () => {
  test('buttons use CSS variables for colors', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // Check primary button styles
    const btnPrimary = page.locator('.btn-primary').first();
    if (await btnPrimary.count() > 0) {
      const borderColor = await btnPrimary.evaluate((el) => {
        return getComputedStyle(el).borderColor;
      });
      // Should use theme border color (from --border)
      expect(borderColor).not.toBe('rgb(255, 0, 0)'); // No hardcoded red
      expect(borderColor).not.toBe('rgb(0, 0, 255)'); // No hardcoded blue
    }
  });

  test('cards use CSS variables for backgrounds', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    const toolCard = page.locator('.tool-card').first();
    if (await toolCard.count() > 0) {
      const bgColor = await toolCard.evaluate((el) => {
        return getComputedStyle(el).backgroundColor;
      });
      // Should derive from --bg-card
      expect(bgColor).toMatch(/rgb\(17,\s*17,\s*17\)|rgba\(17,\s*17,\s*17/);
    }
  });

  test('text uses CSS variables for colors', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    const heading = page.locator('h1, h2').first();
    if (await heading.count() > 0) {
      const textColor = await heading.evaluate((el) => {
        return getComputedStyle(el).color;
      });
      // Should use --text or --accent
      expect(textColor).toMatch(/rgb\(224,\s*224,\s*224\)|rgb\(255,\s*255,\s*255\)/);
    }
  });
});

// ============================================================================
// TEST: WCAG AA CONTRAST RATIOS
// ============================================================================
test.describe('WCAG AA Contrast Ratios', () => {
  test('default theme meets accessibility contrast requirements', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // Run axe-core accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .include('main')
      .analyze();

    // Check for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(
      contrastViolations.length,
      `Found ${contrastViolations.length} contrast violations:\n${JSON.stringify(contrastViolations, null, 2)}`
    ).toBe(0);
  });

  test('clean theme meets accessibility contrast requirements', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .include('main')
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(
      contrastViolations.length,
      `Found ${contrastViolations.length} contrast violations:\n${JSON.stringify(contrastViolations, null, 2)}`
    ).toBe(0);
  });

  test('--text-muted meets 4.5:1 contrast on default theme', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // --text-muted (#707070) on --bg (#0a0a0a)
    // Expected ratio: approximately 4.7:1
    const mutedText = page.locator('.text-muted, [class*="text-muted"]').first();
    if (await mutedText.count() > 0) {
      const result = await checkContrastRatio(page, '.text-muted', 4.5);
      expect(result.passes, `Contrast ratio ${result.ratio}:1 should be >= 4.5:1`).toBe(true);
    }
  });
});

// ============================================================================
// TEST: FOCUS STATES VISIBILITY
// ============================================================================
test.describe('Focus States Visibility', () => {
  test('buttons have visible focus state in default theme', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // Find a button and check focus visibility
    const button = page.locator('button, a.btn-primary, a.btn-secondary').first();
    if (await button.count() > 0) {
      await button.focus();

      // Check for focus ring (outline or box-shadow)
      const focusStyles = await button.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outline: style.outline,
          outlineOffset: style.outlineOffset,
          boxShadow: style.boxShadow,
        };
      });

      // Should have either outline or box-shadow for focus
      const hasFocus =
        focusStyles.outline !== 'none' ||
        (focusStyles.boxShadow !== 'none' && focusStyles.boxShadow !== '');
      expect(hasFocus, 'Button should have visible focus indicator').toBe(true);
    }
  });

  test('buttons have visible focus state in clean theme', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.focus();

      const focusStyles = await button.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
        };
      });

      const hasFocus =
        focusStyles.outline !== 'none' ||
        (focusStyles.boxShadow !== 'none' && focusStyles.boxShadow !== '');
      expect(hasFocus, 'Button should have visible focus indicator').toBe(true);
    }
  });

  test('links have visible focus state', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // Test tool card links
    const link = page.locator('a[href*="/tools/"]').first();
    if (await link.count() > 0) {
      await link.focus();

      const focusStyles = await link.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        };
      });

      // Should have visible focus indicator
      const hasFocus =
        focusStyles.outline !== 'none' ||
        (focusStyles.boxShadow !== 'none' && focusStyles.boxShadow !== '');
      expect(hasFocus, 'Link should have visible focus indicator').toBe(true);
    }
  });

  test('input fields have visible focus state', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await waitForPageReady(page);

    const input = page.locator('input[type="text"], input[type="url"], textarea').first();
    if (await input.count() > 0) {
      await input.focus();

      const focusStyles = await input.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        };
      });

      // Should have visible focus indicator (box-shadow with glow)
      const hasFocus =
        focusStyles.outline !== 'none' ||
        (focusStyles.boxShadow !== 'none' && focusStyles.boxShadow !== '');
      expect(hasFocus, 'Input should have visible focus indicator').toBe(true);
    }
  });
});

// ============================================================================
// TEST: NO FLASH OF WRONG THEME (FOUT)
// ============================================================================
test.describe('No Flash of Wrong Theme', () => {
  test('default theme renders immediately without flash', async ({ page }) => {
    // Set up network monitoring to detect timing
    const themeChanges: string[] = [];

    await page.exposeFunction('logThemeChange', (theme: string) => {
      themeChanges.push(theme);
    });

    await page.goto('/hub', { waitUntil: 'domcontentloaded' });

    // Check theme immediately on DOM ready (before full load)
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(initialTheme).toBe('default');

    // Wait for full load
    await waitForPageReady(page);

    // Theme should still be default
    const finalTheme = await getThemeAttribute(page);
    expect(finalTheme).toBe('default');
  });

  test('clean theme renders immediately without flash', async ({ page }) => {
    await page.goto('/tools/pdf-merge', { waitUntil: 'domcontentloaded' });

    // Check theme immediately
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(initialTheme).toBe('clean');

    // Wait and verify no change
    await waitForPageReady(page);
    const finalTheme = await getThemeAttribute(page);
    expect(finalTheme).toBe('clean');
  });

  test('body background color is correct on first paint', async ({ page }) => {
    await page.goto('/hub');

    // Immediately check background color
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    // Should be dark theme background immediately
    expect(bgColor).toMatch(/rgb\(10,\s*10,\s*10\)/);
  });
});

// ============================================================================
// TEST: THEME PERSISTENCE ACROSS NAVIGATION
// ============================================================================
test.describe('Theme Persistence Across Navigation', () => {
  test('navigating between default theme pages maintains theme', async ({ page }) => {
    // Start on hub (default theme)
    await page.goto('/hub');
    await waitForPageReady(page);

    let theme = await getThemeAttribute(page);
    expect(theme).toBe('default');

    // Navigate to another default theme page
    await page.goto('/tools/qr-generator');
    await waitForPageReady(page);

    theme = await getThemeAttribute(page);
    expect(theme).toBe('default');

    // Navigate to image compress
    await page.goto('/tools/image-compress');
    await waitForPageReady(page);

    theme = await getThemeAttribute(page);
    expect(theme).toBe('default');
  });

  test('navigating to clean theme page switches correctly', async ({ page }) => {
    // Start on hub (default theme)
    await page.goto('/hub');
    await waitForPageReady(page);

    let theme = await getThemeAttribute(page);
    expect(theme).toBe('default');

    // Navigate to clean theme page
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    theme = await getThemeAttribute(page);
    expect(theme).toBe('clean');

    // CSS variables should be clean theme
    const bgColor = await getCSSVariable(page, '--bg');
    expect(bgColor).toBe('#f8f9fa');
  });

  test('navigating back from clean theme to default theme', async ({ page }) => {
    // Start on clean theme page
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    let theme = await getThemeAttribute(page);
    expect(theme).toBe('clean');

    // Navigate back to default theme
    await page.goto('/hub');
    await waitForPageReady(page);

    theme = await getThemeAttribute(page);
    expect(theme).toBe('default');

    // CSS variables should be default theme
    const bgColor = await getCSSVariable(page, '--bg');
    expect(bgColor).toBe('#0a0a0a');
  });
});

// ============================================================================
// TEST: THEME-SPECIFIC ELEMENT STYLING
// ============================================================================
test.describe('Theme-Specific Element Styling', () => {
  test('tool cards have correct styling in default theme', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    const toolCard = page.locator('.tool-card').first();
    if (await toolCard.count() > 0) {
      const styles = await toolCard.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          background: style.background,
          border: style.border,
          boxShadow: style.boxShadow,
        };
      });

      // Should have gradient background
      expect(styles.background).toMatch(/linear-gradient|rgb\(17/);
      // Should have border
      expect(styles.border).toMatch(/1px|solid/);
    }
  });

  test('tool cards have correct styling in clean theme', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    // Look for any glass-card in clean theme
    const glassCard = page.locator('.glass-card').first();
    if (await glassCard.count() > 0) {
      const styles = await glassCard.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
          backdropFilter: style.backdropFilter,
        };
      });

      // Clean theme should have white/light background
      expect(styles.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff/);
      // Should have shadow instead of glow
      expect(styles.boxShadow).toMatch(/rgba\(0,\s*0,\s*0/);
      // No backdrop filter in clean theme
      expect(styles.backdropFilter).toBe('none');
    }
  });

  test('primary buttons styled correctly per theme', async ({ page }) => {
    // Default theme - transparent with border
    await page.goto('/hub');
    await waitForPageReady(page);

    let btnPrimary = page.locator('.btn-primary').first();
    if (await btnPrimary.count() > 0) {
      const defaultStyles = await btnPrimary.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
      });

      // Default theme: transparent background
      expect(defaultStyles.backgroundColor).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/);
    }

    // Clean theme - solid accent color
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    btnPrimary = page.locator('.btn-primary').first();
    if (await btnPrimary.count() > 0) {
      const cleanStyles = await btnPrimary.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
      });

      // Clean theme: solid accent background (#0066cc)
      expect(cleanStyles.backgroundColor).toMatch(/rgb\(0,\s*102,\s*204\)|#0066cc/);
      // White text on accent
      expect(cleanStyles.color).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff|white/);
    }
  });

  test('drop zones styled correctly per theme', async ({ page }) => {
    // Test drop zone in clean theme (pdf-merge)
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    const dropZone = page.locator('.drop-zone, [class*="drop"]').first();
    if (await dropZone.count() > 0) {
      const styles = await dropZone.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          border: style.border,
          backgroundColor: style.backgroundColor,
        };
      });

      // Should have dashed border
      expect(styles.border).toMatch(/dashed/);
    }
  });
});

// ============================================================================
// TEST: ACCESSIBILITY ACROSS THEMES
// ============================================================================
test.describe('Accessibility Across Themes', () => {
  test('default theme passes axe accessibility audit', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page }).analyze();

    // Filter out minor/best-practice issues
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      criticalViolations.length,
      `Critical accessibility violations:\n${JSON.stringify(criticalViolations, null, 2)}`
    ).toBe(0);
  });

  test('clean theme passes axe accessibility audit', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page }).analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      criticalViolations.length,
      `Critical accessibility violations:\n${JSON.stringify(criticalViolations, null, 2)}`
    ).toBe(0);
  });

  test('reduced motion is respected', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/hub');
    await waitForPageReady(page);

    // Check that animations are disabled
    const animationDuration = await page.evaluate(() => {
      const element = document.querySelector('.tool-card, .glass-card');
      if (!element) return '0s';
      return getComputedStyle(element).animationDuration;
    });

    // Should have very short or no animation
    expect(animationDuration).toMatch(/0\.01ms|0s|0ms/);
  });
});

// ============================================================================
// TEST: MOBILE RESPONSIVENESS WITH THEMES
// ============================================================================
test.describe('Mobile Responsiveness with Themes', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('default theme renders correctly on mobile', async ({ page }) => {
    await page.goto('/hub');
    await waitForPageReady(page);

    // Theme should still be default
    const theme = await getThemeAttribute(page);
    expect(theme).toBe('default');

    // Background should be dark
    const bgColor = await getCSSVariable(page, '--bg');
    expect(bgColor).toBe('#0a0a0a');

    // Touch targets should be adequate (44px minimum)
    const navLink = page.locator('.nav-link').first();
    if (await navLink.count() > 0) {
      const size = await navLink.boundingBox();
      expect(size?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('clean theme renders correctly on mobile', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await waitForPageReady(page);

    // Theme should be clean
    const theme = await getThemeAttribute(page);
    expect(theme).toBe('clean');

    // Background should be light
    const bgColor = await getCSSVariable(page, '--bg');
    expect(bgColor).toBe('#f8f9fa');
  });
});
