# Quick Comparison Table Template

Copy-paste template for adding comparison tables to tool pages.

## Step 1: Import Component

Add to imports section:
```typescript
import ComparisonTable from '../../components/seo/ComparisonTable.astro';
```

## Step 2: Insert in Page

Place AFTER tool component, BEFORE QASections:

```astro
<!-- Tool Component -->
<section class="tool-section" aria-label="[Tool Name] Tool">
  <YourTool client:load />
</section>

<!-- Comparison Table: GEO optimization (32% of AI citations) -->
<ComparisonTable
  toolName="[Tool Name]"
  competitors={[
    {
      name: "[Competitor 1]",
      features: {
        price: "$X/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "X files/day",
        watermarks: "Yes",
        worksOffline: "No"
      }
    },
    {
      name: "[Competitor 2]",
      features: {
        price: "$Y/month",
        privacy: "Cloud upload",
        accountRequired: "Yes",
        usageLimits: "X files/month",
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

<!-- Q&A Sections: Semantic structure for AI -->
<QASections ... />
```

## Common Competitor Patterns

### PDF Tools
```javascript
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
  }
]}
```

### Image Tools
```javascript
competitors={[
  {
    name: "TinyPNG",
    features: {
      price: "$25/year",
      privacy: "Cloud upload",
      accountRequired: "Optional",
      usageLimits: "20 images/month (free)",
      watermarks: "None",
      worksOffline: "No"
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
      worksOffline: "Yes"
    }
  }
]}
```

### Video/Audio Tools
```javascript
competitors={[
  {
    name: "Handbrake",
    features: {
      price: "Free",
      privacy: "Local",
      accountRequired: "No",
      usageLimits: "Unlimited",
      watermarks: "None",
      worksOffline: "Yes"
    }
  },
  {
    name: "CloudConvert",
    features: {
      price: "$9/month",
      privacy: "Cloud upload",
      accountRequired: "Yes",
      usageLimits: "25 files/day (free)",
      watermarks: "None",
      worksOffline: "No"
    }
  }
]}
```

## Feature Value Guidelines

### Price
- ✅ Good: "Free forever", "Free", "$0"
- ❌ Bad: "$X/month", "$X/year", "Paid"

### Privacy
- ✅ Good: "100% local", "Browser-based", "Local"
- ❌ Bad: "Cloud upload", "Server processing"

### Account Required
- ✅ Good: "No", "false"
- ❌ Bad: "Yes", "true"
- ⚠️ Neutral: "Optional"

### Usage Limits
- ✅ Good: "Unlimited", "None"
- ❌ Bad: "X files/day", "X MB/month", "X minutes/month"

### Watermarks
- ✅ Good: "None", "No"
- ❌ Bad: "Yes", "On free tier"

### Works Offline
- ✅ Good: "Yes", "true"
- ❌ Bad: "No", "false"

## Research Checklist

Before adding comparisons:

1. **Find competitors** (Google "[tool type] online free")
2. **Verify pricing** (visit competitor websites, check current pricing)
3. **Check features** (create free account if needed to test limits)
4. **Document accurately** (never fabricate competitor features)
5. **Update date** (component auto-generates current date)

## Testing

After adding comparison:

```bash
# Start dev server
npm run dev

# Visit tool page
# http://localhost:4321/tools/[tool-slug]

# Visual checks:
✓ Green "Us" column stands out
✓ Checkmarks (✓) for advantages
✓ X marks (✗) for disadvantages
✓ Table scrolls horizontally on mobile
✓ All competitor names display correctly
✓ All feature values display correctly

# Technical checks:
✓ View source → JSON-LD schema present
✓ No console errors
✓ Responsive on mobile (resize browser)
✓ Print preview works
```

## Quick Examples

### PDF Split
```astro
<ComparisonTable
  toolName="PDF Split"
  competitors={[
    { name: "Sejda", features: { price: "$7.50/month", privacy: "Cloud upload", accountRequired: "Yes", usageLimits: "3 tasks/hour (free)", watermarks: "None", worksOffline: "No" } },
    { name: "PDFCandy", features: { price: "$6/month", privacy: "Cloud upload", accountRequired: "Optional", usageLimits: "Unlimited", watermarks: "None", worksOffline: "No" } }
  ]}
  ourFeatures={{ price: "Free forever", privacy: "100% local", accountRequired: "No", usageLimits: "Unlimited", watermarks: "None", worksOffline: "Yes" }}
/>
```

### Background Remover
```astro
<ComparisonTable
  toolName="Background Remover"
  competitors={[
    { name: "Remove.bg", features: { price: "$9.99/month", privacy: "Cloud upload", accountRequired: "Yes", usageLimits: "50 images/month (free)", watermarks: "None", worksOffline: "No" } },
    { name: "Canva", features: { price: "$12.99/month", privacy: "Cloud upload", accountRequired: "Yes", usageLimits: "Unlimited (Pro)", watermarks: "None", worksOffline: "No" } }
  ]}
  ourFeatures={{ price: "Free forever", privacy: "100% local", accountRequired: "No", usageLimits: "Unlimited", watermarks: "None", worksOffline: "Yes" }}
/>
```

### QR Generator
```astro
<ComparisonTable
  toolName="QR Generator"
  competitors={[
    { name: "QR Code Monkey", features: { price: "Free", privacy: "Cloud upload", accountRequired: "No", usageLimits: "Unlimited", watermarks: "Optional branding", worksOffline: "No" } },
    { name: "Beaconstac", features: { price: "$5/month", privacy: "Cloud upload", accountRequired: "Yes", usageLimits: "50 QR codes (free)", watermarks: "Yes (free tier)", worksOffline: "No" } }
  ]}
  ourFeatures={{ price: "Free forever", privacy: "100% local", accountRequired: "No", usageLimits: "Unlimited", watermarks: "None", worksOffline: "Yes" }}
/>
```

## Custom Features Example

For tools with unique differentiators:

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

## Maintenance Schedule

Update comparisons every **3 months**:
- January: Review Q4 tools
- April: Review Q1 tools
- July: Review Q2 tools
- October: Review Q3 tools

Check:
- Competitor pricing changes
- New competitors entering market
- Feature updates
- Acquisitions/shutdowns

---

**Remember**: Be honest. Never fabricate competitor features. If uncertain, research or omit the tool from comparison.
