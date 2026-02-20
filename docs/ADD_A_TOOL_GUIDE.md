# Add a Tool Guide (Docs-Only)

Source: `CLAUDE.md`.

## Overview
Adding a tool touches three areas: registry, React component, and Astro page.

## Steps
1. Register the tool in `apps/web/src/lib/tools.ts`:
   - id, name, category, SEO metadata, FAQs.
2. Create React component in `apps/web/src/components/tools/YourTool.tsx`:
   - Use `lib/security.ts` for validation and safe errors.
3. Create Astro page in `apps/web/src/pages/tools/your-tool.astro`:
   - Use Layout and SEO components (AnswerBox, QASections, SchemaMarkup).
4. Add a thumbnail SVG in `apps/web/public/thumbnails/`.
5. Add a Playwright test in `apps/web/tests/`.

## Required patterns
- Dynamic imports for heavy libraries.
- Sanitize filenames and error messages.
- Use specific selectors in tests (avoid `h1` collisions).

