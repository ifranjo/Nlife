# PWA Icon Generation Guide

## Required Icons

The PWA manifest requires the following icon sizes:

- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192 (required minimum for PWA)
- 384x384
- 512x512 (required minimum for PWA)

## Quick Generation Options

### Option 1: Using Online Tools (Easiest)

1. Visit [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload a 512x512 source image (PNG or SVG)
3. Download the generated icon set
4. Extract all icons to this directory

### Option 2: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# From a 512x512 source image (icon-source.png)
convert icon-source.png -resize 72x72 icon-72x72.png
convert icon-source.png -resize 96x96 icon-96x96.png
convert icon-source.png -resize 128x128 icon-128x128.png
convert icon-source.png -resize 144x144 icon-144x144.png
convert icon-source.png -resize 152x152 icon-152x152.png
convert icon-source.png -resize 192x192 icon-192x192.png
convert icon-source.png -resize 384x384 icon-384x384.png
convert icon-source.png -resize 512x512 icon-512x512.png
```

### Option 3: Using Sharp (Node.js)

Install sharp: `npm install -g sharp-cli`

```bash
sharp -i icon-source.png -o icon-72x72.png resize 72 72
sharp -i icon-source.png -o icon-96x96.png resize 96 96
sharp -i icon-source.png -o icon-128x128.png resize 128 128
sharp -i icon-source.png -o icon-144x144.png resize 144 144
sharp -i icon-source.png -o icon-152x152.png resize 152 152
sharp -i icon-source.png -o icon-192x192.png resize 192 192
sharp -i icon-source.png -o icon-384x384.png resize 384 384
sharp -i icon-source.png -o icon-512x512.png resize 512 512
```

## Design Guidelines

### Logo Design
- **Simple and recognizable** at small sizes
- **High contrast** against both light and dark backgrounds
- **No text** if possible (icon should work at 72x72)
- **Centered** with appropriate padding (10-15% margin)

### Safe Zone
- Keep critical elements within 80% of icon area
- Account for rounded corners on some platforms

### Maskable Icons
- Icons marked as "maskable" need extra padding (20% margin)
- These adapt to platform-specific shapes (circle, squircle, rounded square)

### Color Scheme
Based on the site theme:
- Primary: Purple/Violet gradient (#8b5cf6)
- Background: Dark (#0a0a0a)
- Accent: White or light gray for contrast

## Example Design

A simple design that would work well:

```
┌────────────────────────────────┐
│                                │
│      ╔═══════════════╗         │
│      ║               ║         │
│      ║       ◈       ║         │
│      ║               ║         │
│      ╚═══════════════╝         │
│                                │
│    GRADIENT BACKGROUND         │
│  (Purple to Dark Purple)       │
│                                │
└────────────────────────────────┘
```

White "◈" symbol centered on a purple gradient background with rounded corners.

## Temporary Placeholder

Until you generate custom icons, the PWA will use the favicon.svg as a fallback. The app will still be installable but icons will look generic.

## Testing Icons

After generating icons:

1. Build the app: `npm run build`
2. Preview locally: `npm run preview`
3. Open DevTools > Application > Manifest
4. Verify all icons load correctly
5. Test install prompt on mobile device

## Maskable Icon Generator

Use [Maskable.app](https://maskable.app/editor) to:
1. Upload your 512x512 icon
2. Preview how it looks in different platform shapes
3. Adjust safe zone padding
4. Export maskable variant
