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
│  │       ├── lib/          ← tools.ts (tool registry)                      │
│  │       └── layouts/      ← Layout.astro                                  │
│  ├── services/             ← Microservices (future, use api-template)      │
│  └── packages/             ← Shared code (config/, types/)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Commands

```bash
# From project root
npm run dev          # Dev server localhost:4321
npm run build        # Production build
npm run check        # TypeScript/Astro validation
npm run preview      # Preview production build

# Installation
npm run install:web  # Install web app deps
```

## Tech Stack

- **Frontend**: Astro 5 + React 19 + Tailwind CSS v4
- **Deploy**: Vercel (auto-deploy on push to main/master)
- **CI/CD**: GitHub Actions (type check + security audit before deploy)

## Adding a New Tool

Tools run entirely in-browser (no server needed). Follow this pattern:

```
1. Register tool in apps/web/src/lib/tools.ts
   ─────────────────────────────────────────
   Add to `tools` array with: id, name, description, icon, category, tier, href, color

2. Create React component in apps/web/src/components/tools/
   ─────────────────────────────────────────────────────────
   Example: YourTool.tsx (see PdfMerge.tsx for pattern)
   - Use client-side libraries (pdf-lib, canvas API, etc.)
   - No server calls for free-tier tools

3. Create page in apps/web/src/pages/tools/
   ─────────────────────────────────────────
   Example: your-tool.astro
   - Import and render your React component with client:load
   - Use Layout.astro wrapper
```

Tool tiers: `free` (browser-only), `pro` (needs backend), `coming` (placeholder)

## Component Patterns

| Type | Location | Framework |
|------|----------|-----------|
| Pages | `pages/*.astro` | Astro |
| Layouts | `layouts/*.astro` | Astro |
| UI components | `components/ui/*.astro` | Astro |
| Interactive tools | `components/tools/*.tsx` | React (client:load) |

React components use dynamic imports for heavy libs: `await import('pdf-lib')`

## Adding Backend Services

```bash
cp -r services/api-template services/api-nuevo
# Edit package.json, uncomment in docker-compose.yml
docker compose up --build
```

## Deploy

- Push to `main`/`master` triggers Vercel auto-deploy
- CI runs type check + security audit (non-blocking)
- Vercel secrets needed: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
