#!/usr/bin/env node
/**
 * IndexNow Submission Script
 * Submits all sitemap URLs to Bing/Yandex via IndexNow protocol
 *
 * Usage: node scripts/submit-indexnow.mjs
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const SITEMAP_URL = `${SITE_URL}/sitemap-0.xml`;
const INDEXNOW_KEY = '0b54e9559a2f7aa045f17e210119c4d5';

// IndexNow endpoints (submit to multiple for redundancy)
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
];

async function fetchSitemap() {
  console.log(`\n📥 Fetching sitemap from ${SITEMAP_URL}...`);
  const response = await fetch(SITEMAP_URL);
  const xml = await response.text();

  // Extract URLs from sitemap XML
  const urls = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }

  console.log(`   Found ${urls.length} URLs in sitemap`);
  return urls;
}

async function submitToIndexNow(endpoint, urls) {
  const payload = {
    host: 'www.newlifesolutions.dev',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    return {
      endpoint,
      status: response.status,
      ok: response.ok || response.status === 202 || response.status === 200
    };
  } catch (error) {
    return {
      endpoint,
      status: 'ERROR',
      ok: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           INDEXNOW BULK SUBMISSION SCRIPT                    ║');
  console.log('║           New Life Solutions - Bing/Yandex Indexing          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Step 1: Fetch sitemap URLs
  const urls = await fetchSitemap();

  if (urls.length === 0) {
    console.log('❌ No URLs found in sitemap!');
    process.exit(1);
  }

  // Step 2: Submit to all IndexNow endpoints
  console.log('\n📤 Submitting to IndexNow endpoints...\n');

  const results = await Promise.all(
    INDEXNOW_ENDPOINTS.map(endpoint => submitToIndexNow(endpoint, urls))
  );

  // Step 3: Display results
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      SUBMISSION RESULTS                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  for (const result of results) {
    const status = result.ok ? '✅' : '❌';
    const endpoint = result.endpoint.replace('https://', '').padEnd(25);
    console.log(`║  ${status} ${endpoint} Status: ${result.status}`.padEnd(63) + '║');
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  URLs Submitted: ${urls.length}`.padEnd(63) + '║');
  console.log(`║  Key: ${INDEXNOW_KEY}`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Step 4: Show sample of submitted URLs
  console.log('\n📋 Sample URLs submitted:');
  urls.slice(0, 10).forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
  });
  if (urls.length > 10) {
    console.log(`   ... and ${urls.length - 10} more`);
  }

  // Status codes reference
  console.log('\n📖 Status Code Reference:');
  console.log('   200/202 = Success - URLs accepted for crawling');
  console.log('   400 = Bad request - Check payload format');
  console.log('   403 = Key not found - Deploy key file first');
  console.log('   422 = Invalid URLs - Check URL format');
  console.log('   429 = Too many requests - Rate limited');
}

main().catch(console.error);
