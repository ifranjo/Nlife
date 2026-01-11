#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Validation Pipeline for New Tools
 *
 * Validates that new tools meet quality standards:
 * 1. Tool is properly registered in tools.ts
 * 2. Required files exist (component, page, tests)
 * 3. Tests pass (functional, accessibility, visual)
 * 4. Code quality checks
 * 5. SEO requirements
 * 6. Accessibility requirements
 */

const args = process.argv.slice(2);
const toolId = args[0];
const skipTests = args.includes('--skip-tests');
const verbose = args.includes('--verbose');

if (!toolId) {
  console.error('Usage: node validate-new-tool.js tool-id [--skip-tests] [--verbose]');
  console.error('Example: node validate-new-tool.js pdf-organizer');
  process.exit(1);
}

const paths = {
  toolsTs: 'apps/web/src/lib/tools.ts',
  component: `apps/web/src/components/tools/${toolId}.tsx`,
  page: `apps/web/src/pages/tools/${toolId}.astro`,
  functionalTest: `apps/web/tests/${toolId}.spec.ts`,
  a11yTest: `apps/web/tests/accessibility/${toolId}.spec.ts`,
  visualTest: `apps/web/tests/visual/${toolId}.spec.ts`,
  thumbnail: `apps/web/public/thumbnails/${toolId}.svg`
};

// Validation results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function log(message, type = 'info') {
  if (type === 'error') console.error('❌', message);
  else if (type === 'success') console.log('✅', message);
  else if (type === 'warning') console.warn('⚠️ ', message);
  else if (verbose) console.log('ℹ️ ', message);
}

function addResult(check, passed, message) {
  if (passed) {
    results.passed.push(check);
    log(`${check}: ${message}`, 'success');
  } else {
    results.failed.push(check);
    log(`${check}: ${message}`, 'error');
  }
}

function addWarning(check, message) {
  results.warnings.push(check);
  log(`${check}: ${message}`, 'warning');
}

async function checkFileExists(filePath, checkName) {
  try {
    await fs.access(filePath);
    addResult(checkName, true, 'File exists');
    return true;
  } catch {
    addResult(checkName, false, `File not found: ${filePath}`);
    return false;
  }
}

async function checkToolRegistration() {
  try {
    const content = await fs.readFile(paths.toolsTs, 'utf8');
    const toolRegex = new RegExp(`id:\s*['"]${toolId}['"]`, 'i');

    if (toolRegex.test(content)) {
      addResult('Tool Registration', true, 'Tool found in tools.ts');

      // Extract tool object for further validation
      const toolMatch = content.match(new RegExp(`{[^}]*id:\s*['"]${toolId}['"][^}]*}`, 's'));
      if (toolMatch) {
        const toolObj = toolMatch[0];

        // Check required fields
        const requiredFields = ['name', 'description', 'icon', 'thumbnail', 'category', 'tier', 'href'];
        for (const field of requiredFields) {
          const fieldRegex = new RegExp(`${field}:\\s*['"][^'"]+['"]`, 'i');
          if (!fieldRegex.test(toolObj)) {
            addWarning('Tool Registration', `Missing or empty field: ${field}`);
          }
        }

        // Check SEO fields
        if (!toolObj.includes('seo:')) {
          addWarning('Tool Registration', 'Missing SEO configuration');
        }

        // Check FAQ
        if (!toolObj.includes('faq:')) {
          addWarning('Tool Registration', 'Missing FAQ section');
        }
      }
    } else {
      addResult('Tool Registration', false, 'Tool not found in tools.ts');
    }
  } catch (error) {
    addResult('Tool Registration', false, `Error reading tools.ts: ${error.message}`);
  }
}

async function checkComponentQuality() {
  const exists = await checkFileExists(paths.component, 'Component File');
  if (!exists) return;

  try {
    const content = await fs.readFile(paths.component, 'utf8');

    // Check imports
    if (!content.includes('useState')) {
      addWarning('Component Quality', 'Missing useState import');
    }
    if (!content.includes('validateFile')) {
      addWarning('Component Quality', 'Missing security validation import');
    }
    if (!content.includes('sanitizeFilename')) {
      addWarning('Component Quality', 'Missing filename sanitization import');
    }

    // Check error handling
    if (!content.includes('try') || !content.includes('catch')) {
      addWarning('Component Quality', 'Missing try-catch error handling');
    }

    // Check privacy notice
    if (!content.includes('never leave your browser') && !content.includes('processed locally')) {
      addWarning('Component Quality', 'Missing privacy notice');
    }

    // Check accessibility
    if (!content.includes('aria-')) {
      addWarning('Component Quality', 'Missing ARIA attributes');
    }

    // Check file size validation
    const hasSizeValidation = content.includes('validateFile') || content.includes('size');
    if (!hasSizeValidation) {
      addWarning('Component Quality', 'Missing file size validation');
    }

    addResult('Component Quality', true, 'Basic quality checks passed');
  } catch (error) {
    addResult('Component Quality', false, `Error reading component: ${error.message}`);
  }
}

async function checkPageQuality() {
  const exists = await checkFileExists(paths.page, 'Astro Page');
  if (!exists) return;

  try {
    const content = await fs.readFile(paths.page, 'utf8');

    // Check imports
    const requiredImports = ['Layout', 'AnswerBox', 'SchemaMarkup'];
    for (const imp of requiredImports) {
      if (!content.includes(`import ${imp}`)) {
        addWarning('Page Quality', `Missing import: ${imp}`);
      }
    }

    // Check SEO components
    if (!content.includes('<AnswerBox')) {
      addWarning('Page Quality', 'Missing AnswerBox component');
    }
    if (!content.includes('<SchemaMarkup')) {
      addWarning('Page Quality', 'Missing SchemaMarkup component');
    }

    // Check navigation
    if (!content.includes('href="/hub"')) {
      addWarning('Page Quality', 'Missing back navigation to hub');
    }

    addResult('Page Quality', true, 'Basic quality checks passed');
  } catch (error) {
    addResult('Page Quality', false, `Error reading page: ${error.message}`);
  }
}

async function checkTestCoverage() {
  const requiredTests = [
    { path: paths.functionalTest, name: 'Functional Tests' },
    { path: paths.a11yTest, name: 'Accessibility Tests' },
    { path: paths.visualTest, name: 'Visual Tests' }
  ];

  for (const test of requiredTests) {
    const exists = await checkFileExists(test.path, test.name);
    if (!exists) continue;

    try {
      const content = await fs.readFile(test.path, 'utf8');

      // Check for basic test structure
      if (!content.includes('test.describe')) {
        addWarning(test.name, 'Missing test.describe block');
      }
      if (!content.includes('test.beforeEach')) {
        addWarning(test.name, 'Missing test.beforeEach block');
      }
      if (!content.includes('expect(')) {
        addWarning(test.name, 'Missing assertions');
      }

      // Test-specific checks
      if (test.name === 'Accessibility Tests') {
        if (!content.includes('AxeBuilder')) {
          addWarning(test.name, 'Missing axe-core integration');
        }
        if (!content.includes('wcag2aa')) {
          addWarning(test.name, 'Missing WCAG 2.1 AA tests');
        }
      }

      if (test.name === 'Visual Tests') {
        if (!content.includes('toHaveScreenshot')) {
          addWarning(test.name, 'Missing screenshot assertions');
        }
      }
    } catch (error) {
      addResult(test.name, false, `Error reading test: ${error.message}`);
    }
  }
}

async function runTests() {
  if (skipTests) {
    log('Skipping test execution (--skip-tests flag)', 'warning');
    return;
  }

  console.log('\n🧪 Running tests...\n');

  const testSuites = [
    { name: 'Functional Tests', path: paths.functionalTest },
    { name: 'Accessibility Tests', path: paths.a11yTest },
    { name: 'Visual Tests', path: paths.visualTest }
  ];

  for (const suite of testSuites) {
    try {
      // Check if test file exists
      await fs.access(suite.path);

      console.log(`Running ${suite.name}...`);

      try {
        execSync(`cd apps/web && npx playwright test ${suite.path} --project=chromium`, {
          stdio: verbose ? 'inherit' : 'pipe',
          encoding: 'utf8'
        });

        addResult(`${suite.name} Results`, true, 'All tests passed');
      } catch (error) {
        addResult(`${suite.name} Results`, false, 'Some tests failed');
        if (verbose) {
          console.error(error.stdout || error.message);
        }
      }
    } catch {
      addResult(`${suite.name} Results`, false, 'Test file not found');
    }
  }
}

async function checkThumbnail() {
  const exists = await checkFileExists(paths.thumbnail, 'Thumbnail');
  if (!exists) return;

  try {
    const content = await fs.readFile(paths.thumbnail, 'utf8');

    // Basic SVG validation
    if (!content.includes('<svg')) {
      addResult('Thumbnail', false, 'Not a valid SVG file');
      return;
    }

    if (!content.includes('</svg>')) {
      addResult('Thumbnail', false, 'Incomplete SVG file');
      return;
    }

    // Check for gradient or styling
    const hasStyling = content.includes('gradient') || content.includes('fill=');
    if (!hasStyling) {
      addWarning('Thumbnail', 'Missing visual styling');
    }

    addResult('Thumbnail', true, 'Valid SVG thumbnail');
  } catch (error) {
    addResult('Thumbnail', false, `Error reading thumbnail: ${error.message}`);
  }
}

// Main validation function
async function validate() {
  console.log(`\n🔍 Validating tool: ${toolId}\n`);

  // File existence checks
  await checkToolRegistration();
  await checkComponentQuality();
  await checkPageQuality();
  await checkTestCoverage();
  await checkThumbnail();

  // Run tests
  await runTests();

  // Summary
  console.log('\n📊 Validation Summary\n');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed checks:');
    results.failed.forEach(check => console.log(`  - ${check}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(check => console.log(`  - ${check}`));
  }

  // Exit code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run validation
validate().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});