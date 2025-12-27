# PWA Screenshots

## Required Screenshots

For optimal PWA install experience, provide:

1. **Desktop Screenshot** (1280x720 or larger)
   - Wide form factor
   - Shows the tools hub or a popular tool
   - File: `hub-desktop.png`

2. **Mobile Screenshot** (750x1334 or similar)
   - Narrow form factor
   - Shows the mobile experience
   - File: `hub-mobile.png`

## How to Capture

### Desktop Screenshot
1. Open `/hub` in browser at 1280x720 viewport
2. Take screenshot (excluding browser chrome)
3. Save as `hub-desktop.png`

### Mobile Screenshot
1. Open DevTools responsive mode
2. Set device to iPhone 8 Plus (414x736 @ 3x = 1242x2208)
3. Navigate to `/hub`
4. Take screenshot
5. Resize to 750x1334
6. Save as `hub-mobile.png`

## Automated Capture (Playwright)

```javascript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();

// Desktop
const desktopPage = await context.newPage({ viewport: { width: 1280, height: 720 } });
await desktopPage.goto('http://localhost:4321/hub');
await desktopPage.screenshot({ path: 'public/screenshots/hub-desktop.png' });

// Mobile
const mobilePage = await context.newPage({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2
});
await mobilePage.goto('http://localhost:4321/hub');
await mobilePage.screenshot({ path: 'public/screenshots/hub-mobile.png' });

await browser.close();
```

## Optional But Recommended

Show different tools in action:
- `pdf-merge-desktop.png` - PDF merger interface
- `image-compress-mobile.png` - Image compression on mobile
- `qr-generator.png` - QR code generation

These give users a better preview before installing.
