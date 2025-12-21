# Deployment Guide

## Quick Start

```bash
# Push to main → auto-deploys to Vercel
git push origin main
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   git push main                                                 │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   GitHub    │───▶│   Vercel    │───▶│  CDN Edge   │        │
│   │   Actions   │    │   Build     │    │  (Global)   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│        │                   │                   │                │
│        ▼                   ▼                   ▼                │
│   Type Check +        Astro SSG         Users worldwide        │
│   Security Audit      + Deploy                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Environments

| Branch | Environment | URL |
|--------|-------------|-----|
| `main` | Production | your-domain.com |
| `staging` | Staging | staging-*.vercel.app |
| PR branches | Preview | pr-*.vercel.app |

## Rollback

If something breaks after deploy:

1. Go to **Vercel Dashboard** → **Deployments**
2. Find last working deployment
3. Click **"..."** → **"Promote to Production"**
4. Done. Takes ~30 seconds.

## Environment Variables

Set in **Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `PUBLIC_SITE_URL` | Production URL | Yes |
| `PUBLIC_VERSION` | App version | No |
| `PUBLIC_GA_ID` | Google Analytics | No |

## Pre-Deploy Checklist

```bash
# Run these before pushing to main
npm run check        # TypeScript validation
npm run build        # Test production build
npm run preview      # Preview locally
```

- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] Preview deployment tested (PR preview URL)
- [ ] No console errors
- [ ] Core tools work (PDF merge, etc.)

## Post-Deploy Verification

After deploy completes:

- [ ] Production URL loads: `https://your-domain.com`
- [ ] Health endpoint responds: `https://your-domain.com/health.json`
- [ ] Security headers: https://securityheaders.com/?q=your-domain.com → A/A+
- [ ] Test PDF merge tool end-to-end
- [ ] Check browser console for errors

## CI/CD Pipeline

GitHub Actions runs on every push/PR:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  BUILD   │     │ SECURITY │     │  DEPLOY  │
│          │     │  AUDIT   │     │          │
│ - check  │     │ - npm    │     │ - Vercel │
│ - build  │     │   audit  │     │   prod   │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┴────────────────┘
                      │
              Both must pass
              before deploy
```

## Monitoring

### Free Tier Setup

1. **UptimeRobot** (uptimerobot.com)
   - Add monitor: `https://your-domain.com/health.json`
   - Check interval: 5 minutes
   - Alert via email

2. **Vercel Analytics** (built-in)
   - Enable in Vercel Dashboard → Analytics

### Health Endpoint

```bash
curl https://your-domain.com/health.json
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

## Troubleshooting

### Build Fails

```bash
# Check locally first
cd apps/web
npm ci
npm run check
npm run build
```

### Deploy Succeeds but Site Broken

1. Check Vercel Function Logs
2. Check browser Network tab
3. Verify environment variables are set
4. Rollback to previous deployment

### Security Audit Blocks Deploy

```bash
# Check what's vulnerable
cd apps/web
npm audit

# Fix if possible
npm audit fix

# If can't fix, document and proceed
# (update CI to allow specific vulnerabilities)
```

## Secrets Management

**Never commit:**
- `.env` files (except `.env.example`)
- API keys
- Credentials

**Store in:**
- Vercel Environment Variables (production)
- `.env.local` (local development, gitignored)
