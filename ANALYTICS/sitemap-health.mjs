#!/usr/bin/env node
/**
 * Sitemap Health Monitor
 * Validates sitemap structure and checks all URLs for accessibility
 *
 * Usage: node ANALYTICS/sitemap-health.mjs
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const SITEMAP_URL = `${SITE_URL}/sitemap-index.xml`;

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

async function fetchSitemap(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `HTTP ${response.status}`, url };
    }
    const text = await response.text();
    return { text, url };
  } catch (error) {
    return { error: error.message, url };
  }
}

function extractUrls(xml) {
  const urls = [];
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function extractLastmod(xml, url) {
  // Find lastmod near the url
  const urlEscaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<url>\\s*<loc>${urlEscaped}</loc>\\s*<lastmod>([^<]+)</lastmod>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

async function checkUrl(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const start = Date.now();
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD' // Faster than GET
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;

    return {
      url,
      status: response.status,
      ok: response.ok,
      responseTime,
      contentType: response.headers.get('content-type')
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      url,
      status: 0,
      ok: false,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

function formatResponseTime(ms) {
  if (ms < 200) return `${colors.green}${ms}ms${colors.reset}`;
  if (ms < 500) return `${colors.yellow}${ms}ms${colors.reset}`;
  return `${colors.red}${ms}ms${colors.reset}`;
}

async function main() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                    SITEMAP HEALTH MONITOR                                    ║
║                    New Life Solutions Analytics                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  const startTime = Date.now();

  // Fetch sitemap index
  console.log(`${colors.dim}Fetching sitemap index...${colors.reset}`);
  const indexResult = await fetchSitemap(SITEMAP_URL);

  if (indexResult.error) {
    console.log(`${colors.red}✗ Failed to fetch sitemap index: ${indexResult.error}${colors.reset}`);
    return;
  }

  console.log(`${colors.green}✓ Sitemap index fetched${colors.reset}\n`);

  // Extract child sitemaps or URLs
  const sitemapUrls = extractUrls(indexResult.text);
  let allPageUrls = [];

  // Check if these are child sitemaps or direct URLs
  const isChildSitemaps = sitemapUrls.some(url => url.endsWith('.xml'));

  if (isChildSitemaps) {
    console.log(`${colors.cyan}Found ${sitemapUrls.length} child sitemaps:${colors.reset}`);

    for (const sitemapUrl of sitemapUrls) {
      console.log(`  ${colors.dim}→ ${sitemapUrl}${colors.reset}`);
      const childResult = await fetchSitemap(sitemapUrl);

      if (childResult.error) {
        console.log(`    ${colors.red}✗ Error: ${childResult.error}${colors.reset}`);
      } else {
        const urls = extractUrls(childResult.text);
        allPageUrls.push(...urls.map(url => ({ url, sitemap: sitemapUrl })));
        console.log(`    ${colors.green}✓ ${urls.length} URLs${colors.reset}`);
      }
    }
  } else {
    allPageUrls = sitemapUrls.map(url => ({ url, sitemap: SITEMAP_URL }));
  }

  console.log(`\n${colors.bold}Total URLs to check: ${allPageUrls.length}${colors.reset}\n`);

  // Check all URLs
  console.log(`${colors.cyan}Checking URL accessibility...${colors.reset}\n`);

  const results = {
    healthy: [],
    slow: [],
    errors: [],
    redirects: []
  };

  // Process in batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < allPageUrls.length; i += batchSize) {
    const batch = allPageUrls.slice(i, i + batchSize);
    const checks = await Promise.all(batch.map(item => checkUrl(item.url)));

    for (const check of checks) {
      const shortUrl = check.url.replace(SITE_URL, '');

      if (check.error) {
        results.errors.push(check);
        console.log(`  ${colors.red}✗${colors.reset} ${shortUrl} - ${colors.red}${check.error}${colors.reset}`);
      } else if (check.status >= 300 && check.status < 400) {
        results.redirects.push(check);
        console.log(`  ${colors.yellow}→${colors.reset} ${shortUrl} - ${colors.yellow}${check.status} Redirect${colors.reset}`);
      } else if (check.ok) {
        if (check.responseTime > 500) {
          results.slow.push(check);
          console.log(`  ${colors.yellow}⚠${colors.reset} ${shortUrl} - ${formatResponseTime(check.responseTime)} (slow)`);
        } else {
          results.healthy.push(check);
          console.log(`  ${colors.green}✓${colors.reset} ${shortUrl} - ${formatResponseTime(check.responseTime)}`);
        }
      } else {
        results.errors.push(check);
        console.log(`  ${colors.red}✗${colors.reset} ${shortUrl} - ${colors.red}${check.status}${colors.reset}`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              HEALTH SUMMARY                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

  ${colors.green}✓ Healthy URLs:${colors.reset}    ${results.healthy.length}
  ${colors.yellow}⚠ Slow URLs:${colors.reset}       ${results.slow.length} (>500ms)
  ${colors.yellow}→ Redirects:${colors.reset}       ${results.redirects.length}
  ${colors.red}✗ Errors:${colors.reset}          ${results.errors.length}

  ${colors.dim}Total URLs:${colors.reset}        ${allPageUrls.length}
  ${colors.dim}Scan duration:${colors.reset}     ${duration}s
`);

  // Performance stats
  const allTimes = [...results.healthy, ...results.slow]
    .filter(r => r.responseTime)
    .map(r => r.responseTime);

  if (allTimes.length > 0) {
    const avgTime = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);

    console.log(`${colors.cyan}Performance Metrics:${colors.reset}
  Avg response time: ${formatResponseTime(avgTime)}
  Min response time: ${formatResponseTime(minTime)}
  Max response time: ${formatResponseTime(maxTime)}
`);
  }

  // Errors detail
  if (results.errors.length > 0) {
    console.log(`${colors.red}Error Details:${colors.reset}`);
    results.errors.forEach(err => {
      console.log(`  ${err.url}`);
      console.log(`    ${colors.dim}→ ${err.error || `Status ${err.status}`}${colors.reset}`);
    });
  }

  // Health score
  const healthScore = Math.round((results.healthy.length / allPageUrls.length) * 100);
  const scoreColor = healthScore >= 90 ? colors.green : healthScore >= 70 ? colors.yellow : colors.red;

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              HEALTH SCORE                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}
${scoreColor}                                   ${healthScore}%                                      ${colors.reset}
${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Exit with error code if there are issues
  if (results.errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
