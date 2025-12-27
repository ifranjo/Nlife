# PWA Testing Checklist

Use this checklist to verify PWA functionality before deployment.

## Pre-Deployment Testing

### 1. Manifest Validation ✓

- [ ] Open DevTools > Application > Manifest
- [ ] Verify app name: "New Life Solutions - Free Online Tools"
- [ ] Verify short name: "New Life Tools"
- [ ] Verify start URL: `/hub`
- [ ] Verify display mode: `standalone`
- [ ] Check all 8 icon sizes load (72, 96, 128, 144, 152, 192, 384, 512)
- [ ] Verify theme color: `#8b5cf6` (purple)
- [ ] Verify background color: `#0a0a0a` (dark)

**Expected**: No errors or warnings in manifest section.

### 2. Service Worker Registration ✓

- [ ] Open DevTools > Application > Service Workers
- [ ] Verify status: "activated and running"
- [ ] Check scope: `/`
- [ ] Verify update on reload enabled

**Expected**: Service worker shows green "activated" status.

### 3. Cache Storage ✓

- [ ] Open DevTools > Application > Cache Storage
- [ ] Verify `static-v1` cache exists
- [ ] Verify `dynamic-v1` cache exists
- [ ] Check static cache contains:
  - [ ] `/` (homepage)
  - [ ] `/hub` (tools hub)
  - [ ] `/offline` (offline page)

**Expected**: Both caches present with expected resources.

### 4. Offline Functionality ✓

- [ ] Navigate to `/hub` while online
- [ ] Open DevTools > Network tab
- [ ] Set throttle to "Offline"
- [ ] Reload page (Ctrl+R)
- [ ] Verify page loads from cache (no network requests)
- [ ] Check navbar shows "Offline" status
- [ ] Verify cached indicator (📦) appears
- [ ] Click on a tool link
- [ ] Verify tool page loads if cached

**Expected**: All cached pages load instantly when offline.

### 5. Install Prompt ✓

- [ ] Clear site data (DevTools > Application > Clear site data)
- [ ] Reload page
- [ ] Wait 30 seconds
- [ ] Verify install prompt appears (bottom-right corner)
- [ ] Verify prompt shows app icon, name, description
- [ ] Click "Install" button
- [ ] Verify browser shows install dialog
- [ ] Cancel and click "Not now"
- [ ] Verify prompt dismisses and doesn't reappear this session

**Expected**: Install prompt appears after 30s and handles clicks correctly.

### 6. Standalone Mode ✓

- [ ] Install app (from install prompt or browser menu)
- [ ] Verify app opens in new window (no browser UI)
- [ ] Check URL bar is hidden
- [ ] Verify app uses system title bar color
- [ ] Navigate between pages
- [ ] Verify navigation works without browser back button

**Expected**: App looks and feels like native desktop/mobile app.

### 7. Keyboard Navigation ✓

- [ ] Press Tab to navigate
- [ ] Verify skip link appears ("Skip to main content")
- [ ] Press Tab through navbar links
- [ ] Verify focus visible (outline)
- [ ] Press Enter on "Install" button in prompt
- [ ] Verify install dialog opens

**Expected**: All interactive elements accessible via keyboard.

### 8. Screen Reader ✓

- [ ] Turn on screen reader (NVDA/JAWS/VoiceOver)
- [ ] Navigate to site
- [ ] Verify skip link announced
- [ ] Toggle offline mode (Network tab)
- [ ] Verify "You are offline" announcement
- [ ] Toggle back online
- [ ] Verify "You are back online" announcement
- [ ] Navigate to install prompt
- [ ] Verify prompt content announced correctly

**Expected**: All status changes and UI elements announced properly.

## Lighthouse PWA Audit

### Run Lighthouse ✓

- [ ] Open DevTools > Lighthouse tab
- [ ] Select "Progressive Web App" category
- [ ] Click "Generate report"
- [ ] Verify score: **90-100**

### PWA Checklist Items ✓

- [ ] Registers a service worker
- [ ] Responds with 200 when offline
- [ ] Has a web app manifest
- [ ] Has a viewport meta tag
- [ ] Has a theme color meta tag
- [ ] Has an apple-touch-icon
- [ ] Content sized correctly for viewport
- [ ] Page has valid HTTPS (production only)
- [ ] Redirects HTTP to HTTPS (production only)

**Expected**: All checks pass, score 90+.

## Mobile Testing

### Android (Chrome)

- [ ] Open site on Android device
- [ ] Dismiss install banner if shown
- [ ] Wait for custom install prompt
- [ ] Tap "Install"
- [ ] Verify app added to home screen
- [ ] Open app from home screen
- [ ] Verify standalone mode (no browser UI)
- [ ] Test navigation
- [ ] Enable airplane mode
- [ ] Verify offline functionality
- [ ] Long-press app icon
- [ ] Verify shortcuts appear (PDF Merge, Image Compress, QR Generator)

**Expected**: Full PWA experience with shortcuts.

### iOS (Safari)

- [ ] Open site on iOS device
- [ ] Tap Share button (square with arrow)
- [ ] Tap "Add to Home Screen"
- [ ] Verify app icon preview
- [ ] Tap "Add"
- [ ] Open app from home screen
- [ ] Verify standalone mode
- [ ] Test navigation
- [ ] Enable airplane mode
- [ ] Verify offline functionality

**Expected**: Full PWA experience (no shortcuts on iOS).

## Performance Testing

### Initial Load ✓

- [ ] Clear cache
- [ ] Open DevTools > Network tab
- [ ] Navigate to `/hub`
- [ ] Check total transfer size
- [ ] Verify service worker registers

**Expected**: Initial load ~500KB, service worker registers within 1s.

### Cached Load ✓

- [ ] Reload page (Ctrl+R)
- [ ] Check Network tab
- [ ] Verify most resources from service worker
- [ ] Check load time (should be <100ms)

**Expected**: Near-instant load from cache.

### Update Detection ✓

- [ ] Make a change to site code
- [ ] Build: `npm run build`
- [ ] Deploy updated version
- [ ] Reload page
- [ ] Verify "New version available" prompt appears
- [ ] Click "OK" to reload
- [ ] Verify new version loads

**Expected**: Update detected and applied automatically.

## Cross-Browser Testing

### Chrome ✓
- [ ] Install prompt works
- [ ] Offline mode works
- [ ] Shortcuts work

### Edge ✓
- [ ] Install prompt works
- [ ] Offline mode works
- [ ] Shortcuts work

### Safari ✓
- [ ] Manual install works (Add to Home Screen)
- [ ] Offline mode works
- [ ] Standalone mode works

### Firefox ✓
- [ ] Offline mode works
- [ ] No install prompt (expected - Firefox limitation)

## Troubleshooting

### Install Prompt Not Showing

**Possible causes**:
- Not served over HTTPS (use localhost or deploy)
- Service worker not registered
- Manifest invalid
- Already installed
- Prompt dismissed in this session

**Fix**:
1. Check DevTools Console for errors
2. Verify Application > Manifest shows no errors
3. Clear site data and try again
4. Check sessionStorage for `pwa-prompt-dismissed`

### Offline Not Working

**Possible causes**:
- Service worker not activated
- Pages not cached
- Navigation from external link

**Fix**:
1. Check Application > Service Workers shows "activated"
2. Check Application > Cache Storage contains pages
3. Navigate from a cached page (e.g., /hub)
4. Hard reload (Ctrl+Shift+R)

### Icons Not Loading

**Possible causes**:
- Icon files missing
- Incorrect paths in manifest
- File format wrong (must be PNG)

**Fix**:
1. Check `public/icons/` contains all 8 icon sizes
2. Verify paths in manifest match actual files
3. Use PNG format (not SVG in manifest)
4. Rebuild: `npm run build`

## Production Deployment Checklist

### Before Deploy ✓

- [ ] Replace placeholder icons with real brand icons
- [ ] Add screenshots (desktop + mobile)
- [ ] Update manifest name/description if needed
- [ ] Test install flow on mobile device
- [ ] Run Lighthouse audit (score 90+)
- [ ] Verify HTTPS enabled on hosting
- [ ] Test update flow with new version

### After Deploy ✓

- [ ] Visit production URL
- [ ] Verify manifest loads (no 404)
- [ ] Verify service worker registers
- [ ] Test install on real mobile device
- [ ] Monitor analytics for install events
- [ ] Check for service worker errors in console

## Accessibility Verification

### WCAG Compliance ✓

- [ ] Install prompt has proper ARIA labels
- [ ] Status changes announced to screen readers
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Keyboard navigation works completely

### Screen Reader Compatibility ✓

- [ ] NVDA (Windows) - Test install flow
- [ ] JAWS (Windows) - Test install flow
- [ ] VoiceOver (Mac/iOS) - Test install flow
- [ ] TalkBack (Android) - Test install flow

**Expected**: All flows accessible without mouse.

---

**Status Legend**:
- ✓ = Ready to test
- [ ] = Not tested yet
- [x] = Tested and passed
- [!] = Tested with issues (document in comments)

After completing this checklist, your PWA is ready for production! 🚀
