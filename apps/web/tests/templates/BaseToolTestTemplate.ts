/**
 * Base Tool Test Template - Foundation for all tool tests
 *
 * This template provides the core testing structure that all tool tests
 * should follow. It ensures consistency and completeness across all tests.
 */

import { test, expect, Page } from '@playwright/test';
import { waitForReactHydration } from '../utils/hydration';
import { validateFile, createSafeErrorMessage } from '../utils/file-validation';
import { measurePerformance } from '../utils/performance';
import { checkAccessibility } from '../utils/accessibility';
import { Tool } from '../types';

export interface ToolTestContext {
  page: Page;
  tool: Tool;
  testFiles: Record<string, string>;
}

export abstract class BaseToolTest {
  protected tool: Tool;
  protected baseUrl: string;

  constructor(tool: Tool) {
    this.tool = tool;
    this.baseUrl = 'http://localhost:4321';
  }

  /**
   * Setup before each test - ensures clean state
   */
  async setup(context: ToolTestContext): Promise<void> {
    const { page } = context;

    // Navigate to tool page
    await page.goto(this.tool.href);

    // Wait for React hydration
    await waitForReactHydration(page);

    // Verify page loaded correctly
    await this.verifyPageLoad(page);
  }

  /**
   * Core tests that all tools must pass
   */
  async runCoreTests(context: ToolTestContext): Promise<void> {
    const { page } = context;

    await test.step('Page loads correctly', async () => {
      await this.testPageLoad(page);
    });

    await test.step('SEO meta tags present', async () => {
      await this.testSEOMeta(page);
    });

    await test.step('Schema markup valid', async () => {
      await this.testSchemaMarkup(page);
    });

    await test.step('Accessibility compliant', async () => {
      await this.testAccessibility(page);
    });

    await test.step('Mobile responsive', async () => {
      await this.testMobileResponsive(page);
    });

    await test.step('Performance acceptable', async () => {
      await this.testPerformance(page);
    });
  }

  /**
   * Individual core test implementations
   */
  private async verifyPageLoad(page: Page): Promise<void> {
    // Check page title
    await expect(page).toHaveTitle(new RegExp(this.tool.seo?.title || this.tool.name, 'i'));

    // Check main heading
    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(new RegExp(this.tool.seo?.h1 || this.tool.name, 'i'));

    // Check tool is interactive
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 10000 });
  }

  private async testPageLoad(page: Page): Promise<void> {
    // Verify no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await waitForReactHydration(page);

    expect(consoleErrors).toHaveLength(0);
  }

  private async testSEOMeta(page: Page): Promise<void> {
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', this.tool.seo?.metaDescription);

    // Check canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.*/);

    // Check OpenGraph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', this.tool.seo?.title);
  }

  private async testSchemaMarkup(page: Page): Promise<void> {
    const schemaScripts = page.locator('script[type="application/ld+json"]');
    await expect(schemaScripts).toHaveCountGreaterThan(0);

    // Validate JSON-LD is parseable
    const schemas = await schemaScripts.evaluateAll(scripts =>
      scripts.map(s => JSON.parse(s.textContent || ''))
    );

    expect(schemas).toBeDefined();
    expect(schemas.length).toBeGreaterThan(0);
  }

  private async testAccessibility(page: Page): Promise<void> {
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  }

  private async testMobileResponsive(page: Page): Promise<void> {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check main elements are visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  }

  private async testPerformance(page: Page): Promise<void> {
    const metrics = await measurePerformance(page);

    expect(metrics.largestContentfulPaint).toBeLessThan(2500);
    expect(metrics.timeToInteractive).toBeLessThan(5000);
    expect(metrics.totalBlockingTime).toBeLessThan(300);
  }

  /**
   * Abstract methods for tool-specific tests
   */
  abstract getTestFiles(): Record<string, string>;
  abstract testProcessing(context: ToolTestContext): Promise<void>;
  abstract testErrorHandling(context: ToolTestContext): Promise<void>;
}

/**
 * Factory function to create tool-specific test instances
 */
export function createToolTest(tool: Tool): BaseToolTest {
  switch (tool.category) {
    case 'document':
      return new DocumentToolTest(tool);
    case 'media':
      return new MediaToolTest(tool);
    case 'ai':
      return new AIToolTest(tool);
    case 'utility':
      return new UtilityToolTest(tool);
    case 'games':
      return new GamesToolTest(tool);
    default:
      throw new Error(`Unknown tool category: ${tool.category}`);
  }
}

/**
 * Document Tool Test Implementation
 */
export class DocumentToolTest extends BaseToolTest {
  getTestFiles(): Record<string, string> {
    return {
      pdf: 'documents/sample.pdf',
      docx: 'documents/sample.docx',
      txt: 'documents/sample.txt'
    };
  }

  async testProcessing(context: ToolTestContext): Promise<void> {
    const { page, testFiles } = context;

    await test.step('Upload and process document', async () => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testFiles.pdf);

      // Wait for processing
      await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });

      // Verify output
      const downloadButton = page.locator('button:has-text("Download")').first();
      await expect(downloadButton).toBeVisible();
      await expect(downloadButton).toBeEnabled();
    });
  }

  async testErrorHandling(context: ToolTestContext): Promise<void> {
    const { page } = context;

    await test.step('Handle corrupted file', async () => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles('fixtures/edge-cases/corrupted.pdf');

      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
    });
  }
}

/**
 * Media Tool Test Implementation
 */
export class MediaToolTest extends BaseToolTest {
  getTestFiles(): Record<string, string> {
    return {
      jpg: 'images/sample.jpg',
      png: 'images/sample.png',
      mp4: 'media/sample.mp4',
      mp3: 'media/sample.mp3'
    };
  }

  async testProcessing(context: ToolTestContext): Promise<void> {
    const { page, testFiles } = context;

    await test.step('Upload and process media', async () => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testFiles.jpg);

      // Verify preview
      const preview = page.locator('[data-testid="media-preview"]');
      await expect(preview).toBeVisible();

      // Process and download
      const processButton = page.locator('button:has-text("Process")').first();
      await processButton.click();

      await page.waitForSelector('[data-testid="download-ready"]', { timeout: 60000 });
    });
  }

  async testErrorHandling(context: ToolTestContext): Promise<void> {
    // Implementation for media-specific error handling
  }
}

/**
 * AI Tool Test Implementation
 */
export class AIToolTest extends BaseToolTest {
  getTestFiles(): Record<string, string> {
    return {
      text: 'ai/sample-text.txt',
      image: 'ai/sample-image.jpg'
    };
  }

  async testProcessing(context: ToolTestContext): Promise<void> {
    const { page, testFiles } = context;

    await test.step('Process with AI', async () => {
      // AI-specific test logic
      const textInput = page.locator('textarea').first();
      await textInput.fill('Sample text for AI processing');

      const generateButton = page.locator('button:has-text("Generate")').first();
      await generateButton.click();

      // Wait for AI response
      await page.waitForSelector('[data-testid="ai-output"]', { timeout: 45000 });
    });
  }

  async testErrorHandling(context: ToolTestContext): Promise<void> {
    // Implementation for AI-specific error handling
  }
}

/**
 * Utility Tool Test Implementation
 */
export class UtilityToolTest extends BaseToolTest {
  getTestFiles(): Record<string, string> {
    return {
      data: 'utility/sample-data.json',
      text: 'utility/sample-text.txt'
    };
  }

  async testProcessing(context: ToolTestContext): Promise<void> {
    const { page } = context;

    await test.step('Execute utility function', async () => {
      // Utility-specific test logic
      const input = page.locator('input[type="text"]').first();
      await input.fill('test input');

      const convertButton = page.locator('button:has-text("Convert")').first();
      await convertButton.click();

      // Verify output
      const output = page.locator('[data-testid="output"]').first();
      await expect(output).toBeVisible();
    });
  }

  async testErrorHandling(context: ToolTestContext): Promise<void> {
    // Implementation for utility-specific error handling
  }
}

/**
 * Games Tool Test Implementation
 */
export class GamesToolTest extends BaseToolTest {
  getTestFiles(): Record<string, string> {
    return {};
  }

  async testProcessing(context: ToolTestContext): Promise<void> {
    const { page } = context;

    await test.step('Game initializes correctly', async () => {
      // Game-specific test logic
      const gameCanvas = page.locator('canvas').first();
      await expect(gameCanvas).toBeVisible();

      // Test basic interaction
      await gameCanvas.click();
      await expect(page.locator('[data-testid="game-score"]')).toBeVisible();
    });
  }

  async testErrorHandling(context: ToolTestContext): Promise<void> {
    // Implementation for game-specific error handling
  }
}