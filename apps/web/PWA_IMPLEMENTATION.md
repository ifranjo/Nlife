# PWA Implementation Guide

## Overview

New Life Solutions is now a fully-featured Progressive Web App (PWA) with:
- **Offline capability** - Works without internet after first visit
- **Installable** - Add to home screen on mobile/desktop
- **Fast loading** - Service worker caching for instant page loads
- **App-like experience** - Standalone mode with custom theme

## What Was Added

### 1. Web App Manifest (`public/manifest.json`)

Defines app metadata and install behavior:
- App name, description, icons
- Theme colors (dark background #0a0a0a, purple accent #8b5cf6)
- Display mode: standalone (full-screen app)
- Start URL: `/hub` (tools hub as home)
- Shortcuts to popular tools (PDF Merge, Image Compress, QR Generator)

### 2. Service Worker (`public/sw.js`)

Handles caching and offline functionality:
- **Static cache** - Homepage, hub, offline page
- **Dynamic cache** - Tool pages cached on first visit
- **Cache-first strategy** - Instant load from cache, update in background
- **Network fallback** - Show offline page when network fails
- **Auto-update** - Checks for updates every hour

### 3. Install Prompt Component (`src/components/ui/InstallPrompt.tsx`)

React component that:
- Listens for `beforeinstallprompt` event
- Shows install prompt after 30 seconds
- Handles user accept/dismiss
- Persists dismiss state in sessionStorage
- Hides when already installed

### 4. Offline Page (`src/pages/offline.astro`)

Fallback page shown when offline:
- Lists offline-capable tools
- Retry connection button
- Auto-redirects when back online
- Live connection status indicator

### 5. Enhanced Navbar

Updated navbar with:
- **Cached indicator** (📦) - Shows when page is cached for offline
- **Status announcements** - Screen reader notifications for online/offline
- **Install prompt integration** - Rendered alongside navbar

### 6. Layout Updates (`src/layouts/Layout.astro`)

Added to `<head>`:
- Manifest link
- Apple PWA meta tags
- Apple touch icons
- Service worker registration script
- Update notification handler

## How It Works

### Installation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. User visits site                                                 │
│     ↓                                                                │
│  2. Service worker registers                                         │
│     ↓                                                                │
│  3. Static assets cached                                             │
│     ↓                                                                │
│  4. Browser fires 'beforeinstallprompt'                              │
│     ↓                                                                │
│  5. After 30s, InstallPrompt component shows                         │
│     ↓                                                                │
│  6. User clicks "Install"                                            │
│     ↓                                                                │
│  7. App installs, opens in standalone mode                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Caching Strategy

**Static Assets** (cached immediately):
- `/` - Homepage
- `/hub` - Tools hub
- `/offline` - Offline fallback

**Dynamic Assets** (cached on first visit):
- `/tools/*` - All tool pages
- CSS, JS, images from Astro build
- Fonts and other static resources

**Cache Priority**:
1. Check cache first
2. If found, return cached version
3. Fetch from network in background
4. Update cache with new version
5. If offline and not cached, show `/offline`

## Testing the PWA

### Local Testing

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open DevTools** (F12) > **Application** tab

3. **Verify manifest**:
   - Click "Manifest" in sidebar
   - Check all icons load (will show favicon.svg until you add real icons)
   - Verify theme colors, start URL, display mode

4. **Verify service worker**:
   - Click "Service Workers" in sidebar
   - Should show "activated and running"
   - Check cache storage for static/dynamic caches

5. **Test offline mode**:
   - In Network tab, change throttle to "Offline"
   - Navigate to `/hub` or any tool page
   - Should still load from cache
   - Navbar shows "Offline" with 📦 cached indicator

6. **Test install prompt**:
   - Wait 30 seconds or trigger manually in console:
     ```javascript
     // Simulate install prompt (for testing)
     window.dispatchEvent(new Event('beforeinstallprompt'));
     ```

### Production Testing

After deploying to Vercel:

1. **Lighthouse PWA Audit**:
   - DevTools > Lighthouse tab
   - Check "Progressive Web App"
   - Click "Generate report"
   - Should score 90-100

2. **Mobile testing**:
   - Open site on mobile device
   - Wait for install prompt or use browser menu "Add to Home Screen"
   - Verify app opens in standalone mode
   - Test offline by enabling airplane mode

## Adding Real Icons

### Option 1: Use PWA Icon Generator (Easiest)

1. Visit [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload a 512x512 source image (PNG)
3. Download generated icon pack
4. Extract all icons to `public/icons/`

### Option 2: Use Included Script

1. Create a 512x512 source icon (PNG)
2. Install sharp: `npm install sharp`
3. Run generator:
   ```bash
   node scripts/generate-pwa-icons.js path/to/source-icon.png
   ```

### Design Guidelines

- **Simple logo** - Recognizable at 72x72
- **High contrast** - Works on light/dark backgrounds
- **Padding** - 10-15% margin from edges
- **Maskable version** - 20% margin for safe zone
- **Color scheme**: Purple gradient (#8b5cf6) on dark background

See `public/icons/GENERATE_ICONS.md` for detailed instructions.

## Adding Screenshots

PWA install prompts look better with screenshots:

1. **Desktop screenshot** (1280x720):
   - Viewport: 1280x720
   - Navigate to `/hub`
   - Save as `public/screenshots/hub-desktop.png`

2. **Mobile screenshot** (750x1334):
   - DevTools responsive mode (iPhone size)
   - Navigate to `/hub`
   - Save as `public/screenshots/hub-mobile.png`

See `public/screenshots/README.md` for automated capture script.

## Customization

### Changing Theme Colors

Edit `public/manifest.json`:
```json
{
  "theme_color": "#8b5cf6",      // Purple (navbar color)
  "background_color": "#0a0a0a"  // Dark (splash screen)
}
```

### Adding Tool Shortcuts

Edit `public/manifest.json` > `shortcuts`:
```json
{
  "shortcuts": [
    {
      "name": "Your Tool",
      "short_name": "Tool",
      "description": "Quick access to your tool",
      "url": "/tools/your-tool",
      "icons": [{"src": "/icons/icon-192x192.png", "sizes": "192x192"}]
    }
  ]
}
```

Users can long-press app icon to access shortcuts.

### Adjusting Cache Strategy

Edit `public/sw.js`:

**Cache more pages on install**:
```javascript
const STATIC_ASSETS = [
  '/',
  '/hub',
  '/offline',
  '/tools/pdf-merge',  // Add more here
  '/tools/image-compress'
];
```

**Change cache expiration**:
```javascript
// In activate event, delete old caches:
cacheNames.filter(name => name.startsWith('v1-'))
```

**Pre-cache all tools** (larger initial download):
```javascript
// Send message from client to cache all tools:
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_URLS',
    urls: ['/tools/pdf-merge', '/tools/image-compress', ...]
  });
}
```

### Disabling Install Prompt

If you want manual install only (via browser menu):

Comment out in `src/components/ui/Navbar.astro`:
```astro
<!-- <InstallPrompt client:load /> -->
```

## Browser Support

| Browser | Install | Offline | Shortcuts |
|---------|---------|---------|-----------|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ❌ |
| Firefox 100+ | ❌ | ✅ | ❌ |
| Opera 76+ | ✅ | ✅ | ✅ |

**Notes**:
- Firefox doesn't support install prompts (manual via menu only)
- Safari doesn't support shortcuts
- All modern browsers support service workers for offline

## Troubleshooting

### Service Worker Not Registering

- Check browser console for errors
- Ensure site is served over HTTPS (or localhost)
- Clear browser cache and hard reload (Ctrl+Shift+R)

### Install Prompt Not Showing

- Must meet PWA criteria (manifest + service worker + HTTPS)
- May not show if already installed
- Some browsers require user engagement (clicks) first
- Check `sessionStorage` - may be dismissed

### Offline Mode Not Working

- Verify service worker is activated (DevTools > Application > Service Workers)
- Check cache storage contains pages (DevTools > Application > Cache Storage)
- Try navigation from a cached page (not external link)

### Icons Not Showing

- Check DevTools > Application > Manifest for errors
- Ensure icon files exist at correct paths
- Clear cache and rebuild: `npm run build`
- Icons must be PNG (not SVG in manifest)

### Update Not Detected

Service worker updates on:
- Page reload (if new version detected)
- Every hour automatically
- Manual: DevTools > Application > Service Workers > "Update"

Force update all users:
1. Change `CACHE_VERSION` in `sw.js` (e.g., `v1` → `v2`)
2. Deploy
3. Old caches auto-deleted on next visit

## Performance Impact

### Initial Load
- +2KB (manifest.json)
- +6KB (sw.js)
- +4KB (InstallPrompt component)
- **Total: ~12KB** (minified + gzipped)

### Subsequent Loads
- **Instant** from cache (0ms network)
- Service worker intercepts requests
- Background update checks

### Storage Usage
- ~5-10MB for typical cached tools
- Automatically managed by browser
- Old caches deleted on activate

## Security Considerations

### Service Worker Scope
- Scoped to `/` (entire site)
- Cannot access cross-origin resources
- Cannot modify cached responses

### Cache Poisoning Prevention
- Only caches same-origin requests
- Validates response status (200 OK)
- HTTPS required in production

### Privacy
- All processing happens client-side
- No server sees user files
- Service worker cannot access camera/microphone
- Respects browser privacy mode

## Next Steps

1. **Generate real icons** - Replace placeholder with brand icons
2. **Add screenshots** - Improve install prompt UX
3. **Test on mobile** - Verify standalone mode works well
4. **Lighthouse audit** - Ensure 90+ PWA score
5. **Analytics** - Track install events with Plausible
6. **Push notifications** - Optional future enhancement (placeholder in sw.js)

## Resources

- [PWA Builder](https://www.pwabuilder.com/) - Test and improve PWA
- [Maskable.app](https://maskable.app/) - Test maskable icons
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Audit tool
- [Service Worker Cookbook](https://serviceworke.rs/) - Caching strategies
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) - Official docs
