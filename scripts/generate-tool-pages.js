#!/usr/bin/env node

/**
 * Batch Tool Page Generator
 *
 * Generates optimized tool pages using Answer-First GEO strategy
 * from the YAML metadata file.
 *
 * Usage: node scripts/generate-tool-pages.js
 *
 * This script will:
 * 1. Read tools-metadata-full.yaml
 * 2. Generate .astro pages for each tool
 * 3. Use the Answer-First GEO template structure
 * 4. Create pages in apps/web/src/pages/tools/
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, prefix, message) {
  console.log(`${color}${colors.bold}${prefix}${colors.reset} ${message}`);
}

function info(msg) { log(colors.cyan, 'INFO', msg); }
function success(msg) { log(colors.green, 'SUCCESS', msg); }
function warn(msg) { log(colors.yellow, 'WARN', msg); }
function error(msg) { log(colors.red, 'ERROR', msg); }

// Load and parse YAML metadata
function loadMetadata() {
  const yamlPath = path.join(__dirname, '../data/tools-metadata-full.yaml');

  if (!fs.existsSync(yamlPath)) {
    error(`Metadata file not found: ${yamlPath}`);
    error('Please ensure data/tools-metadata-full.yaml exists');
    process.exit(1);
  }

  try {
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const data = yaml.load(yamlContent);
    return data.tools || [];
  } catch (err) {
    error(`Failed to parse YAML metadata: ${err.message}`);
    process.exit(1);
  }
}

// Generate the Astro page content for a tool
function generateToolPage(tool) {
  const isComingSoon = tool.status === 'coming-soon' || tool.tier === 'pro';

  // Common frontmatter for all tools
  const frontmatter = `---
/**
 * ${tool.name} - AI-Native Tool Page
 *
 * Optimized for LLM extraction with:
 * - TL;DR answer box (50-70 words)
 * - Semantic Q&A sections
 * - Full schema markup (SoftwareApplication, HowTo, FAQPage)
 */
import Layout from '../../layouts/Layout.astro';
import Navbar from '../../components/ui/Navbar.astro';
import Footer from '../../components/ui/Footer.astro';
import AnswerBox from '../../components/seo/AnswerBox.astro';
import QASections from '../../components/seo/QASections.astro';
import SchemaMarkup from '../../components/seo/SchemaMarkup.astro';
${isComingSoon ? '' : `import ${tool.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')} from '../../components/tools/${tool.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}';`}

// Tool metadata
const tool = {
  id: '${tool.id}',
  name: '${tool.name}',
  category: '${tool.category}' as const,
  url: '/tools/${tool.id}',
  tier: '${tool.tier || 'free'}' as const
};

// AI-optimized content
const seoContent = {
  // Page meta
  title: '${tool.name} - ${tool.title ? tool.title.split(' - ')[1] : 'Free Online Tool'} | New Life Solutions',
  description: '${tool.description.charAt(0).toUpperCase() + tool.description.slice(0, 150)}${tool.description.length > 150 ? '...' : ''}',

  // TL;DR Answer Box (50-70 words - this is what AI extracts)
  answerBox: {
    title: '${tool.answerBox.title}',
    queryTarget: '${tool.queryTarget}',
    tldr: \`${tool.tldr}\`,
    trustSignals: ${JSON.stringify(tool.trustSignals)}
  },

  // Q&A Sections
  qa: {
    whatIs: {
      answer: \`${tool.whatIs}\`,
      context: '${tool.useCases[0]}'
    },
    howItWorks: {
      steps: ${JSON.stringify(tool.howItWorks)}
    },
    whyBrowserBased: {
      benefits: ${JSON.stringify(tool.whyBrowserBased)}
    },
    faqs: ${JSON.stringify(tool.questions || [])}
  }
};

// Schema data
const schemaData = {
  toolId: tool.id,
  toolName: tool.name,
  description: seoContent.description,
  category: tool.category,
  steps: seoContent.qa.howItWorks.steps,
  faqs: seoContent.qa.faqs,
  url: tool.url
};
---

<Layout
  title={seoContent.title}
  description={seoContent.description}
  image="/thumbnails/${tool.id}.svg"
>
  <!-- Schema Markup for AI extraction -->
  <SchemaMarkup {...schemaData} />

  <Navbar />

  <main class="pt-20 pb-16 px-6 min-h-screen">
    <div class="max-w-3xl mx-auto">

      <!-- Answer Box: AI extracts this first -->
      <AnswerBox
        title={seoContent.answerBox.title}
        tldr={seoContent.answerBox.tldr}
        toolName={tool.name}
        queryTarget={seoContent.answerBox.queryTarget}
        trustSignals={seoContent.answerBox.trustSignals}
      />

      ${isComingSoon ? `
      <!-- Coming Soon Notice -->
      <section class="coming-soon-notice" aria-label="Coming soon">
        <div class="notice-content">
          <h2 class="text-2xl font-bold mb-4">${tool.name} - Coming Soon</h2>
          <p class="text-lg text-dim mb-6">
            We're working hard to bring you ${tool.name.toLowerCase()}.
            This tool will ${tool.primaryBenefit}.
          </p>
          <div class="features-preview">
            <h3 class="text-lg font-semibold mb-4">Key Features:</h3>
            <ul class="feature-list">
              ${tool.keyFeature ? `<li>✓ ${tool.keyFeature}</li>` : ''}
              <li>${tool.trustSignals.map(signal => `✓ ${signal}`).join('</li><li>')}</li>
            </ul>
          </div>
          <div class="mt-8">
            <a href="/hub" class="btn-primary">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
              </svg>
              Back to Tools
            </a>
          </div>
        </div>
      </section>
      ` : `
      <!-- Tool Component -->
      <section class="tool-section" aria-label="${tool.name} Tool">
        <${tool.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')} client:load />
      </section>
      `}

      <!-- Q&A Sections: Semantic structure for AI -->
      ${!isComingSoon ? `<QASections
        toolName={tool.name}
        whatIs={seoContent.qa.whatIs}
        howItWorks={seoContent.qa.howItWorks}
        whyBrowserBased={seoContent.qa.whyBrowserBased}
        faqs={seoContent.qa.faqs}
      />` : ''}

    </div>
  </main>

  <Footer />
</Layout>

<style>
  .tool-section {
    margin: 2rem 0;
  }

  ${isComingSoon ? `
  .coming-soon-notice {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 3rem 2rem;
    text-align: center;
    margin: 2rem 0;
  }

  .notice-content {
    max-width: 600px;
    margin: 0 auto;
  }

  .features-preview {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0;
    padding: 1.5rem;
    margin: 2rem 0;
    text-align: left;
  }

  .feature-list {
    list-style: none;
    padding: 0;
  }

  .feature-list li {
    padding: 0.25rem 0;
    color: var(--text);
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0;
    text-decoration: none;
    font-weight: 500;
    transition: transform 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
  }
  ` : ''}
</style>
`;

  return frontmatter;
}

// Main generation function
async function generatePages() {
  info('Loading tool metadata from data/tools-metadata-full.yaml...');

  const tools = loadMetadata();

  if (tools.length === 0) {
    error('No tools found in metadata file');
    process.exit(1);
  }

  success(`Loaded metadata for ${tools.length} tools`);

  // Create output directory
  const outputDir = path.join(__dirname, '../apps/web/src/pages/tools');

  if (!fs.existsSync(outputDir)) {
    info(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let generatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Process each tool
  for (const tool of tools) {
    try {
      const filename = `${tool.id}.astro`;
      const filepath = path.join(outputDir, filename);

      // Skip if file already exists (to prevent overwriting custom pages)
      if (fs.existsSync(filepath)) {
        warn(`Skipping ${filename} - file already exists`);
        skippedCount++;
        continue;
      }

      info(`Generating ${filename}...`);

      // Check if React component exists (for non-coming-soon tools)
      if (tool.tier !== 'pro' && tool.status !== 'coming-soon') {
        const componentName = tool.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
        const componentPath = path.join(__dirname, `../apps/web/src/components/tools/${componentName}.tsx`);

        if (!fs.existsSync(componentPath)) {
          warn(`React component not found for ${tool.id}: ${componentPath}`);
          warn(`Tool page will be generated but component will need to be created`);
        }
      }

      // Generate the page content
      const pageContent = generateToolPage(tool);

      // Write the file
      fs.writeFileSync(filepath, pageContent, 'utf8');
      success(`Generated ${filename}`);
      generatedCount++;

    } catch (err) {
      error(`Failed to generate ${tool.id}.astro: ${err.message}`);
      failedCount++;
    }
  }

  // Summary
  info('\\n=== Generation Summary ===');
  success(`✓ Generated: ${generatedCount} pages`);
  warn(`⊘ Skipped: ${skippedCount} pages (already exist)`);
  if (failedCount > 0) {
    error(`✗ Failed: ${failedCount} pages`);
  } else {
    success(`✗ Failed: ${failedCount} pages`);
  }

  // Next steps
  info('\\n=== Next Steps ===');
  info('1. Review generated pages in apps/web/src/pages/tools/');
  info('2. Create missing React components in apps/web/src/components/tools/');
  info('3. Test pages with: cd apps/web && npm run dev');
  info('4. Update tools registry in apps/web/src/lib/tools.ts');

  if (skippedCount > 0) {
    warn('\\nNote: Some pages were skipped because they already exist.');
    warn('To regenerate these pages, delete them first or modify the script logic.');
  }
}

// Run the generator
generatePages().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
