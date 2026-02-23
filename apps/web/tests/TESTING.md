# Testing Strategy for New Life Solutions

## 3-Tier Testing Pyramid

```
       /\
      /  \      TIER 3: Full Regression (weekly)
     /    \     All 57 tools × file upload × all browsers
    /______\
   /        \   TIER 2: Critical Path (on PR)
  /          \  25 tools × full E2E with file processing
 /____________\
/              \ TIER 1: Smoke Tests (every commit)
/                \ Fast health checks
```

---

## TIER 1: SMOKE TESTS

### ⚡ Lightning (2-3 minutes)
Fastest possible check - use this when you need immediate feedback.

```bash
npx playwright test tools-smoke-light --project=chromium
```

**What it checks:**
- Page loads (HTTP 200)
- Title exists
- Main content visible

**Coverage:** All 57 tools in parallel

### 🔥 Standard Smoke (5-8 minutes)
Comprehensive smoke test - use this before pushing.

```bash
npx playwright test tools-smoke --project=chromium
```

**What it checks:**
- All lightning checks +
- H1 present and contains tool name
- Schema markup valid (JSON-LD)
- No console errors
- File input/drop zone present
- React hydration successful

**Special handling:**
- Heavy library tools (FFmpeg, Whisper, Background Removal) get 120s timeout
- Standard tools get 30s timeout

### By Category
Run smoke tests for specific tool categories:

```bash
# Document tools only (10 tools)
npx playwright test tools-smoke --grep "document" --project=chromium

# Media tools only (17 tools)
npx playwright test tools-smoke --grep "media" --project=chromium

# AI tools only (8 tools)
npx playwright test tools-smoke --grep "ai" --project=chromium

# Utility tools only (15 tools)
npx playwright test tools-smoke --grep "utility" --project=chromium
```

---

## TIER 2: CRITICAL PATH

Full E2E tests with actual file uploads and processing. Run before merging PRs.

```bash
# All critical tools (~20-30 minutes)
npx playwright test critical-path --project=chromium

# Specific tool
npx playwright test critical-path --grep "PDF Merge"
```

### Critical Tools Tested (25 tools)

#### Document Tools
| # | Tool | What It Tests | Timeout |
|---|------|---------------|---------|
| 1 | **PDF Merge** | Upload 2 PDFs → Merge → Download | 60s |
| 2 | **PDF Compress** | Upload PDF → Compress → Smaller output | 60s |
| 3 | **PDF Split** | Upload PDF → Extract pages | 60s |
| 4 | **PDF to Word** | Upload PDF → Convert to DOCX | 60s |
| 5 | **PDF Organizer** | Upload PDF → Reorder pages | 60s |

#### Media Tools
| # | Tool | What It Tests | Timeout |
|---|------|---------------|---------|
| 6 | **Image Compress** | Upload JPG → Compress → Download | 60s |
| 7 | **JPG to PDF** | Upload JPG → Convert to PDF | 60s |
| 8 | **Background Remover** | Upload image → AI remove background | 180s |
| 9 | **Video Compressor** | Upload video → Compress (FFmpeg) | 180s |
| 10 | **Video Trimmer** | Upload video → Cut clip | 180s |
| 11 | **GIF Maker** | Upload video → Create GIF | 180s |
| 12 | **Audio Editor** | Upload MP3 → Trim audio | 180s |
| 13 | **Screen Recorder** | Recording interface loads | 30s |
| 14 | **OCR** | Upload image → Extract text (Tesseract.js) | 120s |
| 15 | **Image Upscaler** | Upload image → AI upscale | 180s |

#### Utility Tools
| # | Tool | What It Tests | Timeout |
|---|------|---------------|---------|
| 16 | **QR Generator** | Enter text → Generate QR → Display | 30s |
| 17 | **Password Generator** | Click generate → Copy password | 30s |
| 18 | **JSON Formatter** | Paste JSON → Format → Validate | 30s |
| 19 | **Text Case Converter** | Enter text → Convert case | 30s |
| 20 | **Word Counter** | Enter text → Count words | 30s |
| 21 | **Lorem Ipsum** | Generate placeholder text | 30s |
| 22 | **Hash Generator** | Enter text → Create hash | 60s |
| 23 | **Diff Checker** | Enter 2 texts → Compare | 30s |

#### AI-Powered Tools
| # | Tool | What It Tests | Timeout |
|---|------|---------------|---------|
| 24 | **Grammar Checker** | Enter text → Check grammar | 120s |
| 25 | **Text Summarization** | Enter long text → Summarize | 120s |

### Test Fixtures

Located in `tests/fixtures/`:

| File | Size | Purpose |
|------|------|---------|
| `sample.pdf` | ~460B | Single page test PDF |
| `sample-1.pdf` | ~454B | Multi-merge test (doc 1) |
| `sample-2.pdf` | ~455B | Multi-merge test (doc 2) |
| `sample.jpg` | 338B | 1x1 pixel JPEG |
| `sample-large.jpg` | 10KB | Larger image for compression |
| `sample.png` | 71B | 1x1 pixel PNG with transparency |
| `sample.mp4` | 148B | Minimal valid MP4 structure |
| `sample.mp3` | 316B | Silent MP3 frame |

**Regenerate fixtures:**
```bash
node tests/fixtures/generate-fixtures.cjs
```

---

## TIER 3: FULL REGRESSION

Complete validation of all tools. Run weekly or before releases.

```bash
# Planned - not yet implemented
npx playwright test regression --project=chromium

# All tools, all browsers (4+ hours)
npx playwright test regression
```

---

## Test Configuration

### Timeouts

| Tool Type | Timeout | Reason |
|-----------|---------|--------|
| Standard | 30s | Fast-loading tools |
| Heavy Lib | 120-180s | FFmpeg, Whisper, Background Removal |

### Parallel Execution

Tests run in parallel by default (5 workers). To run sequentially:

```bash
# Smoke tests parallel (default)
npx playwright test tools-smoke --project=chromium

# Critical path serial (required for resource management)
npx playwright test critical-path --project=chromium

# Force sequential
npx playwright test --workers=1
```

### Debug Mode

```bash
# See the browser while testing
npx playwright test tools-smoke --project=chromium --headed

# Run with UI
npx playwright test --ui

# Debug specific test
npx playwright test critical-path --grep "PDF Merge" --headed --debug
```

---

## Interpreting Results

### Pass/Fail Criteria

| Check | Severity | Meaning |
|-------|----------|---------|
| Page loads | 🔴 Critical | Tool completely broken |
| H1 visible | 🔴 Critical | SEO/rendering broken |
| Schema valid | 🟡 High | AI/search visibility impacted |
| Console errors | 🟡 High | Potential runtime issues |
| File input present | 🟡 High | Core functionality missing |
| File processing | 🔴 Critical (Tier 2) | Tool doesn't work |
| Download works | 🔴 Critical (Tier 2) | Output broken |

### Example Output

```
✅ [document] PDF Merge (pdf-merge) - 2.3s
   ✓ page-load
   ✓ h1-visible
   ✓ h1-contains-name
   ✓ schema-valid (SoftwareApplication, HowTo, FAQPage)

🔥 CRITICAL PATH: PDF Merge - 5.2s
   ✓ Navigate to tool
   ✓ Upload 2 PDFs
   ✓ Merge processing complete
   ✓ Download merged.pdf (2,847 bytes)

❌ [media] Video Compressor (video-compressor) - 125s
   ✓ page-load
   ✗ processing timeout
   Error: FFmpeg WASM failed to load
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
    branches: [main, master]

jobs:
  # Tier 1: Quick smoke test on every PR
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install chromium
      - run: npx playwright test tools-smoke-light --project=chromium

  # Tier 2: Full critical path before merge
  critical-path:
    needs: smoke-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: node tests/fixtures/generate-fixtures.cjs
      - run: npx playwright test critical-path --project=chromium
```

---

## Test File Structure

```
tests/
├── tools-smoke.spec.ts          # Full smoke tests (57 tools)
├── tools-smoke-light.spec.ts    # Lightning tests (57 tools)
├── critical-path.spec.ts        # E2E tests (25 critical tools)
├── lib/
│   └── test-helpers.ts          # Shared utilities
├── fixtures/
│   ├── sample.pdf               # Test PDFs
│   ├── sample-1.pdf
│   ├── sample-2.pdf
│   ├── sample.jpg               # Test images
│   ├── sample-large.jpg
│   ├── sample.png
│   ├── sample.mp4               # Test video
│   ├── sample.mp3               # Test audio
│   └── generate-fixtures.cjs    # Fixture generator
└── TESTING.md                   # This file
```

---

## Adding New Tools

When adding a tool to `lib/tools.ts`:

### 1. Update Smoke Tests

Add to `TOOLS` array in `tools-smoke.spec.ts`:

```typescript
{ id: 'new-tool', name: 'New Tool', category: 'utility', hasHeavyLib: false },
```

Add to `TOOL_PATHS` in `tools-smoke-light.spec.ts`:

```typescript
'/tools/new-tool',
```

### 2. Add to Critical Path (if top 10)

Add E2E test in `critical-path.spec.ts` following existing patterns.

### 3. Generate Fixtures (if needed)

Add to `generate-fixtures.cjs` if new file types required.

---

## Troubleshooting

### Timeouts on Heavy Tools

```bash
# Increase timeout globally
npx playwright test --timeout=300000

# Run single heavy tool
npx playwright test critical-path --grep "Background Remover" --timeout=300000
```

### Memory Issues

```bash
# Reduce parallel workers
npx playwright test tools-smoke --workers=2
```

### Fixture Files Missing

```bash
# Regenerate all fixtures
cd apps/web
node tests/fixtures/generate-fixtures.cjs
```

### Flaky Tests

Check for:
- Dynamic content loading (add explicit waits)
- Third-party library CDN issues
- Browser extension interference

```bash
# Run with retries
npx playwright test --retries=2
```

---

## Quick Reference

| Goal | Command | Time |
|------|---------|------|
| **Quick sanity check** | `npx playwright test tools-smoke-light` | 2-3 min |
| **Pre-commit validation** | `npx playwright test tools-smoke` | 5-8 min |
| **PR merge check** | `npx playwright test critical-path` | 20-30 min |
| **Full validation** | `npx playwright test regression` | 4+ hours |
| **Single tool debug** | `npx playwright test --grep "Tool Name" --headed` | varies |
| **Specific category** | `npx playwright test tools-smoke --grep "document"` | 1-2 min |

---

## Maintenance

### Monthly Tasks
- [ ] Review and update critical tools list based on analytics
- [ ] Check test fixture validity
- [ ] Review flaky tests and fix root causes

### Quarterly Tasks
- [ ] Run full regression on all browsers
- [ ] Update Playwright to latest version
- [ ] Audit test coverage for new tools
