# New Life Solutions - Infrastructure Plan

## Quick Reference

| Item | Choice | Cost |
|------|--------|------|
| Domain | TBD (.io, .dev, .tools) | ~$12-45/year |
| Frontend | Vercel (Free tier) | $0/month |
| Backend | Railway (when needed) | $5+/month |
| DNS/CDN | Cloudflare (Free) | $0/month |

---

## 1. Domain Options

### Recommended Registrars (Best Price)
1. **Cloudflare Registrar** - At-cost pricing, no markup
2. **Porkbun** - Cheap renewals
3. **Google Domains** - Clean UI, good DNS

### Domain Ideas to Check
| Domain | Est. Price/Year | Notes |
|--------|-----------------|-------|
| newlifesolutions.io | $35-45 | Professional, tech |
| newlifesolutions.dev | $12-15 | Developer-friendly |
| newlife.tools | $30-40 | Descriptive |
| nls.tools | $30-40 | Short |
| newlifesolutions.com | $12 | If available |

### Action
- [ ] Check availability on Cloudflare
- [ ] Register chosen domain
- [ ] Point DNS to Vercel

---

## 2. Hosting Architecture

### Phase 1: MVP (Current)
```
User → Cloudflare DNS → Vercel CDN → Static Site
                                    ↓
                              (All tools run in browser)
```

**Cost: $0/month**

Everything runs client-side:
- PDF Merge: pdf-lib in browser
- Image Compress: browser canvas API
- No server needed

### Phase 2: With Backend
```
User → Cloudflare → Vercel (Frontend)
                  → Railway (API)
                        ↓
                   FastAPI backends
                   - /api/translate (DeepL)
                   - /api/heygen (HeyGen)
```

**Cost: ~$5-15/month**

### Phase 3: Scale
```
User → Cloudflare (CDN + WAF)
     → Vercel Pro (Frontend)
     → Railway/Fly.io (Multiple APIs)
     → Stripe (Payments)
     → Postgres (User data)
```

**Cost: ~$20-50/month**

---

## 3. Service Breakdown

### Frontend: Vercel

| Tier | Bandwidth | Builds | Price |
|------|-----------|--------|-------|
| Hobby | 100GB/mo | Unlimited | Free |
| Pro | 1TB/mo | Unlimited | $20/mo |
| Enterprise | Custom | Custom | Custom |

**Why Vercel:**
- Zero config for Astro
- Automatic HTTPS
- Global CDN (fast everywhere)
- Preview deployments per PR
- Free tier is generous

### Backend: Railway

| Tier | Included | Price |
|------|----------|-------|
| Trial | $5 credit | Free |
| Hobby | $5/mo credit | $5/mo |
| Pro | $20/mo credit | $20/mo |

**Pricing Model:**
- CPU: $0.000463/min
- Memory: $0.000231/GB/min
- Egress: $0.10/GB

**Typical API costs:**
- Light usage: $2-5/mo
- Medium: $5-15/mo
- Heavy: $15-50/mo

### Alternative: Render

| Tier | Hours/mo | Price |
|------|----------|-------|
| Free | 750 (spins down) | Free |
| Starter | Always on | $7/mo |

### Alternative: Fly.io

| Tier | Included | Price |
|------|----------|-------|
| Free | 3 shared VMs | Free |
| Pay as go | Per usage | ~$2-5/mo |

### Alternative: Hetzner VPS (Self-managed)

| Tier | Specs | Price |
|------|-------|-------|
| CX11 | 1 vCPU, 2GB RAM, 20GB | €3.29/mo |
| CX21 | 2 vCPU, 4GB RAM, 40GB | €5.39/mo |
| CX31 | 2 vCPU, 8GB RAM, 80GB | €8.69/mo |

**Pros:** Cheapest, full control
**Cons:** You manage everything

---

## 4. Cost Projection

### Year 1 (Bootstrap)
| Item | Monthly | Annual |
|------|---------|--------|
| Domain (.dev) | - | $15 |
| Vercel Free | $0 | $0 |
| Cloudflare Free | $0 | $0 |
| **Total** | **$0** | **$15** |

### Year 1 (With Backend)
| Item | Monthly | Annual |
|------|---------|--------|
| Domain | - | $15 |
| Vercel Free | $0 | $0 |
| Railway Hobby | $5 | $60 |
| Cloudflare Free | $0 | $0 |
| **Total** | **$5** | **$75** |

### Year 2+ (Growth)
| Item | Monthly | Annual |
|------|---------|--------|
| Domain | - | $15 |
| Vercel Pro | $20 | $240 |
| Railway Pro | $20 | $240 |
| Cloudflare Pro | $20 | $240 |
| **Total** | **$60** | **$735** |

---

## 5. Scaling Strategy

### Traffic Thresholds

| Users/month | Action needed |
|-------------|---------------|
| 0-5,000 | Stay on free tiers |
| 5,000-20,000 | Consider Vercel Pro |
| 20,000-50,000 | Add caching, optimize |
| 50,000+ | Evaluate dedicated infra |

### When to Add Backend
- AI features (translation, HeyGen)
- User accounts / auth
- File storage (large PDFs)
- Rate limiting / abuse prevention

### Database Options (When Needed)
| Service | Free Tier | Paid |
|---------|-----------|------|
| Supabase | 500MB | $25/mo |
| PlanetScale | 1GB | $29/mo |
| Neon | 3GB | $19/mo |
| Railway Postgres | Included | Usage |

---

## 6. Deploy Checklist

### First Deploy (Today)
- [ ] Initialize Git repo
- [ ] Push to GitHub
- [ ] Connect Vercel
- [ ] Get preview URL (*.vercel.app)
- [ ] Test everything works

### Production Deploy
- [ ] Buy domain
- [ ] Add domain to Vercel
- [ ] Configure DNS at Cloudflare
- [ ] Enable Cloudflare proxy (CDN + protection)
- [ ] Test custom domain

### Monitoring Setup
- [ ] Vercel Analytics (free basic)
- [ ] Cloudflare Analytics
- [ ] UptimeRobot (free monitoring)

---

## 7. Security Considerations

### Free Tier Security
- HTTPS: Automatic via Vercel
- DDoS: Cloudflare free tier
- Headers: Configure in Vercel

### When Growing
- Cloudflare WAF
- Rate limiting
- Bot protection

---

## Commands Reference

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy (automatic via Git push)
git push origin main
```

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2024-XX | Domain: TBD | - |
| 2024-XX | Vercel for frontend | Free, fast, easy |
| 2024-XX | Railway for backend | Good DX, fair pricing |
