#!/usr/bin/env node
/**
 * Search Engine Index Status Checker
 * Checks if pages are indexed by Google, Bing, and available in AI search engines
 *
 * Usage: node ANALYTICS/index-status.mjs [--quick]
 *
 * Methods:
 * - Google: site: search operator
 * - Bing: site: search operator + IndexNow status
 * - DuckDuckGo: site: search
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const DOMAIN = 'newlifesolutions.dev';

// Key pages to check (prioritized)
const PRIORITY_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/hub', name: 'Tools Hub' },
  { path: '/tools/pdf-merge', name: 'PDF Merge' },
  { path: '/tools/image-compress', name: 'Image Compress' },
  { path: '/tools/background-remover', name: 'Background Remover' },
  { path: '/tools/audio-transcription', name: 'Audio Transcription' },
  { path: '/tools/video-compressor', name: 'Video Compressor' },
  { path: '/guides/how-to-merge-pdf-files', name: 'PDF Merge Guide' }
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

// Check robots.txt
async function checkRobotsTxt() {
  try {
    const response = await fetch(`${SITE_URL}/robots.txt`);
    if (!response.ok) return { status: 'missing', issues: ['robots.txt not found'] };

    const text = await response.text();
    const issues = [];

    // Check for disallow all
    if (text.includes('Disallow: /') && !text.includes('Disallow: /#')) {
      if (!/Allow:/.test(text)) {
        issues.push('Disallow: / blocks all crawlers');
      }
    }

    // Check for sitemap reference
    if (!text.toLowerCase().includes('sitemap:')) {
      issues.push('No sitemap reference in robots.txt');
    }

    // Check for common bots
    const bots = {
      googlebot: /Googlebot/i.test(text),
      bingbot: /Bingbot/i.test(text),
      gptbot: /GPTBot/i.test(text),
      claudebot: /Claude-Web|ClaudeBot/i.test(text)
    };

    return {
      status: issues.length === 0 ? 'ok' : 'warning',
      issues,
      bots,
      content: text.substring(0, 500)
    };
  } catch (error) {
    return { status: 'error', issues: [error.message] };
  }
}

// Check sitemap status
async function checkSitemap() {
  try {
    const response = await fetch(`${SITE_URL}/sitemap-index.xml`);
    if (!response.ok) return { status: 'missing', count: 0 };

    const xml = await response.text();

    // Count URLs across all sitemaps
    let totalUrls = 0;
    const sitemapUrls = [];

    const sitemapRegex = /<loc>([^<]+\.xml)<\/loc>/g;
    let match;
    while ((match = sitemapRegex.exec(xml)) !== null) {
      sitemapUrls.push(match[1]);
    }

    for (const sitemapUrl of sitemapUrls) {
      try {
        const childResponse = await fetch(sitemapUrl);
        const childXml = await childResponse.text();
        const urlMatches = childXml.match(/<url>/g);
        if (urlMatches) totalUrls += urlMatches.length;
      } catch (e) {
        // Skip failed sitemaps
      }
    }

    return {
      status: 'ok',
      count: totalUrls,
      sitemaps: sitemapUrls.length
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// Fetch IndexNow key status
async function checkIndexNow() {
  try {
    // Find key file
    const keyPatterns = [
      /[a-f0-9]{32}/
    ];

    const robotsResponse = await fetch(`${SITE_URL}/robots.txt`);
    const robotsText = await robotsResponse.text();

    // Try to find key from known location
    const keyFiles = [
      '0b54e9559a2f7aa045f17e210119c4d5.txt'
    ];

    for (const keyFile of keyFiles) {
      try {
        const keyResponse = await fetch(`${SITE_URL}/${keyFile}`);
        if (keyResponse.ok) {
          const keyContent = await keyResponse.text();
          return {
            status: 'configured',
            keyFile,
            key: keyContent.trim().substring(0, 32)
          };
        }
      } catch (e) {
        // Continue checking
      }
    }

    return { status: 'not-found' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// Check meta tags on a page
async function checkPageMeta(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return { error: `HTTP ${response.status}` };

    const html = await response.text();

    return {
      hasTitle: /<title>[^<]+<\/title>/i.test(html),
      hasDescription: /<meta\s+name="description"/i.test(html),
      hasCanonical: /<link\s+rel="canonical"/i.test(html),
      hasRobots: /<meta\s+name="robots"/i.test(html),
      noindex: /noindex/i.test(html),
      hasOG: /<meta\s+property="og:/i.test(html),
      hasSchema: /application\/ld\+json/i.test(html)
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Simulate search engine check (note: actual search requires API keys)
function getSearchCheckInfo() {
  return {
    google: {
      manual: `https://www.google.com/search?q=site:${DOMAIN}`,
      api: 'Requires Google Search Console API',
      tip: 'Use GSC URL Inspection Tool for accurate status'
    },
    bing: {
      manual: `https://www.bing.com/search?q=site:${DOMAIN}`,
      api: 'Bing Webmaster Tools API available',
      tip: 'IndexNow submissions are processed within 24-48h'
    },
    duckduckgo: {
      manual: `https://duckduckgo.com/?q=site:${DOMAIN}`,
      tip: 'Uses Bing index primarily'
    }
  };
}

async function main() {
  const quickMode = process.argv.includes('--quick');

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                    SEARCH ENGINE INDEX STATUS                                ║
║                    New Life Solutions Analytics                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.dim}Site: ${SITE_URL}${colors.reset}
`);

  // 1. Check robots.txt
  console.log(`${colors.cyan}━━━ ROBOTS.TXT ━━━${colors.reset}\n`);
  const robots = await checkRobotsTxt();

  if (robots.status === 'ok') {
    console.log(`  ${colors.green}✓${colors.reset} robots.txt is properly configured`);
  } else if (robots.status === 'warning') {
    console.log(`  ${colors.yellow}⚠${colors.reset} robots.txt has issues:`);
    robots.issues.forEach(issue => {
      console.log(`    ${colors.yellow}→ ${issue}${colors.reset}`);
    });
  } else {
    console.log(`  ${colors.red}✗${colors.reset} robots.txt error: ${robots.issues?.[0] || 'unknown'}`);
  }

  // Show bot-specific rules
  if (robots.bots) {
    console.log(`\n  ${colors.dim}Bot rules detected:${colors.reset}`);
    Object.entries(robots.bots).forEach(([bot, hasRule]) => {
      console.log(`    ${hasRule ? colors.green + '✓' : colors.dim + '○'} ${bot}${colors.reset}`);
    });
  }

  // 2. Check sitemap
  console.log(`\n${colors.cyan}━━━ SITEMAP ━━━${colors.reset}\n`);
  const sitemap = await checkSitemap();

  if (sitemap.status === 'ok') {
    console.log(`  ${colors.green}✓${colors.reset} Sitemap found`);
    console.log(`    ${colors.dim}→ ${sitemap.count} URLs across ${sitemap.sitemaps} sitemaps${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Sitemap issue: ${sitemap.error || 'not found'}`);
  }

  // 3. Check IndexNow
  console.log(`\n${colors.cyan}━━━ INDEXNOW ━━━${colors.reset}\n`);
  const indexnow = await checkIndexNow();

  if (indexnow.status === 'configured') {
    console.log(`  ${colors.green}✓${colors.reset} IndexNow configured`);
    console.log(`    ${colors.dim}→ Key file: ${indexnow.keyFile}${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}○${colors.reset} IndexNow key file not detected`);
    console.log(`    ${colors.dim}→ Bing/Yandex instant indexing may not be active${colors.reset}`);
  }

  // 4. Check priority pages
  console.log(`\n${colors.cyan}━━━ PAGE SEO STATUS ━━━${colors.reset}\n`);
  console.log(`┌${'─'.repeat(28)}┬${'─'.repeat(7)}┬${'─'.repeat(7)}┬${'─'.repeat(7)}┬${'─'.repeat(7)}┬${'─'.repeat(7)}┬${'─'.repeat(7)}┐`);
  console.log(`│ ${'Page'.padEnd(26)} │ Title │ Desc  │ Canon │ OG    │Schema │ NoIdx │`);
  console.log(`├${'─'.repeat(28)}┼${'─'.repeat(7)}┼${'─'.repeat(7)}┼${'─'.repeat(7)}┼${'─'.repeat(7)}┼${'─'.repeat(7)}┼${'─'.repeat(7)}┤`);

  for (const page of PRIORITY_PAGES) {
    const url = `${SITE_URL}${page.path}`;
    const meta = await checkPageMeta(url);

    if (meta.error) {
      console.log(`│ ${page.name.substring(0, 26).padEnd(26)} │ ${colors.red}ERROR${colors.reset} │       │       │       │       │       │`);
      continue;
    }

    const check = (val) => val ? `${colors.green}  ✓  ${colors.reset}` : `${colors.red}  ✗  ${colors.reset}`;
    const noindex = meta.noindex ? `${colors.red}  ✗  ${colors.reset}` : `${colors.green}  ✓  ${colors.reset}`;

    console.log(`│ ${page.name.substring(0, 26).padEnd(26)} │${check(meta.hasTitle)}│${check(meta.hasDescription)}│${check(meta.hasCanonical)}│${check(meta.hasOG)}│${check(meta.hasSchema)}│${noindex}│`);
  }

  console.log(`└${'─'.repeat(28)}┴${'─'.repeat(7)}┴${'─'.repeat(7)}┴${'─'.repeat(7)}┴${'─'.repeat(7)}┴${'─'.repeat(7)}┴${'─'.repeat(7)}┘`);

  // 5. Search engine check links
  console.log(`\n${colors.cyan}━━━ MANUAL INDEX VERIFICATION ━━━${colors.reset}\n`);
  const searchInfo = getSearchCheckInfo();

  console.log(`${colors.bold}Google:${colors.reset}`);
  console.log(`  ${colors.dim}Manual check:${colors.reset} ${searchInfo.google.manual}`);
  console.log(`  ${colors.dim}Tip:${colors.reset} ${searchInfo.google.tip}`);

  console.log(`\n${colors.bold}Bing:${colors.reset}`);
  console.log(`  ${colors.dim}Manual check:${colors.reset} ${searchInfo.bing.manual}`);
  console.log(`  ${colors.dim}Tip:${colors.reset} ${searchInfo.bing.tip}`);

  console.log(`\n${colors.bold}DuckDuckGo:${colors.reset}`);
  console.log(`  ${colors.dim}Manual check:${colors.reset} ${searchInfo.duckduckgo.manual}`);

  // 6. AI Search Engines
  console.log(`\n${colors.cyan}━━━ AI SEARCH ENGINE VISIBILITY ━━━${colors.reset}\n`);
  console.log(`  Test these queries in AI search engines:\n`);

  const testQueries = [
    'free pdf merge online browser based',
    'compress image without uploading',
    'remove background from image free no signup',
    'transcribe audio to text free browser'
  ];

  testQueries.forEach((q, i) => {
    console.log(`  ${i + 1}. "${q}"`);
  });

  console.log(`\n  ${colors.dim}Platforms to test:${colors.reset}`);
  console.log(`    • https://www.perplexity.ai`);
  console.log(`    • https://chat.openai.com (Browse mode)`);
  console.log(`    • https://www.bing.com/chat`);
  console.log(`    • https://gemini.google.com`);

  // Summary
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              INDEX READINESS                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

  ${robots.status === 'ok' ? colors.green + '✓' : colors.yellow + '⚠'} robots.txt${colors.reset}     ${robots.status === 'ok' ? 'Properly configured' : 'Needs attention'}
  ${sitemap.status === 'ok' ? colors.green + '✓' : colors.red + '✗'} Sitemap${colors.reset}         ${sitemap.count || 0} URLs submitted
  ${indexnow.status === 'configured' ? colors.green + '✓' : colors.yellow + '○'} IndexNow${colors.reset}        ${indexnow.status === 'configured' ? 'Active for Bing/Yandex' : 'Not configured'}

${colors.cyan}Next Steps:${colors.reset}
  1. Open the Google/Bing links above to check current index status
  2. If not indexed, request indexing via Google Search Console
  3. Run IndexNow submission: node scripts/submit-indexnow.mjs
  4. Check again in 24-48 hours
`);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
