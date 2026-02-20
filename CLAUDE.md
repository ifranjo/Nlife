# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

New Life Solutions - Monorepo for browser-based utility tools (PDF, images, AI).

**Live site**: https://www.newlifesolutions.dev

All processing is 100% client-side. Files never leave the user's browser.

## Commands

```bash
# From project root
npm run dev          # Dev server localhost:4321
npm run build        # Production build
npm run check        # TypeScript/Astro validation
npm run preview      # Preview production build

# Testing (from apps/web/)
cd apps/web
npx playwright test                          # All tests (5 browsers)
npx playwright test --project=chromium       # Single browser (fastest)
npx playwright test -g "PDF Merge"           # Pattern match	npx playwright test tests/guides-and-seo.spec.ts  # Single file
npx playwright test --ui                     # Interactive UI mode
npx playwright test tests/accessibility-comprehensive.spec.ts --project=chromium  # All accessibility tests
npx playwright test --grep "axe accessibility scan" --project=chromium  # Quick a11y check

# Visual regression testing
npm run test:visual     # Run visual regression tests
npm run test:percy      # Run Percy visual testing
npm run test:percy:local # Dry run Percy locally

# Test sharding for CI
npm run test:shard:1    # Run 1/4 of tests
npm run test:shard:2    # Run 2/4 of tests
npm run test:shard:3    # Run 3/4 of tests
npm run test:shard:4    # Run 4/4 of tests
```

**Windows note**: Use PowerShell for Playwright commands. The webServer auto-starts dev on port 4321.

## Architecture

```
NEW_LIFE/
├── apps/web/                 ← Astro frontend
│   └── src/
│       ├── pages/
│       │   ├── tools/*.astro     ← Tool pages (24 tools)
│       │   ├── guides/*.astro    ← SEO guide pages
│       │   ├── use-cases/*.astro ← Programmatic landing pages
│       │   ├── admin/*.astro     ← Admin dashboards (ai-analytics)
│       │   └── hub.astro         ← Main hub page
│       ├── components/
│       │   ├── tools/*.tsx       ← React tool components
│       │   ├── ui/*.astro        ← Shared UI (Navbar, Footer, ToolCard)
│       │   ├── seo/*.astro       ← SEO (AnswerBox, SchemaMarkup, QASections)
│       │   └── dashboard/        ← Admin dashboard components
│       ├── lib/
│       │   ├── tools.ts          ← Tool registry (source of truth)
│       │   ├── security.ts       ← File validation utilities
│       │   ├── ai-detection.ts   ← AI traffic detection (HAMBREDEVICTORIA)
│       │   ├── dynamic-adaptation.ts ← Content adaptation for AI
│       │   ├── performance-optimizer.ts ← AI crawler optimizations
│       │   ├── personalization-layer.ts ← Unified personalization API
│       │   ├── ai-analytics.ts   ← Real-time AI traffic analytics
│       │   ├── geo-ab-testing.ts ← A/B testing framework for GEO
│       │   └── geo-feedback-loops.ts ← Automated optimization rules
│       ├── layouts/              ← Astro layout templates
│       └── styles/               ← Global CSS with design system
├── packages/                   ← Shared code
├── docs/geo-system/            ← HAMBREDEVICTORIA Protocol documentation
└── tests/                      ← Playwright E2E tests
```

### Key Patterns

**Tool Registry** (`lib/tools.ts`): Central registry defining all tools with metadata, SEO fields, and FAQs. Every tool page reads from this.

**Astro + React Hybrid**: Astro pages (`.astro`) for static shell/SEO, React components (`.tsx`) with `client:load` for interactive tools.

**Heavy Library Loading**: Dynamic imports for large libs (FFmpeg ~50MB, Whisper ~50MB, Background Removal ~180MB):
```typescript
const { PDFDocument } = await import('pdf-lib');
```

**HAMBREDEVICTORIA Protocol**: 7-week GEO optimization system with AI traffic detection, content adaptation, performance optimization, analytics, and A/B testing.

## Adding a New Tool

1. **Register** in `lib/tools.ts` with id, name, category, SEO metadata, FAQs
2. **Create React component** `components/tools/YourTool.tsx` using security utilities
3. **Create Astro page** `pages/tools/your-tool.astro` with Layout, SEO components
4. **Add thumbnail** SVG in `public/thumbnails/`
5. **Add test** in `apps/web/tests/`

## Security (`lib/security.ts`)

**Required for all file-handling tools:**

```typescript
import { validateFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

// Validates size, MIME type, and magic bytes
await validateFile(file, 'pdf');    // 50MB max
await validateFile(file, 'image');  // 10MB max
validateVideoFile(file);            // 500MB max
validateAudioFile(file);            // 100MB max

// Always sanitize filenames and error messages
const safeName = sanitizeFilename(file.name);
setError(createSafeErrorMessage(err, 'Processing failed'));
```

## HAMBREDEVICTORIA Protocol

7-week systematic GEO optimization strategy for AI platforms (Claude, GPT-4, Gemini, Perplexity):

- **Week 1-2**: Foundation & Core Implementation
- **Week 3**: Advanced Content Strategy
- **Week 4**: GEO Authority & Distribution (Personalization)
- **Week 5**: Continuous Optimization & Measurement (Analytics)
- **Week 6-7**: Advanced Optimization & Scale

**Key Components:**
- `ai-detection.ts` - Multi-signal AI crawler detection
- `dynamic-adaptation.ts` - Platform-specific content rules
- `performance-optimizer.ts` - 50-70% faster extraction for AI
- `ai-analytics.ts` - Real-time traffic monitoring with privacy
- `geo-ab-testing.ts` - Statistical A/B testing framework
- `geo-feedback-loops.ts` - Automated optimization rules

**Analytics Dashboard**: `/admin/ai-analytics` - Real-time monitoring of AI traffic, conversion rates, platform distribution.

## Testing Conventions

Tests run across 5 browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari.

**Important**: A debug overlay can create duplicate h1 elements. Always use specific selectors:
```typescript
// ✅ Correct
const h1 = page.locator('main h1').first();

// ❌ Wrong - may find debug overlay h1
const h1 = page.locator('h1');
```

Test patterns:
```typescript
test('tool page loads', async ({ page }) => {
  await page.goto('/tools/pdf-merge');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveTitle(/PDF Merge/i);
  const main = page.locator('main');
  await expect(main).toBeVisible();

  // Check schema markup exists
  const schema = page.locator('script[type="application/ld+json"]');
  await expect(schema.first()).toBeAttached();
});
```

## Design System

### CSS Classes (`styles/global.css`)

| Class | Usage |
|-------|-------|
| `glass-card` | Card with blur + border |
| `drop-zone` | File upload area (add `drag-over` when dragging) |
| `btn-primary` | Primary action button |
| `btn-secondary` | Secondary button |
| `tool-card` | Hub grid tool cards |

### CSS Variables

```css
--bg: #0a0a0a    --text: #e0e0e0    --border: #222222
--success: #00ff00    --warning: #ffaa00    --error: #ff4444
```

## SEO Structure

Tool pages use three components for AI/search optimization:

| Component | Purpose |
|-----------|---------|
| `AnswerBox.astro` | TL;DR (50-70 words) for AI extraction |
| `QASections.astro` | Semantic Q&A sections |
| `SchemaMarkup.astro` | JSON-LD (SoftwareApplication, HowTo, FAQPage) |

Guide pages (`/guides/*`) and use-case pages (`/use-cases/*`) target long-tail keywords with HowTo schema.

## Accessibility (WCAG 2.1 AA)

All 40 tool pages pass axe-core WCAG 2.1 AA compliance tests. Follow these guidelines:

### Color Contrast Requirements

| Element Type | Minimum Ratio | Notes |
|--------------|---------------|-------|
| Normal text | 4.5:1 | Text < 18pt or < 14pt bold |
| Large text | 3:1 | Text ≥ 18pt or ≥ 14pt bold |
| UI components | 3:1 | Buttons, form borders, icons |

**Theme-aware colors**: Use CSS variables for colors that need different values in dark/light modes:

```css
/* Dark theme (default) */
--success: #00ff00;  /* Bright green on dark backgrounds */

/* Clean/light theme */
--success: #166534;  /* green-800: 5.5:1 on light backgrounds */
```

### Form Accessibility Patterns

**Every form input MUST have an accessible name**. Use one of:

```tsx
// Option 1: htmlFor + id (preferred for visible labels)
<label htmlFor="my-input">Label Text</label>
<input id="my-input" type="text" />

// Option 2: aria-label (for inputs without visible labels)
<input type="range" aria-label="Volume control" />

// Option 3: aria-labelledby (reference existing element)
<span id="size-label">Size: 256px</span>
<input type="range" aria-labelledby="size-label" />
```

**Common inputs that need labels**:
- `<select>` elements
- `<input type="range">` sliders
- `<input type="color">` pickers
- `<input type="number">` fields

### Link Accessibility

Links within text blocks must be distinguishable without relying on color alone:

```css
.prose a {
  color: #818cf8;
  text-decoration: underline;  /* Required for WCAG */
}
```

### Running Accessibility Tests

```bash
cd apps/web

# All accessibility tests (40 tools × 6 checks = 240 tests)
npx playwright test tests/accessibility-comprehensive.spec.ts --project=chromium

# Single tool
npx playwright test --grep "PDF Merge - axe"

# Quick check during development
npx playwright test --grep "axe accessibility scan" --project=chromium
```

## CI/CD

```
PUSH → BUILD + TYPE CHECK + SECURITY AUDIT → DEPLOY (Vercel)
```

- Triggers on push to `main`/`master`
- Security audit blocks on high/critical vulnerabilities
- Vercel secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Astro 5, React 19, Tailwind CSS v4 |
| Testing | Playwright, axe-core, Percy |
| Deploy | Vercel |
| Node | >=20.0.0 |

### Browser Libraries

| Library | Purpose | Size |
|---------|---------|------|
| `pdf-lib` | PDF manipulation | ~2MB |
| `pdfjs-dist` | PDF rendering/text extraction | ~4MB |
| `@ffmpeg/ffmpeg` | Video/audio processing | ~50MB |
| `@huggingface/transformers` | Whisper AI transcription | ~50MB |
| `@imgly/background-removal` | AI background removal | ~180MB |
| `tesseract.js` | OCR | ~30MB |

**Note**: Large libraries use dynamic imports to avoid blocking initial page load.

## Common Development Tasks

### Running a Single Test
```bash
cd apps/web
npx playwright test -g "exact test name" --project=chromium --headed
```

### Debugging AI Analytics
Visit `/admin/ai-analytics` to see real-time AI traffic data. Check browser console for "📊 AI Analytics batch" logs.

### Testing AI Personalization
Use browser dev tools to simulate AI platforms:
```javascript
// Simulate Claude
window.navigator.userAgent = 'Mozilla/5.0 (compatible; Claude/1.0; +https://www.anthropic.com/claude';
window.location.reload();
```

### Updating Tool Registry
After modifying `lib/tools.ts`, restart dev server to see changes. The registry is read at build time.

## Performance Considerations

- All tools must work offline after initial load
- File processing happens in Web Workers when possible
- Large files are processed in chunks with progress indicators
- Memory usage is monitored and cleaned up after processing
- Safari requires special handling for certain file types (HEIC, video codecs)