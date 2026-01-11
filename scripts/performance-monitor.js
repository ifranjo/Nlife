#!/usr/bin/env node

/**
 * Performance monitoring script for CI/CD pipeline
 * Tracks build times, test execution, and deployment metrics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const METRICS_FILE = 'performance-metrics.json';
const HISTORY_FILE = 'performance-history.json';

/**
 * Load existing metrics
 */
function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading metrics:', error.message);
  }
  return {};
}

/**
 * Save metrics
 */
function saveMetrics(metrics) {
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));

  // Append to history
  const history = loadHistory();
  history.push({
    timestamp: new Date().toISOString(),
    commit: getCommitHash(),
    branch: getBranchName(),
    metrics,
  });

  // Keep only last 100 entries
  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Load performance history
 */
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading history:', error.message);
  }
  return [];
}

/**
 * Get git commit hash
 */
function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get branch name
 */
function getBranchName() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Measure build time
 */
async function measureBuildTime() {
  const start = Date.now();

  try {
    execSync('npm run build', { stdio: 'inherit' });
    const duration = Date.now() - start;

    console.log(`Build completed in ${(duration / 1000).toFixed(2)}s`);
    return duration;
  } catch (error) {
    console.error('Build failed:', error.message);
    throw error;
  }
}

/**
 * Measure test execution time
 */
async function measureTestTime(testCommand) {
  const start = Date.now();

  try {
    execSync(testCommand, { stdio: 'inherit' });
    const duration = Date.now() - start;

    console.log(`Tests completed in ${(duration / 1000).toFixed(2)}s`);
    return duration;
  } catch (error) {
    console.error('Tests failed:', error.message);
    throw error;
  }
}

/**
 * Calculate bundle size
 */
function calculateBundleSize() {
  const distPath = 'apps/web/dist';

  if (!fs.existsSync(distPath)) {
    console.warn('Dist folder not found');
    return 0;
  }

  let totalSize = 0;

  function getSize(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        getSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  }

  getSize(distPath);

  console.log(`Bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  return totalSize;
}

/**
 * Analyze test results
 */
function analyzeTestResults(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    console.warn('Test results not found');
    return null;
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    const summary = {
      total: results.suites.reduce((acc, suite) => acc + suite.tests.length, 0),
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration: results.duration,
    };

    results.suites.forEach(suite => {
      suite.tests.forEach(test => {
        if (test.status === 'passed') summary.passed++;
        else if (test.status === 'failed') summary.failed++;
        else if (test.status === 'skipped') summary.skipped++;

        if (test.results.some(r => r.status !== test.status)) {
          summary.flaky++;
        }
      });
    });

    console.log(`Test summary: ${summary.passed}/${summary.total} passed`);
    return summary;
  } catch (error) {
    console.error('Error analyzing test results:', error.message);
    return null;
  }
}

/**
 * Check for performance regressions
 */
function checkRegressions(current, baseline) {
  const regressions = [];

  const thresholds = {
    buildTime: 1.2, // 20% increase
    bundleSize: 1.1, // 10% increase
    testTime: 1.3, // 30% increase
  };

  for (const [metric, threshold] of Object.entries(thresholds)) {
    if (current[metric] && baseline[metric]) {
      const ratio = current[metric] / baseline[metric];
      if (ratio > threshold) {
        regressions.push({
          metric,
          current: current[metric],
          baseline: baseline[metric],
          increase: ((ratio - 1) * 100).toFixed(1),
        });
      }
    }
  }

  if (regressions.length > 0) {
    console.warn('\n⚠️  Performance regressions detected:');
    regressions.forEach(r => {
      console.warn(`  ${r.metric}: ${r.increase}% increase`);
    });
  }

  return regressions;
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Performance monitoring started');

  const metrics = {
    timestamp: new Date().toISOString(),
    commit: getCommitHash(),
    branch: getBranchName(),
  };

  try {
    // Measure build time
    console.log('\n⏱️  Measuring build time...');
    metrics.buildTime = await measureBuildTime();

    // Calculate bundle size
    console.log('\n📦 Calculating bundle size...');
    metrics.bundleSize = calculateBundleSize();

    // Measure test time if requested
    if (process.argv.includes('--with-tests')) {
      console.log('\n🧪 Measuring test execution time...');
      metrics.testTime = await measureTestTime('cd apps/web && npm run test:e2e -- --project=chromium');

      // Analyze test results
      const testSummary = analyzeTestResults('apps/web/test-results/results.json');
      if (testSummary) {
        metrics.testSummary = testSummary;
      }
    }

    // Load previous metrics for comparison
    const previousMetrics = loadMetrics();
    if (Object.keys(previousMetrics).length > 0) {
      console.log('\n📈 Comparing with previous metrics...');
      const regressions = checkRegressions(metrics, previousMetrics);

      // Fail CI if significant regressions
      if (regressions.length > 0 && process.env.CI) {
        console.error('\n❌ Performance regressions exceed thresholds');
        process.exit(1);
      }
    }

    // Save metrics
    saveMetrics(metrics);

    console.log('\n✅ Performance monitoring completed');
    console.log('\nMetrics summary:');
    console.log(`  Build time: ${(metrics.buildTime / 1000).toFixed(2)}s`);
    console.log(`  Bundle size: ${(metrics.bundleSize / 1024 / 1024).toFixed(2)} MB`);
    if (metrics.testTime) {
      console.log(`  Test time: ${(metrics.testTime / 1000).toFixed(2)}s`);
    }

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const output = `
build-time=${metrics.buildTime}
bundle-size=${metrics.bundleSize}
test-time=${metrics.testTime || 0}
`.trim();

      fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
    }

  } catch (error) {
    console.error('\n❌ Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  measureBuildTime,
  measureTestTime,
  calculateBundleSize,
  analyzeTestResults,
  checkRegressions,
  loadMetrics,
  saveMetrics,
};