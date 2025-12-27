# Clean Theme Implementation

## Overview

Added a "clean" theme option to the Layout component for a softer, more professional appearance suitable for document tools.

## Changes Made

### 1. Layout.astro (`apps/web/src/layouts/Layout.astro`)

**Added `theme` prop:**
```typescript
interface Props {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
  theme?: 'default' | 'clean'; // NEW
}
```

**Applied theme to HTML element:**
```html
<html lang="en" data-theme={theme}>
```

### 2. Global CSS (`apps/web/src/styles/global.css`)

**Added Clean Theme Variables:**
- Soft warm backgrounds: `#f8f9fa`, `#ffffff`
- Professional text colors: `#212529`, `#495057`, `#6c757d`
- Blue accent color: `#0066cc`
- Subtle borders: `#dee2e6`, `#adb5bd`
- Professional shadows (instead of glow effects)

**Key Clean Theme Overrides:**
- ✅ Hides grid background and scanlines
- ✅ Sans-serif typography (Inter instead of monospace)
- ✅ Clean card styling with subtle shadows
- ✅ Blue primary buttons instead of transparent
- ✅ Professional hover states (no cyberpunk effects)
- ✅ Light color scheme optimized for document work

### 3. Example Usage

**PDF Merge Tool** (`apps/web/src/pages/tools/pdf-merge.astro`):
```astro
<Layout
  title={seoContent.title}
  description={seoContent.description}
  image="/thumbnails/pdf-merge.svg"
  theme="clean"  <!-- NEW -->
>
```

## Theme Comparison

| Feature | Default Theme | Clean Theme |
|---------|---------------|-------------|
| **Background** | Dark (`#0a0a0a`) | Light (`#f8f9fa`) |
| **Typography** | Monospace | Sans-serif (Inter) |
| **Grid Effect** | Visible | Hidden |
| **Scanlines** | Visible | Hidden |
| **Accent Color** | White | Blue (`#0066cc`) |
| **Button Style** | Transparent border | Solid blue fill |
| **Shadows** | Glow effects | Professional box-shadows |
| **Vibe** | Hacker/Cyberpunk | Professional/Corporate |

## Applying the Clean Theme

### For Document Tools (PDF, Resume, etc.)
```astro
<Layout theme="clean">
  <!-- Your content -->
</Layout>
```

### For Utility/Developer Tools (keep default)
```astro
<Layout>
  <!-- Uses default hacker theme -->
</Layout>
```

## Testing

1. **Start dev server:**
   ```bash
   cd C:\Users\Kaos\scripts\Nlife_somo
   npm run dev
   ```

2. **Visit pages:**
   - Clean theme: http://localhost:4321/tools/pdf-merge
   - Default theme: http://localhost:4321/tools/qr-generator (or any non-updated tool)

## Next Steps

Apply `theme="clean"` to all document tools:
- ✅ `pdf-merge.astro` (completed)
- ⬜ `pdf-split.astro`
- ⬜ `pdf-compress.astro`
- ⬜ `pdf-redactor.astro`
- ⬜ `pdf-form-filler.astro`
- ⬜ `pdf-to-word.astro`
- ⬜ `ocr.astro`
- ⬜ `document-scanner.astro`
- ⬜ `resume-builder.astro`

## File Locations

- Layout component: `C:\Users\Kaos\scripts\Nlife_somo\apps\web\src\layouts\Layout.astro`
- Global styles: `C:\Users\Kaos\scripts\Nlife_somo\apps\web\src\styles\global.css`
- Tool pages: `C:\Users\Kaos\scripts\Nlife_somo\apps\web\src\pages\tools\*.astro`
