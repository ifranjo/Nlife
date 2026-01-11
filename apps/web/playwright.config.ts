import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for New Life Solutions E2E tests
 *
 * Features:
 * - Full parallelism on CI with sharding support
 * - Percy visual regression integration
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Mobile viewport testing
 *
 * Usage:
 *   npm run test:e2e              # Run all tests
 *   npm run test:e2e:visual       # Run visual regression only
 *   npm run test:percy            # Run with Percy cloud
 *
 * Sharding (CI):
 *   npx playwright test --shard=1/4  # Run 1st quarter of tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Only run Playwright tests (ignore Vitest unit tests) */
  testMatch: /\.spec\.ts$/,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only - helps with flaky tests */
  retries: process.env.CI ? 2 : 0,

  /*
   * Parallel workers configuration:
   * - CI: Use 50% of available CPUs (GitHub Actions has 2 cores, so 1 worker per shard)
   * - Local: Use all available CPUs
   * - With sharding, each shard gets its own job with full parallelism
   */
  workers: process.env.CI ? '50%' : undefined,

  /* Global timeout per test */
  timeout: 30 * 1000,

  /* Reporter to use */
  reporter: process.env.CI
    ? [
        ['github'],           // GitHub annotations
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ]
    : [
        ['html'],
        ['list']
      ],

  /* Visual regression snapshot settings */
  expect: {
    toHaveScreenshot: {
      /* Allow 0.2% pixel difference for anti-aliasing variations */
      maxDiffPixelRatio: 0.002,
      /* Animation tolerance - wait for animations to settle */
      animations: 'disabled',
      /* Consistent rendering across platforms */
      scale: 'css',
    },
    toMatchSnapshot: {
      /* Threshold for image comparison */
      maxDiffPixelRatio: 0.002,
    },
  },

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:4321',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
