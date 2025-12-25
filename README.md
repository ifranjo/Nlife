# New Life Solutions

Free, private, browser-based tools for documents, images, and more.

**Live site**: https://www.newlifesolutions.dev

## Features

- **24 free tools** - PDF, image, video, audio, and utility tools
- **100% browser-based** - Files never leave your device
- **No signup required** - Use instantly, no account needed
- **Works offline** - After initial load, works without internet

## Tools

| Category | Tools |
|----------|-------|
| Document | PDF Merge, PDF Split, PDF Redactor, PDF Form Filler, OCR Extractor, Document Scanner, PDF to Word, Resume Builder |
| Media | Image Compress, Background Remover, Video to MP3, Video Compressor, Video Trimmer, Vocal Remover, Audio Transcription |
| Utility | QR Generator, Base64, JSON Formatter, Text Case, Word Counter, Lorem Ipsum, Hash Generator, Color Converter |

## Tech Stack

- **Frontend**: Astro 5 + React 19 + Tailwind CSS v4
- **Testing**: Playwright + axe-core
- **Deploy**: Vercel
- **Node**: >=20.0.0

## Development

```bash
# Install dependencies
npm run install:web

# Start dev server (localhost:4321)
npm run dev

# Build for production
npm run build

# Run tests
cd apps/web && npx playwright test
```

## Project Structure

```
NEW_LIFE/
├── apps/web/          # Astro frontend
│   └── src/
│       ├── pages/     # Routes
│       ├── components/
│       │   ├── ui/    # Shared UI components
│       │   ├── tools/ # React tool components
│       │   └── seo/   # SEO components
│       └── lib/       # Utilities (tools.ts, security.ts)
├── docs/              # Documentation
└── packages/          # Shared code
```

## Privacy

All tools process files entirely in your browser using JavaScript. Your files are never uploaded to any server. You can verify this by:

1. Opening browser DevTools (F12)
2. Going to the Network tab
3. Processing a file - no upload requests are made

## License

MIT
