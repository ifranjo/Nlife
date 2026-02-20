import { defineConfig, devices } from '@playwright/test';

/**
 * Optimized Playwright configuration for CI/CD pipeline
 *
 * Features:
 * - Parallel execution optimized for CI
 * - Reduced retries for faster feedback
 * - Optimized reporter for GitHub Actions
 * - Smart test sharding
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail fast on CI */
  maxFailures: process.env.CI ? 10 : undefined,

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,

  /* Optimize workers for CI environment */
  workers: process.env.CI ? 3 : undefined,

  /* Reduce timeout for faster feedback */
  timeout: process.env.CI ? 20000 : 30000,

  /* Reporter optimized for CI */
  reporter: [
    ['github'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],

  /* Visual regression snapshot settings */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      scale: 'css',
    },
  },

  /* Shared settings */
  use: {
    /* Base URL - preview server runs on 4321 */
    baseURL: 'http://localhost:4321',

    /* Collect trace on retry */
    trace: 'retain-on-failure',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure for debugging */
    video: 'retain-on-failure',

    /* Increase action timeout for CI */
    actionTimeout: 15 * 1000,

    /* Increase navigation timeout */
    navigationTimeout: 30 * 1000,
  },

  /* Run only Chromium in CI for speed */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* NO webServer - CI starts preview server separately */
  // webServer is intentionally omitted
});
