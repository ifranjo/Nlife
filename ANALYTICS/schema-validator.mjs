#!/usr/bin/env node
/**
 * Schema Markup Validator
 * Validates JSON-LD structured data across all tool pages
 *
 * Usage: node ANALYTICS/schema-validator.mjs
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const SITEMAP_URL = `${SITE_URL}/sitemap-index.xml`;

// Required schema types for tool pages
const REQUIRED_SCHEMAS = {
  tools: ['WebApplication', 'HowTo', 'FAQPage', 'BreadcrumbList'],
  guides: ['HowTo', 'BreadcrumbList'],
  'use-cases': ['HowTo', 'BreadcrumbList']
};

// Recommended additional schemas
const RECOMMENDED_SCHEMAS = ['SpeakableSpecification', 'Organization'];

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

async function fetchPage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return { html: await response.text() };
  } catch (error) {
    return { error: error.message };
  }
}

async function fetchSitemapUrls() {
  try {
    const response = await fetch(SITEMAP_URL);
    const xml = await response.text();

    // Extract child sitemaps
    const sitemapUrls = [];
    const sitemapRegex = /<loc>([^<]+\.xml)<\/loc>/g;
    let match;
    while ((match = sitemapRegex.exec(xml)) !== null) {
      sitemapUrls.push(match[1]);
    }

    // Fetch all child sitemaps
    const allUrls = [];
    for (const sitemapUrl of sitemapUrls) {
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
    console.error('Failed to fetch sitemap:', error);
    return [];
  }
}

function extractSchemas(html) {
  const schemas = [];
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      schemas.push(json);
    } catch (e) {
      schemas.push({ parseError: e.message, raw: match[1].substring(0, 100) });
    }
  }

  return schemas;
}

function getSchemaTypes(schemas) {
  const types = new Set();

  function extractTypes(obj) {
    if (!obj) return;

    if (Array.isArray(obj)) {
      obj.forEach(extractTypes);
      return;
    }

    if (typeof obj === 'object') {
      if (obj['@type']) {
        if (Array.isArray(obj['@type'])) {
          obj['@type'].forEach(t => types.add(t));
        } else {
          types.add(obj['@type']);
        }
      }

      // Check @graph
      if (obj['@graph']) {
        extractTypes(obj['@graph']);
      }

      // Check speakable
      if (obj.speakable) {
        extractTypes(obj.speakable);
      }

      // Check nested objects
      Object.values(obj).forEach(v => {
        if (typeof v === 'object') extractTypes(v);
      });
    }
  }

  schemas.forEach(extractTypes);
  return Array.from(types);
}

function getPageType(url) {
  if (url.includes('/tools/')) return 'tools';
  if (url.includes('/guides/')) return 'guides';
  if (url.includes('/use-cases/')) return 'use-cases';
  return 'other';
}

function validateSchemas(url, schemas, types) {
  const pageType = getPageType(url);
  const required = REQUIRED_SCHEMAS[pageType] || [];
  const issues = [];
  const recommendations = [];

  // Check for parse errors
  const parseErrors = schemas.filter(s => s.parseError);
  if (parseErrors.length > 0) {
    issues.push(`JSON parse error: ${parseErrors[0].parseError}`);
  }

  // Check required schemas
  for (const reqType of required) {
    if (!types.includes(reqType)) {
      issues.push(`Missing required: ${reqType}`);
    }
  }

  // Check recommended schemas
  for (const recType of RECOMMENDED_SCHEMAS) {
    if (!types.includes(recType)) {
      recommendations.push(`Add: ${recType}`);
    }
  }

  // Validate specific schema requirements
  schemas.forEach(schema => {
    const graph = schema['@graph'] || [schema];

    graph.forEach(item => {
      if (item['@type'] === 'WebApplication') {
        if (!item.offers) issues.push('WebApplication missing offers (pricing)');
        if (!item.applicationCategory) issues.push('WebApplication missing applicationCategory');
      }

      if (item['@type'] === 'HowTo') {
        if (!item.step || item.step.length === 0) issues.push('HowTo missing steps');
      }

      if (item['@type'] === 'FAQPage') {
        if (!item.mainEntity || item.mainEntity.length === 0) issues.push('FAQPage missing questions');
      }
    });
  });

  return { issues, recommendations };
}

async function main() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                    SCHEMA MARKUP VALIDATOR                                   ║
║                    New Life Solutions Analytics                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.dim}Fetching sitemap URLs...${colors.reset}`);
  const urls = await fetchSitemapUrls();
  console.log(`${colors.green}✓ Found ${urls.length} URLs${colors.reset}\n`);

  const results = {
    valid: [],
    warnings: [],
    errors: [],
    noSchema: []
  };

  // Group by page type
  const pageGroups = {
    tools: urls.filter(u => u.includes('/tools/')),
    guides: urls.filter(u => u.includes('/guides/')),
    'use-cases': urls.filter(u => u.includes('/use-cases/')),
    other: urls.filter(u => !u.includes('/tools/') && !u.includes('/guides/') && !u.includes('/use-cases/'))
  };

  for (const [groupName, groupUrls] of Object.entries(pageGroups)) {
    if (groupUrls.length === 0) continue;

    console.log(`${colors.cyan}━━━ ${groupName.toUpperCase()} (${groupUrls.length} pages) ━━━${colors.reset}\n`);

    for (const url of groupUrls) {
      const shortUrl = url.replace(SITE_URL, '');
      const pageResult = await fetchPage(url);

      if (pageResult.error) {
        console.log(`  ${colors.red}✗${colors.reset} ${shortUrl} - ${colors.red}${pageResult.error}${colors.reset}`);
        results.errors.push({ url, error: pageResult.error });
        continue;
      }

      const schemas = extractSchemas(pageResult.html);
      const types = getSchemaTypes(schemas);

      if (schemas.length === 0) {
        console.log(`  ${colors.yellow}○${colors.reset} ${shortUrl} - ${colors.yellow}No schema markup${colors.reset}`);
        results.noSchema.push({ url });
        continue;
      }

      const { issues, recommendations } = validateSchemas(url, schemas, types);

      if (issues.length > 0) {
        console.log(`  ${colors.red}✗${colors.reset} ${shortUrl}`);
        issues.forEach(issue => {
          console.log(`    ${colors.red}→ ${issue}${colors.reset}`);
        });
        results.errors.push({ url, issues, types });
      } else if (recommendations.length > 0) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${shortUrl} - ${colors.dim}${types.join(', ')}${colors.reset}`);
        recommendations.forEach(rec => {
          console.log(`    ${colors.dim}→ ${rec}${colors.reset}`);
        });
        results.warnings.push({ url, recommendations, types });
      } else {
        console.log(`  ${colors.green}✓${colors.reset} ${shortUrl} - ${colors.dim}${types.join(', ')}${colors.reset}`);
        results.valid.push({ url, types });
      }
    }

    console.log('');
  }

  // Summary
  const total = urls.length;
  const validPercent = Math.round((results.valid.length / total) * 100);

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              VALIDATION SUMMARY                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}

  ${colors.green}✓ Valid:${colors.reset}           ${results.valid.length} pages
  ${colors.yellow}⚠ Warnings:${colors.reset}        ${results.warnings.length} pages (recommendations)
  ${colors.red}✗ Errors:${colors.reset}          ${results.errors.length} pages (missing required)
  ${colors.yellow}○ No Schema:${colors.reset}       ${results.noSchema.length} pages

  ${colors.dim}Total pages:${colors.reset}       ${total}
`);

  // Schema type coverage
  const allTypes = new Map();
  [...results.valid, ...results.warnings].forEach(r => {
    r.types?.forEach(t => {
      allTypes.set(t, (allTypes.get(t) || 0) + 1);
    });
  });

  console.log(`${colors.cyan}Schema Type Coverage:${colors.reset}`);
  const sortedTypes = [...allTypes.entries()].sort((a, b) => b[1] - a[1]);
  sortedTypes.forEach(([type, count]) => {
    const bar = '█'.repeat(Math.round((count / total) * 30));
    console.log(`  ${type.padEnd(25)} ${bar} ${count}`);
  });

  // Score
  const scoreColor = validPercent >= 90 ? colors.green : validPercent >= 70 ? colors.yellow : colors.red;

  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                              SCHEMA SCORE                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}
${scoreColor}                                   ${validPercent}%                                      ${colors.reset}
${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Exit with error if issues found
  if (results.errors.length > 0 || results.noSchema.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
