# ANALYTICS - SEO Monitoring & Reporting

Comprehensive monitoring and reporting tools for New Life Solutions SEO health.

## Quick Start

```bash
# Run full SEO dashboard (recommended)
node ANALYTICS/seo-dashboard.mjs

# Generate HTML report
node ANALYTICS/seo-dashboard.mjs --html

# Generate JSON report
node ANALYTICS/seo-dashboard.mjs --json
```

## Available Scripts

### Core Dashboard

| Script | Description | Runtime |
|--------|-------------|---------|
| `seo-dashboard.mjs` | Comprehensive SEO health report | ~30s |

### Individual Monitors

| Script | Description | Runtime |
|--------|-------------|---------|
| `sitemap-health.mjs` | Validates sitemap & checks all URLs | ~60s |
| `schema-validator.mjs` | Validates JSON-LD structured data | ~45s |
| `performance-monitor.mjs` | Core Web Vitals via PageSpeed API | ~2min |
| `index-status.mjs` | Search engine indexing readiness | ~15s |
| `broken-links.mjs` | Crawls & validates all links | ~3min |

### SEO Tools (from scripts/)

| Script | Description |
|--------|-------------|
| `../scripts/submit-indexnow.mjs` | Submit URLs to Bing/Yandex |
| `../scripts/aeo-audit.mjs` | AI search engine readiness |
| `../scripts/backlink-opportunities.mjs` | Directory submission checklist |

## Usage Examples

### Sitemap Health

```bash
# Check all sitemap URLs for accessibility
node ANALYTICS/sitemap-health.mjs
```

Output includes:
- URL accessibility (200, 404, etc.)
- Response times
- Health score percentage

### Schema Validation

```bash
# Validate JSON-LD across all pages
node ANALYTICS/schema-validator.mjs
```

Checks for:
- `WebApplication` (tool pages)
- `HowTo` (step-by-step guides)
- `FAQPage` (FAQ sections)
- `BreadcrumbList` (navigation)
- `SpeakableSpecification` (voice search)

### Performance Monitor

```bash
# Check key pages (fast)
node ANALYTICS/performance-monitor.mjs

# Check all pages (slower, respects API limits)
node ANALYTICS/performance-monitor.mjs --full
```

Metrics:
- LCP (Largest Contentful Paint)
- FCP (First Contentful Paint)
- CLS (Cumulative Layout Shift)
- SI (Speed Index)
- Performance score

### Index Status

```bash
# Check indexing readiness
node ANALYTICS/index-status.mjs
```

Checks:
- robots.txt configuration
- Sitemap presence
- IndexNow setup
- Meta tag validation
- Manual verification links

### Broken Links

```bash
# Check internal links only (fast)
node ANALYTICS/broken-links.mjs

# Include external links
node ANALYTICS/broken-links.mjs --external

# Limit pages to crawl
node ANALYTICS/broken-links.mjs --limit=10
```

## Recommended Workflow

### Daily (Automated)

```bash
# Quick health check
node ANALYTICS/seo-dashboard.mjs
```

### Weekly

```bash
# Full audit
node ANALYTICS/sitemap-health.mjs
node ANALYTICS/schema-validator.mjs
node ANALYTICS/broken-links.mjs
```

### Before Launch / After Major Changes

```bash
# Complete audit with reports
node ANALYTICS/seo-dashboard.mjs --html --json
node ANALYTICS/performance-monitor.mjs --full
node ANALYTICS/broken-links.mjs --external
```

### Monthly

```bash
# Submit to search engines
node scripts/submit-indexnow.mjs

# Review backlink opportunities
node scripts/backlink-opportunities.mjs
```

## Exit Codes

All scripts return appropriate exit codes for CI/CD integration:

| Code | Meaning |
|------|---------|
| 0 | Success - all checks passed |
| 1 | Failure - issues found |

## Output Formats

### Console (default)

ASCII formatted tables with color coding:
- Green: OK
- Yellow: Warning
- Red: Error

### HTML (`--html`)

Generates `seo-report-YYYY-MM-DD.html` with:
- Glassmorphic JARVIS aesthetic
- Score visualizations
- Detailed breakdowns

### JSON (`--json`)

Generates `seo-report-YYYY-MM-DD.json` for:
- Programmatic analysis
- Historical tracking
- CI/CD integration

## API Dependencies

| API | Used By | Limits |
|-----|---------|--------|
| PageSpeed Insights | `performance-monitor.mjs` | 25,000/day (free) |
| IndexNow | `submit-indexnow.mjs` | 10,000 URLs/day |

## Scoring Guide

### Overall Score

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Excellent | Maintain |
| 70-89 | Good | Minor optimizations |
| 50-69 | Fair | Address warnings |
| <50 | Poor | Immediate attention |

### Individual Metrics

- **Sitemap Health**: All URLs should return 200
- **Schema Markup**: Tool pages need WebApplication + HowTo + FAQPage
- **Performance**: Target 90+ on PageSpeed
- **Meta Tags**: All pages need title, description, canonical
- **AEO**: TL;DR, FAQs, comparison tables for AI citations

## Troubleshooting

### "Timeout" errors

Increase timeout in script or check server response times.

### Rate limiting

PageSpeed API has limits. Use `--full` sparingly or add delays.

### Schema validation false positives

Some pages may not need all schema types. Check requirements per page type.

## Contributing

When adding new monitors:

1. Follow existing script structure
2. Use consistent color coding
3. Return proper exit codes
4. Add to this README
