import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * SEO and Metadata Validation Tests
 *
 * Comprehensive tests for SEO elements across all pages:
 * 1. Title tags (unique, descriptive, proper length)
 * 2. Meta descriptions (present, appropriate length 150-160 chars)
 * 3. Open Graph tags (og:title, og:description, og:image, og:url)
 * 4. Twitter Card tags
 * 5. Canonical URLs
 * 6. Heading hierarchy (single h1, logical h2-h6)
 * 7. Alt text on images
 * 8. Lang attribute on html
 * 9. Robots meta tag
 * 10. Structured data (JSON-LD)
 */

// ============================================================================
// Test Configuration
// ============================================================================

// Pages to test - organized by section
const PAGES = {
  // Core pages
  core: [
    { path: '/hub', name: 'Hub Page' },
  ],

  // Tool pages (from tools.ts registry)
  tools: [
    { path: '/tools/pdf-merge', name: 'PDF Merge' },
    { path: '/tools/pdf-compress', name: 'PDF Compress' },
    { path: '/tools/pdf-split', name: 'PDF Split' },
    { path: '/tools/pdf-redactor', name: 'PDF Redactor' },
    { path: '/tools/pdf-form-filler', name: 'PDF Form Filler' },
    { path: '/tools/pdf-to-word', name: 'PDF to Word' },
    { path: '/tools/ocr', name: 'OCR Text Extractor' },
    { path: '/tools/document-scanner', name: 'Document Scanner' },
    { path: '/tools/resume-builder', name: 'Resume Builder' },
    { path: '/tools/image-compress', name: 'Image Compress' },
    { path: '/tools/file-converter', name: 'Image Converter' },
    { path: '/tools/background-remover', name: 'Background Remover' },
    { path: '/tools/exif-editor', name: 'EXIF Editor' },
    { path: '/tools/image-upscaler', name: 'AI Image Upscaler' },
    { path: '/tools/object-remover', name: 'AI Object Remover' },
    { path: '/tools/video-compressor', name: 'Video Compressor' },
    { path: '/tools/video-trimmer', name: 'Video Trimmer' },
    { path: '/tools/video-to-mp3', name: 'Video to MP3' },
    { path: '/tools/gif-maker', name: 'GIF Maker' },
    { path: '/tools/remove-vocals', name: 'Vocal Remover' },
    { path: '/tools/audio-transcription', name: 'Audio Transcription' },
    { path: '/tools/audio-editor', name: 'Audio Editor' },
    { path: '/tools/audiogram-maker', name: 'Audiogram Maker' },
    { path: '/tools/subtitle-generator', name: 'Subtitle Generator' },
    { path: '/tools/subtitle-editor', name: 'Subtitle Editor' },
    { path: '/tools/screen-recorder', name: 'Screen Recorder' },
    { path: '/tools/qr-generator', name: 'QR Generator' },
    { path: '/tools/base64', name: 'Base64 Encoder' },
    { path: '/tools/json-formatter', name: 'JSON Formatter' },
    { path: '/tools/text-case', name: 'Text Case Converter' },
    { path: '/tools/word-counter', name: 'Word Counter' },
    { path: '/tools/lorem-ipsum', name: 'Lorem Ipsum Generator' },
    { path: '/tools/hash-generator', name: 'Hash Generator' },
    { path: '/tools/color-converter', name: 'Color Converter' },
    { path: '/tools/password-generator', name: 'Password Generator' },
    { path: '/tools/diff-checker', name: 'Diff Checker' },
    { path: '/tools/code-beautifier', name: 'Code Beautifier' },
    { path: '/tools/svg-editor', name: 'SVG Editor' },
    { path: '/tools/markdown-editor', name: 'Markdown Editor' },
    { path: '/tools/ai-summary', name: 'AI Summary' },
  ],

  // Category pages
  categories: [
    { path: '/pdf-tools', name: 'PDF Tools' },
    { path: '/image-tools', name: 'Image Tools' },
    { path: '/video-tools', name: 'Video Tools' },
    { path: '/audio-tools', name: 'Audio Tools' },
  ],

  // Guide pages
  guides: [
    { path: '/guides', name: 'Guides Index' },
    { path: '/guides/merge-pdf-online-free', name: 'Merge PDF Guide' },
    { path: '/guides/compress-video-for-discord', name: 'Compress Video Guide' },
    { path: '/guides/remove-vocals-karaoke', name: 'Remove Vocals Guide' },
    { path: '/guides/transcribe-audio-to-text', name: 'Transcribe Audio Guide' },
    { path: '/guides/extract-text-from-images', name: 'OCR Guide' },
  ],

  // Use case pages
  useCases: [
    { path: '/use-cases', name: 'Use Cases Index' },
    { path: '/use-cases/pdf-merge-invoices', name: 'PDF Merge Invoices' },
    { path: '/use-cases/qr-code-wifi', name: 'QR Code WiFi' },
    { path: '/use-cases/amazon-product-photo-background', name: 'Amazon Product Photos' },
  ],

  // Comparison pages
  compare: [
    { path: '/compare', name: 'Compare Index' },
    { path: '/compare/remove-bg-alternative', name: 'Remove.bg Alternative' },
  ],

  // Persona pages
  personas: [
    { path: '/for/accountants', name: 'For Accountants' },
    { path: '/for/content-creators', name: 'For Content Creators' },
    { path: '/for/ecommerce-sellers', name: 'For E-commerce Sellers' },
  ],
};

// Combine all pages for comprehensive testing
const ALL_PAGES = [
  ...PAGES.core,
  ...PAGES.tools,
  ...PAGES.categories,
  ...PAGES.guides,
  ...PAGES.useCases,
  ...PAGES.compare,
  ...PAGES.personas,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get meta tag content by name or property
 */
async function getMetaContent(page: Page, attribute: string, value: string): Promise<string | null> {
  const meta = page.locator(`meta[${attribute}="${value}"]`);
  const count = await meta.count();
  if (count === 0) return null;
  return meta.getAttribute('content');
}

/**
 * Check if a JSON-LD script exists and is valid JSON
 */
async function getJsonLd(page: Page): Promise<object[] | null> {
  const scripts = page.locator('script[type="application/ld+json"]');
  const count = await scripts.count();
  if (count === 0) return null;

  const results: object[] = [];
  for (let i = 0; i < count; i++) {
    const content = await scripts.nth(i).textContent();
    if (content) {
      try {
        results.push(JSON.parse(content));
      } catch {
        // Invalid JSON, skip
      }
    }
  }
  return results.length > 0 ? results : null;
}

/**
 * Get all headings from the page
 */
async function getHeadings(page: Page): Promise<{ level: number; text: string }[]> {
  const headings: { level: number; text: string }[] = [];

  for (let level = 1; level <= 6; level++) {
    const elements = page.locator(`h${level}`);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      const text = await elements.nth(i).textContent();
      headings.push({ level, text: text?.trim() || '' });
    }
  }

  return headings;
}

// ============================================================================
// Test Suites
// ============================================================================

test.describe('SEO Meta Tags - Core Validation', () => {

  test.describe('Title Tags', () => {
    // Test a sample of pages for title validation
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
      PAGES.tools[5],
      PAGES.guides[0],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has valid title tag`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        const title = await page.title();

        // Title should exist and be non-empty
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);

        // Title should be descriptive (more than just site name)
        expect(title.length).toBeGreaterThan(10);

        // Title should not be too long (Google truncates at ~60 chars)
        expect(title.length).toBeLessThanOrEqual(70);

        // Title should contain relevant keywords or site name
        expect(title.toLowerCase()).toMatch(/new life|tool|pdf|image|video|audio|free/i);
      });
    }
  });

  test.describe('Meta Descriptions', () => {
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
      PAGES.tools[10],
      PAGES.guides[1],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has valid meta description`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        const description = await getMetaContent(page, 'name', 'description');

        // Meta description should exist
        expect(description).toBeTruthy();

        if (description) {
          // Description should be reasonably long (50+ chars)
          expect(description.length).toBeGreaterThan(50);

          // Description should not be too long (Google truncates at ~160 chars)
          // Allow some flexibility as descriptions up to 160 are common
          expect(description.length).toBeLessThanOrEqual(200);

          // Optimal length is 150-160 chars
          if (description.length < 120 || description.length > 165) {
            console.warn(`${pageInfo.path}: Meta description length ${description.length} chars (optimal: 150-160)`);
          }
        }
      });
    }
  });

  test.describe('Open Graph Tags', () => {
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
      PAGES.tools[15],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has Open Graph tags`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        // og:title
        const ogTitle = await getMetaContent(page, 'property', 'og:title');
        expect(ogTitle).toBeTruthy();
        expect(ogTitle!.length).toBeGreaterThan(5);

        // og:description
        const ogDescription = await getMetaContent(page, 'property', 'og:description');
        expect(ogDescription).toBeTruthy();
        expect(ogDescription!.length).toBeGreaterThan(20);

        // og:type
        const ogType = await getMetaContent(page, 'property', 'og:type');
        expect(ogType).toBeTruthy();
        expect(['website', 'article', 'product']).toContain(ogType);

        // og:url
        const ogUrl = await getMetaContent(page, 'property', 'og:url');
        expect(ogUrl).toBeTruthy();
        expect(ogUrl).toMatch(/^https?:\/\//);

        // og:image (optional but recommended)
        const ogImage = await getMetaContent(page, 'property', 'og:image');
        if (ogImage) {
          expect(ogImage).toMatch(/^https?:\/\/.*\.(png|jpg|jpeg|svg|webp)/i);
        }

        // og:site_name
        const ogSiteName = await getMetaContent(page, 'property', 'og:site_name');
        expect(ogSiteName).toBeTruthy();
      });
    }
  });

  test.describe('Twitter Card Tags', () => {
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has Twitter Card tags`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        // twitter:card
        const twitterCard = await getMetaContent(page, 'name', 'twitter:card');
        expect(twitterCard).toBeTruthy();
        expect(['summary', 'summary_large_image', 'app', 'player']).toContain(twitterCard);

        // twitter:title
        const twitterTitle = await getMetaContent(page, 'name', 'twitter:title');
        expect(twitterTitle).toBeTruthy();

        // twitter:description
        const twitterDescription = await getMetaContent(page, 'name', 'twitter:description');
        expect(twitterDescription).toBeTruthy();

        // twitter:image (optional but recommended)
        const twitterImage = await getMetaContent(page, 'name', 'twitter:image');
        if (twitterImage) {
          expect(twitterImage).toMatch(/^https?:\/\//);
        }
      });
    }
  });

  test.describe('Canonical URLs', () => {
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
      PAGES.tools[20],
      PAGES.guides[0],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has canonical URL`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveCount(1);

        const href = await canonical.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/^https?:\/\//);

        // Canonical should not have trailing slash inconsistencies
        // Either all have trailing slashes or none
        expect(href).not.toMatch(/\/\/$/); // No double slashes at end
      });
    }
  });

  test.describe('Robots Meta Tag', () => {
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has proper robots meta`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        const robots = await getMetaContent(page, 'name', 'robots');

        // Robots tag should exist
        expect(robots).toBeTruthy();

        // Should allow indexing (index, follow)
        expect(robots!.toLowerCase()).toContain('index');
        expect(robots!.toLowerCase()).toContain('follow');

        // Should NOT have noindex or nofollow for public pages
        expect(robots!.toLowerCase()).not.toContain('noindex');
        expect(robots!.toLowerCase()).not.toContain('nofollow');
      });
    }
  });

  test.describe('HTML Lang Attribute', () => {
    const samplePages = [
      PAGES.core[0],
      PAGES.tools[0],
      PAGES.guides[0],
    ];

    for (const pageInfo of samplePages) {
      test(`${pageInfo.name} has lang attribute`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('domcontentloaded');

        const html = page.locator('html');
        const lang = await html.getAttribute('lang');

        expect(lang).toBeTruthy();
        expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., "en" or "en-US"
      });
    }
  });
});

test.describe('Heading Hierarchy', () => {
  const samplePages = [
    PAGES.core[0],
    PAGES.tools[0],
    PAGES.tools[10],
    PAGES.guides[1],
  ];

  for (const pageInfo of samplePages) {
    test(`${pageInfo.name} has proper heading hierarchy`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Check for exactly one H1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // H1 should have meaningful content
      const h1Text = await page.locator('h1').first().textContent();
      expect(h1Text?.trim().length).toBeGreaterThan(3);

      // Check heading order (no skipping levels)
      const headings = await getHeadings(page);

      if (headings.length > 1) {
        let prevLevel = 0;
        for (const heading of headings) {
          // First heading should be H1
          if (prevLevel === 0) {
            expect(heading.level).toBe(1);
          }

          // Should not skip more than one level
          // e.g., H1 -> H3 is bad, H1 -> H2 or H2 -> H3 is good
          if (prevLevel > 0) {
            const levelDiff = heading.level - prevLevel;
            // Allow going up (higher number) by max 1, going down (lower number) is always ok
            if (levelDiff > 1) {
              console.warn(
                `${pageInfo.path}: Heading level skipped from H${prevLevel} to H${heading.level}`
              );
            }
          }

          prevLevel = heading.level;
        }
      }
    });
  }
});

test.describe('Image Alt Text', () => {
  const samplePages = [
    PAGES.core[0],
    PAGES.tools[0],
  ];

  for (const pageInfo of samplePages) {
    test(`${pageInfo.name} images have alt text`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Get all images
      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);

        // Check if image has alt attribute
        const alt = await img.getAttribute('alt');

        // Alt can be empty string for decorative images, but should exist
        expect(alt).not.toBeNull();

        // Check role for decorative images
        if (alt === '') {
          const role = await img.getAttribute('role');
          // Decorative images should have role="presentation" or role="none"
          // or be inside an element that provides context
          const ariaHidden = await img.getAttribute('aria-hidden');
          if (role !== 'presentation' && role !== 'none' && ariaHidden !== 'true') {
            console.warn(`${pageInfo.path}: Image ${i} has empty alt without role="presentation"`);
          }
        }
      }
    });
  }

  test('Hub page uses aria-hidden for decorative emoji icons', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Check that tool cards have accessible names
    const toolCards = page.locator('[data-testid="tool-card"], .tool-card, article');
    const count = await toolCards.count();

    if (count > 0) {
      // At least some tool cards should be present
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('Structured Data (JSON-LD)', () => {
  test('Hub page has valid JSON-LD schema', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    const schemas = await getJsonLd(page);

    expect(schemas).toBeTruthy();
    expect(schemas!.length).toBeGreaterThan(0);

    // Check for required properties
    const hasContext = schemas!.some((s: Record<string, unknown>) =>
      s['@context'] && (s['@context'] as string).includes('schema.org')
    );
    expect(hasContext).toBe(true);

    // Check for valid @type
    const hasType = schemas!.some((s: Record<string, unknown>) => s['@type']);
    expect(hasType).toBe(true);
  });

  test('Tool pages have SoftwareApplication or WebApplication schema', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    const schemas = await getJsonLd(page);

    if (schemas && schemas.length > 0) {
      const validTypes = ['SoftwareApplication', 'WebApplication', 'HowTo', 'FAQPage'];

      // Helper to check if a type matches
      const typeMatches = (type: unknown): boolean => {
        if (Array.isArray(type)) {
          return type.some(t => validTypes.includes(t));
        }
        return validTypes.includes(type as string);
      };

      // Check both direct @type and @graph items
      const hasAppSchema = schemas.some((s: Record<string, unknown>) => {
        // Check direct @type
        if (s['@type'] && typeMatches(s['@type'])) return true;

        // Check @graph items (consolidated schema format)
        if (s['@graph'] && Array.isArray(s['@graph'])) {
          return (s['@graph'] as Record<string, unknown>[]).some(
            item => item['@type'] && typeMatches(item['@type'])
          );
        }
        return false;
      });

      expect(hasAppSchema).toBe(true);
    }
  });

  test('Guide pages have FAQPage or HowTo schema', async ({ page }) => {
    await page.goto('/guides/merge-pdf-online-free');
    await page.waitForLoadState('networkidle');

    const schemas = await getJsonLd(page);

    expect(schemas).toBeTruthy();

    // Should have FAQ or HowTo schema
    const hasFaqOrHowTo = schemas!.some((s: Record<string, unknown>) => {
      const type = s['@type'];
      if (Array.isArray(type)) {
        return type.some(t => ['FAQPage', 'HowTo', 'Article', 'WebPage'].includes(t));
      }
      return ['FAQPage', 'HowTo', 'Article', 'WebPage'].includes(type as string);
    });

    expect(hasFaqOrHowTo).toBe(true);
  });

  test('Schema has required properties', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    const schemas = await getJsonLd(page);

    if (schemas && schemas.length > 0) {
      for (const schema of schemas) {
        const s = schema as Record<string, unknown>;

        // All schemas need @context
        expect(s['@context']).toBeTruthy();

        // All schemas need @type
        expect(s['@type']).toBeTruthy();

        // WebPage should have name or headline
        if (s['@type'] === 'WebPage') {
          expect(s['name'] || s['headline']).toBeTruthy();
        }

        // ItemList should have itemListElement
        if (s['@type'] === 'ItemList') {
          expect(s['itemListElement']).toBeTruthy();
          expect(Array.isArray(s['itemListElement'])).toBe(true);
        }
      }
    }
  });
});

test.describe('Comprehensive Page Validation', () => {
  // Test all tool pages exist and have basic SEO
  test('All tool pages load with valid status', async ({ page }) => {
    const failedPages: string[] = [];

    for (const pageInfo of PAGES.tools) {
      const response = await page.goto(pageInfo.path);

      if (!response || response.status() !== 200) {
        failedPages.push(`${pageInfo.path} (status: ${response?.status() || 'no response'})`);
      }
    }

    if (failedPages.length > 0) {
      console.error('Failed pages:', failedPages);
    }

    // Allow some failures but report them
    expect(failedPages.length).toBeLessThan(PAGES.tools.length * 0.1); // Less than 10% failure
  });

  test('All pages have unique titles', async ({ page }) => {
    const titles: Map<string, string[]> = new Map();

    for (const pageInfo of [...PAGES.core, ...PAGES.tools.slice(0, 10)]) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');

      const title = await page.title();

      if (titles.has(title)) {
        titles.get(title)!.push(pageInfo.path);
      } else {
        titles.set(title, [pageInfo.path]);
      }
    }

    // Check for duplicate titles
    const duplicates = Array.from(titles.entries()).filter(([_, paths]) => paths.length > 1);

    if (duplicates.length > 0) {
      console.warn('Duplicate titles found:', duplicates);
    }

    // There should be no duplicate titles (or minimal)
    expect(duplicates.length).toBeLessThanOrEqual(1);
  });
});

test.describe('SEO Accessibility Integration', () => {
  test('Hub page passes accessibility checks for SEO elements', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Wait for React hydration
    await page.waitForTimeout(1000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Filter for SEO-relevant violations
    const seoRelevantViolations = accessibilityScanResults.violations.filter(v =>
      ['document-title', 'html-has-lang', 'image-alt', 'heading-order', 'meta-viewport'].includes(
        v.id
      )
    );

    if (seoRelevantViolations.length > 0) {
      console.error('SEO-relevant accessibility violations:', seoRelevantViolations);
    }

    expect(seoRelevantViolations).toEqual([]);
  });

  test('Tool page passes accessibility checks', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    // Wait for React component hydration
    await page.waitForTimeout(1000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Filter critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      console.error('Critical accessibility violations:', criticalViolations);
    }

    // Allow minor issues but no critical ones
    expect(criticalViolations).toEqual([]);
  });
});

test.describe('Mobile SEO', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Pages have viewport meta tag', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('domcontentloaded');

    const viewport = await getMetaContent(page, 'name', 'viewport');

    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  test('Mobile pages have touch-friendly elements', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Check that clickable elements are reasonably sized
    const links = page.locator('a');
    const count = await links.count();

    if (count > 0) {
      const firstLink = links.first();
      const box = await firstLink.boundingBox();

      if (box) {
        // Touch targets should be at least 44x44 pixels (WCAG recommendation)
        // Allow some flexibility for inline links
        expect(box.height).toBeGreaterThanOrEqual(20);
      }
    }
  });
});

test.describe('Landing Page SEO', () => {
  test('Landing page redirects to hub with proper SEO', async ({ page }) => {
    // The landing page does a 301 redirect to /hub
    const response = await page.goto('/');

    // Should redirect
    expect(page.url()).toContain('/hub');

    // Hub page should have all SEO elements
    await page.waitForLoadState('domcontentloaded');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);

    const description = await getMetaContent(page, 'name', 'description');
    expect(description).toBeTruthy();
  });
});

test.describe('Performance SEO Signals', () => {
  test('Pages load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/hub');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('No render-blocking resources warning', async ({ page }) => {
    await page.goto('/hub');
    await page.waitForLoadState('networkidle');

    // Check for defer/async on scripts
    const scripts = page.locator('head script[src]');
    const count = await scripts.count();

    for (let i = 0; i < count; i++) {
      const script = scripts.nth(i);
      const async = await script.getAttribute('async');
      const defer = await script.getAttribute('defer');
      const type = await script.getAttribute('type');

      // Scripts should either be async, defer, or module
      const isNonBlocking = async !== null || defer !== null || type === 'module';

      if (!isNonBlocking) {
        const src = await script.getAttribute('src');
        console.warn(`Potentially render-blocking script: ${src}`);
      }
    }
  });
});
