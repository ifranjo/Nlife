# ANALYTICS.md

Analytics setup and tracking documentation for New Life Solutions.

## Overview

New Life Solutions uses **Vercel Analytics** for privacy-first, cookie-free tracking. All analytics data is automatically collected via Vercel's integration.

## Current Setup

### Vercel Analytics (Active)

**Implementation:** `@vercel/analytics/astro` package integrated in Layout.astro

```typescript
// apps/web/src/layouts/Layout.astro
import Analytics from '@vercel/analytics/astro';

// Renders on every page
<Analytics />
```

**Benefits:**
- Zero configuration required
- No cookies (GDPR/CCPA compliant by default)
- Automatic page view tracking
- Performance metrics included
- No impact on Core Web Vitals

**Dashboard Access:**
1. Visit https://vercel.com/dashboard
2. Select the **new-life-solutions** project
3. Navigate to **Analytics** tab

## Key Metrics Tracked

### Automatic Metrics (Vercel Analytics)

| Metric | Description |
|--------|-------------|
| Page Views | Total visits to each tool page |
| Unique Visitors | De-duplicated visitor count |
| Top Pages | Most visited tool pages |
| Top Referrers | Traffic sources (Google, direct, social) |
| Countries | Geographic distribution |
| Devices | Desktop vs Mobile vs Tablet |
| Browsers | Chrome, Firefox, Safari, Edge usage |
| Page Load Time | Core Web Vitals (LCP, FID, CLS) |

### Tool-Specific Tracking

Currently tracked via Vercel's automatic page view tracking:

- `/tools/pdf-merge` - PDF Merge tool
- `/tools/pdf-compress` - PDF Compress tool
- `/tools/image-compress` - Image Compress tool
- `/tools/background-remover` - Background Remover tool
- `/tools/audio-transcription` - Audio Transcription tool
- ... (all 30+ tools)

## Custom Events (Optional Enhancement)

### Recommended Custom Events

While Vercel Analytics handles page views automatically, you can add custom events for deeper insights:

```typescript
import { track } from '@vercel/analytics';

// Track when user successfully processes a file
track('tool_used', {
  tool: 'pdf-merge',
  file_count: 3,
  file_size: '2.5MB'
});

// Track when user downloads result
track('conversion', {
  tool: 'pdf-merge',
  output_format: 'pdf'
});

// Track errors
track('tool_error', {
  tool: 'pdf-merge',
  error: 'file_too_large'
});
```

### Implementation Example

Add tracking to tool components:

```tsx
// apps/web/src/components/tools/PdfMerge.tsx
import { track } from '@vercel/analytics';

const handleMerge = async () => {
  try {
    // ... merge logic ...

    // Track successful usage
    track('tool_used', {
      tool: 'pdf-merge',
      file_count: files.length
    });

  } catch (err) {
    // Track errors
    track('tool_error', {
      tool: 'pdf-merge',
      error: err.message
    });
  }
};

const handleDownload = () => {
  // Track conversion
  track('conversion', {
    tool: 'pdf-merge'
  });

  // ... download logic ...
};
```

## Adding Tracking to New Tools

### Step 1: Layout Already Configured

All pages inherit analytics from `Layout.astro`. New tools automatically get page view tracking.

### Step 2: Add Custom Events (Optional)

For tools that process files:

```tsx
import { track } from '@vercel/analytics';

// In your tool component
const YourTool = () => {
  const handleProcess = async () => {
    try {
      // ... processing logic ...

      track('tool_used', { tool: 'your-tool-id' });
    } catch (err) {
      track('tool_error', {
        tool: 'your-tool-id',
        error: sanitizeError(err)
      });
    }
  };

  const handleDownload = () => {
    track('conversion', { tool: 'your-tool-id' });
    // ... download logic ...
  };

  return (
    // ... component JSX ...
  );
};
```

### Step 3: Test in Development

Custom events appear in Vercel Dashboard within 24 hours. Use Vercel Analytics debug mode for instant verification:

```bash
# Add to .env.local
VERCEL_ANALYTICS_DEBUG=1
```

## Alternative: Plausible Analytics Setup

If switching to Plausible for open-source analytics:

### Cloud Option (Recommended for Simplicity)

1. **Sign up:** https://plausible.io (€9/month for 10k pageviews)
2. **Add script to Layout.astro:**

```astro
---
// apps/web/src/layouts/Layout.astro
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- ... -->
    <script defer data-domain="newlifesolutions.dev" src="https://plausible.io/js/script.js"></script>
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

3. **Custom Events:**

```typescript
// Track custom events
window.plausible('Tool Used', { props: { tool: 'pdf-merge' } });
window.plausible('Conversion', { props: { tool: 'pdf-merge' } });
```

### Self-Hosted Option (Free, Requires VPS)

1. **Deploy Plausible:** https://plausible.io/docs/self-hosting
2. **Requirements:** Docker, 2GB RAM VPS (DigitalOcean, Hetzner)
3. **Cost:** ~$5-10/month for hosting
4. **Implementation:** Same as cloud option, but point to your domain

```html
<script defer data-domain="newlifesolutions.dev" src="https://analytics.yourdomain.com/js/script.js"></script>
```

## Privacy & Compliance

### Current Setup (Vercel Analytics)

- **GDPR Compliant:** No cookies, no personal data stored
- **CCPA Compliant:** No data selling
- **No Consent Banner Required:** Privacy-first by design
- **IP Anonymization:** Automatic
- **Data Retention:** 90 days (default)

### Best Practices

1. **No PII in Events:** Never track emails, names, or sensitive data
2. **Anonymize Errors:** Use `createSafeErrorMessage()` from `lib/security.ts`
3. **File Data:** Track counts/sizes, not content or filenames
4. **Transparency:** Privacy policy at https://www.newlifesolutions.dev/privacy

## Dashboard Access

### Vercel Analytics

**URL:** https://vercel.com/dashboard → Select Project → Analytics

**Permissions:**
- Project Owner: Full access
- Team Members: Read-only (configurable)

**Export Data:**
- Click "Export" button in Vercel Dashboard
- Downloads CSV with all metrics

### Plausible (If Migrating)

**URL:** https://plausible.io/newlifesolutions.dev

**Sharing:**
- Generate shareable link (public or password-protected)
- No login required for viewers

## Monitoring Popular Tools

### Top 10 Tools (Expected)

Based on page view data, focus improvements on:

1. PDF Merge
2. PDF Compress
3. Image Compress
4. Background Remover
5. QR Generator
6. Password Generator
7. PDF to Word
8. Resume Builder
9. Audio Transcription
10. Markdown Editor

**Action:** Review analytics monthly to identify trends and optimize underperforming tools.

## Traffic Source Analysis

### Channels to Monitor

| Source | Tracking Method |
|--------|-----------------|
| Google Search | Organic traffic in Vercel Analytics |
| Direct | Direct URL entry |
| Social Media | Referrer links (Twitter, Reddit, etc.) |
| GitHub | Referrer from repository |

### UTM Tracking (Optional)

For campaigns, use UTM parameters:

```
https://www.newlifesolutions.dev/tools/pdf-merge?utm_source=twitter&utm_medium=social&utm_campaign=launch
```

Vercel Analytics automatically parses UTM parameters.

## Conversion Funnel

Track user journey with custom events:

1. **Page View** (automatic) → User lands on tool
2. **File Upload** → `track('file_selected', { tool: 'pdf-merge' })`
3. **Processing** → `track('tool_used', { tool: 'pdf-merge' })`
4. **Download** → `track('conversion', { tool: 'pdf-merge' })`

**Conversion Rate Formula:**
```
Conversion Rate = (Downloads / Page Views) × 100
```

## Performance Monitoring

Vercel Analytics tracks Core Web Vitals automatically:

- **LCP (Largest Contentful Paint):** Target <2.5s
- **FID (First Input Delay):** Target <100ms
- **CLS (Cumulative Layout Shift):** Target <0.1

**Slow Tools Alert:** If any tool page has LCP >3s, investigate:
- Heavy library loading (FFmpeg, Whisper, Background Removal)
- Missing dynamic imports
- Unoptimized images

## Troubleshooting

### Analytics Not Showing

1. **Check Vercel Deployment:** Ensure `@vercel/analytics` is in `package.json`
2. **Verify Production:** Analytics only track in production (not localhost)
3. **Ad Blockers:** Some users may block Vercel scripts (expected <5% loss)

### Custom Events Not Appearing

1. **Debug Mode:** Enable `VERCEL_ANALYTICS_DEBUG=1`
2. **Check Console:** Events should log in browser DevTools
3. **Wait 24 Hours:** Custom events have a delay before appearing in dashboard

## Future Enhancements

### Planned Analytics Features

- [ ] A/B testing for tool layouts
- [ ] Heatmaps for tool interaction zones
- [ ] User session recordings (privacy-safe)
- [ ] Error rate dashboard
- [ ] Weekly analytics email digest

### Advanced Tracking Ideas

```typescript
// Track tool performance
track('tool_performance', {
  tool: 'pdf-merge',
  processing_time: 2500, // milliseconds
  file_count: 3,
  total_size: 5000000 // bytes
});

// Track browser compatibility issues
track('browser_feature_missing', {
  tool: 'background-remover',
  feature: 'WebGPU',
  browser: navigator.userAgent
});

// Track user preferences
track('setting_changed', {
  tool: 'image-compress',
  setting: 'quality',
  value: '90'
});
```

---

## Quick Reference

| Task | Command/URL |
|------|-------------|
| View Dashboard | https://vercel.com/dashboard → Analytics |
| Add Custom Event | `track('event_name', { prop: 'value' })` |
| Export Data | Vercel Dashboard → Export CSV |
| Debug Events | Set `VERCEL_ANALYTICS_DEBUG=1` in .env.local |
| Check Privacy Compliance | No cookies = GDPR/CCPA compliant ✓ |

---

**Last Updated:** December 2025
**Maintained By:** New Life Solutions Team
