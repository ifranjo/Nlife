import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright CI Configuration
 *
 * This config is used in GitHub Actions where:
 * - The preview server is already running (started by CI)
 * - We want fast, reliable tests
 * - No need to start webServer ourselves
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: true,

  /* Retry failed tests to handle flakiness */
  retries: 2,

  /* Use 50% of available CPUs */
  workers: '50%',

  /* Global timeout per test - generous for CI */
  timeout: 60 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },

  /* Reporter for CI */
  reporter: [
    ['github'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  /* Shared settings */
  use: {
    /* Base URL - preview server runs on 4321 */
    baseURL: 'http://localhost:4321',

    /* Collect trace on retry */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure for debugging */
    video: 'on-first-retry',

    /* Increase action timeout for CI */
    actionTimeout: 15 * 1000,

    /* Increase navigation timeout */
    navigationTimeout: 30 * 1000,
  },

  /* Only test Chromium in CI for speed */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* NO webServer - CI starts preview server separately */
  // webServer is intentionally omitted
});
