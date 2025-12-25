# Marketing Launch Guide

## STATUS: Ready to Execute

---

## 1. GOOGLE SEARCH CONSOLE (DO FIRST)

**URL:** https://search.google.com/search-console

**Steps:**
1. Go to Search Console
2. Add property: `https://www.newlifesolutions.dev`
3. Verify via DNS TXT record or HTML file
4. Submit sitemap: `https://www.newlifesolutions.dev/sitemap-index.xml`
5. Request indexing for key pages:
   - `/hub`
   - `/tools/pdf-merge`
   - `/tools/background-remover`
   - `/for/accountants`

---

## 2. BING WEBMASTER TOOLS

**URL:** https://www.bing.com/webmasters

**Steps:**
1. Import from Google Search Console (easiest)
2. Or add site manually
3. Submit sitemap

---

## 3. FREE DIRECTORIES (High Value)

### AlternativeTo.net
**URL:** https://alternativeto.net/submit/

```
Name: New Life Solutions
URL: https://www.newlifesolutions.dev
Category: Online Services > File Conversion

Description:
Free browser-based tools for PDF, images, video & audio. 36 tools including PDF merge/split, background remover, video compressor, and AI transcription. 100% private - files never leave your browser. No signup, no watermarks, no subscriptions.

Tags: pdf tools, image editor, video compressor, free online tools, privacy-focused
```

### Product Hunt
**URL:** https://www.producthunt.com/posts/new

```
Tagline: 36 free browser tools. No uploads. No signup. No BS.

Description:
We built 36 professional tools that run 100% in your browser:

- PDF: Merge, split, compress, convert
- Images: Background remover (AI), compress, convert, upscale
- Video: Compress for Discord, trim, convert to GIF, extract audio
- Audio: Transcription (Whisper AI), remove vocals, edit waveforms
- Documents: OCR, scanner, markdown editor

Why it's different:
- Files NEVER leave your device (WebAssembly processing)
- No accounts, no email harvesting
- No watermarks on output
- No "free tier" limitations
- Works offline after first load

Built for professionals who care about privacy: accountants handling client docs, content creators with unreleased footage, sellers protecting product photos.

First Comment:
Hey PH! We're tired of "free" tools that:
- Upload your files to random servers
- Add watermarks unless you pay
- Require signup just to try
- Have sketchy privacy policies

So we built the opposite. Everything runs in your browser using WebAssembly. Your files literally cannot leave your computer.

Try it: https://www.newlifesolutions.dev/hub
```

### Hacker News (Show HN)
**URL:** https://news.ycombinator.com/submit

```
Title: Show HN: 36 browser-based tools (PDF, video, AI) – no uploads, 100% client-side

URL: https://www.newlifesolutions.dev

Comment:
Built this over the past months. 36 tools for PDF, images, video, and audio that run entirely in the browser using WebAssembly.

Tech stack:
- Astro + React
- pdf-lib, pdfjs-dist for PDFs
- FFmpeg WASM for video
- Tesseract.js for OCR
- Whisper (transformers.js) for transcription
- @imgly/background-removal for AI bg removal

Everything processes locally. Files never hit a server. Wanted to see if "truly free" tools with no catch could work.

Feedback welcome, especially on performance and UX.
```

---

## 4. REDDIT POSTS

### r/webdev
```
Title: I built 36 browser-based tools using WebAssembly – no server uploads, everything runs client-side

Body:
After getting frustrated with "free" online tools that harvest data, I built a collection of 36 tools that run 100% in the browser.

**Tech used:**
- Astro 5 + React 19
- FFmpeg WASM for video processing
- pdf-lib for PDF manipulation
- Tesseract.js for OCR
- Whisper (transformers.js) for AI transcription
- @imgly/background-removal for AI background removal

**What it does:**
- PDF: merge, split, compress, convert
- Video: compress for Discord, trim, make GIFs
- Audio: transcribe, remove vocals
- Images: remove backgrounds, compress, upscale

Files literally cannot leave your device because there's no upload endpoint.

Live: https://www.newlifesolutions.dev

Would love feedback on:
1. Performance on different devices
2. UX improvements
3. Any tools you'd want added

Source is on GitHub if anyone wants to see the WASM integration patterns.
```

### r/SideProject
```
Title: Built 36 free online tools that don't suck (no uploads, no watermarks, no signup)

Body:
I was sick of:
- "Free" tools that upload your files to sketchy servers
- Watermarks unless you pay $9.99/month
- Forced signups just to try something
- 3 free uses then paywall

So I built the opposite: https://www.newlifesolutions.dev

**36 tools including:**
- PDF merge/split/compress
- AI background remover
- Video compressor (Discord-ready)
- AI transcription (Whisper)
- GIF maker
- And 30 more

**The catch:** There is none. It's actually free.

Everything runs in your browser via WebAssembly. Files never leave your computer. No accounts. No tracking beyond basic Plausible analytics.

Built with Astro, React, and various WASM libraries. Took about 2 months.

Looking for feedback and suggestions for new tools!
```

### r/InternetIsBeautiful
```
Title: 36 free browser tools (PDF, video, images) that don't upload your files anywhere

URL: https://www.newlifesolutions.dev/hub

(No body text needed for this sub, just the link)
```

---

## 5. OTHER DIRECTORIES

| Directory | URL | Priority |
|-----------|-----|----------|
| AlternativeTo | alternativeto.net/submit | HIGH |
| Product Hunt | producthunt.com | HIGH |
| Hacker News | news.ycombinator.com | HIGH |
| BetaList | betalist.com/submit | Medium |
| SaaSHub | saashub.com/submit | Medium |
| ToolPilot.ai | toolpilot.ai | Medium |
| There's An AI For That | theresanaiforthat.com | Medium (for AI tools) |
| Free-for.dev | github.com/ripienaar/free-for-dev | Medium (PR) |
| Awesome lists | Various GitHub repos | Medium |

---

## 6. QUICK BACKLINKS (Free)

1. **GitHub repo** - Make sure README links to live site
2. **Dev.to article** - Write "How I built X with WebAssembly"
3. **Twitter/X** - Post with #buildinpublic
4. **LinkedIn** - Post as project update
5. **Discord servers** - Share in #showcase channels

---

## EXECUTION ORDER

1. [ ] Google Search Console (YOU - need login)
2. [ ] Bing Webmaster (YOU - need login)
3. [ ] Push robots.txt fix (ME - done after this)
4. [ ] AlternativeTo submission (YOU - need account)
5. [ ] Reddit r/webdev post (YOU - need account)
6. [ ] Reddit r/SideProject post (YOU - wait 1 day)
7. [ ] Hacker News Show HN (YOU - need account, best on weekday morning PST)
8. [ ] Product Hunt (YOU - schedule for Tuesday/Wednesday)

---

## TRACKING

After submissions, track:
- Google Search Console: Impressions, clicks, indexed pages
- Plausible: Traffic sources, top pages
- Reddit: Upvotes, comments
- Product Hunt: Upvotes, comments

Good luck!
