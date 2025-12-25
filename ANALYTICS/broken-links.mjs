#!/usr/bin/env node
/**
 * Broken Link Checker
 * Crawls site pages and validates all internal and external links
 *
 * Usage: node ANALYTICS/broken-links.mjs [--external] [--limit=N]
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const DOMAIN = 'newlifesolutions.dev';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

// Link extraction regex
const LINK_REGEX = /<a[^>]+href=["']([^"']+)["']/gi;
const IMG_REGEX = /<img[^>]+src=["']([^"']+)["']/gi;
const SCRIPT_REGEX = /<script[^>]+src=["']([^"']+)["']/gi;
const LINK_CSS_REGEX = /<link[^>]+href=["']([^"']+)["']/gi;

// URLs to skip (CDNs, external services)
const SKIP_PATTERNS = [
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
  /^#/,
  /^data:/i,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdn\.jsdelivr\.net/,
  /unpkg\.com/,
  /cdnjs\.cloudflare\.com/
];

async function fetchSitemapUrls() {
  try {
    const response = await fetch(`${SITE_URL}/sitemap-index.xml`);
    const xml = await response.text();

    const allUrls = [];
    const sitemapRegex = /<loc>([^<]+\.xml)<\/loc>/g;
    let match;
    const sitemaps = [];

    while ((match = sitemapRegex.exec(xml)) !== null) {
      sitemaps.push(match[1]);
    }

    for (const sitemapUrl of sitemaps) {
      const childResponse = await fetch(sitemapUrl);
      const childXml = await childResponse.text();

      const urlRegex = /<loc>([^<]+)<\/loc>/g;
      while ((match = urlRegex.exec(childXml)) !== null) {
        if (!match[1].endsWith('.xml')) {
          allUrls.push(match[1]);
        }
      }
    }

    return allUrls;
  } catch (error) {
    console.error('Failed to fetch sitemap:', error.message);
    return [`${SITE_URL}/`];
  }
}

function extractLinks(html, baseUrl) {
  const links = new Set();

  const patterns = [
    { regex: LINK_REGEX, type: 'anchor' },
    { regex: IMG_REGEX, type: 'image' },
    { regex: SCRIPT_REGEX, type: 'script' },
    { regex: LINK_CSS_REGEX, type: 'resource' }
  ];

  for (const { regex, type } of patterns) {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);

    while ((match = regexCopy.exec(html)) !== null) {
      let url = match[1];

      // Skip patterns
      if (SKIP_PATTERNS.some(p => p.test(url))) continue;

      // Resolve relative URLs
      if (url.startsWith('/')) {
        url = `${SITE_URL}${url}`;
      } else if (!url.startsWith('http')) {
        // Relative to current page
        const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        url = `${base}${url}`;
      }

      // Normalize
      url = url.split('#')[0]; // Remove fragments
      url = url.split('?')[0]; // Remove query strings for dedup

      if (url) {
        links.add(JSON.stringify({ url, type }));
      }
    }
  }

  return Array.from(links).map(s => JSON.parse(s));
}

function isInternal(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes(DOMAIN);
  } catch {
    return false;
  }
}

async function checkLink(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD',
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    return {
      url,
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      finalUrl: response.url
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Try GET if HEAD fails (some servers don't support HEAD)
    if (error.name !== 'AbortError') {
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow'
        });

        return {
          url,
          status: response.status,
          ok: response.ok,
          redirected: response.redirected,
          finalUrl: response.url,
          fallbackGet: true
        };
      } catch (e) {
        // Give up
      }
    }

    return {
      url,
      status: 0,
      ok: false,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const checkExternal = process.argv.includes('--external');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const pageLimit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                    BROKEN LINK CHECKER                                       ║
║                    New Life Solutions Analytics                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.dim}Options: ${checkExternal ? 'Internal + External' : 'Internal only'} | Limit: ${pageLimit || 'None'}${colors.reset}
`);

  // Get pages to crawl
  console.log(`${colors.dim}Fetching sitemap...${colors.reset}`);
  let pages = await fetchSitemapUrls();

  if (pageLimit > 0) {
    pages = pages.slice(0, pageLimit);
  }

  console.log(`${colors.green}✓ Found ${pages.length} pages to crawl${colors.reset}\n`);

  // Collect all links
  const allLinks = new Map(); // url -> { foundOn: [], type: string }
  const checkedUrls = new Set();

  console.log(`${colors.cyan}Phase 1: Crawling pages for links...${colors.reset}\n`);

  for (let i = 0; i < pages.length; i++) {
    const pageUrl = pages[i];
    const shortUrl = pageUrl.replace(SITE_URL, '');

    process.stdout.write(`  [${i + 1}/${pages.length}] ${shortUrl}...`);

    try {
      const response = await fetch(pageUrl);
      const html = await response.text();
      const links = extractLinks(html, pageUrl);

      let added = 0;
      for (const link of links) {
        // Filter external if not requested
        if (!checkExternal && !isInternal(link.url)) continue;

        if (!allLinks.has(link.url)) {
          allLinks.set(link.url, { foundOn: [], type: link.type });
        }
        allLinks.get(link.url).foundOn.push(shortUrl);
        added++;
      }

      console.log(` ${colors.green}${added} links${colors.reset}`);
    } catch (error) {
      console.log(` ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }

  console.log(`\n${colors.cyan}Phase 2: Checking ${allLinks.size} unique links...${colors.reset}\n`);

  const results = {
    valid: [],
    redirects: [],
    broken: [],
    errors: []
  };

  const linksArray = Array.from(allLinks.entries());

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < linksArray.length; i += batchSize) {
    const batch = linksArray.slice(i, i + batchSize);
    const checks = await Promise.all(batch.map(([url]) => checkLink(url)));

    for (let j = 0; j < checks.length; j++) {
      const check = checks[j];
      const [url, meta] = batch[j];
      const internal = isInternal(url);
      const typeLabel = internal ? 'int' : 'ext';
      const shortUrl = internal ? url.replace(SITE_URL, '') : url.substring(0, 60);

      if (check.error) {
        console.log(`  ${colors.red}✗${colors.reset} [${typeLabel}] ${shortUrl} - ${colors.red}${check.error}${colors.reset}`);
        results.errors.push({ ...check, ...meta, internal });
      } else if (check.status >= 400) {
        console.log(`  ${colors.red}✗${colors.reset} [${typeLabel}] ${shortUrl} - ${colors.red}${check.status}${colors.reset}`);
        results.broken.push({ ...check, ...meta, internal });
      } else if (check.redirected) {
        console.log(`  ${colors.yellow}→${colors.reset} [${typeLabel}] ${shortUrl} - ${colors.yellow}${check.status} → ${check.finalUrl?.substring(0, 40)}${colors.reset}`);
        results.redirects.push({ ...check, ...meta, internal });
      } else {
        console.log(`  ${colors.green}✓${colors.reset} [${typeLabel}] ${shortUrl}`);
        results.valid.push({ ...check, ...meta, internal });
      }
    }

    // Small delay between batches
    if (i + batchSize < linksArray.length) {
      await sleep(500);
    }
  }

  // Summary
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              LINK CHECK SUMMARY                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

  ${colors.green}✓ Valid links:${colors.reset}     ${results.valid.length}
  ${colors.yellow}→ Redirects:${colors.reset}       ${results.redirects.length}
  ${colors.red}✗ Broken (4xx/5xx):${colors.reset} ${results.broken.length}
  ${colors.red}✗ Errors:${colors.reset}          ${results.errors.length}

  ${colors.dim}Total links checked:${colors.reset} ${allLinks.size}
  ${colors.dim}Pages crawled:${colors.reset}       ${pages.length}
`);

  // Broken links detail
  if (results.broken.length > 0) {
    console.log(`${colors.red}Broken Links (${results.broken.length}):${colors.reset}\n`);

    results.broken.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.url}`);
      console.log(`     ${colors.dim}Status: ${link.status} | Type: ${link.type}${colors.reset}`);
      console.log(`     ${colors.dim}Found on: ${link.foundOn.slice(0, 3).join(', ')}${link.foundOn.length > 3 ? '...' : ''}${colors.reset}\n`);
    });
  }

  // Errors detail
  if (results.errors.length > 0) {
    console.log(`${colors.red}Connection Errors (${results.errors.length}):${colors.reset}\n`);

    results.errors.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.url}`);
      console.log(`     ${colors.dim}Error: ${link.error}${colors.reset}`);
      console.log(`     ${colors.dim}Found on: ${link.foundOn.slice(0, 3).join(', ')}${colors.reset}\n`);
    });
  }

  // Redirects that should be fixed
  const internalRedirects = results.redirects.filter(r => r.internal);
  if (internalRedirects.length > 0) {
    console.log(`${colors.yellow}Internal Redirects to Fix (${internalRedirects.length}):${colors.reset}\n`);

    internalRedirects.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.url.replace(SITE_URL, '')}`);
      console.log(`     ${colors.dim}→ ${link.finalUrl?.replace(SITE_URL, '')}${colors.reset}`);
      console.log(`     ${colors.dim}Found on: ${link.foundOn.slice(0, 3).join(', ')}${colors.reset}\n`);
    });
  }

  // Health score
  const brokenCount = results.broken.length + results.errors.length;
  const healthScore = Math.round(((allLinks.size - brokenCount) / allLinks.size) * 100);
  const scoreColor = healthScore >= 95 ? colors.green : healthScore >= 80 ? colors.yellow : colors.red;

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              LINK HEALTH SCORE                               ║
╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}
${scoreColor}                                   ${healthScore}%                                      ${colors.reset}
${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Exit with error if broken links found
  if (brokenCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
