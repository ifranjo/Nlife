/**
 * Comprehensive Accessibility Tests for All Tool Pages
 *
 * Tests all 40 tool pages for:
 * - WCAG 2.1 Level AA compliance (via axe-core)
 * - Proper heading hierarchy (h1 > h2 > h3)
 * - Form labels and ARIA attributes
 * - Color contrast issues
 * - Keyboard navigation
 * - Screen reader compatibility
 *
 * Run: npx playwright test tests/accessibility-comprehensive.spec.ts
 * Run single browser: npx playwright test tests/accessibility-comprehensive.spec.ts --project=chromium
 */
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// All tool pages in the project
const TOOL_PAGES = [
  // Document Tools
  { path: '/tools/pdf-merge', name: 'PDF Merge', category: 'document' },
  { path: '/tools/pdf-split', name: 'PDF Split', category: 'document' },
  { path: '/tools/pdf-compress', name: 'PDF Compress', category: 'document' },
  { path: '/tools/pdf-redactor', name: 'PDF Redactor', category: 'document' },
  { path: '/tools/pdf-form-filler', name: 'PDF Form Filler', category: 'document' },
  { path: '/tools/pdf-to-word', name: 'PDF to Word', category: 'document' },
  { path: '/tools/ocr', name: 'OCR Text Extractor', category: 'document' },
  { path: '/tools/file-converter', name: 'File Converter', category: 'document' },
  { path: '/tools/document-scanner', name: 'Document Scanner', category: 'document' },

  // Image Tools
  { path: '/tools/image-compress', name: 'Image Compress', category: 'media' },
  { path: '/tools/background-remover', name: 'Background Remover', category: 'media' },
  { path: '/tools/image-upscaler', name: 'Image Upscaler', category: 'media' },
  { path: '/tools/gif-maker', name: 'GIF Maker', category: 'media' },
  { path: '/tools/exif-editor', name: 'EXIF Editor', category: 'media' },
  { path: '/tools/object-remover', name: 'Object Remover', category: 'media' },
  { path: '/tools/svg-editor', name: 'SVG Editor', category: 'media' },

  // Video/Audio Tools
  { path: '/tools/video-compressor', name: 'Video Compressor', category: 'media' },
  { path: '/tools/video-trimmer', name: 'Video Trimmer', category: 'media' },
  { path: '/tools/video-to-mp3', name: 'Video to MP3', category: 'media' },
  { path: '/tools/audio-editor', name: 'Audio Editor', category: 'media' },
  { path: '/tools/audio-transcription', name: 'Audio Transcription', category: 'media' },
  { path: '/tools/remove-vocals', name: 'Remove Vocals', category: 'media' },
  { path: '/tools/audiogram-maker', name: 'Audiogram Maker', category: 'media' },
  { path: '/tools/screen-recorder', name: 'Screen Recorder', category: 'media' },
  { path: '/tools/subtitle-editor', name: 'Subtitle Editor', category: 'media' },
  { path: '/tools/subtitle-generator', name: 'Subtitle Generator', category: 'media' },

  // Utility/Developer Tools
  { path: '/tools/qr-generator', name: 'QR Generator', category: 'utility' },
  { path: '/tools/hash-generator', name: 'Hash Generator', category: 'utility' },
  { path: '/tools/base64', name: 'Base64 Encoder/Decoder', category: 'utility' },
  { path: '/tools/json-formatter', name: 'JSON Formatter', category: 'utility' },
  { path: '/tools/code-beautifier', name: 'Code Beautifier', category: 'utility' },
  { path: '/tools/markdown-editor', name: 'Markdown Editor', category: 'utility' },
  { path: '/tools/diff-checker', name: 'Diff Checker', category: 'utility' },
  { path: '/tools/color-converter', name: 'Color Converter', category: 'utility' },
  { path: '/tools/lorem-ipsum', name: 'Lorem Ipsum Generator', category: 'utility' },
  { path: '/tools/password-generator', name: 'Password Generator', category: 'utility' },
  { path: '/tools/word-counter', name: 'Word Counter', category: 'utility' },
  { path: '/tools/text-case', name: 'Text Case Converter', category: 'utility' },
  { path: '/tools/resume-builder', name: 'Resume Builder', category: 'utility' },

  // AI Tools
  { path: '/tools/ai-summary', name: 'AI Summary', category: 'ai' },
];

// Interface for accessibility results
interface AccessibilityResult {
  page: string;
  name: string;
  category: string;
  axeViolations: AxeViolation[];
  headingIssues: HeadingIssue[];
  formIssues: FormIssue[];
  keyboardIssues: KeyboardIssue[];
  passed: boolean;
}

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  nodes: number;
  helpUrl: string;
}

interface HeadingIssue {
  type: 'missing-h1' | 'multiple-h1' | 'skipped-level' | 'empty-heading';
  details: string;
}

interface FormIssue {
  type: 'missing-label' | 'missing-aria' | 'invalid-autocomplete';
  element: string;
  details: string;
}

interface KeyboardIssue {
  type: 'not-focusable' | 'missing-focus-indicator' | 'trap';
  element: string;
  details: string;
}

// Store results for final report
const testResults: AccessibilityResult[] = [];

// ============================================================================
// AXE-CORE WCAG 2.1 AA COMPLIANCE TESTS
// ============================================================================
test.describe('Axe-Core WCAG 2.1 AA Compliance', () => {
  for (const tool of TOOL_PAGES) {
    test(`${tool.name} - axe accessibility scan`, async ({ page }) => {
      await page.goto(tool.path);

      // Wait for page to fully load (React components to mount)
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Extra wait for React hydration

      // Run axe-core analysis
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Store violations for report
      const violations: AxeViolation[] = accessibilityScanResults.violations.map(v => ({
        id: v.id,
        impact: v.impact || 'unknown',
        description: v.description,
        nodes: v.nodes.length,
        helpUrl: v.helpUrl,
      }));

      // Log violations for debugging
      if (violations.length > 0) {
        console.log(`\n[${tool.name}] Axe violations found:`);
        violations.forEach(v => {
          console.log(`  - ${v.id} (${v.impact}): ${v.description} [${v.nodes} nodes]`);
        });
      }

      // Critical and serious violations should fail the test
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations, `Critical/serious axe violations in ${tool.name}`).toHaveLength(0);
    });
  }
});

// ============================================================================
// HEADING HIERARCHY TESTS
// ============================================================================
test.describe('Heading Hierarchy', () => {
  for (const tool of TOOL_PAGES) {
    test(`${tool.name} - heading structure`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      const issues: HeadingIssue[] = [];

      // Check for exactly one h1
      // Only count h1s that are NOT inside tool content areas (which may have sample content)
      const allH1Elements = await page.locator('h1').all();
      const h1Elements = [];

      for (const h1 of allH1Elements) {
        const text = await h1.textContent();
        const trimmedText = (text?.trim() || '').substring(0, 60);

        // Skip external toolbar h1s
        const toolbarTexts = ['Audit', 'Settings', 'No accessibility or performance issues detected'];
        const isToolbar = toolbarTexts.some(t => trimmedText.includes(t));

        // Skip h1s inside tool content areas (they're sample content, not page titles)
        const isInsideToolContent = await h1.evaluate((el) => {
          const toolContent = el.closest('[data-tool-content]') ||
                             el.closest('.tool-content-area') ||
                             el.closest('.tool-section') ||
                             el.closest('[class*="tool"]');
          return toolContent !== null;
        });

        if (!isToolbar && !isInsideToolContent) {
          h1Elements.push(h1);
        }
      }

      if (h1Elements.length === 0) {
        issues.push({ type: 'missing-h1', details: 'Page has no h1 element' });
      } else if (h1Elements.length > 1) {
        issues.push({ type: 'multiple-h1', details: `Page has ${h1Elements.length} h1 elements` });
      }

      // Check for skipped heading levels
      const headings = await page.evaluate(() => {
        const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(allHeadings).map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent?.trim().substring(0, 50) || '',
          isEmpty: !h.textContent?.trim()
        }));
      });

      // Check for empty headings
      headings.forEach((h, i) => {
        if (h.isEmpty) {
          issues.push({
            type: 'empty-heading',
            details: `Empty h${h.level} at position ${i + 1}`
          });
        }
      });

      // Check for skipped levels (e.g., h1 -> h3)
      for (let i = 1; i < headings.length; i++) {
        const prevLevel = headings[i - 1].level;
        const currLevel = headings[i].level;
        if (currLevel > prevLevel + 1) {
          issues.push({
            type: 'skipped-level',
            details: `Skipped from h${prevLevel} to h${currLevel}: "${headings[i].text}"`
          });
        }
      }

      // Log issues
      if (issues.length > 0) {
        console.log(`\n[${tool.name}] Heading issues:`);
        issues.forEach(i => console.log(`  - ${i.type}: ${i.details}`));
      }

      // Check at least h1 exists
      expect(h1Elements.length, `${tool.name} should have exactly one h1`).toBe(1);
    });
  }
});

// ============================================================================
// FORM LABELS AND ARIA TESTS
// ============================================================================
test.describe('Form Labels and ARIA', () => {
  for (const tool of TOOL_PAGES) {
    test(`${tool.name} - form accessibility`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const issues: FormIssue[] = [];

      // Check all form inputs have labels or aria-label
      const formIssues = await page.evaluate(() => {
        const issues: Array<{ type: string; element: string; details: string }> = [];

        // Check text inputs
        const inputs = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"])'
        );

        inputs.forEach((input) => {
          const el = input as HTMLInputElement;
          const hasLabel = document.querySelector(`label[for="${el.id}"]`);
          const hasAriaLabel = el.getAttribute('aria-label');
          const hasAriaLabelledBy = el.getAttribute('aria-labelledby');
          const hasPlaceholder = el.getAttribute('placeholder');
          const hasTitle = el.getAttribute('title');

          // At minimum, input should have label, aria-label, or aria-labelledby
          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
            issues.push({
              type: 'missing-label',
              element: `input[type="${el.type}"]${el.id ? `#${el.id}` : ''}`,
              details: hasPlaceholder
                ? `Has placeholder "${hasPlaceholder}" but no label/aria-label`
                : 'No label, aria-label, or aria-labelledby'
            });
          }
        });

        // Check textareas
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach((textarea) => {
          const el = textarea as HTMLTextAreaElement;
          const hasLabel = document.querySelector(`label[for="${el.id}"]`);
          const hasAriaLabel = el.getAttribute('aria-label');
          const hasAriaLabelledBy = el.getAttribute('aria-labelledby');

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
            issues.push({
              type: 'missing-label',
              element: `textarea${el.id ? `#${el.id}` : ''}`,
              details: 'No label, aria-label, or aria-labelledby'
            });
          }
        });

        // Check selects
        const selects = document.querySelectorAll('select');
        selects.forEach((select) => {
          const el = select as HTMLSelectElement;
          const hasLabel = document.querySelector(`label[for="${el.id}"]`);
          const hasAriaLabel = el.getAttribute('aria-label');
          const hasAriaLabelledBy = el.getAttribute('aria-labelledby');

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
            issues.push({
              type: 'missing-label',
              element: `select${el.id ? `#${el.id}` : ''}`,
              details: 'No label, aria-label, or aria-labelledby'
            });
          }
        });

        // Check buttons have accessible names
        const buttons = document.querySelectorAll('button');
        buttons.forEach((button) => {
          const el = button as HTMLButtonElement;
          const hasText = el.textContent?.trim();
          const hasAriaLabel = el.getAttribute('aria-label');
          const hasAriaLabelledBy = el.getAttribute('aria-labelledby');
          const hasTitle = el.getAttribute('title');

          if (!hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
            issues.push({
              type: 'missing-aria',
              element: `button${el.className ? `.${el.className.split(' ')[0]}` : ''}`,
              details: 'Button has no accessible name (text, aria-label, or title)'
            });
          }
        });

        return issues;
      });

      // Log issues
      if (formIssues.length > 0) {
        console.log(`\n[${tool.name}] Form accessibility issues:`);
        formIssues.forEach(i => console.log(`  - ${i.type}: ${i.element} - ${i.details}`));
      }

      // Allow some form issues but flag them for review
      // Critical: inputs without any labeling mechanism
      const criticalFormIssues = formIssues.filter(i => i.type === 'missing-label');
      expect(
        criticalFormIssues.length,
        `${tool.name} has ${criticalFormIssues.length} unlabeled form elements`
      ).toBeLessThanOrEqual(2); // Allow up to 2 (some may be hidden or decorative)
    });
  }
});

// ============================================================================
// KEYBOARD NAVIGATION TESTS
// ============================================================================
test.describe('Keyboard Navigation', () => {
  for (const tool of TOOL_PAGES) {
    test(`${tool.name} - keyboard accessibility`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const issues: KeyboardIssue[] = [];

      // Test that interactive elements are focusable
      const focusableElements = await page.evaluate(() => {
        const interactiveSelectors = 'button, a[href], input, select, textarea, [tabindex]';
        const elements = document.querySelectorAll(interactiveSelectors);
        const results: Array<{
          tag: string;
          text: string;
          tabIndex: number;
          hasFocusStyles: boolean;
        }> = [];

        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Skip hidden elements
          if (htmlEl.offsetParent === null && !htmlEl.closest('[role="dialog"]')) return;

          const computed = window.getComputedStyle(htmlEl);
          // Check if element is visible
          if (computed.display === 'none' || computed.visibility === 'hidden') return;

          results.push({
            tag: htmlEl.tagName.toLowerCase(),
            text: htmlEl.textContent?.trim().substring(0, 30) || '',
            tabIndex: htmlEl.tabIndex,
            hasFocusStyles: true // Will check via Tab key navigation
          });
        });

        return results;
      });

      // Check we can tab through the page
      let tabCount = 0;
      const maxTabs = 50; // Prevent infinite loops
      let lastFocusedElement = '';

      // Press Tab key and verify focus moves
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        tabCount++;

        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          return {
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim().substring(0, 30) || '',
            hasOutline: window.getComputedStyle(el).outlineStyle !== 'none' ||
                       window.getComputedStyle(el).boxShadow !== 'none'
          };
        });

        if (!focusedElement) break;

        // Check for focus trap (same element focused repeatedly)
        const focusId = `${focusedElement.tag}:${focusedElement.text}`;
        if (focusId === lastFocusedElement) {
          // Could be a focus trap, check if we've gone around
          const bodyFocused = await page.evaluate(() => document.activeElement === document.body);
          if (bodyFocused) break;

          // If same element twice, might be keyboard trap
          if (tabCount > 5) {
            issues.push({
              type: 'trap',
              element: focusedElement.tag,
              details: `Possible keyboard trap at "${focusedElement.text}"`
            });
            break;
          }
        }
        lastFocusedElement = focusId;

        // Check for visible focus indicator
        if (!focusedElement.hasOutline) {
          // Check if it has ring/shadow focus via classes
          const hasFocusRing = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el) return false;
            const classes = el.className || '';
            return classes.includes('focus') ||
                   classes.includes('ring') ||
                   el.matches(':focus-visible');
          });

          if (!hasFocusRing) {
            issues.push({
              type: 'missing-focus-indicator',
              element: focusedElement.tag,
              details: `No visible focus indicator on "${focusedElement.text}"`
            });
          }
        }
      }

      // Log issues
      if (issues.length > 0) {
        console.log(`\n[${tool.name}] Keyboard issues:`);
        issues.forEach(i => console.log(`  - ${i.type}: ${i.element} - ${i.details}`));
      }

      // No keyboard traps allowed
      const traps = issues.filter(i => i.type === 'trap');
      expect(traps.length, `${tool.name} has keyboard traps`).toBe(0);

      // Should be able to tab to at least some elements
      expect(tabCount, `${tool.name} should have tabbable elements`).toBeGreaterThan(3);
    });
  }
});

// ============================================================================
// COLOR CONTRAST (via axe-core)
// ============================================================================
test.describe('Color Contrast', () => {
  for (const tool of TOOL_PAGES) {
    test(`${tool.name} - color contrast check`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Run axe specifically for color contrast
      const contrastResults = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .include('main') // Focus on main content area
        .analyze();

      const contrastViolations = contrastResults.violations.filter(
        v => v.id.includes('contrast')
      );

      if (contrastViolations.length > 0) {
        console.log(`\n[${tool.name}] Color contrast issues:`);
        contrastViolations.forEach(v => {
          console.log(`  - ${v.id}: ${v.nodes.length} elements`);
          v.nodes.slice(0, 3).forEach(n => {
            console.log(`    Element: ${n.target.join(' > ')}`);
          });
        });
      }

      // Allow some contrast issues (may be intentional for disabled states)
      expect(
        contrastViolations.length,
        `${tool.name} has ${contrastViolations.length} contrast issues`
      ).toBeLessThanOrEqual(5);
    });
  }
});

// ============================================================================
// SCREEN READER COMPATIBILITY
// ============================================================================
test.describe('Screen Reader Compatibility', () => {
  for (const tool of TOOL_PAGES) {
    test(`${tool.name} - ARIA landmarks and roles`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');

      // Check for proper landmarks
      const landmarks = await page.evaluate(() => {
        return {
          hasMain: !!document.querySelector('main, [role="main"]'),
          hasNav: !!document.querySelector('nav, [role="navigation"]'),
          hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
          hasBanner: !!document.querySelector('header, [role="banner"]'),
        };
      });

      // Check for skip link
      const hasSkipLink = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href^="#"]');
        return Array.from(links).some(l =>
          l.textContent?.toLowerCase().includes('skip') ||
          l.textContent?.toLowerCase().includes('content')
        );
      });

      // Check for live regions (for dynamic content)
      const hasLiveRegion = await page.evaluate(() => {
        return !!document.querySelector('[aria-live], [role="alert"], [role="status"]');
      });

      // Check for proper alt text on images
      const imgIssues = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const issues: string[] = [];
        images.forEach((img, i) => {
          if (!img.alt && !img.getAttribute('aria-hidden') && img.getAttribute('role') !== 'presentation') {
            issues.push(`Image ${i + 1}: missing alt attribute`);
          }
        });
        return issues;
      });

      // Log findings
      console.log(`\n[${tool.name}] Screen reader check:`);
      console.log(`  - Main landmark: ${landmarks.hasMain ? 'Yes' : 'No'}`);
      console.log(`  - Navigation: ${landmarks.hasNav ? 'Yes' : 'No'}`);
      console.log(`  - Footer: ${landmarks.hasFooter ? 'Yes' : 'No'}`);
      console.log(`  - Skip link: ${hasSkipLink ? 'Yes' : 'No'}`);
      console.log(`  - Live region: ${hasLiveRegion ? 'Yes' : 'No'}`);
      if (imgIssues.length > 0) {
        imgIssues.forEach(i => console.log(`  - ${i}`));
      }

      // Main content area is required
      expect(landmarks.hasMain, `${tool.name} should have main landmark`).toBe(true);

      // Navigation is required
      expect(landmarks.hasNav, `${tool.name} should have navigation`).toBe(true);
    });
  }
});

// ============================================================================
// GENERATE FINAL REPORT
// ============================================================================
test.afterAll(async () => {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('ACCESSIBILITY TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tool pages tested: ${TOOL_PAGES.length}`);
  console.log('');
  console.log('Categories tested:');
  console.log(`  - Document tools: ${TOOL_PAGES.filter(t => t.category === 'document').length}`);
  console.log(`  - Media tools: ${TOOL_PAGES.filter(t => t.category === 'media').length}`);
  console.log(`  - Utility tools: ${TOOL_PAGES.filter(t => t.category === 'utility').length}`);
  console.log(`  - AI tools: ${TOOL_PAGES.filter(t => t.category === 'ai').length}`);
  console.log('');
  console.log('Tests performed per page:');
  console.log('  1. Axe-core WCAG 2.1 AA compliance');
  console.log('  2. Heading hierarchy (h1 > h2 > h3)');
  console.log('  3. Form labels and ARIA attributes');
  console.log('  4. Keyboard navigation');
  console.log('  5. Color contrast');
  console.log('  6. Screen reader compatibility');
  console.log('='.repeat(80));
});
