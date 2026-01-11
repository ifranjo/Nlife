#!/usr/bin/env node

/**
 * Script to detect affected tests based on changed files
 * Usage: node scripts/detect-affected-tests.js [base-branch]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_BRANCH = process.argv[2] || 'main';
const TEST_DIR = 'apps/web/tests';
const SRC_DIR = 'apps/web/src';

/**
 * Get changed files from git
 */
function getChangedFiles() {
  try {
    const output = execSync(`git diff --name-only origin/${BASE_BRANCH}...HEAD`, {
      encoding: 'utf8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

/**
 * Map source files to test files
 */
function mapToTestFile(srcFile) {
  // Convert src files to test files
  if (srcFile.startsWith(SRC_DIR)) {
    const relativePath = srcFile.replace(SRC_DIR, '');
    const testPath = path.join(TEST_DIR, relativePath);

    // Try different test extensions
    const extensions = ['.spec.ts', '.test.ts', '.e2e.ts'];
    for (const ext of extensions) {
      const testFile = testPath.replace(/\.(ts|tsx|js|jsx|astro)$/, ext);
      if (fs.existsSync(testFile)) {
        return testFile;
      }
    }
  }

  return null;
}

/**
 * Find tests that import changed files
 */
function findImportingTests(changedFiles) {
  const importingTests = new Set();

  // Get all test files
  function getAllTestFiles(dir, files = []) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        getAllTestFiles(fullPath, files);
      } else if (item.name.endsWith('.spec.ts') || item.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  const testFiles = getAllTestFiles(TEST_DIR);

  // Check each test file for imports
  for (const testFile of testFiles) {
    try {
      const content = fs.readFileSync(testFile, 'utf8');

      // Check if any changed file is imported
      for (const changedFile of changedFiles) {
        const importPattern = new RegExp(
          `import.*from\s*['"]\.?\.?/${changedFile.replace(/\//g, '\\\\')}['"]|require\(['"]\.?\.?/${changedFile.replace(/\//g, '\\\\')}['"]\)`,
          'i'
        );

        if (importPattern.test(content)) {
          importingTests.add(testFile);
          break;
        }
      }
    } catch (error) {
      console.error(`Error reading ${testFile}:`, error.message);
    }
  }

  return Array.from(importingTests);
}

/**
 * Get test tags from file path
 */
function getTestTags(filePath) {
  const tags = [];

  if (filePath.includes('accessibility')) tags.push('a11y');
  if (filePath.includes('visual')) tags.push('visual');
  if (filePath.includes('performance')) tags.push('performance');
  if (filePath.includes('smoke')) tags.push('smoke');
  if (filePath.includes('critical')) tags.push('critical');

  return tags;
}

/**
 * Main execution
 */
function main() {
  console.log(`🔍 Detecting affected tests (base: ${BASE_BRANCH})...`);

  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.log('No changed files detected');
    console.log('Affected tests: all');
    return;
  }

  console.log(`Changed files (${changedFiles.length}):`);
  changedFiles.forEach(file => console.log(`  - ${file}`));

  // Find directly affected tests
  const affectedTests = new Set();

  for (const file of changedFiles) {
    const testFile = mapToTestFile(file);
    if (testFile) {
      affectedTests.add(testFile);
    }
  }

  // Find tests that import changed files
  const importingTests = findImportingTests(changedFiles);
  importingTests.forEach(test => affectedTests.add(test));

  // Filter out non-existent files
  const validTests = Array.from(affectedTests).filter(file => fs.existsSync(file));

  console.log(`\nAffected tests (${validTests.length}):`);
  validTests.forEach(test => {
    const tags = getTestTags(test);
    console.log(`  - ${test}${tags.length > 0 ? ` [${tags.join(', ')}]` : ''}`);
  });

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const output = validTests.length > 0 ? validTests.join(' ') : 'all';
    require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `affected-tests=${output}\n`);
  }

  // Create test groups
  const groups = {
    all: validTests.length === 0,
    smoke: [],
    visual: [],
    a11y: [],
    performance: [],
    e2e: [],
  };

  validTests.forEach(test => {
    const tags = getTestTags(test);

    if (tags.includes('smoke')) groups.smoke.push(test);
    if (tags.includes('visual')) groups.visual.push(test);
    if (tags.includes('a11y')) groups.a11y.push(test);
    if (tags.includes('performance')) groups.performance.push(test);

    // Default to e2e if no specific tags
    if (tags.length === 0) groups.e2e.push(test);
  });

  console.log('\nTest groups:');
  Object.entries(groups).forEach(([group, tests]) => {
    if (Array.isArray(tests) && tests.length > 0) {
      console.log(`  ${group}: ${tests.length} tests`);
    } else if (group === 'all' && tests) {
      console.log(`  ${group}: true`);
    }
  });

  // Save test groups for later use
  const testGroupsPath = 'test-groups.json';
  fs.writeFileSync(testGroupsPath, JSON.stringify(groups, null, 2));
  console.log(`\nTest groups saved to ${testGroupsPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  getChangedFiles,
  mapToTestFile,
  findImportingTests,
  getTestTags,
};