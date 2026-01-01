import type { Page } from '@playwright/test';

/**
 * Helper function to wait for React component hydration in Astro islands
 * Use this before interacting with React components that have client:load directive
 *
 * @param page - Playwright page object
 * @param selector - Optional selector for the specific component (defaults to input[type="file"])
 * @param timeout - Timeout in milliseconds (default: 5000)
 *
 * @example
 * await waitForReactHydration(page);
 * await fileInput.setInputFiles(['file.pdf']);
 */
export async function waitForReactHydration(
  page: Page,
  selector: string = 'input[type="file"]',
  timeout: number = 10000
): Promise<void> {
  // With client:only, the element doesn't exist initially (no SSR)
  // With client:load, the element exists but needs hydration
  // In both cases, we need to wait for the element to be VISIBLE (rendered by React)
  await page.locator(selector).waitFor({ state: 'visible', timeout });
}

/**
 * Combined hydration wait - waits for both Astro and React to be ready
 * Recommended for React components in Astro with client:load
 * For client:only components, this effectively just waits for the element to appear
 *
 * @param page - Playwright page object
 * @param selector - Optional selector for React component
 */
export async function waitForHydration(
  page: Page,
  selector?: string
): Promise<void> {
  await waitForReactHydration(page, selector || 'input[type="file"]');
}
