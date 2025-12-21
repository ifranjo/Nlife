# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Preferences

- Use ASCII diagrams/reports for technical explanations (saves time, enhances clarity)
- Prefer visual 2D representations when explaining architecture, flows, or concepts

## Project Overview

New Life Solutions - Monorepo for browser-based utility tools (PDF, images, AI).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARQUITECTURA MONOREPO                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NEW_LIFE/                                                                  │
│  ├── apps/web/             ← Frontend Astro (main application)             │
│  │   └── src/                                                              │
│  │       ├── pages/        ← Routes: /, /hub, /tools/*                     │
│  │       ├── components/                                                   │
│  │       │   ├── ui/       ← Shared UI (Navbar, Footer, ToolCard, etc.)   │
│  │       │   └── tools/    ← React tool components (PdfMerge.tsx, etc.)   │
│  │       ├── lib/          ← tools.ts (registry), security.ts (validation)│
│  │       └── layouts/      ← Layout.astro                                  │
│  ├── services/             ← Microservices (future, use api-template)      │
│  └── packages/             ← Shared code (config/, types/)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Commands

```bash
# From project root (all commands proxy to apps/web)
npm run dev          # Dev server localhost:4321
npm run build        # Production build
npm run check        # TypeScript/Astro validation
npm run preview      # Preview production build

# Installation
npm run install:web  # Install web app deps

# Testing (from apps/web/)
cd apps/web && npx playwright test              # Run all e2e tests
cd apps/web && npx playwright test --ui         # Interactive test UI
cd apps/web && npx playwright test <file>       # Run specific test file

# Direct Astro commands (from apps/web/)
cd apps/web && npx astro add react  # Add integrations
```

## Tech Stack

- **Frontend**: Astro 5 + React 19 + Tailwind CSS v4
- **Testing**: Playwright + axe-core (accessibility)
- **Deploy**: Vercel (auto-deploy on push to main/master)
- **CI/CD**: GitHub Actions (type check + `npm audit --audit-level=high` before deploy)
- **Node**: >=20.0.0 required

### Key Browser-Side Libraries

| Library | Purpose | Usage |
|---------|---------|-------|
| `pdf-lib` | PDF manipulation | Merge, split, edit PDFs |
| `jszip` | ZIP archive creation | Batch downloads |
| `qrcode` | QR code generation | QR Generator tool |

All processing happens client-side. Dynamic import heavy libs to reduce initial bundle:
```typescript
const { PDFDocument } = await import('pdf-lib');
```

## Adding a New Tool

Tools run entirely in-browser (no server needed). Follow this pattern:

```
1. Register tool in apps/web/src/lib/tools.ts
   ─────────────────────────────────────────
   Add to `tools` array:
   { id, name, description, icon, category, tier, href, color }

   Categories: 'document' | 'media' | 'ai' | 'utility'
   Tiers: 'free' (browser-only) | 'pro' (needs backend) | 'coming' (placeholder)

2. Create React component in apps/web/src/components/tools/
   ─────────────────────────────────────────────────────────
   Example: YourTool.tsx (see PdfMerge.tsx for pattern)

   REQUIRED: Use security utilities from lib/security.ts:
   - validateFile(file, 'pdf'|'image') for file uploads
   - sanitizeFilename() for user-provided filenames
   - createSafeErrorMessage(err) for error display

   Dynamic import heavy libs: const { PDFDocument } = await import('pdf-lib');

3. Create page in apps/web/src/pages/tools/
   ─────────────────────────────────────────
   Example: your-tool.astro

   Structure:
   ---
   import Layout from '../../layouts/Layout.astro';
   import Navbar from '../../components/ui/Navbar.astro';
   import Footer from '../../components/ui/Footer.astro';
   import YourTool from '../../components/tools/YourTool';
   ---
   <Layout title="Tool Name - New Life Solutions">
     <Navbar />
     <main class="pt-20 pb-16 px-6 min-h-screen">
       <!-- Back link to /hub -->
       <!-- Tool header with icon, title, description -->
       <YourTool client:load />
     </main>
     <Footer />
   </Layout>

   IMPORTANT: Use client:load directive for React components
```

## Security Requirements

All tools handling file uploads MUST use `lib/security.ts`:

```typescript
import { validateFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

// Validate files (checks size, MIME, magic bytes)
const result = await validateFile(file, 'pdf');  // or 'image'
if (!result.valid) { setError(result.error); return; }

// Sanitize filenames before display/download
const safeName = sanitizeFilename(file.name);

// Never expose internal errors to users
setError(createSafeErrorMessage(err, 'Failed to process file'));
```

File limits: PDF 50MB, Images 10MB. Magic byte validation prevents type spoofing.

## Component Patterns

| Type | Location | Framework |
|------|----------|-----------|
| Pages | `pages/*.astro` | Astro |
| Layouts | `layouts/*.astro` | Astro |
| UI components | `components/ui/*.astro` | Astro |
| Interactive tools | `components/tools/*.tsx` | React (client:load) |

## Adding Backend Services

```bash
cp -r services/api-template services/api-nuevo
# Edit package.json, uncomment in docker-compose.yml
docker compose up --build
```

## Deploy

- Push to `main`/`master` triggers Vercel auto-deploy
- CI runs: build → type check → security audit → deploy
- Vercel secrets needed: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
