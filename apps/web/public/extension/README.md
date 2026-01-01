# New Life Tools - Chrome Extension

Quick access to 40+ free browser-based tools for PDFs, images, and AI processing.

## Features

- **Quick Access Popup**: Access 6 most popular tools instantly
- **Recently Used Tracking**: Your last 3 used tools appear at the top
- **PDF Detection**: Floating button appears when viewing PDF files
- **Context Menus**: Right-click on PDFs or images for quick tool access
- **100% Private**: All tools process files in your browser - nothing is uploaded

## Installation

### From Chrome Web Store (Recommended)
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Download or clone this extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension` folder
6. The extension icon will appear in your toolbar

## Files Structure

```
extension/
├── manifest.json      # Extension configuration (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles (dark theme)
├── popup.js           # Popup logic & recent tools
├── content.js         # PDF page detection script
├── content.css        # Floating button styles
├── background.js      # Service worker
├── icons/             # Extension icons
│   ├── icon-16.svg
│   ├── icon-48.svg
│   └── icon-128.svg
└── README.md          # This file
```

## Generating PNG Icons

The extension uses SVG icons which need to be converted to PNG for Chrome. You can:

1. **Use an online converter**: Upload SVGs to a tool like CloudConvert
2. **Use ImageMagick**:
   ```bash
   convert icon-16.svg icon-16.png
   convert icon-48.svg icon-48.png
   convert icon-128.svg icon-128.png
   ```
3. **Use the site's existing PWA icons**: Copy from `/public/icons/`:
   - `icon-192x192.png` -> Resize to 128x128
   - Or create new icons with the same gradient style

## Permissions Used

- `activeTab`: Access current tab for PDF detection
- `storage`: Save recently used tools locally

## Context Menu Actions

When you right-click on:
- **PDF links**: "Merge with PDF Merge Tool", "Compress with PDF Compress Tool"
- **Images**: "Convert with Image Converter", "Compress with Image Compressor", "Remove Background"

## Development

### Testing Changes

1. Make changes to files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Close and reopen popup to see changes

### Building for Production

1. Ensure all icons are PNG format
2. Remove `README.md` from the final package
3. Zip the folder contents (not the folder itself)
4. Upload to Chrome Web Store Developer Dashboard

## Privacy

This extension:
- Does NOT collect any user data
- Does NOT track usage
- Does NOT make network requests (except when clicking tool links)
- Stores only a list of 3 recent tool IDs locally

## Support

- Website: https://www.newlifesolutions.dev
- Issues: Report on GitHub

## License

MIT License - Feel free to modify and distribute.
