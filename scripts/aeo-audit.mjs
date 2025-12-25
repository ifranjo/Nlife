#!/usr/bin/env node
/**
 * AEO (Answer Engine Optimization) Audit Tool
 * Tests site visibility in AI search engines
 *
 * Usage: node scripts/aeo-audit.mjs
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const BRAND_NAME = 'New Life Solutions';

// Test queries that should surface the site in AI search
const TEST_QUERIES = [
  'free pdf merge online browser based',
  'compress image without uploading',
  'remove background from image free no signup',
  'transcribe audio to text free browser',
  'pdf to word converter privacy focused',
  'free online video compressor',
  'ocr extract text from image free',
  'qr code generator free no watermark',
  'split pdf online free secure',
  'remove vocals from song free online'
];

// Tools to check
const TOOLS_TO_CHECK = [
  { name: 'PDF Merge', path: '/tools/pdf-merge', keywords: ['pdf merge', 'combine pdf'] },
  { name: 'Image Compress', path: '/tools/image-compress', keywords: ['compress image', 'reduce image size'] },
  { name: 'Background Remover', path: '/tools/background-remover', keywords: ['remove background', 'transparent background'] },
  { name: 'Audio Transcription', path: '/tools/audio-transcription', keywords: ['transcribe audio', 'speech to text'] },
  { name: 'Video Compressor', path: '/tools/video-compressor', keywords: ['compress video', 'reduce video size'] }
];

async function checkSchemaMarkup(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const schemas = {
      hasWebApplication: html.includes('"@type":"WebApplication"') || html.includes('"@type": "WebApplication"'),
      hasHowTo: html.includes('"@type":"HowTo"') || html.includes('"@type": "HowTo"'),
      hasFAQPage: html.includes('"@type":"FAQPage"') || html.includes('"@type": "FAQPage"'),
      hasSpeakable: html.includes('SpeakableSpecification') || html.includes('speakable'),
      hasBreadcrumb: html.includes('"@type":"BreadcrumbList"') || html.includes('"@type": "BreadcrumbList"'),
    };

    return schemas;
  } catch (error) {
    return { error: error.message };
  }
}

async function checkAEOReadiness(toolUrl) {
  try {
    const response = await fetch(toolUrl);
    const html = await response.text();

    const checks = {
      // Title tag present and descriptive
      hasTitle: /<title>[^<]{20,}<\/title>/.test(html),
      // Meta description present
      hasMetaDesc: /<meta\s+name="description"/.test(html),
      // H1 present
      hasH1: /<h1[^>]*>/.test(html),
      // TL;DR or summary section
      hasTLDR: html.includes('class="tldr"') || html.includes('tl;dr') || html.includes('TL;DR'),
      // FAQ section
      hasFAQ: html.includes('FAQ') || html.includes('faq') || html.includes('frequently asked'),
      // How-to steps
      hasSteps: html.includes('step') || html.includes('Step'),
      // Trust signals
      hasTrustSignals: html.includes('trust-signal') || html.includes('100%') || html.includes('free'),
      // Last updated date
      hasDateInfo: html.includes('Updated') || html.includes('dateModified'),
    };

    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, maxScore: Object.keys(checks).length };
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           AEO (ANSWER ENGINE OPTIMIZATION) AUDIT                     ║');
  console.log('║           New Life Solutions - AI Search Readiness                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Check main pages
  console.log('\n📊 SCHEMA MARKUP ANALYSIS\n');
  console.log('┌────────────────────────────┬───────┬───────┬───────┬───────┬───────┐');
  console.log('│ Page                       │ WebApp│ HowTo │  FAQ  │ Speak │ Bread │');
  console.log('├────────────────────────────┼───────┼───────┼───────┼───────┼───────┤');

  for (const tool of TOOLS_TO_CHECK) {
    const url = `${SITE_URL}${tool.path}`;
    const schemas = await checkSchemaMarkup(url);

    if (schemas.error) {
      console.log(`│ ${tool.name.padEnd(26)} │ ERROR │ ERROR │ ERROR │ ERROR │ ERROR │`);
    } else {
      const wa = schemas.hasWebApplication ? '  ✓  ' : '  ✗  ';
      const ht = schemas.hasHowTo ? '  ✓  ' : '  ✗  ';
      const fq = schemas.hasFAQPage ? '  ✓  ' : '  ✗  ';
      const sp = schemas.hasSpeakable ? '  ✓  ' : '  ✗  ';
      const bc = schemas.hasBreadcrumb ? '  ✓  ' : '  ✗  ';
      console.log(`│ ${tool.name.padEnd(26)} │${wa}│${ht}│${fq}│${sp}│${bc}│`);
    }
  }

  console.log('└────────────────────────────┴───────┴───────┴───────┴───────┴───────┘');

  // AEO Readiness Scores
  console.log('\n📈 AEO READINESS SCORES\n');
  console.log('┌────────────────────────────┬───────┬─────────────────────────────────┐');
  console.log('│ Tool                       │ Score │ Progress                        │');
  console.log('├────────────────────────────┼───────┼─────────────────────────────────┤');

  let totalScore = 0;
  let maxTotal = 0;

  for (const tool of TOOLS_TO_CHECK) {
    const url = `${SITE_URL}${tool.path}`;
    const result = await checkAEOReadiness(url);

    if (result.error) {
      console.log(`│ ${tool.name.padEnd(26)} │ ERROR │ Connection failed               │`);
    } else {
      totalScore += result.score;
      maxTotal += result.maxScore;
      const pct = Math.round((result.score / result.maxScore) * 100);
      const filled = Math.round(pct / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      console.log(`│ ${tool.name.padEnd(26)} │ ${result.score}/${result.maxScore}   │ ${bar} ${pct}% │`);
    }
  }

  console.log('└────────────────────────────┴───────┴─────────────────────────────────┘');

  const overallPct = Math.round((totalScore / maxTotal) * 100);
  console.log(`\n📊 Overall AEO Score: ${totalScore}/${maxTotal} (${overallPct}%)`);

  // Recommendations
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         RECOMMENDATIONS                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  1. Submit to AI search engines:                                     ║');
  console.log('║     • Perplexity: perplexity.ai (uses IndexNow - already done!)     ║');
  console.log('║     • ChatGPT: Uses Bing index (IndexNow submitted!)                ║');
  console.log('║     • Google AI: Waiting for Google to index                        ║');
  console.log('║                                                                      ║');
  console.log('║  2. Content optimization for AI citations:                           ║');
  console.log('║     • Add "2025" to titles/descriptions (AI prefers recent)         ║');
  console.log('║     • Use listicle format (32% of AI citations are listicles)       ║');
  console.log('║     • Add comparison tables (AI loves structured data)              ║');
  console.log('║                                                                      ║');
  console.log('║  3. Build authority signals:                                         ║');
  console.log('║     • Get cited by authoritative sources                            ║');
  console.log('║     • Add expert author bios                                        ║');
  console.log('║     • Include citations/references                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Test queries for manual verification
  console.log('\n🔍 TEST THESE QUERIES IN AI SEARCH ENGINES:\n');
  TEST_QUERIES.forEach((q, i) => {
    console.log(`   ${i + 1}. "${q}"`);
  });

  console.log('\n📱 Test in:');
  console.log('   • https://www.perplexity.ai');
  console.log('   • https://chat.openai.com');
  console.log('   • https://www.bing.com/chat');
  console.log('   • https://gemini.google.com');
}

main().catch(console.error);
