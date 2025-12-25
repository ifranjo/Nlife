#!/usr/bin/env node
/**
 * Page Performance Monitor
 * Checks Core Web Vitals and page speed metrics using PageSpeed Insights API
 *
 * Usage: node ANALYTICS/performance-monitor.mjs [--full]
 *
 * API: Free tier allows ~25,000 queries/day (no key needed)
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Key pages to check (subset for speed, use --full for all)
const KEY_PAGES = [
  '/',
  '/hub',
  '/tools/pdf-merge',
  '/tools/image-compress',
  '/tools/background-remover',
  '/tools/audio-transcription',
  '/guides/how-to-merge-pdf-files'
];

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

// Core Web Vitals thresholds
const CWV_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },   // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },     // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },    // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },   // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },   // Time to First Byte (ms)
  SI: { good: 3400, poor: 5800 }     // Speed Index (ms)
};

async function fetchSitemapUrls() {
  try {
    const response = await fetch(`${SITE_URL}/sitemap-index.xml`);
    const xml = await response.text();

    const allUrls = [];

    // Extract child sitemaps
    const sitemapRegex = /<loc>([^<]+\.xml)<\/loc>/g;
    let match;
    const sitemaps = [];
    while ((match = sitemapRegex.exec(xml)) !== null) {
      sitemaps.push(match[1]);
    }

    // Fetch each child sitemap
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
    return [];
  }
}

async function runPageSpeedTest(url, strategy = 'mobile') {
  const apiUrl = `${PSI_API}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return { error: data.error.message };
    }

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;

    return {
      score: Math.round(lighthouse.categories.performance.score * 100),
      metrics: {
        LCP: audits['largest-contentful-paint']?.numericValue,
        FID: audits['max-potential-fid']?.numericValue,
        CLS: audits['cumulative-layout-shift']?.numericValue,
        FCP: audits['first-contentful-paint']?.numericValue,
        TTFB: audits['server-response-time']?.numericValue,
        SI: audits['speed-index']?.numericValue,
        TBT: audits['total-blocking-time']?.numericValue,
        TTI: audits['interactive']?.numericValue
      },
      opportunities: lighthouse.categories.performance.auditRefs
        .filter(ref => ref.weight > 0)
        .map(ref => audits[ref.id])
        .filter(audit => audit && audit.score !== null && audit.score < 0.9)
        .slice(0, 5)
        .map(audit => ({
          title: audit.title,
          description: audit.description?.replace(/\[.*?\]\(.*?\)/g, '').trim(),
          savings: audit.displayValue
        }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

function getMetricStatus(metric, value) {
  if (value === undefined || value === null) return { status: 'unknown', color: colors.dim };

  const threshold = CWV_THRESHOLDS[metric];
  if (!threshold) return { status: 'ok', color: colors.green };

  if (value <= threshold.good) return { status: 'good', color: colors.green };
  if (value <= threshold.poor) return { status: 'needs-improvement', color: colors.yellow };
  return { status: 'poor', color: colors.red };
}

function formatMetric(metric, value) {
  if (value === undefined || value === null) return `${colors.dim}N/A${colors.reset}`;

  const { color } = getMetricStatus(metric, value);

  if (metric === 'CLS') {
    return `${color}${value.toFixed(3)}${colors.reset}`;
  }

  if (value >= 1000) {
    return `${color}${(value / 1000).toFixed(1)}s${colors.reset}`;
  }

  return `${color}${Math.round(value)}ms${colors.reset}`;
}

function getScoreColor(score) {
  if (score >= 90) return colors.green;
  if (score >= 50) return colors.yellow;
  return colors.red;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const fullMode = process.argv.includes('--full');
  const mobileOnly = !process.argv.includes('--desktop');

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                    PAGE PERFORMANCE MONITOR                                  ║
║                    New Life Solutions Analytics                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.dim}Using PageSpeed Insights API (Core Web Vitals)${colors.reset}
${colors.dim}Mode: ${fullMode ? 'Full site' : 'Key pages only'} | Strategy: ${mobileOnly ? 'Mobile' : 'Mobile + Desktop'}${colors.reset}
`);

  let urls;
  if (fullMode) {
    console.log(`${colors.dim}Fetching all URLs from sitemap...${colors.reset}`);
    urls = await fetchSitemapUrls();
    // Limit to avoid API rate limits
    if (urls.length > 20) {
      console.log(`${colors.yellow}⚠ Limiting to 20 pages to avoid API rate limits${colors.reset}`);
      urls = urls.slice(0, 20);
    }
  } else {
    urls = KEY_PAGES.map(p => `${SITE_URL}${p}`);
  }

  console.log(`${colors.cyan}Testing ${urls.length} pages...${colors.reset}\n`);

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const shortUrl = url.replace(SITE_URL, '') || '/';

    process.stdout.write(`  [${i + 1}/${urls.length}] ${shortUrl} ... `);

    const result = await runPageSpeedTest(url, 'mobile');

    if (result.error) {
      console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
      results.push({ url: shortUrl, error: result.error });
    } else {
      const scoreColor = getScoreColor(result.score);
      console.log(`${scoreColor}${result.score}${colors.reset}`);

      results.push({
        url: shortUrl,
        score: result.score,
        metrics: result.metrics,
        opportunities: result.opportunities
      });
    }

    // Rate limit: 1 request per 2 seconds to be safe
    if (i < urls.length - 1) {
      await sleep(2000);
    }
  }

  // Summary table
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              PERFORMANCE RESULTS                             ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bold}Core Web Vitals by Page:${colors.reset}

┌${'─'.repeat(30)}┬${'─'.repeat(7)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┐
│ ${'Page'.padEnd(28)} │ Score │   LCP  │   FCP  │   CLS  │   SI   │
├${'─'.repeat(30)}┼${'─'.repeat(7)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┤`);

  const validResults = results.filter(r => !r.error);

  for (const r of validResults) {
    const scoreColor = getScoreColor(r.score);
    const page = r.url.substring(0, 28).padEnd(28);
    const score = `${scoreColor}${String(r.score).padStart(3)}${colors.reset}`;

    console.log(`│ ${page} │  ${score}  │ ${formatMetric('LCP', r.metrics?.LCP).padEnd(15)} │ ${formatMetric('FCP', r.metrics?.FCP).padEnd(15)} │ ${formatMetric('CLS', r.metrics?.CLS).padEnd(15)} │ ${formatMetric('SI', r.metrics?.SI).padEnd(15)} │`);
  }

  console.log(`└${'─'.repeat(30)}┴${'─'.repeat(7)}┴${'─'.repeat(8)}┴${'─'.repeat(8)}┴${'─'.repeat(8)}┴${'─'.repeat(8)}┘`);

  // Aggregate stats
  const scores = validResults.map(r => r.score);
  if (scores.length > 0) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    console.log(`
${colors.cyan}Aggregate Statistics:${colors.reset}
  Average score: ${getScoreColor(avgScore)}${avgScore}${colors.reset}
  Min score:     ${getScoreColor(minScore)}${minScore}${colors.reset}
  Max score:     ${getScoreColor(maxScore)}${maxScore}${colors.reset}
`);

    // Score distribution
    const good = scores.filter(s => s >= 90).length;
    const needsWork = scores.filter(s => s >= 50 && s < 90).length;
    const poor = scores.filter(s => s < 50).length;

    console.log(`${colors.cyan}Score Distribution:${colors.reset}
  ${colors.green}■${colors.reset} Good (90+):      ${good} pages
  ${colors.yellow}■${colors.reset} Needs work (50-89): ${needsWork} pages
  ${colors.red}■${colors.reset} Poor (<50):       ${poor} pages
`);
  }

  // Top optimization opportunities
  const allOpportunities = new Map();
  validResults.forEach(r => {
    r.opportunities?.forEach(opp => {
      const key = opp.title;
      if (!allOpportunities.has(key)) {
        allOpportunities.set(key, { ...opp, count: 0 });
      }
      allOpportunities.get(key).count++;
    });
  });

  if (allOpportunities.size > 0) {
    console.log(`${colors.cyan}Top Optimization Opportunities:${colors.reset}`);
    const sorted = [...allOpportunities.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    sorted.forEach((opp, i) => {
      console.log(`  ${i + 1}. ${opp.title} ${colors.dim}(${opp.count} pages)${colors.reset}`);
      if (opp.savings) {
        console.log(`     ${colors.dim}Potential savings: ${opp.savings}${colors.reset}`);
      }
    });
  }

  // Overall score
  if (scores.length > 0) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const scoreColor = getScoreColor(avgScore);

    console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              PERFORMANCE SCORE                               ║
╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}
${scoreColor}                                   ${avgScore}                                       ${colors.reset}
${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);
  }

  // Errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`${colors.red}Errors (${errors.length}):${colors.reset}`);
    errors.forEach(e => {
      console.log(`  ${e.url}: ${e.error}`);
    });
  }
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
