# Onboarding Checklist (Docs-Only)

Purpose: orient a new contributor without running commands or changing code.

## 1) Core context
- Read `README.md` for the high-level product, features, and dev commands.
- Read `CLAUDE.md` for architecture, patterns, testing conventions, and design system notes.
- Skim `INTEGRATION_PLAN.md` for current integration priorities (if relevant).

## 2) Project layout
- `apps/web/` is the Astro + React frontend.
- `apps/web/src/pages/tools/*.astro` are tool pages (SEO shell).
- `apps/web/src/components/tools/*.tsx` are interactive tool components.
- `apps/web/src/lib/tools.ts` is the tool registry (source of truth).
- `docs/` contains plans, infrastructure, analytics, and marketing guidance.

## 3) Local setup (no execution)
- Node >= 20 is required.
- Dependency install and dev scripts are documented in `README.md`.
- Tests are Playwright-based and documented in `CLAUDE.md`.

## 4) Development conventions
- Tools should use the security utilities (`lib/security.ts`) for file validation.
- Heavy libraries are dynamically imported to reduce initial load.
- Astro handles static/SEO; React handles interactive tools via `client:load`.

## 5) Release and operations
- CI/CD flow and pre-deploy checks are in `DEPLOYMENT.md`.
- Analytics setup and optional custom events are in `docs/ANALYTICS.md`.

## 6) First tasks (docs-only)
- Review `docs/MARKETING-LAUNCH.md` for launch steps and copy.
- Review `docs/INFRASTRUCTURE.md` for hosting phases and cost projections.

