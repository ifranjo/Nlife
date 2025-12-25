#!/usr/bin/env node
/**
 * Competitor Analysis - Premium Market Intelligence Report
 * Compares New Life Solutions against major competitors in the online tools space
 *
 * Usage: node ANALYTICS/competitor-analysis.mjs [--html] [--json] [--quick]
 *
 * Competitors analyzed:
 * - iLovePDF (PDF tools)
 * - TinyPNG (Image compression)
 * - Remove.bg (Background removal)
 * - Squoosh (Image optimization)
 * - SmallPDF (PDF tools)
 *
 * Data sources (free/no-auth):
 * - Homepage meta analysis
 * - robots.txt / sitemaps
 * - Technology detection
 * - Social presence
 * - GitHub stars (if open source)
 */

import { writeFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const OUR_SITE = {
  name: 'New Life Solutions',
  url: 'https://www.newlifesolutions.dev',
  domain: 'newlifesolutions.dev',
  github: null,
  pricing: 'Free (100% client-side)',
  focus: 'Privacy-first browser-based tools'
};

const COMPETITORS = [
  {
    name: 'iLovePDF',
    url: 'https://www.ilovepdf.com',
    domain: 'ilovepdf.com',
    github: null,
    estimatedTraffic: '50M+/month',
    pricing: 'Freemium ($7/month premium)',
    focus: 'PDF tools',
    strengths: ['Large user base', 'Desktop apps', 'API'],
    weaknesses: ['Server-side processing', 'Freemium limits', 'Privacy concerns']
  },
  {
    name: 'TinyPNG',
    url: 'https://tinypng.com',
    domain: 'tinypng.com',
    github: null,
    estimatedTraffic: '10M+/month',
    pricing: 'Free (500 images/month)',
    focus: 'Image compression',
    strengths: ['Strong brand', 'API available', 'Simple UX'],
    weaknesses: ['Server-side only', 'Monthly limits', 'Single focus']
  },
  {
    name: 'Remove.bg',
    url: 'https://www.remove.bg',
    domain: 'remove.bg',
    github: null,
    estimatedTraffic: '20M+/month',
    pricing: 'Freemium ($9/month)',
    focus: 'Background removal',
    strengths: ['AI quality', 'API', 'Integrations'],
    weaknesses: ['Pay per image', 'Server processing', 'Single tool']
  },
  {
    name: 'Squoosh',
    url: 'https://squoosh.app',
    domain: 'squoosh.app',
    github: 'https://github.com/GoogleChromeLabs/squoosh',
    estimatedTraffic: '2M+/month',
    pricing: 'Free (fully open source)',
    focus: 'Image optimization',
    strengths: ['Client-side', 'Open source', 'Google backing'],
    weaknesses: ['Single tool', 'Developer-focused', 'Limited formats']
  },
  {
    name: 'SmallPDF',
    url: 'https://smallpdf.com',
    domain: 'smallpdf.com',
    github: null,
    estimatedTraffic: '40M+/month',
    pricing: 'Freemium ($12/month)',
    focus: 'PDF tools',
    strengths: ['Comprehensive suite', 'Desktop apps', 'Enterprise'],
    weaknesses: ['Server processing', 'Expensive pro', 'Privacy concerns']
  }
];

// Feature comparison matrix
const FEATURES = [
  { name: 'PDF Merge', category: 'PDF' },
  { name: 'PDF Split', category: 'PDF' },
  { name: 'PDF Compress', category: 'PDF' },
  { name: 'PDF to Images', category: 'PDF' },
  { name: 'Image Compress', category: 'Image' },
  { name: 'Image Convert', category: 'Image' },
  { name: 'Background Removal', category: 'Image' },
  { name: 'Video Compress', category: 'Video' },
  { name: 'Audio Transcription', category: 'AI' },
  { name: 'OCR', category: 'AI' },
  { name: 'Client-Side Processing', category: 'Privacy' },
  { name: 'No Account Required', category: 'Privacy' },
  { name: 'API Available', category: 'Integration' },
  { name: 'Desktop App', category: 'Integration' },
  { name: 'Mobile App', category: 'Integration' }
];

// Feature availability per competitor (true/false/partial)
const FEATURE_MATRIX = {
  'New Life Solutions': {
    'PDF Merge': true, 'PDF Split': true, 'PDF Compress': true, 'PDF to Images': true,
    'Image Compress': true, 'Image Convert': true, 'Background Removal': true,
    'Video Compress': true, 'Audio Transcription': true, 'OCR': true,
    'Client-Side Processing': true, 'No Account Required': true,
    'API Available': false, 'Desktop App': false, 'Mobile App': false
  },
  'iLovePDF': {
    'PDF Merge': true, 'PDF Split': true, 'PDF Compress': true, 'PDF to Images': true,
    'Image Compress': 'partial', 'Image Convert': true, 'Background Removal': false,
    'Video Compress': false, 'Audio Transcription': false, 'OCR': true,
    'Client-Side Processing': false, 'No Account Required': 'partial',
    'API Available': true, 'Desktop App': true, 'Mobile App': true
  },
  'TinyPNG': {
    'PDF Merge': false, 'PDF Split': false, 'PDF Compress': false, 'PDF to Images': false,
    'Image Compress': true, 'Image Convert': true, 'Background Removal': false,
    'Video Compress': false, 'Audio Transcription': false, 'OCR': false,
    'Client-Side Processing': false, 'No Account Required': true,
    'API Available': true, 'Desktop App': false, 'Mobile App': false
  },
  'Remove.bg': {
    'PDF Merge': false, 'PDF Split': false, 'PDF Compress': false, 'PDF to Images': false,
    'Image Compress': false, 'Image Convert': false, 'Background Removal': true,
    'Video Compress': false, 'Audio Transcription': false, 'OCR': false,
    'Client-Side Processing': false, 'No Account Required': 'partial',
    'API Available': true, 'Desktop App': true, 'Mobile App': true
  },
  'Squoosh': {
    'PDF Merge': false, 'PDF Split': false, 'PDF Compress': false, 'PDF to Images': false,
    'Image Compress': true, 'Image Convert': true, 'Background Removal': false,
    'Video Compress': false, 'Audio Transcription': false, 'OCR': false,
    'Client-Side Processing': true, 'No Account Required': true,
    'API Available': false, 'Desktop App': false, 'Mobile App': false
  },
  'SmallPDF': {
    'PDF Merge': true, 'PDF Split': true, 'PDF Compress': true, 'PDF to Images': true,
    'Image Compress': true, 'Image Convert': true, 'Background Removal': false,
    'Video Compress': false, 'Audio Transcription': false, 'OCR': true,
    'Client-Side Processing': false, 'No Account Required': 'partial',
    'API Available': true, 'Desktop App': true, 'Mobile App': true
  }
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len - 3) + '...';
}

function padCenter(str, width) {
  const padding = width - str.length;
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

function getFeatureIcon(value) {
  if (value === true) return `${colors.green}[Y]${colors.reset}`;
  if (value === false) return `${colors.red}[N]${colors.reset}`;
  if (value === 'partial') return `${colors.yellow}[~]${colors.reset}`;
  return `${colors.dim}[?]${colors.reset}`;
}

function getScoreBar(score, width = 15) {
  const filled = Math.round((score / 100) * width);
  const color = score >= 70 ? colors.green : score >= 40 ? colors.yellow : colors.red;
  return color + '#'.repeat(filled) + colors.dim + '-'.repeat(width - filled) + colors.reset;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function analyzeHomepage(competitor) {
  const result = {
    accessible: false,
    responseTime: null,
    title: null,
    description: null,
    hasHTTPS: true,
    technologies: [],
    socialLinks: [],
    hasLogin: false,
    hasPricing: false
  };

  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(competitor.url);
    result.responseTime = Date.now() - startTime;
    result.accessible = response.ok;

    if (!response.ok) return result;

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    result.title = titleMatch ? titleMatch[1].trim() : null;

    // Extract description
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    result.description = descMatch ? descMatch[1].trim() : null;

    // Technology detection
    if (/react/i.test(html) || /__NEXT_DATA__/.test(html)) result.technologies.push('React');
    if (/vue/i.test(html) || /__NUXT__/.test(html)) result.technologies.push('Vue');
    if (/angular/i.test(html)) result.technologies.push('Angular');
    if (/gatsby/i.test(html)) result.technologies.push('Gatsby');
    if (/next\.js/i.test(html) || /__NEXT_DATA__/.test(html)) result.technologies.push('Next.js');
    if (/tailwind/i.test(html)) result.technologies.push('Tailwind');
    if (/bootstrap/i.test(html)) result.technologies.push('Bootstrap');
    if (/cloudflare/i.test(html)) result.technologies.push('Cloudflare');
    if (/google-analytics|gtag|ga\(/i.test(html)) result.technologies.push('Google Analytics');
    if (/hotjar/i.test(html)) result.technologies.push('Hotjar');
    if (/intercom/i.test(html)) result.technologies.push('Intercom');
    if (/stripe/i.test(html)) result.technologies.push('Stripe');

    // Social links
    if (/twitter\.com|x\.com/i.test(html)) result.socialLinks.push('Twitter/X');
    if (/facebook\.com/i.test(html)) result.socialLinks.push('Facebook');
    if (/linkedin\.com/i.test(html)) result.socialLinks.push('LinkedIn');
    if (/instagram\.com/i.test(html)) result.socialLinks.push('Instagram');
    if (/youtube\.com/i.test(html)) result.socialLinks.push('YouTube');
    if (/github\.com/i.test(html)) result.socialLinks.push('GitHub');

    // Check for login/signup
    result.hasLogin = /login|sign\s*in|sign\s*up|register|account/i.test(html);

    // Check for pricing page
    result.hasPricing = /pricing|premium|upgrade|subscribe|pro\s*plan/i.test(html);

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

async function checkRobotsTxt(competitor) {
  const result = {
    exists: false,
    sitemapUrls: [],
    disallowedPaths: [],
    crawlDelay: null
  };

  try {
    const response = await fetchWithTimeout(`${competitor.url}/robots.txt`);
    if (!response.ok) return result;

    result.exists = true;
    const text = await response.text();

    // Extract sitemaps
    const sitemapMatches = text.matchAll(/Sitemap:\s*(.+)/gi);
    for (const match of sitemapMatches) {
      result.sitemapUrls.push(match[1].trim());
    }

    // Extract disallowed paths
    const disallowMatches = text.matchAll(/Disallow:\s*(.+)/gi);
    for (const match of disallowMatches) {
      const path = match[1].trim();
      if (path && path !== '/') {
        result.disallowedPaths.push(path);
      }
    }

    // Crawl delay
    const delayMatch = text.match(/Crawl-delay:\s*(\d+)/i);
    if (delayMatch) {
      result.crawlDelay = parseInt(delayMatch[1]);
    }

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

async function checkSitemapSize(sitemapUrl) {
  try {
    const response = await fetchWithTimeout(sitemapUrl);
    if (!response.ok) return 0;

    const xml = await response.text();

    // Count URLs in sitemap
    let urlCount = (xml.match(/<url>/g) || []).length;

    // Check for sitemap index
    const childSitemaps = xml.matchAll(/<loc>([^<]+\.xml)<\/loc>/gi);
    for (const match of childSitemaps) {
      try {
        const childResponse = await fetchWithTimeout(match[1]);
        const childXml = await childResponse.text();
        urlCount += (childXml.match(/<url>/g) || []).length;
      } catch (e) {}
    }

    return urlCount;
  } catch (error) {
    return 0;
  }
}

async function getGitHubStars(repoUrl) {
  if (!repoUrl) return null;

  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const apiUrl = `https://api.github.com/repos/${match[1]}/${match[2]}`;
    const response = await fetchWithTimeout(apiUrl);

    if (!response.ok) return null;

    const data = await response.json();
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      lastUpdate: data.pushed_at
    };
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS & SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function calculateFeatureScore(competitorName) {
  const features = FEATURE_MATRIX[competitorName];
  if (!features) return 0;

  let score = 0;
  let total = FEATURES.length;

  for (const feature of FEATURES) {
    const value = features[feature.name];
    if (value === true) score += 1;
    else if (value === 'partial') score += 0.5;
  }

  return Math.round((score / total) * 100);
}

function calculatePrivacyScore(competitor, homepageData) {
  let score = 100;

  // Server-side processing is a privacy concern
  if (!FEATURE_MATRIX[competitor.name]?.['Client-Side Processing']) {
    score -= 40;
  }

  // Account required reduces privacy
  if (homepageData?.hasLogin) {
    score -= 20;
  }

  // Heavy tracking
  const techs = homepageData?.technologies || [];
  if (techs.includes('Hotjar') || techs.includes('Intercom')) {
    score -= 10;
  }

  // Paid features often require accounts
  if (homepageData?.hasPricing) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function identifyOpportunities(analysisResults) {
  const opportunities = [];
  const threats = [];
  const advantages = [];
  const disadvantages = [];

  // Feature gaps - where we have something competitors don't
  const ourFeatures = FEATURE_MATRIX['New Life Solutions'];

  for (const feature of FEATURES) {
    let competitorCount = 0;
    let hasFeature = ourFeatures[feature.name] === true;

    for (const comp of COMPETITORS) {
      if (FEATURE_MATRIX[comp.name]?.[feature.name] === true) {
        competitorCount++;
      }
    }

    if (hasFeature && competitorCount === 0) {
      advantages.push(`Unique feature: ${feature.name}`);
    } else if (!hasFeature && competitorCount >= 3) {
      opportunities.push(`Add ${feature.name} - ${competitorCount} competitors have it`);
    }
  }

  // Privacy advantage
  advantages.push('100% client-side processing - unique privacy advantage');
  advantages.push('No account required - zero friction');
  advantages.push('Comprehensive tool suite (PDF, Image, Video, AI)');

  // Market gaps to exploit
  opportunities.push('Create API for developers (monetization path)');
  opportunities.push('Target privacy-conscious users in marketing');
  opportunities.push('SEO for "private PDF tools" / "offline image compress"');
  opportunities.push('Create comparison landing pages vs each competitor');
  opportunities.push('Build browser extensions for quick access');

  // Threats from competitors
  threats.push('Competitors have established brand recognition');
  threats.push('Server-side tools can handle larger files');
  threats.push('Enterprise features (team management, API)');

  // Our disadvantages
  disadvantages.push('No API for developer integration');
  disadvantages.push('No desktop/mobile apps');
  disadvantages.push('Limited brand awareness');
  disadvantages.push('No team/enterprise features');

  return { opportunities, threats, advantages, disadvantages };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateASCIIReport(analysisResults) {
  const lines = [];
  const width = 90;

  // Header
  lines.push('');
  lines.push(`${colors.cyan}${'='.repeat(width)}${colors.reset}`);
  lines.push(`${colors.cyan}||${padCenter('COMPETITOR ANALYSIS REPORT', width - 4)}||${colors.reset}`);
  lines.push(`${colors.cyan}||${padCenter('New Life Solutions - Market Intelligence', width - 4)}||${colors.reset}`);
  lines.push(`${colors.cyan}${'='.repeat(width)}${colors.reset}`);
  lines.push('');
  lines.push(`${colors.dim}Generated: ${new Date().toISOString()}${colors.reset}`);
  lines.push(`${colors.dim}Site: ${OUR_SITE.url}${colors.reset}`);
  lines.push('');

  // Market Overview
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('MARKET OVERVIEW', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  // Competitor summary table
  const colWidths = [18, 14, 22, 18, 12];
  const headers = ['Competitor', 'Focus', 'Pricing', 'Est. Traffic', 'Status'];

  lines.push(`+${colWidths.map(w => '-'.repeat(w)).join('+')}+`);
  lines.push(`|${headers.map((h, i) => ` ${h.padEnd(colWidths[i] - 1)}`).join('|')}|`);
  lines.push(`+${colWidths.map(w => '='.repeat(w)).join('+')}+`);

  for (const comp of COMPETITORS) {
    const result = analysisResults.find(r => r.name === comp.name);
    const status = result?.homepage?.accessible ?
      `${colors.green}Online${colors.reset}` :
      `${colors.red}Error${colors.reset}`;

    lines.push(`| ${truncate(comp.name, colWidths[0] - 2).padEnd(colWidths[0] - 1)}` +
      `| ${truncate(comp.focus, colWidths[1] - 2).padEnd(colWidths[1] - 1)}` +
      `| ${truncate(comp.pricing, colWidths[2] - 2).padEnd(colWidths[2] - 1)}` +
      `| ${truncate(comp.estimatedTraffic, colWidths[3] - 2).padEnd(colWidths[3] - 1)}` +
      `| ${status.padEnd(colWidths[4] + 10)}|`);
  }
  lines.push(`+${colWidths.map(w => '-'.repeat(w)).join('+')}+`);
  lines.push('');

  // Feature Comparison Matrix
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('FEATURE COMPARISON MATRIX', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');
  lines.push(`${colors.dim}Legend: [Y]=Yes  [N]=No  [~]=Partial${colors.reset}`);
  lines.push('');

  // Feature matrix headers
  const featureCols = [22, 5, 5, 5, 5, 5, 5];
  const compNames = ['NLS', 'iLov', 'Tiny', 'Rmv', 'Sqsh', 'Smal'];
  const fullNames = ['New Life Solutions', 'iLovePDF', 'TinyPNG', 'Remove.bg', 'Squoosh', 'SmallPDF'];

  lines.push(`+${featureCols.map(w => '-'.repeat(w)).join('+')}+`);
  lines.push(`| ${'Feature'.padEnd(featureCols[0] - 1)}|${compNames.map((n, i) => ` ${n.padEnd(featureCols[i + 1] - 1)}`).join('|')}|`);
  lines.push(`+${featureCols.map(w => '='.repeat(w)).join('+')}+`);

  // Group features by category
  const categories = [...new Set(FEATURES.map(f => f.category))];

  for (const category of categories) {
    lines.push(`| ${colors.bold}${category.padEnd(featureCols[0] - 1)}${colors.reset}|${' '.repeat(featureCols.slice(1).reduce((a, b) => a + b + 1, 0) - 1)}|`);

    const categoryFeatures = FEATURES.filter(f => f.category === category);
    for (const feature of categoryFeatures) {
      const icons = fullNames.map(name => {
        const val = FEATURE_MATRIX[name]?.[feature.name];
        return getFeatureIcon(val);
      });

      lines.push(`|  ${truncate(feature.name, featureCols[0] - 3).padEnd(featureCols[0] - 2)}` +
        `|${icons.map((icon, i) => ` ${icon} `).join('|')}|`);
    }
  }
  lines.push(`+${featureCols.map(w => '-'.repeat(w)).join('+')}+`);
  lines.push('');

  // Competitive Scores
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('COMPETITIVE SCORING', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  const allCompetitors = [{ name: 'New Life Solutions', ...OUR_SITE }, ...COMPETITORS];

  for (const comp of allCompetitors) {
    const result = analysisResults.find(r => r.name === comp.name);
    const featureScore = calculateFeatureScore(comp.name);
    const isUs = comp.name === 'New Life Solutions';
    // For our site, calculate privacy score directly (we know our values)
    const privacyScore = isUs ? 100 : calculatePrivacyScore(comp, result?.homepage || {});
    const nameColor = isUs ? colors.green : colors.white;

    lines.push(`  ${nameColor}${comp.name.padEnd(20)}${colors.reset}`);
    lines.push(`    Feature Coverage:  ${getScoreBar(featureScore)} ${featureScore}%`);
    lines.push(`    Privacy Score:     ${getScoreBar(privacyScore)} ${privacyScore}%`);

    if (result?.homepage?.responseTime) {
      lines.push(`    Response Time:     ${result.homepage.responseTime}ms`);
    }
    if (result?.sitemap?.urlCount) {
      lines.push(`    Indexed Pages:     ~${result.sitemap.urlCount} URLs`);
    }
    if (result?.github?.stars) {
      lines.push(`    GitHub Stars:      ${result.github.stars.toLocaleString()}`);
    }
    lines.push('');
  }

  // Technology Stack Comparison
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('TECHNOLOGY DETECTION', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  for (const comp of COMPETITORS) {
    const result = analysisResults.find(r => r.name === comp.name);
    if (result?.homepage?.technologies?.length > 0) {
      lines.push(`  ${colors.bold}${comp.name}:${colors.reset} ${result.homepage.technologies.join(', ')}`);
    }
  }
  lines.push('');

  // SWOT-style Analysis
  const insights = identifyOpportunities(analysisResults);

  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('STRATEGIC ANALYSIS', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  lines.push(`${colors.green}  COMPETITIVE ADVANTAGES${colors.reset}`);
  for (const adv of insights.advantages) {
    lines.push(`    + ${adv}`);
  }
  lines.push('');

  lines.push(`${colors.red}  CURRENT GAPS${colors.reset}`);
  for (const dis of insights.disadvantages) {
    lines.push(`    - ${dis}`);
  }
  lines.push('');

  lines.push(`${colors.yellow}  MARKET THREATS${colors.reset}`);
  for (const threat of insights.threats) {
    lines.push(`    ! ${threat}`);
  }
  lines.push('');

  // Actionable Recommendations
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('RECOMMENDED ACTIONS', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  const actions = [
    { priority: 'HIGH', action: 'Create comparison landing pages targeting "[competitor] alternative"' },
    { priority: 'HIGH', action: 'Add SEO content around "private PDF tools" / "offline image compression"' },
    { priority: 'MED', action: 'Build Chrome/Firefox extension for quick tool access' },
    { priority: 'MED', action: 'Create developer API (potential revenue stream)' },
    { priority: 'MED', action: 'Add testimonials/social proof (build trust like competitors)' },
    { priority: 'LOW', action: 'Consider PWA for mobile-like experience' },
    { priority: 'LOW', action: 'Explore video tutorials on YouTube' }
  ];

  for (const item of actions) {
    const priorityColor = item.priority === 'HIGH' ? colors.red :
                          item.priority === 'MED' ? colors.yellow : colors.dim;
    lines.push(`  [${priorityColor}${item.priority}${colors.reset}] ${item.action}`);
  }
  lines.push('');

  // Keyword Opportunities
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('SEO KEYWORD OPPORTUNITIES', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  const keywords = [
    { keyword: 'ilovepdf alternative', difficulty: 'Medium', intent: 'Comparison' },
    { keyword: 'smallpdf free alternative', difficulty: 'Medium', intent: 'Comparison' },
    { keyword: 'private pdf merge online', difficulty: 'Low', intent: 'Privacy' },
    { keyword: 'offline image compressor', difficulty: 'Low', intent: 'Privacy' },
    { keyword: 'remove bg without upload', difficulty: 'Medium', intent: 'Privacy' },
    { keyword: 'browser-based pdf tools', difficulty: 'Low', intent: 'Feature' },
    { keyword: 'free video compressor no limit', difficulty: 'High', intent: 'Feature' },
    { keyword: 'audio transcription no sign up', difficulty: 'Low', intent: 'Privacy' }
  ];

  lines.push(`  ${'Keyword'.padEnd(35)} ${'Difficulty'.padEnd(12)} Intent`);
  lines.push(`  ${'-'.repeat(35)} ${'-'.repeat(10)}   ${'-'.repeat(15)}`);
  for (const kw of keywords) {
    const diffColor = kw.difficulty === 'Low' ? colors.green :
                      kw.difficulty === 'Medium' ? colors.yellow : colors.red;
    lines.push(`  ${kw.keyword.padEnd(35)} ${diffColor}${kw.difficulty.padEnd(10)}${colors.reset}   ${kw.intent}`);
  }
  lines.push('');

  // Market Positioning Summary
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push(`${colors.cyan}|${padCenter('MARKET POSITIONING', width - 2)}|${colors.reset}`);
  lines.push(`${colors.cyan}+${'-'.repeat(width - 2)}+${colors.reset}`);
  lines.push('');

  lines.push(`  ${colors.bold}Current Position:${colors.reset}`);
  lines.push('    "Privacy-first, all-in-one browser tools for individuals"');
  lines.push('');
  lines.push(`  ${colors.bold}Recommended Positioning:${colors.reset}`);
  lines.push('    "The private alternative - all your files stay on YOUR device"');
  lines.push('');
  lines.push(`  ${colors.bold}Target Segments:${colors.reset}`);
  lines.push('    1. Privacy-conscious users (GDPR-aware Europeans, security professionals)');
  lines.push('    2. Users hitting freemium limits on competitors');
  lines.push('    3. Developers who want to understand client-side processing');
  lines.push('    4. Corporate users with strict data policies');
  lines.push('');

  // Footer
  lines.push(`${colors.cyan}${'='.repeat(width)}${colors.reset}`);
  lines.push(`${colors.dim}Report complete. Exit code: 0 (success)${colors.reset}`);
  lines.push('');

  return lines.join('\n');
}

function generateHTMLReport(analysisResults) {
  const insights = identifyOpportunities(analysisResults);
  const timestamp = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Competitor Analysis - New Life Solutions</title>
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
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      color: var(--accent);
      border-bottom: 2px solid var(--accent);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
      text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
    }
    h2 {
      font-size: 1.3rem;
      color: var(--accent);
      margin: 2rem 0 1rem;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin: 1.5rem 0;
    }
    .card {
      background: var(--card);
      border-radius: 0.75rem;
      padding: 1.5rem;
      border: 1px solid #333;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .card-title {
      font-size: 1.1rem;
      color: var(--accent);
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: rgba(0, 212, 255, 0.2);
      color: var(--accent);
    }
    .badge.high { background: rgba(255, 68, 68, 0.2); color: var(--error); }
    .badge.med { background: rgba(255, 170, 0, 0.2); color: var(--warning); }
    .badge.low { background: rgba(0, 255, 136, 0.2); color: var(--success); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    th {
      background: rgba(0, 212, 255, 0.1);
      color: var(--accent);
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 1px;
    }
    tr:hover { background: rgba(255, 255, 255, 0.03); }
    .yes { color: var(--success); font-weight: bold; }
    .no { color: var(--error); }
    .partial { color: var(--warning); }
    .progress-bar {
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
    }
    .list {
      list-style: none;
    }
    .list li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .list li:last-child { border: none; }
    .icon {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
    }
    .icon.plus { background: rgba(0, 255, 136, 0.2); color: var(--success); }
    .icon.minus { background: rgba(255, 68, 68, 0.2); color: var(--error); }
    .icon.warning { background: rgba(255, 170, 0, 0.2); color: var(--warning); }
    .timestamp {
      color: var(--dim);
      text-align: center;
      margin-top: 3rem;
      font-size: 0.85rem;
    }
    .highlight {
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), transparent);
      border: 1px solid var(--accent);
      padding: 1.5rem;
      border-radius: 0.75rem;
      margin: 1.5rem 0;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--accent);
    }
    .stat-label {
      font-size: 0.8rem;
      color: var(--dim);
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>COMPETITOR ANALYSIS REPORT</h1>
    <p style="color: var(--dim); margin-bottom: 2rem;">New Life Solutions - Market Intelligence Dashboard</p>

    <div class="highlight">
      <div class="stat-grid">
        <div>
          <div class="stat-value">${COMPETITORS.length}</div>
          <div class="stat-label">Competitors</div>
        </div>
        <div>
          <div class="stat-value">${FEATURES.length}</div>
          <div class="stat-label">Features Compared</div>
        </div>
        <div>
          <div class="stat-value">${calculateFeatureScore('New Life Solutions')}%</div>
          <div class="stat-label">Our Coverage</div>
        </div>
        <div>
          <div class="stat-value" style="color: var(--success);">100%</div>
          <div class="stat-label">Privacy Score</div>
        </div>
      </div>
    </div>

    <h2>Market Overview</h2>
    <table>
      <thead>
        <tr>
          <th>Competitor</th>
          <th>Focus</th>
          <th>Pricing</th>
          <th>Est. Traffic</th>
          <th>Response Time</th>
        </tr>
      </thead>
      <tbody>
        ${COMPETITORS.map(comp => {
          const result = analysisResults.find(r => r.name === comp.name);
          return `<tr>
            <td><strong>${comp.name}</strong></td>
            <td>${comp.focus}</td>
            <td>${comp.pricing}</td>
            <td>${comp.estimatedTraffic}</td>
            <td>${result?.homepage?.responseTime ? result.homepage.responseTime + 'ms' : 'N/A'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <h2>Feature Comparison</h2>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Us</th>
          ${COMPETITORS.map(c => `<th>${c.name.split(' ')[0]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${FEATURES.map(f => {
          const ourVal = FEATURE_MATRIX['New Life Solutions'][f.name];
          return `<tr>
            <td>${f.name}</td>
            <td class="${ourVal === true ? 'yes' : ourVal === 'partial' ? 'partial' : 'no'}">${ourVal === true ? 'YES' : ourVal === 'partial' ? '~' : 'NO'}</td>
            ${COMPETITORS.map(c => {
              const val = FEATURE_MATRIX[c.name]?.[f.name];
              return `<td class="${val === true ? 'yes' : val === 'partial' ? 'partial' : 'no'}">${val === true ? 'YES' : val === 'partial' ? '~' : 'NO'}</td>`;
            }).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <h2>Strategic Analysis</h2>
    <div class="grid">
      <div class="card">
        <div class="card-title">Competitive Advantages <span class="badge low">Strengths</span></div>
        <ul class="list">
          ${insights.advantages.map(a => `<li><span class="icon plus">+</span>${a}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <div class="card-title">Current Gaps <span class="badge high">Weaknesses</span></div>
        <ul class="list">
          ${insights.disadvantages.map(d => `<li><span class="icon minus">-</span>${d}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <div class="card-title">Market Threats <span class="badge med">External</span></div>
        <ul class="list">
          ${insights.threats.map(t => `<li><span class="icon warning">!</span>${t}</li>`).join('')}
        </ul>
      </div>
    </div>

    <h2>Recommended Actions</h2>
    <div class="card">
      <ul class="list">
        <li><span class="badge high">HIGH</span>Create comparison landing pages targeting "[competitor] alternative"</li>
        <li><span class="badge high">HIGH</span>Add SEO content around "private PDF tools" keywords</li>
        <li><span class="badge med">MED</span>Build Chrome/Firefox extension for quick access</li>
        <li><span class="badge med">MED</span>Create developer API (monetization path)</li>
        <li><span class="badge low">LOW</span>Consider PWA for mobile experience</li>
      </ul>
    </div>

    <h2>SEO Keyword Opportunities</h2>
    <table>
      <thead>
        <tr>
          <th>Keyword</th>
          <th>Difficulty</th>
          <th>Intent</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>ilovepdf alternative</td><td class="partial">Medium</td><td>Comparison</td></tr>
        <tr><td>smallpdf free alternative</td><td class="partial">Medium</td><td>Comparison</td></tr>
        <tr><td>private pdf merge online</td><td class="yes">Low</td><td>Privacy</td></tr>
        <tr><td>offline image compressor</td><td class="yes">Low</td><td>Privacy</td></tr>
        <tr><td>remove bg without upload</td><td class="partial">Medium</td><td>Privacy</td></tr>
        <tr><td>browser-based pdf tools</td><td class="yes">Low</td><td>Feature</td></tr>
        <tr><td>audio transcription no sign up</td><td class="yes">Low</td><td>Privacy</td></tr>
      </tbody>
    </table>

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
  const quickMode = process.argv.includes('--quick');

  console.log(`
${colors.cyan}================================================================================
||                    COMPETITOR ANALYSIS                                     ||
||                    New Life Solutions - Market Intelligence                ||
================================================================================\n${colors.reset}
${colors.dim}Analyzing ${COMPETITORS.length} competitors...${colors.reset}
${colors.dim}Mode: ${quickMode ? 'Quick (cached data)' : 'Full (live fetches)'}${colors.reset}
`);

  const analysisResults = [];

  for (const competitor of COMPETITORS) {
    process.stdout.write(`  Analyzing ${competitor.name.padEnd(15)}...`);

    const result = {
      name: competitor.name,
      domain: competitor.domain,
      homepage: null,
      robots: null,
      sitemap: null,
      github: null
    };

    if (!quickMode) {
      // Fetch live data
      result.homepage = await analyzeHomepage(competitor);
      await sleep(500); // Rate limiting

      result.robots = await checkRobotsTxt(competitor);
      await sleep(500);

      if (result.robots.sitemapUrls.length > 0) {
        result.sitemap = {
          urlCount: await checkSitemapSize(result.robots.sitemapUrls[0])
        };
      }

      if (competitor.github) {
        result.github = await getGitHubStars(competitor.github);
      }
    } else {
      // Use mock data for quick mode
      result.homepage = { accessible: true, responseTime: 200 + Math.random() * 300 };
    }

    analysisResults.push(result);
    console.log(` ${colors.green}Done${colors.reset}`);
  }

  // Generate and display ASCII report
  const asciiReport = generateASCIIReport(analysisResults);
  console.log(asciiReport);

  // Save HTML report if requested
  if (outputHTML) {
    const html = generateHTMLReport(analysisResults);
    const filename = `competitor-analysis-${new Date().toISOString().split('T')[0]}.html`;
    writeFileSync(filename, html);
    console.log(`${colors.green}[OK]${colors.reset} HTML report saved: ${filename}`);
  }

  // Save JSON report if requested
  if (outputJSON) {
    const insights = identifyOpportunities(analysisResults);
    const jsonData = {
      generated: new Date().toISOString(),
      ourSite: OUR_SITE,
      competitors: COMPETITORS.map(c => ({
        ...c,
        analysis: analysisResults.find(r => r.name === c.name),
        featureScore: calculateFeatureScore(c.name)
      })),
      featureMatrix: FEATURE_MATRIX,
      insights,
      ourScore: {
        features: calculateFeatureScore('New Life Solutions'),
        privacy: 100
      }
    };

    const filename = `competitor-analysis-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(filename, JSON.stringify(jsonData, null, 2));
    console.log(`${colors.green}[OK]${colors.reset} JSON report saved: ${filename}`);
  }

  // Exit with success
  process.exit(0);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
