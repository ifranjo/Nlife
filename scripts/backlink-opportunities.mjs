#!/usr/bin/env node
/**
 * Backlink Opportunity Finder
 * Premium directories and submission platforms for New Life Solutions
 *
 * Usage: node scripts/backlink-opportunities.mjs
 */

const SITE_URL = 'https://www.newlifesolutions.dev';
const TOOL_NAME = 'New Life Solutions';
const DESCRIPTION = 'Free browser-based tools for PDF, images, audio, and video. 100% client-side processing - your files never leave your browser.';

// Categorized backlink opportunities
const OPPORTUNITIES = {
  // High-priority free directories (high DA)
  highPriority: [
    {
      name: 'Product Hunt',
      url: 'https://www.producthunt.com/posts/new',
      da: 91,
      type: 'Launch Platform',
      cost: 'Free',
      timeline: 'Immediate',
      notes: 'Best for launch day. Schedule for Tuesday 12:01 AM PST.'
    },
    {
      name: 'Hacker News (Show HN)',
      url: 'https://news.ycombinator.com/submit',
      da: 95,
      type: 'Community',
      cost: 'Free',
      timeline: 'Immediate',
      notes: 'Title format: "Show HN: Free browser-based PDF/image tools - 100% client-side"'
    },
    {
      name: 'Reddit r/InternetIsBeautiful',
      url: 'https://www.reddit.com/r/InternetIsBeautiful/submit',
      da: 95,
      type: 'Community',
      cost: 'Free',
      timeline: 'Immediate',
      notes: 'Also try: r/webdev, r/SideProject, r/Entrepreneur'
    },
    {
      name: 'Indie Hackers',
      url: 'https://www.indiehackers.com/products/new',
      da: 75,
      type: 'Community',
      cost: 'Free',
      timeline: '1-2 days',
      notes: 'Share your building journey, not just the product'
    },
    {
      name: 'BetaList',
      url: 'https://betalist.com/submit',
      da: 68,
      type: 'Startup Directory',
      cost: 'Free (waitlist) / $129 (featured)',
      timeline: '2-4 weeks free / 48h paid',
      notes: 'Good for early adopter feedback'
    }
  ],

  // Tool directories (free submissions)
  toolDirectories: [
    {
      name: 'There\'s An AI For That',
      url: 'https://theresanaiforthat.com/submit/',
      da: 72,
      type: 'AI Directory',
      cost: 'Free / $99 featured',
      timeline: '1-2 weeks',
      notes: 'Submit AI tools (transcription, background removal)'
    },
    {
      name: 'Tool Finder',
      url: 'https://toolfinder.co/submit-your-tool',
      da: 45,
      type: 'Tool Directory',
      cost: 'Free',
      timeline: '2-3 weeks',
      notes: 'Gets dedicated page with reviews'
    },
    {
      name: 'Tool IDX',
      url: 'https://toolidx.com/submit-tool',
      da: 35,
      type: 'Tool Directory',
      cost: 'Free / $29 fast track',
      timeline: '2-3 weeks free / 72h paid',
      notes: '2.4M visitors in 2024'
    },
    {
      name: 'Futurepedia',
      url: 'https://www.futurepedia.io/submit-tool',
      da: 65,
      type: 'AI Directory',
      cost: 'Free',
      timeline: '1-2 weeks',
      notes: 'Focus on AI tools, high authority in AI space'
    },
    {
      name: 'OpenTools',
      url: 'https://opentools.ai/submit',
      da: 40,
      type: 'Tool Directory',
      cost: 'Free',
      timeline: '1 week',
      notes: 'Open-source friendly'
    },
    {
      name: 'SaaS Hub',
      url: 'https://www.saashub.com/submit',
      da: 55,
      type: 'SaaS Directory',
      cost: 'Free',
      timeline: '1-2 weeks',
      notes: 'Good for B2B visibility'
    },
    {
      name: 'AlternativeTo',
      url: 'https://alternativeto.net/add-app/',
      da: 85,
      type: 'Alternative Directory',
      cost: 'Free',
      timeline: '1 week',
      notes: 'Position as alternative to iLovePDF, TinyPNG, etc.'
    },
    {
      name: 'G2',
      url: 'https://www.g2.com/products/new',
      da: 92,
      type: 'Software Reviews',
      cost: 'Free listing',
      timeline: '2-4 weeks',
      notes: 'Very high DA, worth the effort'
    }
  ],

  // Launch platforms (free tier available)
  launchPlatforms: [
    {
      name: 'Uneed',
      url: 'https://www.uneed.best/submit',
      da: 45,
      type: 'Launch Platform',
      cost: 'Free (waitlist) / $30 skip',
      timeline: '2 weeks free / Immediate paid',
      notes: 'Dofollow links, growing community'
    },
    {
      name: 'Dev Hunt',
      url: 'https://devhunt.org/submit',
      da: 35,
      type: 'Developer Launch',
      cost: 'Free',
      timeline: '1 week',
      notes: 'Developer-focused, dofollow links'
    },
    {
      name: 'Peerlist',
      url: 'https://peerlist.io/launch',
      da: 40,
      type: 'Launch Platform',
      cost: 'Free',
      timeline: 'Mondays',
      notes: 'New products listed every Monday'
    },
    {
      name: 'MicroLaunch',
      url: 'https://microlaunch.net/submit',
      da: 30,
      type: 'Launch Platform',
      cost: 'Free / $49 featured',
      timeline: '1 week',
      notes: 'Great for side projects'
    },
    {
      name: 'Launching Next',
      url: 'https://www.launchingnext.com/submit/',
      da: 48,
      type: 'Launch Platform',
      cost: 'Free',
      timeline: '1-2 weeks',
      notes: 'Startup launches and updates'
    }
  ],

  // HARO alternatives for backlinks
  haroAlternatives: [
    {
      name: 'Source of Sources (SOS)',
      url: 'https://sourceofsources.com/',
      da: null,
      type: 'Journalist Outreach',
      cost: 'Free',
      timeline: 'Ongoing',
      notes: 'By HARO founder. Respond to journalist queries about PDF/image tools'
    },
    {
      name: 'Qwoted',
      url: 'https://www.qwoted.com/',
      da: null,
      type: 'Journalist Outreach',
      cost: 'Free (2/mo) / $149+/mo',
      timeline: 'Ongoing',
      notes: 'Higher quality publications'
    },
    {
      name: 'Help A B2B Writer',
      url: 'https://helpab2bwriter.com/',
      da: null,
      type: 'B2B Content',
      cost: 'Free',
      timeline: 'Ongoing',
      notes: 'Great for SaaS/tool mentions'
    },
    {
      name: 'Featured (ex-Terkel)',
      url: 'https://featured.com/',
      da: null,
      type: 'Expert Quotes',
      cost: 'Free',
      timeline: 'Ongoing',
      notes: 'Fast Company, GoDaddy writers use this'
    }
  ]
};

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           BACKLINK OPPORTUNITY FINDER - PREMIUM EDITION                      ║');
  console.log('║           New Life Solutions - SEO Authority Building                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log(`\n🌐 Site: ${SITE_URL}`);
  console.log(`📝 Description: ${DESCRIPTION}\n`);

  // High Priority
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  🔥 HIGH PRIORITY (DA 75+) - Do These First!');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  OPPORTUNITIES.highPriority.forEach((opp, i) => {
    console.log(`  ${i + 1}. ${opp.name} (DA: ${opp.da})`);
    console.log(`     URL: ${opp.url}`);
    console.log(`     Cost: ${opp.cost} | Timeline: ${opp.timeline}`);
    console.log(`     💡 ${opp.notes}\n`);
  });

  // Tool Directories
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  📁 TOOL DIRECTORIES - Build Domain Authority');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  OPPORTUNITIES.toolDirectories.forEach((opp, i) => {
    console.log(`  ${i + 1}. ${opp.name} (DA: ${opp.da})`);
    console.log(`     URL: ${opp.url}`);
    console.log(`     Cost: ${opp.cost} | Timeline: ${opp.timeline}`);
    console.log(`     💡 ${opp.notes}\n`);
  });

  // Launch Platforms
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  🚀 LAUNCH PLATFORMS - Community Exposure');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  OPPORTUNITIES.launchPlatforms.forEach((opp, i) => {
    console.log(`  ${i + 1}. ${opp.name} (DA: ${opp.da})`);
    console.log(`     URL: ${opp.url}`);
    console.log(`     Cost: ${opp.cost} | Timeline: ${opp.timeline}`);
    console.log(`     💡 ${opp.notes}\n`);
  });

  // HARO Alternatives
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  📰 JOURNALIST OUTREACH (HARO Alternatives) - High Authority Backlinks');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  OPPORTUNITIES.haroAlternatives.forEach((opp, i) => {
    console.log(`  ${i + 1}. ${opp.name}`);
    console.log(`     URL: ${opp.url}`);
    console.log(`     Cost: ${opp.cost} | Timeline: ${opp.timeline}`);
    console.log(`     💡 ${opp.notes}\n`);
  });

  // Summary
  const totalFree = [...OPPORTUNITIES.highPriority, ...OPPORTUNITIES.toolDirectories, ...OPPORTUNITIES.launchPlatforms]
    .filter(o => o.cost.toLowerCase().includes('free')).length;

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  console.log(`  Total opportunities: ${OPPORTUNITIES.highPriority.length + OPPORTUNITIES.toolDirectories.length + OPPORTUNITIES.launchPlatforms.length + OPPORTUNITIES.haroAlternatives.length}`);
  console.log(`  Free submissions: ${totalFree}`);
  console.log(`  Highest DA sites: G2 (92), Product Hunt (91), Reddit (95), AlternativeTo (85)`);
  console.log(`\n  ⏱️  Recommended order:`);
  console.log(`     1. Week 1: High priority (PH, HN, Reddit, Indie Hackers)`);
  console.log(`     2. Week 2: Tool directories (AlternativeTo, G2, TAAFT)`);
  console.log(`     3. Week 3: Launch platforms (Uneed, DevHunt, Peerlist)`);
  console.log(`     4. Ongoing: HARO alternatives for journalist mentions`);

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 PRO TIP: Copy your submission text template below                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('─── SUBMISSION TEMPLATE ───────────────────────────────────────────────────────\n');
  console.log(`Title: New Life Solutions - Free Browser-Based PDF, Image & Audio Tools\n`);
  console.log(`Tagline: 100% client-side processing. Your files never leave your browser.\n`);
  console.log(`Description:`);
  console.log(`New Life Solutions offers 24+ free browser-based tools for PDF manipulation,`);
  console.log(`image editing, audio transcription, and video processing. Unlike other online`);
  console.log(`tools, all processing happens 100% in your browser - your files are never`);
  console.log(`uploaded to any server, ensuring complete privacy and security.\n`);
  console.log(`Key Features:`);
  console.log(`• PDF: Merge, Split, Compress, Convert to Word, Fill Forms, Redact`);
  console.log(`• Images: Compress, Remove Background, Upscale, OCR, Remove Objects`);
  console.log(`• Audio: AI Transcription (Whisper), Remove Vocals, Edit, Audiograms`);
  console.log(`• Video: Compress, Trim, Convert to MP3, Generate Subtitles\n`);
  console.log(`URL: ${SITE_URL}`);
  console.log(`Pricing: Free forever (no signup required)`);
  console.log(`────────────────────────────────────────────────────────────────────────────────\n`);
}

main();
