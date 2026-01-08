# Glossary (Docs-Only)

Purpose: quick reference for key project terms and where they live.

## Product and Pages
- Tool page: An Astro page under `apps/web/src/pages/tools/` that renders a tool.
- Tool component: A React component under `apps/web/src/components/tools/` that runs tool logic.
- Tool registry: The metadata source of truth in `apps/web/src/lib/tools.ts`.
- Guide page: An Astro page under `apps/web/src/pages/guides/` for SEO guides.
- Use-case page: An Astro page under `apps/web/src/pages/use-cases/` for landing pages.

## SEO and Content
- AnswerBox: SEO TL;DR component referenced in `CLAUDE.md`.
- QASections: SEO Q&A block referenced in `CLAUDE.md`.
- SchemaMarkup: JSON-LD component referenced in `CLAUDE.md`.

## Security and Validation
- `lib/security.ts`: File validation and safe error helpers used by tools.
- `validateFile`: Helper for size, MIME type, and magic byte checks.
- `sanitizeFilename`: Helper to avoid unsafe filenames.
- `createSafeErrorMessage`: Helper to avoid leaking sensitive details.

## Testing
- Playwright: Test runner used in `apps/web/tests/`.
- axe-core: Accessibility testing used by Playwright.
- Debug overlay: Playwright UI overlay that can duplicate `h1` elements.

## Deployment and Analytics
- Vercel: Hosting platform used for deploys and analytics.
- CI/CD: GitHub Actions pipeline for build, check, and audit.
- Health endpoint: `/health.json` endpoint used for uptime checks.

## Directories
- `docs/`: Documentation and plans.
- `packages/`: Shared code (monorepo).
- `prompts/`: Prompt references.

