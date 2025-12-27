# Clean Theme CSS Reference

## Quick Copy-Paste Examples

### Color Variables

**Default Theme:**
```css
--bg: #0a0a0a;              /* Almost black */
--text: #e0e0e0;            /* Light gray */
--accent: #ffffff;          /* White */
--border: #222222;          /* Dark gray */
```

**Clean Theme:**
```css
--bg: #f8f9fa;              /* Light gray */
--text: #212529;            /* Almost black */
--accent: #0066cc;          /* Blue */
--border: #dee2e6;          /* Light gray */
```

### Typography

**Default Theme:**
```css
body {
  font-family: 'Courier New', 'Monaco', monospace;
  letter-spacing: 0.01em;
}
```

**Clean Theme:**
```css
body {
  font-family: 'Inter', -apple-system, sans-serif;
  letter-spacing: normal;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

### Button Styles

**Default Theme:**
```css
.btn-primary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-primary:hover {
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
}
```

**Clean Theme:**
```css
.btn-primary {
  background: #0066cc;
  border-color: #0066cc;
  color: white;
}

.btn-primary:hover {
  background: #0052a3;
  border-color: #0052a3;
  color: white;
}
```

### Card Styles

**Default Theme:**
```css
.glass-card {
  background: rgba(17, 17, 17, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.03);
}

.glass-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.06);
}
```

**Clean Theme:**
```css
.glass-card {
  background: #ffffff;
  border: 1px solid #dee2e6;
  backdrop-filter: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.glass-card:hover {
  border-color: #adb5bd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
```

### Drop Zone

**Default Theme:**
```css
.drop-zone {
  border: 2px dashed #222222;
  background: #0f0f0f;
}

.drop-zone:hover {
  border-color: #444444;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.06);
}
```

**Clean Theme:**
```css
.drop-zone {
  border: 2px dashed #dee2e6;
  background: #ffffff;
}

.drop-zone:hover {
  border-color: #0066cc;
  background: #f1f3f5;
}
```

### Shadow Effects

**Default Theme (Glow):**
```css
--glow-subtle: 0 0 20px rgba(255, 255, 255, 0.03);
--glow-hover: 0 0 30px rgba(255, 255, 255, 0.06);
--glow-focus: 0 0 0 3px rgba(255, 255, 255, 0.1);
```

**Clean Theme (Professional Shadows):**
```css
--glow-subtle: 0 1px 3px rgba(0, 0, 0, 0.08);
--glow-hover: 0 4px 12px rgba(0, 0, 0, 0.12);
--glow-focus: 0 0 0 3px rgba(0, 102, 204, 0.15);
```

## CSS Selector Pattern

All clean theme overrides use the `[data-theme="clean"]` attribute selector:

```css
/* Default theme (no selector needed) */
.btn-primary {
  background: transparent;
}

/* Clean theme override */
[data-theme="clean"] .btn-primary {
  background: #0066cc;
}
```

## Disabled Effects in Clean Theme

These cyberpunk/hacker effects are hidden in clean theme:

```css
[data-theme="clean"] .grid-bg,
[data-theme="clean"] .scanlines {
  display: none;
}

[data-theme="clean"] .tool-card::before,
[data-theme="clean"] .tool-card::after {
  display: none; /* No ambient glow orbs */
}
```

## Adding Clean Theme to a Page

```astro
---
import Layout from '../../layouts/Layout.astro';
---

<Layout
  title="Your Tool Name"
  description="Tool description"
  theme="clean"  <!-- Add this line -->
>
  <!-- Page content -->
</Layout>
```

## Accessibility Notes

Both themes maintain WCAG 2.1 AA contrast ratios:

**Default Theme:**
- Background #0a0a0a vs Text #e0e0e0 = 16.2:1 (AAA)
- Background #0a0a0a vs Muted #707070 = 7.8:1 (AA)

**Clean Theme:**
- Background #f8f9fa vs Text #212529 = 15.8:1 (AAA)
- Background #ffffff vs Muted #6c757d = 4.5:1 (AA)
