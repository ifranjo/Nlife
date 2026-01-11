/**
 * Test utilities for CI/CD optimization
 */

import { test as base } from '@playwright/test';

/**
 * Get test tags from environment variables
 */
export function getTestTags(): string[] {
  const tags = process.env.TEST_TAGS || '';
  return tags.split(',').filter(tag => tag.trim());
}

/**
 * Skip tests based on tags
 */
export function shouldSkipTest(testTags: string[]): boolean {
  const runTags = getTestTags();
  if (runTags.length === 0) return false;

  // If test has no tags, run it
  if (testTags.length === 0) return false;

  // Run test if any of its tags match run tags
  return !testTags.some(tag => runTags.includes(tag));
}

/**
 * Get affected tests from git changes
 */
export function getAffectedTests(): string[] {
  if (!process.env.AFFECTED_TESTS) return [];
  return process.env.AFFECTED_TESTS.split(' ').filter(test => test.trim());
}

/**
 * Test fixture with optimization helpers
 */
export const test = base.extend<{
  skipIfNotAffected: () => void;
  tag: (tags: string[]) => void;
}>({
  skipIfNotAffected: async ({}, use) => {
    await use(() => {
      const affectedTests = getAffectedTests();
      if (affectedTests.length > 0 && !affectedTests.includes(expect.getState().currentTestName)) {
        test.skip();
      }
    });
  },

  tag: async ({}, use) => {
    await use((tags: string[]) => {
      if (shouldSkipTest(tags)) {
        test.skip();
      }
    });
  },
});

/**
 * Retry helper for flaky operations
 */
export async function retry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Performance measurement helper
 */
export async function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;

  console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}

/**
 * Create test data with defaults
 */
export function createTestFile(
  name: string,
  type: string,
  size: number = 1024
): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

/**
 * Wait for stable network conditions
 */
export async function waitForNetworkIdle(page: any, timeout: number = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Enhanced screenshot helper with automatic naming
 */
export async function takeScreenshot(
  page: any,
  name?: string
): Promise<Buffer> {
  const testName = expect.getState().currentTestName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = name ? `${testName}_${name}` : testName;

  return await page.screenshot({
    path: `test-results/screenshots/${fileName}.png`,
    fullPage: true,
  });
}

/**
 * Mock file chooser for file inputs
 */
export async function mockFileChooser(
  page: any,
  selector: string,
  files: File[]
) {
  await page.setInputFiles(selector, files);
}

/**
 * Test categorization tags
 */
export const TAGS = {
  SMOKE: 'smoke',
  CRITICAL: 'critical',
  VISUAL: 'visual',
  ACCESSIBILITY: 'a11y',
  PERFORMANCE: 'performance',
  E2E: 'e2e',
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
  TOOL: 'tool',
  GUIDE: 'guide',
} as const;

export type TestTag = typeof TAGS[keyof typeof TAGS];