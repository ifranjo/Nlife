#!/usr/bin/env node
/**
 * SEO Dashboard - Comprehensive Site Health Report
 * Combines all analytics into a single actionable report
 *
 * Usage: node ANALYTICS/seo-dashboard.mjs [--html] [--json]
 *
 * Checks performed:
 * - Sitemap health & URL count
 * - Schema markup validation
 * - Core Web Vitals (via PageSpeed Insights)
 * - Index readiness (robots.txt, meta tags)
 * - Link integrity
 * - AEO (Answer Engine Optimization) score
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

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
  bold: '\x1b[1m',
  magenta: '\x1b[35m'
};

// Key pages for spot checks
const KEY_PAGES = [
  '/',
  '/hub',
  '/tools/pdf-merge',
  '/tools/image-compress',
  '/tools/background-remover'
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

async function checkSitemap() {
  try {
    const response = await fetch(`${SITE_URL}/sitemap-index.xml`);
    if (!response.ok) return { status: 'error', score: 0, urlCount: 0 };

    const xml = await response.text();
    let totalUrls = 0;
    let sitemapCount = 0;

    const sitemapRegex = /<loc>([^<]+\.xml)<\/loc>/g;
    let match;
    while ((match = sitemapRegex.exec(xml)) !== null) {
      sitemapCount++;
      try {
        const childResponse = await fetch(match[1]);
        const childXml = await childResponse.text();
        const urlMatches = childXml.match(/<url>/g);
        if (urlMatches) totalUrls += urlMatches.length;
      } catch (e) {}
    }

    return {
      status: 'ok',
      score: 100,
      urlCount: totalUrls,
      sitemapCount,
      details: `${totalUrls} URLs in ${sitemapCount} sitemaps`
    };
  } catch (error) {
    return { status: 'error', score: 0, error: error.message };
  }
}

async function checkRobotsTxt() {
  try {
    const response = await fetch(`${SITE_URL}/robots.txt`);
    if (!response.ok) return { status: 'missing', score: 0 };

    const text = await response.text();
    let score = 100;
    const issues = [];

    if (!text.toLowerCase().includes('sitemap:')) {
      score -= 20;
      issues.push('No sitemap reference');
    }

    if (text.includes('Disallow: /') && !text.includes('Allow:')) {
      score -= 50;
      issues.push('May block crawlers');
    }

    return {
      status: issues.length === 0 ? 'ok' : 'warning',
      score,
      issues,
      details: issues.length === 0 ? 'Properly configured' : issues.join(', ')
    };
  } catch (error) {
    return { status: 'error', score: 0, error: error.message };
  }
}

async function checkSchemaMarkup() {
  const results = [];

  for (const path of KEY_PAGES) {
    try {
      const response = await fetch(`${SITE_URL}${path}`);
      const html = await response.text();

      const hasWebApp = /\"@type\"\s*:\s*\"WebApplication\"/i.test(html);
      const hasHowTo = /\"@type\"\s*:\s*\"HowTo\"/i.test(html);
      const hasFAQ = /\"@type\"\s*:\s*\"FAQPage\"/i.test(html);
      const hasBreadcrumb = /\"@type\"\s*:\s*\"BreadcrumbList\"/i.test(html);
      const hasSpeakable = /speakable/i.test(html);

      const pageScore = [hasWebApp, hasHowTo, hasFAQ, hasBreadcrumb, hasSpeakable]
        .filter(Boolean).length * 20;

      results.push({
        path,
        score: pageScore,
        schemas: { hasWebApp, hasHowTo, hasFAQ, hasBreadcrumb, hasSpeakable }
      });
    } catch (error) {
      results.push({ path, score: 0, error: error.message });
    }
  }

  const avgScore = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);

  return {
    status: avgScore >= 80 ? 'ok' : avgScore >= 50 ? 'warning' : 'error',
    score: avgScore,
    pages: results,
    details: `Average ${avgScore}% across ${results.length} pages`
  };
}

async function checkMetaTags() {
  const results = [];

  for (const path of KEY_PAGES) {
    try {
      const response = await fetch(`${SITE_URL}${path}`);
      const html = await response.text();

      const hasTitle = /<title>[^<]+<\/title>/i.test(html);
      const hasDesc = /<meta\s+name="description"/i.test(html);
      const hasCanonical = /<link\s+rel="canonical"/i.test(html);
      const hasOG = /<meta\s+property="og:/i.test(html);
      const noIndex = /noindex/i.test(html);

      const pageScore = [hasTitle, hasDesc, hasCanonical, hasOG, !noIndex]
        .filter(Boolean).length * 20;

      results.push({
        path,
        score: pageScore,
        meta: { hasTitle, hasDesc, hasCanonical, hasOG, noIndex }
      });
    } catch (error) {
      results.push({ path, score: 0, error: error.message });
    }
  }

  const avgScore = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);

  return {
    status: avgScore >= 80 ? 'ok' : avgScore >= 50 ? 'warning' : 'error',
    score: avgScore,
    pages: results,
    details: `Average ${avgScore}% across ${results.length} pages`
  };
}

async function checkPerformance() {
  // Quick check - just homepage
  const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const url = `${PSI_API}?url=${encodeURIComponent(SITE_URL)}&strategy=mobile&category=performance`;

  try {
    const response = await fetch(url);
    if (!response.ok) return { status: 'error', score: 0, error: 'API error' };

    const data = await response.json();
    const score = Math.round(data.lighthouseResult.categories.performance.score * 100);

    return {
      status: score >= 90 ? 'ok' : score >= 50 ? 'warning' : 'error',
      score,
      details: `PageSpeed score: ${score}/100`
    };
  } catch (error) {
    return { status: 'skip', score: null, error: error.message };
  }
}

async function checkIndexNow() {
  try {
    // Check if IndexNow key file exists
    const keyFile = '0b54e9559a2f7aa045f17e210119c4d5.txt';
    const response = await fetch(`${SITE_URL}/${keyFile}`);

    if (response.ok) {
      return {
        status: 'ok',
        score: 100,
        details: 'IndexNow configured for Bing/Yandex'
      };
    }

    return {
      status: 'warning',
      score: 50,
      details: 'IndexNow not configured'
    };
  } catch (error) {
    return { status: 'warning', score: 50, error: error.message };
  }
}

async function checkAEO() {
  // Check AEO (Answer Engine Optimization) readiness
  let score = 0;
  const checks = [];

  for (const path of ['/tools/pdf-merge', '/tools/image-compress']) {
    try {
      const response = await fetch(`${SITE_URL}${path}`);
      const html = await response.text();

      const hasTLDR = /tldr|tl;dr|summary/i.test(html);
      const hasFAQ = /faq|frequently\s*asked/i.test(html);
      const hasSteps = /step\s*\d|how.*to/i.test(html);
      const hasComparison = /comparison|vs\.|versus|compare/i.test(html);
      const hasDate = /updated|modified|\d{4}/i.test(html);

      const pageScore = [hasTLDR, hasFAQ, hasSteps, hasComparison, hasDate]
        .filter(Boolean).length * 20;

      checks.push({ path, score: pageScore });
      score += pageScore;
    } catch (error) {
      checks.push({ path, score: 0, error: error.message });
    }
  }

  const avgScore = Math.round(score / checks.length);

  return {
    status: avgScore >= 80 ? 'ok' : avgScore >= 50 ? 'warning' : 'error',
    score: avgScore,
    checks,
    details: `AEO readiness: ${avgScore}%`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function getStatusIcon(status) {
  switch (status) {
    case 'ok': return `${colors.green}✓${colors.reset}`;
    case 'warning': return `${colors.yellow}⚠${colors.reset}`;
    case 'error': return `${colors.red}✗${colors.reset}`;
    case 'skip': return `${colors.dim}○${colors.reset}`;
    default: return `${colors.dim}?${colors.reset}`;
  }
}

function getScoreBar(score, width = 20) {
  if (score === null) return colors.dim + '░'.repeat(width) + colors.reset;

  const filled = Math.round((score / 100) * width);
  const color = score >= 80 ? colors.green : score >= 50 ? colors.yellow : colors.red;

  return color + '█'.repeat(filled) + colors.dim + '░'.repeat(width - filled) + colors.reset;
}

function generateHTMLReport(results, overallScore) {
  const timestamp = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Dashboard - ${DOMAIN}</title>
  <style>
    :root {
      --bg: #0f1419;
      --card: #1a1f26;
      --accent: #00d4ff;
      --success: #00ff88;
      --warning: #ffaa00;
      --error: #ff4444;
      --text: #e0e0e0;
      --dim: #666;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'JetBrains Mono', monospace;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      color: var(--accent);
      border-bottom: 1px solid var(--accent);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    .score-hero {
      text-align: center;
      padding: 3rem;
      background: linear-gradient(135deg, var(--card), transparent);
      border-radius: 1rem;
      margin-bottom: 2rem;
    }
    .score-value {
      font-size: 6rem;
      font-weight: bold;
      color: ${results.overall >= 80 ? 'var(--success)' : results.overall >= 50 ? 'var(--warning)' : 'var(--error)'};
    }
    .score-label { color: var(--dim); font-size: 1.2rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: var(--card);
      border-radius: 0.5rem;
      padding: 1.5rem;
      border: 1px solid #333;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-title { font-size: 1.1rem; color: var(--accent); }
    .card-score {
      font-size: 1.5rem;
      font-weight: bold;
    }
    .score-ok { color: var(--success); }
    .score-warning { color: var(--warning); }
    .score-error { color: var(--error); }
    .progress-bar {
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
      margin: 1rem 0;
    }
    .progress-fill {
      height: 100%;
      transition: width 0.3s;
    }
    .details { color: var(--dim); font-size: 0.9rem; }
    .timestamp { color: var(--dim); text-align: center; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SEO DASHBOARD - ${DOMAIN.toUpperCase()}</h1>

    <div class="score-hero">
      <div class="score-value">${overallScore}</div>
      <div class="score-label">Overall SEO Health Score</div>
    </div>

    <div class="grid">
      ${Object.entries(results).filter(([k]) => k !== 'overall').map(([key, data]) => `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
            <span class="card-score ${data.score >= 80 ? 'score-ok' : data.score >= 50 ? 'score-warning' : 'score-error'}">${data.score ?? 'N/A'}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${data.score ?? 0}%; background: ${data.score >= 80 ? 'var(--success)' : data.score >= 50 ? 'var(--warning)' : 'var(--error)'}"></div>
          </div>
          <div class="details">${data.details || data.error || ''}</div>
        </div>
      `).join('')}
    </div>

    <div class="timestamp">Generated: ${timestamp}</div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const outputHTML = process.argv.includes('--html');
  const outputJSON = process.argv.includes('--json');

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                         SEO DASHBOARD                                        ║
║                         New Life Solutions                                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.dim}Site: ${SITE_URL}${colors.reset}
${colors.dim}Time: ${new Date().toISOString()}${colors.reset}
`);

  console.log(`${colors.cyan}Running comprehensive SEO audit...${colors.reset}\n`);

  const results = {};

  // Run all checks
  const checks = [
    { name: 'sitemap', fn: checkSitemap, label: 'Sitemap Health' },
    { name: 'robots', fn: checkRobotsTxt, label: 'Robots.txt' },
    { name: 'schema', fn: checkSchemaMarkup, label: 'Schema Markup' },
    { name: 'meta', fn: checkMetaTags, label: 'Meta Tags' },
    { name: 'indexnow', fn: checkIndexNow, label: 'IndexNow' },
    { name: 'aeo', fn: checkAEO, label: 'AEO Readiness' },
    { name: 'performance', fn: checkPerformance, label: 'Performance' }
  ];

  for (const check of checks) {
    process.stdout.write(`  ${colors.dim}Checking ${check.label}...${colors.reset}`);
    results[check.name] = await check.fn();
    console.log(` ${getStatusIcon(results[check.name].status)} ${results[check.name].score ?? 'N/A'}`);
  }

  // Calculate overall score
  const scores = Object.values(results)
    .filter(r => r.score !== null && r.score !== undefined)
    .map(r => r.score);

  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  results.overall = overallScore;

  // Display results
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              AUDIT RESULTS                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`┌${'─'.repeat(24)}┬${'─'.repeat(8)}┬${'─'.repeat(24)}┬${'─'.repeat(20)}┐`);
  console.log(`│ ${'Check'.padEnd(22)} │ ${'Score'.padEnd(6)} │ ${'Status'.padEnd(22)} │ ${'Bar'.padEnd(18)} │`);
  console.log(`├${'─'.repeat(24)}┼${'─'.repeat(8)}┼${'─'.repeat(24)}┼${'─'.repeat(20)}┤`);

  for (const check of checks) {
    const r = results[check.name];
    const scoreStr = r.score !== null ? `${r.score}%`.padEnd(6) : 'N/A'.padEnd(6);
    const statusStr = (r.details || r.error || '').substring(0, 22).padEnd(22);

    console.log(`│ ${check.label.padEnd(22)} │ ${scoreStr} │ ${statusStr} │ ${getScoreBar(r.score, 18)} │`);
  }

  console.log(`└${'─'.repeat(24)}┴${'─'.repeat(8)}┴${'─'.repeat(24)}┴${'─'.repeat(20)}┘`);

  // Overall score display
  const scoreColor = overallScore >= 80 ? colors.green : overallScore >= 50 ? colors.yellow : colors.red;

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              OVERALL SEO SCORE                               ║
╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}

${scoreColor}                                    ${overallScore}%                                     ${colors.reset}

                        ${getScoreBar(overallScore, 40)}

${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Recommendations
  console.log(`${colors.cyan}Recommendations:${colors.reset}\n`);

  if (results.schema.score < 80) {
    console.log(`  ${colors.yellow}→${colors.reset} Add missing schema markup (WebApplication, HowTo, FAQPage)`);
  }
  if (results.performance.score && results.performance.score < 80) {
    console.log(`  ${colors.yellow}→${colors.reset} Improve Core Web Vitals - run: node ANALYTICS/performance-monitor.mjs`);
  }
  if (results.indexnow.score < 100) {
    console.log(`  ${colors.yellow}→${colors.reset} Configure IndexNow for faster Bing indexing`);
  }
  if (results.aeo.score < 80) {
    console.log(`  ${colors.yellow}→${colors.reset} Improve AEO with TL;DR sections and comparison tables`);
  }

  console.log(`\n${colors.dim}Run individual scripts for detailed analysis:${colors.reset}`);
  console.log(`  node ANALYTICS/sitemap-health.mjs`);
  console.log(`  node ANALYTICS/schema-validator.mjs`);
  console.log(`  node ANALYTICS/performance-monitor.mjs`);
  console.log(`  node ANALYTICS/broken-links.mjs`);
  console.log(`  node ANALYTICS/index-status.mjs`);

  // Output files
  if (outputHTML) {
    const html = generateHTMLReport(results, overallScore);
    const filename = `seo-report-${new Date().toISOString().split('T')[0]}.html`;
    writeFileSync(filename, html);
    console.log(`\n${colors.green}✓${colors.reset} HTML report saved: ${filename}`);
  }

  if (outputJSON) {
    const filename = `seo-report-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n${colors.green}✓${colors.reset} JSON report saved: ${filename}`);
  }
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
