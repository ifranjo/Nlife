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

# Testing (from apps/web/)
cd apps/web
npx playwright test                          # All tests (5 browsers)
npx playwright test --project=chromium       # Single browser (fastest)
npx playwright test -g "PDF Merge"           # Pattern match
npx playwright test tests/guides-and-seo.spec.ts  # Single file
npx playwright test --ui                     # Interactive UI mode
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
│       │   └── use-cases/*.astro ← Programmatic landing pages
│       ├── components/
│       │   ├── tools/*.tsx       ← React tool components
│       │   ├── ui/*.astro        ← Shared UI (Navbar, Footer, ToolCard)
│       │   └── seo/*.astro       ← SEO (AnswerBox, SchemaMarkup, QASections)
│       └── lib/
│           ├── tools.ts          ← Tool registry (source of truth)
│           └── security.ts       ← File validation utilities
├── packages/                 ← Shared code
└── docs/                     ← Documentation
```

### Key Patterns

**Tool Registry** (`lib/tools.ts`): Central registry defining all tools with metadata, SEO fields, and FAQs. Every tool page reads from this.

**Astro + React Hybrid**: Astro pages (`.astro`) for static shell/SEO, React components (`.tsx`) with `client:load` for interactive tools.

**Heavy Library Loading**: Dynamic imports for large libs (FFmpeg ~50MB, Whisper ~50MB, Background Removal ~180MB):
```typescript
const { PDFDocument } = await import('pdf-lib');
```

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
| Testing | Playwright, axe-core |
| Deploy | Vercel |
| Node | >=20.0.0 |

### Browser Libraries

| Library | Purpose |
|---------|---------|
| `pdf-lib` | PDF manipulation |
| `pdfjs-dist` | PDF rendering/text extraction |
| `@ffmpeg/ffmpeg` | Video/audio processing |
| `@huggingface/transformers` | Whisper AI transcription |
| `@imgly/background-removal` | AI background removal |
| `tesseract.js` | OCR |
