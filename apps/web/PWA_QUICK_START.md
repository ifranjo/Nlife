# PWA Quick Start Guide

## 🚀 Getting Started (2 Minutes)

### 1. Test Locally

```bash
# Start dev server
npm run dev

# Open browser
# http://localhost:4321/hub

# Open DevTools (F12) > Application tab
# Verify:
#   ✓ Manifest loads (no errors)
#   ✓ Service worker "activated and running"
#   ✓ Cache storage shows static-v1 and dynamic-v1
```

### 2. Test Offline

```bash
# In DevTools:
# Network tab > Throttle dropdown > "Offline"

# Navigate to /hub or any tool page
# Should load instantly from cache

# Check navbar:
#   ✓ Status shows "Offline" (red dot)
#   ✓ Cached indicator (📦) appears
```

### 3. Test Install Prompt

```bash
# Wait 30 seconds or trigger manually:
# Console: window.dispatchEvent(new Event('beforeinstallprompt'))

# Verify:
#   ✓ Prompt appears bottom-right
#   ✓ "Install" button works
#   ✓ "Not now" dismisses
```

## 📦 Before Production (15 Minutes)

### Required: Generate Icons

**Option A: Online Tool (Easiest)**
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload 512x512 logo PNG
3. Download icon pack
4. Extract to `apps/web/public/icons/`

**Option B: Use Script**
```bash
npm install sharp
node scripts/generate-pwa-icons.js path/to/logo-512.png
```

### Recommended: Add Screenshots

```bash
# Desktop: 1280x720 of /hub
# Save as: public/screenshots/hub-desktop.png

# Mobile: 750x1334 of /hub
# Save as: public/screenshots/hub-mobile.png
```

## ✅ Pre-Deploy Checklist

- [ ] Icons generated (8 sizes: 72-512px)
- [ ] Screenshots added (desktop + mobile)
- [ ] Lighthouse PWA audit score 90+
- [ ] Tested install flow on mobile device
- [ ] Verified offline mode works
- [ ] Service worker no console errors

## 🔧 Common Commands

```bash
# Check type errors
npm run check

# Build for production
npm run build

# Preview production build
npm run preview

# Generate placeholder icons (SVG)
node scripts/generate-placeholder-icons.js

# Generate real icons (PNG, requires sharp)
npm install sharp
node scripts/generate-pwa-icons.js logo.png
```

## 📊 Testing Tools

### DevTools Shortcuts
- **Manifest**: F12 > Application > Manifest
- **Service Worker**: F12 > Application > Service Workers
- **Cache**: F12 > Application > Cache Storage
- **Offline**: F12 > Network > Throttle: Offline

### Lighthouse Audit
```bash
# DevTools > Lighthouse tab
# Check "Progressive Web App"
# Click "Generate report"
# Target: 90-100 score
```

## 🐛 Troubleshooting Quick Fixes

### Install Prompt Not Showing
```bash
# Clear site data
DevTools > Application > Clear site data > Clear

# Check console for errors
# Verify manifest has no errors
# Ensure HTTPS or localhost
```

### Offline Not Working
```bash
# Verify SW status
DevTools > Application > Service Workers
# Should show "activated and running"

# Check cache
DevTools > Application > Cache Storage
# Should show static-v1 and dynamic-v1

# Hard reload
Ctrl+Shift+R
```

### Icons Missing
```bash
# Verify files exist
ls public/icons/
# Should show icon-72x72.png through icon-512x512.png

# Check manifest paths
cat public/manifest.json | grep "src"

# Rebuild
npm run build
```

## 🎨 Customization Quick Reference

### Change Theme Colors
```json
// public/manifest.json
{
  "theme_color": "#8b5cf6",      // Navbar
  "background_color": "#0a0a0a"  // Splash screen
}
```

### Add Tool Shortcut
```json
// public/manifest.json > shortcuts array
{
  "name": "Your Tool",
  "url": "/tools/your-tool",
  "icons": [{"src": "/icons/icon-192x192.png", "sizes": "192x192"}]
}
```

### Pre-cache More Pages
```javascript
// public/sw.js > STATIC_ASSETS array
const STATIC_ASSETS = [
  '/',
  '/hub',
  '/offline',
  '/tools/your-tool'  // Add here
];
```

### Disable Install Prompt
```astro
<!-- src/components/ui/Navbar.astro -->
<!-- Comment out: -->
<!-- <InstallPrompt client:load /> -->
```

## 📱 Mobile Testing

### Android (Chrome)
1. Open site on phone
2. Wait for install banner or use menu
3. Tap "Add to Home Screen"
4. Verify standalone mode
5. Test offline (airplane mode)

### iOS (Safari)
1. Open site on iPhone/iPad
2. Tap Share button
3. Tap "Add to Home Screen"
4. Verify standalone mode
5. Test offline (airplane mode)

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PWA_QUICK_START.md` | This file - quick commands |
| `PWA_SUMMARY.md` | Overview and next steps |
| `PWA_IMPLEMENTATION.md` | Full technical guide |
| `TESTING_CHECKLIST.md` | Complete test procedures |
| `PWA_ARCHITECTURE.txt` | Visual diagrams (ASCII) |

## 🎯 Success Criteria

✅ **Ready for Production** when:
- Lighthouse PWA score: 90+
- All icon sizes generated (PNG)
- Screenshots added (desktop + mobile)
- Tested install on real mobile device
- Offline mode verified working
- No console errors from service worker

## 🆘 Need Help?

1. Check `PWA_IMPLEMENTATION.md` for detailed docs
2. Use `TESTING_CHECKLIST.md` to verify each component
3. See `PWA_ARCHITECTURE.txt` for visual flow diagrams
4. Check browser DevTools console for errors

---

**Estimated Time to Production**: 15 minutes (if icons ready) | 1 hour (if creating icons from scratch)
