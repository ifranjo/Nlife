# ComparisonTable Component - Usage Guide

## Overview

The `ComparisonTable.astro` component creates semantic "Us vs Them" comparison tables optimized for GEO (Generative Engine Optimization). Research shows **32% of AI citations come from comparison tables**.

## Basic Usage

```astro
---
import ComparisonTable from '../../components/seo/ComparisonTable.astro';
---

<ComparisonTable
  toolName="PDF Merge"
  competitors={[
    {
      name: "SmallPDF",
      features: {
        price: "$12/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "2 files/hour",
        watermarks: "Yes",
        worksOffline: "No"
      }
    },
    {
      name: "iLovePDF",
      features: {
        price: "$7/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "10 files/day",
        watermarks: "Yes",
        worksOffline: "No"
      }
    }
  ]}
  ourFeatures={{
    price: "Free forever",
    privacy: "100% local",
    accountRequired: "No",
    usageLimits: "Unlimited",
    watermarks: "None",
    worksOffline: "Yes"
  }}
/>
```

## Standard Features

The component includes 6 standard features that work well for most browser-based tools:

| Feature Key | Label | Good Values | Bad Values |
|-------------|-------|-------------|------------|
| `price` | Price | "Free", "Free forever", "$0" | "$X/month", "Paid" |
| `privacy` | Privacy | "100% local", "Browser-based" | "Cloud upload", "Server processing" |
| `accountRequired` | Account Required | "No", "false" | "Yes", "true" |
| `usageLimits` | Usage Limits | "Unlimited", "None" | "X files/day", "X MB/month" |
| `watermarks` | Watermarks | "None", "No" | "Yes", "On free tier" |
| `worksOffline` | Works Offline | "Yes", "true" | "No", "false" |

## Custom Features

Add custom features specific to your tool:

```astro
<ComparisonTable
  toolName="Image Upscaler"
  competitors={[...]}
  ourFeatures={{
    price: "Free forever",
    privacy: "100% local",
    accountRequired: "No",
    usageLimits: "Unlimited",
    watermarks: "None",
    worksOffline: "Yes",
    maxResolution: "8K (7680x4320)",
    aiModel: "Real-ESRGAN"
  }}
  customFeatures={[
    { key: 'maxResolution', label: 'Max Resolution' },
    { key: 'aiModel', label: 'AI Model' }
  ]}
/>
```

## Real-World Examples

### PDF Merge

```astro
<ComparisonTable
  toolName="PDF Merge"
  competitors={[
    {
      name: "Adobe Acrobat",
      features: {
        price: "$19.99/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "Unlimited",
        watermarks: "None",
        worksOffline: "No"
      }
    },
    {
      name: "SmallPDF",
      features: {
        price: "$12/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "2 files/hour (free)",
        watermarks: "Yes (free tier)",
        worksOffline: "No"
      }
    },
    {
      name: "iLovePDF",
      features: {
        price: "$7/month",
        privacy: "Cloud upload",
        accountRequired: "Optional",
        usageLimits: "10 files/day (free)",
        watermarks: "None",
        worksOffline: "No"
      }
    }
  ]}
  ourFeatures={{
    price: "Free forever",
    privacy: "100% local",
    accountRequired: "No",
    usageLimits: "Unlimited",
    watermarks: "None",
    worksOffline: "Yes"
  }}
/>
```

### Background Remover

```astro
<ComparisonTable
  toolName="Background Remover"
  competitors={[
    {
      name: "Remove.bg",
      features: {
        price: "$9.99/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "50 images/month (free)",
        watermarks: "None",
        worksOffline: "No",
        processingTime: "5-10 seconds",
        quality: "Standard"
      }
    },
    {
      name: "Photoshop",
      features: {
        price: "$54.99/month",
        privacy: "Local",
        accountRequired: "Yes",
        usageLimits: "Unlimited",
        watermarks: "None",
        worksOffline: "Yes",
        processingTime: "Manual",
        quality: "Professional"
      }
    }
  ]}
  ourFeatures={{
    price: "Free forever",
    privacy: "100% local",
    accountRequired: "No",
    usageLimits: "Unlimited",
    watermarks: "None",
    worksOffline: "Yes",
    processingTime: "10-15 seconds",
    quality: "AI-powered"
  }}
  customFeatures={[
    { key: 'processingTime', label: 'Processing Time' },
    { key: 'quality', label: 'Quality' }
  ]}
/>
```

### Video to GIF

```astro
<ComparisonTable
  toolName="Video to GIF"
  competitors={[
    {
      name: "Giphy",
      features: {
        price: "Free",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "Unlimited",
        watermarks: "Giphy watermark",
        worksOffline: "No",
        maxDuration: "60 seconds",
        maxSize: "100 MB"
      }
    },
    {
      name: "EZGIF",
      features: {
        price: "Free",
        privacy: "Cloud upload",
        accountRequired: "No",
        usageLimits: "100 MB/file",
        watermarks: "None",
        worksOffline: "No",
        maxDuration: "Unlimited",
        maxSize: "100 MB"
      }
    }
  ]}
  ourFeatures={{
    price: "Free forever",
    privacy: "100% local",
    accountRequired: "No",
    usageLimits: "Unlimited",
    watermarks: "None",
    worksOffline: "Yes",
    maxDuration: "Unlimited",
    maxSize: "500 MB"
  }}
  customFeatures={[
    { key: 'maxDuration', label: 'Max Duration' },
    { key: 'maxSize', label: 'Max File Size' }
  ]}
/>
```

## Where to Place in Tool Pages

Place the comparison table **after the main tool interface** but **before the FAQ section**:

```astro
---
import Layout from '../../layouts/Layout.astro';
import AnswerBox from '../../components/seo/AnswerBox.astro';
import PdfMerge from '../../components/tools/PdfMerge';
import QASections from '../../components/seo/QASections.astro';
import ComparisonTable from '../../components/seo/ComparisonTable.astro';
import SchemaMarkup from '../../components/seo/SchemaMarkup.astro';
---

<Layout title="PDF Merge - Free Online PDF Merger">
  <AnswerBox
    title="Merge PDF Files Online — Free, Private, No Upload"
    tldr="..."
    toolName="PDF Merge"
    queryTarget="How to Merge PDF Files Online Free"
  />

  <!-- Main tool interface -->
  <PdfMerge client:load />

  <!-- Comparison table (NEW) -->
  <ComparisonTable
    toolName="PDF Merge"
    competitors={[...]}
    ourFeatures={{...}}
  />

  <!-- FAQ and Q&A -->
  <QASections
    toolName="PDF Merge"
    faqs={[...]}
  />

  <SchemaMarkup
    toolName="PDF Merge"
    description="..."
    category="PDF"
  />
</Layout>
```

## Visual Indicators

The component automatically applies visual indicators:

- **Green checkmark (✓)**: Advantages (Free, Local, Unlimited, etc.)
- **Red X (✗)**: Disadvantages (Paid, Cloud upload, Limited, etc.)
- **Highlighted column**: "Our" column has green accent border and background
- **Bold text**: Our advantages are highlighted with bold, green text

## Accessibility Features

- Proper `<th scope="col">` and `<th scope="row">` for screen readers
- ARIA labels on table and sections
- Semantic HTML structure
- Icons include `aria-hidden="true"`
- Keyboard navigable

## SEO Features

- Schema.org `Table` structured data
- AI citation hints (`data-ai-citation="true"`)
- Semantic markup for machine readability
- Date-stamped for freshness signals
- Print-optimized styles

## Tips for Maximum GEO Impact

1. **Be honest**: Don't fabricate competitor features
2. **Update regularly**: Keep pricing and features current
3. **Choose 2-3 competitors**: Too many dilutes impact
4. **Highlight real advantages**: Focus on genuine differentiators
5. **Use consistent formatting**: Helps AI extraction
6. **Include context**: The intro paragraph explains WHY you're better

## Testing

After adding the comparison table, verify:

1. Table renders correctly on mobile (horizontal scroll)
2. Visual indicators are clear (checkmarks vs X marks)
3. "Our" column stands out with green accent
4. Schema.org JSON-LD is valid (view source)
5. Responsive behavior on tablet/phone

## Browser Compatibility

- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile Safari and Chrome
- Degrades gracefully without CSS
- Print-friendly styles included
