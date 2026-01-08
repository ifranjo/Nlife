# Deployment and Analytics Runbook (Docs-Only)

Source: `DEPLOYMENT.md` and `docs/ANALYTICS.md`.

## Deployment flow (Vercel)
- Push to `main` triggers CI and deploy.
- CI runs type checks, build, and security audit.
- Vercel handles preview deployments for PR branches.

## Pre-deploy checklist
- Review for console errors and obvious regressions.
- Run `npm run check`, `npm run build`, and `npm run preview` locally when ready.
- Confirm core tools (PDF merge, image compress, etc.) work end-to-end.

## Rollback steps
1. Open Vercel Dashboard.
2. Find a known-good deployment.
3. Promote it to production.

## Environment variables
- `PUBLIC_SITE_URL` (required)
- `PUBLIC_VERSION` (optional)
- `PUBLIC_GA_ID` (optional)

## Analytics (current)
- Vercel Analytics is integrated in the layout and tracks page views.
- No cookies by default and GDPR/CCPA-friendly.

## Optional custom events
- Track tool usage, conversions, and errors with `@vercel/analytics`.
- Do not include PII; track counts/sizes only.

## Troubleshooting signals
- Build failures: run local check/build and inspect CI logs.
- Missing analytics: analytics only appear in production; allow up to 24 hours.

