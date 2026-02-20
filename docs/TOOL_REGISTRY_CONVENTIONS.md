# Tool Registry Conventions (Docs-Only)

Source: `CLAUDE.md` and `README.md`.

## Registry role
- `apps/web/src/lib/tools.ts` is the single source of truth for tool metadata.
- Every tool page and SEO component reads from this registry.

## Required parts (high-level)
- Unique tool id and name.
- Category mapping (document, media, utility, etc.).
- SEO metadata and FAQs used by Astro SEO components.

## Page and component pairing
- Each tool has an Astro page in `apps/web/src/pages/tools/`.
- Each tool has a React component in `apps/web/src/components/tools/`.
- Astro page provides the static shell and SEO; React component handles tool logic.

## Security and validation
- File-handling tools must validate files and sanitize filenames.
- Use `lib/security.ts` helpers for size checks, MIME checks, and safe errors.

## Performance pattern
- Large libraries must be dynamically imported (e.g., ffmpeg, whisper, bg removal).
- Avoid static imports of heavy libraries in top-level code.

## Testing expectations
- Add or update Playwright tests under `apps/web/tests/`.
- Use selectors that avoid debug overlay collisions (see `CLAUDE.md`).

## Assets
- Thumbnails live under `apps/web/public/thumbnails/`.
- Keep SVGs optimized and consistent with existing naming.

