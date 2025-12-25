# Analytics Integration Guide

This guide shows how to integrate Plausible Analytics custom event tracking into NEW_LIFE tools.

## Setup Complete

- ✅ Analytics utility created: `src/lib/analytics.ts`
- ✅ Plausible script updated to `script.tagged-events.js` in Layout.astro
- ✅ TypeScript types defined for all tracking functions

## Quick Start

### 1. Import the analytics functions

```typescript
import {
  trackToolUse,
  trackConversion,
  trackToolError,
  trackPerformance,
  createPerformanceTimer,
  trackWorkflow
} from '../../lib/analytics';
```

### 2. Track tool page views (in .astro pages)

```astro
---
// In tools/pdf-merge.astro
import { trackToolPageView } from '../../lib/analytics';
import { tools } from '../../lib/tools';

const tool = tools.find(t => t.id === 'pdf-merge');
---

<script>
  import { trackToolPageView } from '../../lib/analytics';

  // Track when page loads
  trackToolPageView('pdf-merge', 'document', 'free');
</script>
```

### 3. Track user actions (in React components)

```typescript
// Example: PdfMerge.tsx
import { useState } from 'react';
import {
  trackToolUse,
  trackConversion,
  trackToolError,
  createPerformanceTimer
} from '../../lib/analytics';

export default function PdfMerge() {
  const [files, setFiles] = useState([]);

  const handleFileUpload = async (newFiles: FileList) => {
    // Track file upload
    trackToolUse('pdf-merge', 'file_uploaded', {
      file_count: newFiles.length
    });

    try {
      // Validate and add files...
      setFiles(prev => [...prev, ...validatedFiles]);
    } catch (error) {
      // Track errors
      trackToolError('pdf-merge', 'validation_failed', {
        error_message: error.message
      });
    }
  };

  const handleMergePDFs = async () => {
    // Create performance timer
    const timer = createPerformanceTimer('pdf-merge');
    timer.start();

    try {
      // Process files...
      const pdfBytes = await mergePdfs(files);

      // End timer (automatically tracks performance)
      timer.end({
        file_count: files.length,
        output_size_mb: Math.round(pdfBytes.length / 1024 / 1024 * 10) / 10
      });

      // Track successful processing
      trackToolUse('pdf-merge', 'file_processed', {
        file_count: files.length
      });

      // Track conversion goal
      trackConversion('pdf-merge', 'file_processed', {
        file_count: files.length,
        output_size_mb: Math.round(pdfBytes.length / 1024 / 1024 * 10) / 10
      });

    } catch (error) {
      trackToolError('pdf-merge', 'processing_error', {
        file_count: files.length
      });
    }
  };

  const handleDownload = () => {
    // Track download
    trackConversion('pdf-merge', 'download_completed');
    trackToolUse('pdf-merge', 'file_downloaded');

    // Trigger actual download...
  };

  return (
    // Component JSX...
  );
}
```

## Common Tracking Patterns

### Pattern 1: Simple Action Tracking

```typescript
// Track when user clicks a button
trackToolUse('pdf-merge', 'settings_changed', {
  setting: 'compression_level',
  value: 'high'
});
```

### Pattern 2: Error Tracking

```typescript
try {
  await processFile(file);
} catch (error) {
  trackToolError('video-compressor', 'unsupported_format', {
    format: file.type,
    size_mb: Math.round(file.size / 1024 / 1024)
  });
  setError('Unsupported video format');
}
```

### Pattern 3: Performance Tracking

```typescript
// Option A: Manual timing
const startTime = performance.now();
await heavyProcessing();
const duration = performance.now() - startTime;

trackPerformance('background-remover', duration, {
  image_size_mp: width * height / 1000000
});

// Option B: Using timer helper
const timer = createPerformanceTimer('background-remover');
timer.start();
await heavyProcessing();
timer.end({ image_size_mp: width * height / 1000000 });
```

### Pattern 4: Complete Workflow Tracking

```typescript
// Track entire workflow in one call
trackWorkflow('pdf-merge', {
  files_uploaded: 5,
  processing_duration_ms: 2500,
  output_size_mb: 12.5,
  compression_enabled: true
});

// This automatically tracks:
// - File upload event
// - Processing event with performance
// - Conversion goal
```

### Pattern 5: Engagement Tracking

```typescript
// Track shares
trackEngagement('share_clicked', 'tool_page', {
  tool: 'pdf-merge',
  method: 'twitter'
});

// Track guide views
trackGuideView('merge-pdf-online-free', 'pdf-merge');

// Track use-case views
trackUseCaseView('pdf-merge-invoices', 'pdf-merge');
```

## Integration Checklist for Each Tool

### React Component (.tsx)

- [ ] Import analytics functions
- [ ] Track file upload: `trackToolUse(toolId, 'file_uploaded')`
- [ ] Track processing start/end with performance timer
- [ ] Track successful processing: `trackToolUse(toolId, 'file_processed')`
- [ ] Track conversions: `trackConversion(toolId, 'file_processed')`
- [ ] Track downloads: `trackConversion(toolId, 'download_completed')`
- [ ] Track errors: `trackToolError(toolId, errorType)`
- [ ] Track settings changes if applicable

### Astro Page (.astro)

- [ ] Add page view tracking in `<script>` tag
- [ ] Use tool metadata from `lib/tools.ts` registry

### Example: Complete PDF Merge Integration

```typescript
// components/tools/PdfMerge.tsx
import { useState } from 'react';
import {
  trackToolUse,
  trackConversion,
  trackToolError,
  createPerformanceTimer,
  trackWorkflow
} from '../../lib/analytics';

export default function PdfMerge() {
  const toolId = 'pdf-merge';

  const handleFileUpload = async (newFiles: FileList) => {
    trackToolUse(toolId, 'file_uploaded', {
      file_count: newFiles.length
    });
    // ... rest of upload logic
  };

  const handleMerge = async () => {
    const timer = createPerformanceTimer(toolId);
    timer.start();

    try {
      const pdfBytes = await mergePdfs(files);

      const outputSizeMB = Math.round(pdfBytes.length / 1024 / 1024 * 10) / 10;

      timer.end({
        file_count: files.length,
        output_size_mb: outputSizeMB
      });

      trackConversion(toolId, 'file_processed', {
        file_count: files.length,
        output_size_mb: outputSizeMB
      });

      return pdfBytes;
    } catch (error) {
      trackToolError(toolId, 'merge_failed', {
        file_count: files.length,
        error_type: error.name
      });
      throw error;
    }
  };

  const handleDownload = () => {
    trackConversion(toolId, 'download_completed');
    // ... trigger download
  };

  return (/* JSX */);
}
```

```astro
---
// pages/tools/pdf-merge.astro
import Layout from '../../layouts/Layout.astro';
import { tools } from '../../lib/tools';

const tool = tools.find(t => t.id === 'pdf-merge')!;
---

<Layout title={tool.seo.title} description={tool.seo.metaDescription}>
  <PdfMerge client:load />
</Layout>

<script>
  import { trackToolPageView } from '../../lib/analytics';

  trackToolPageView('pdf-merge', 'document', 'free');
</script>
```

## Event Reference

### Standard Events

| Event Name | Purpose | Example Props |
|------------|---------|---------------|
| `Tool Used` | User interaction with tool | `{ tool, action, file_count }` |
| `Conversion` | Goal completion | `{ tool, type, output_size_mb }` |
| `Tool Page View` | Page load | `{ tool, category, tier }` |
| `Tool Error` | Error occurred | `{ tool, error_type }` |
| `Performance` | Processing metrics | `{ tool, duration_seconds }` |
| `Engagement` | Social/sharing actions | `{ action, context }` |
| `Guide View` | Guide page view | `{ guide, tool }` |
| `Use Case View` | Use case page view | `{ use_case, tool }` |

### Action Types

**ToolAction:**
- `file_uploaded`
- `file_processed`
- `file_downloaded`
- `tool_opened`
- `settings_changed`
- `error_occurred`
- `feature_used`

**ConversionType:**
- `file_processed`
- `download_completed`
- `tool_completed`
- `premium_viewed`
- `share_clicked`

## Viewing Analytics

1. Go to https://plausible.io/newlifesolutions.dev
2. Click "Goal Conversions" in the top menu
3. View custom events:
   - Tool Used (by tool/action)
   - Conversion (by tool/type)
   - Tool Error (by tool/error_type)
   - Performance (by tool)

## Custom Goals Setup in Plausible

Configure these goals in Plausible dashboard (Settings → Goals):

1. **Tool Used** - Event goal (tracks all tool interactions)
2. **Conversion** - Event goal (tracks successful completions)
3. **Tool Error** - Event goal (tracks errors for debugging)
4. **Performance** - Event goal (tracks processing performance)
5. **Engagement** - Event goal (tracks social/sharing)
6. **Guide View** - Event goal (tracks guide engagement)
7. **Use Case View** - Event goal (tracks use-case page views)

## Privacy & GDPR Compliance

All tracking is privacy-focused:

- ✅ No cookies used
- ✅ No personal data collected
- ✅ No cross-site tracking
- ✅ GDPR compliant by default
- ✅ All data anonymized
- ✅ Respects DNT headers

## Debugging

Enable debug logging in development:

```typescript
// analytics.ts already includes dev logging
if (import.meta.env.DEV) {
  console.log('[Analytics] Event tracked:', { eventName, props });
}
```

Check browser console in development to see tracked events before they're sent to Plausible.

## Best Practices

1. **Be Specific**: Use descriptive action names and metadata
2. **Track Errors**: Always track errors with context
3. **Measure Performance**: Track processing times for heavy operations
4. **Batch Related Events**: Use `trackWorkflow()` for complete user journeys
5. **Don't Over-Track**: Focus on meaningful interactions
6. **Test First**: Check dev console before deploying

## Migration Plan

### Phase 1: Core Tools (Priority)
- [ ] PDF Merge
- [ ] PDF Split
- [ ] Image Compress
- [ ] Video Compressor
- [ ] Background Remover

### Phase 2: Media Tools
- [ ] Video to MP3
- [ ] Video Trimmer
- [ ] Remove Vocals
- [ ] Audio Transcription

### Phase 3: Utility Tools
- [ ] QR Generator
- [ ] Hash Generator
- [ ] Base64
- [ ] JSON Formatter
- [ ] All remaining tools

### Phase 4: Pages
- [ ] Guide pages
- [ ] Use-case pages
- [ ] Hub page
- [ ] Homepage

## Support

For questions or issues:
- Check Plausible docs: https://plausible.io/docs/custom-event-goals
- Review `src/lib/analytics.ts` source code
- Test in browser console during development
