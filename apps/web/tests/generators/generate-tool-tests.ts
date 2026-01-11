/**
 * Test Generator - Automatically creates test files for new tools
 *
 * Usage:
 *   npm run test:generate -- --tool=pdf-merge [--category=document]
 *   npm run test:generate -- --all
 *   npm run test:generate -- --validate
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import * as ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Tool {
  id: string;
  name: string;
  category: 'document' | 'media' | 'ai' | 'utility' | 'games';
  href: string;
  description: string;
  tier: 'free' | 'pro' | 'coming';
  seo?: {
    title: string;
    metaDescription: string;
    h1: string;
    keywords: string[];
  };
}

interface TestGeneratorOptions {
  tool?: string;
  category?: string;
  all?: boolean;
  validate?: boolean;
  force?: boolean;
}

class TestGenerator {
  private toolsPath = join(__dirname, '../../src/lib/tools.ts');
  private outputDir = join(__dirname, '../categories');
  private templatesDir = join(__dirname, '../templates');

  async generate(options: TestGeneratorOptions): Promise<void> {
    console.log('🚀 Starting test generation...');

    if (options.validate) {
      await this.validateExistingTests();
      return;
    }

    const tools = await this.loadTools();
    const toolsToGenerate = this.filterTools(tools, options);

    console.log(`📋 Found ${toolsToGenerate.length} tools to generate tests for`);

    for (const tool of toolsToGenerate) {
      await this.generateTestsForTool(tool, options.force);
    }

    console.log('✅ Test generation complete!');
  }

  private async loadTools(): Promise<Tool[]> {
    console.log('📖 Loading tools from registry...');

    const toolsFile = readFileSync(this.toolsPath, 'utf-8');
    const toolsMatch = toolsFile.match(/export const tools: Tool\[\] = \[([\s\S]*?)\];/);

    if (!toolsMatch) {
      throw new Error('Could not find tools array in tools.ts');
    }

    // Parse the tools array using TypeScript compiler
    const toolsArray = toolsMatch[1];
    const tools: Tool[] = [];

    // Extract tool objects using regex
    const toolMatches = toolsArray.matchAll(/\{\s*id: ['"](.+?)['"],\s*name: ['"](.+?)['"],\s*category: ['"](.+?)['"]/g);

    for (const match of toolMatches) {
      tools.push({
        id: match[1],
        name: match[2],
        category: match[3] as Tool['category'],
        href: `/tools/${match[1]}`,
        description: '',
        tier: 'free'
      });
    }

    return tools;
  }

  private filterTools(tools: Tool[], options: TestGeneratorOptions): Tool[] {
    if (options.all) {
      return tools;
    }

    if (options.tool) {
      const tool = tools.find(t => t.id === options.tool);
      if (!tool) {
        throw new Error(`Tool '${options.tool}' not found in registry`);
      }
      return [tool];
    }

    if (options.category) {
      return tools.filter(t => t.category === options.category);
    }

    // Default: generate for tools without tests
    return tools.filter(tool => !this.hasExistingTests(tool));
  }

  private hasExistingTests(tool: Tool): boolean {
    const testFilePath = join(this.outputDir, tool.category, `${tool.id}.spec.ts`);
    return existsSync(testFilePath);
  }

  private async generateTestsForTool(tool: Tool, force: boolean = false): Promise<void> {
    console.log(`🔧 Generating tests for ${tool.name}...`);

    const outputPath = join(this.outputDir, tool.category, `${tool.id}.spec.ts`);

    if (!force && existsSync(outputPath)) {
      console.log(`   ⚠️  Tests already exist for ${tool.id}, skipping (use --force to overwrite)`);
      return;
    }

    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate test content
    const testContent = this.generateTestContent(tool);

    // Write test file
    writeFileSync(outputPath, testContent);

    console.log(`   ✅ Generated ${outputPath}`);

    // Generate fixtures if needed
    await this.generateFixtures(tool);
  }

  private generateTestContent(tool: Tool): string {
    const template = this.getTemplateForCategory(tool.category);

    return template
      .replace(/\{\{toolId\}\}/g, tool.id)
      .replace(/\{\{toolName\}\}/g, tool.name)
      .replace(/\{\{toolHref\}\}/g, tool.href)
      .replace(/\{\{toolCategory\}\}/g, tool.category)
      .replace(/\{\{toolDescription\}\}/g, tool.description || '');
  }

  private getTemplateForCategory(category: Tool['category']): string {
    const templates = {
      document: this.getDocumentTestTemplate(),
      media: this.getMediaTestTemplate(),
      ai: this.getAITestTemplate(),
      utility: this.getUtilityTestTemplate(),
      games: this.getGamesTestTemplate()
    };

    return templates[category] || templates.utility;
  }

  private getDocumentTestTemplate(): string {
    return `/**
 * {{toolName}} - Functional and E2E Tests
 *
 * Generated automatically on ${new Date().toISOString()}
 */

import { test, expect } from '@playwright/test';
import { waitForReactHydration } from '../utils/hydration';
import { validateFile } from '../utils/file-validation';
import { measurePerformance } from '../utils/performance';
import { checkAccessibility } from '../utils/accessibility';

const TEST_TIMEOUT = 60000; // 60 seconds for document processing

test.describe('{{toolName}} - Core Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('page loads with correct metadata', async ({ page }) => {
    await expect(page).toHaveTitle(/{{toolName}}/i);

    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();

    const description = page.locator('meta[name="description"]');
    await expect(description).toBeAttached();
  });

  test('meets accessibility standards', async ({ page }) => {
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('file input accepts PDF documents', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Check accept attribute
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toMatch(/pdf|document/);
  });
});

test.describe('{{toolName}} - Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('processes single PDF file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles('fixtures/documents/sample.pdf');

    // Wait for file to be processed
    await page.waitForSelector('[data-testid="file-loaded"]', { timeout: 10000 });

    // Click process button
    const processButton = page.locator('button:has-text("Process"), button:has-text("Convert"), button:has-text("Merge")').first();
    await processButton.click();

    // Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: TEST_TIMEOUT });

    // Verify download button is available
    const downloadButton = page.locator('button:has-text("Download")').first();
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();
  });

  test('handles multiple PDF files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles([
      'fixtures/documents/sample-1.pdf',
      'fixtures/documents/sample-2.pdf',
      'fixtures/documents/sample-3.pdf'
    ]);

    // Verify all files are listed
    const fileList = page.locator('[data-testid="file-list"]');
    await expect(fileList).toBeVisible();

    const fileItems = fileList.locator('[data-testid="file-item"]');
    await expect(fileItems).toHaveCount(3);
  });

  test('validates file type restrictions', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    // Try to upload invalid file type
    await fileInput.setInputFiles('fixtures/images/sample.jpg');

    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"], .error, .text-red-500').first();
    await expect(errorMessage).toBeVisible();
  });

  test('handles large PDF files', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for large files

    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles('fixtures/documents/large-file.pdf');

    // Should show progress indicator
    const progressBar = page.locator('[data-testid="progress-bar"], .progress').first();
    await expect(progressBar).toBeVisible();

    // Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 120000 });
  });
});

test.describe('{{toolName}} - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('handles corrupted PDF files gracefully', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles('fixtures/edge-cases/corrupted.pdf');

    const errorMessage = page.locator('[data-testid="error-message"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Error message should be user-friendly
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/corrupted|invalid|damaged/i);
  });

  test('handles password-protected PDFs', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles('fixtures/edge-cases/password-protected.pdf');

    // Should prompt for password or show appropriate error
    const passwordPrompt = page.locator('[data-testid="password-prompt"], input[type="password"]').first();
    await expect(passwordPrompt).toBeVisible();
  });

  test('handles empty files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles('fixtures/edge-cases/empty.pdf');

    const errorMessage = page.locator('[data-testid="error-message"]').first();
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('{{toolName}} - Performance Tests', () => {
  test('loads within performance budget', async ({ page }) => {
    const metrics = await measurePerformance(page);

    expect(metrics.largestContentfulPaint).toBeLessThan(2500);
    expect(metrics.timeToInteractive).toBeLessThan(5000);
    expect(metrics.totalBlockingTime).toBeLessThan(300);
  });

  test('processes files within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('fixtures/documents/sample.pdf');

    const processButton = page.locator('button:has-text("Process")').first();
    await processButton.click();

    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: TEST_TIMEOUT });

    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(TEST_TIMEOUT);
  });
});

/**
 * Visual regression tests - run with Percy
 */
test.describe('{{toolName}} - Visual Tests', () => {
  test('matches visual baseline', async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);

    // Take screenshot of entire page
    await expect(page).toHaveScreenshot('{{toolId}}-full-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.002
    });
  });

  test('file upload state visual', async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('fixtures/documents/sample.pdf');

    // Take screenshot after file upload
    await expect(page).toHaveScreenshot('{{toolId}}-with-file.png', {
      maxDiffPixelRatio: 0.002
    });
  });
});
`;
  }

  private getMediaTestTemplate(): string {
    return `/**
 * {{toolName}} - Media Tool Tests
 *
 * Generated automatically on ${new Date().toISOString()}
 */

import { test, expect } from '@playwright/test';
import { waitForReactHydration } from '../utils/hydration';
import { validateImageFile, validateVideoFile, validateAudioFile } from '../utils/file-validation';

test.describe('{{toolName}} - Core Media Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('accepts image files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    const accept = await fileInput.getAttribute('accept');

    expect(accept).toMatch(/image\*/);
  });

  test('displays image preview', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('fixtures/images/sample.jpg');

    const preview = page.locator('[data-testid="image-preview"], img').first();
    await expect(preview).toBeVisible({ timeout: 10000 });
  });

  test('processes image with correct output format', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('fixtures/images/sample.png');

    // Process image
    const processButton = page.locator('button:has-text("Process"), button:has-text("Convert")').first();
    await processButton.click();

    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });

    // Verify download
    const downloadButton = page.locator('button:has-text("Download")').first();
    await expect(downloadButton).toBeVisible();
  });
});

test.describe('{{toolName}} - Video/Audio Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('handles video files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('fixtures/media/sample.mp4');

    // Should show video preview or processing options
    const videoElement = page.locator('video').first();
    const processingOptions = page.locator('[data-testid="video-options"]').first();

    await expect(videoElement.or(processingOptions)).toBeVisible();
  });

  test('handles audio files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('fixtures/media/sample.mp3');

    // Should show audio controls or options
    const audioElement = page.locator('audio').first();
    const audioOptions = page.locator('[data-testid="audio-options"]').first();

    await expect(audioElement.or(audioOptions)).toBeVisible();
  });
});

test.describe('{{toolName}} - Batch Processing', () => {
  test('processes multiple images', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([
      'fixtures/images/sample-1.jpg',
      'fixtures/images/sample-2.png',
      'fixtures/images/sample-3.webp'
    ]);

    // Verify batch processing UI
    const batchIndicator = page.locator('[data-testid="batch-indicator"]').first();
    await expect(batchIndicator).toBeVisible();

    // Process all
    const processButton = page.locator('button:has-text("Process All")').first();
    await processButton.click();

    await page.waitForSelector('[data-testid="batch-complete"]', { timeout: 60000 });
  });
});
`;
  }

  private getAITestTemplate(): string {
    return `/**
 * {{toolName}} - AI Tool Tests
 *
 * Generated automatically on ${new Date().toISOString()}
 */

import { test, expect } from '@playwright/test';
import { waitForReactHydration } from '../utils/hydration';

test.describe('{{toolName}} - AI Processing Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('AI model loads correctly', async ({ page }) => {
    // Check for model loading indicator
    const modelStatus = page.locator('[data-testid="model-status"], [data-testid="ai-ready"]').first();
    await expect(modelStatus).toBeVisible({ timeout: 30000 });

    // Should indicate model is ready
    const statusText = await modelStatus.textContent();
    expect(statusText).toMatch(/ready|loaded|online/i);
  });

  test('processes text input', async ({ page }) => {
    const textInput = page.locator('textarea, input[type="text"]').first();
    await textInput.fill('This is a test input for AI processing');

    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Process"), button:has-text("Summarize")').first();
    await generateButton.click();

    // Wait for AI output
    const output = page.locator('[data-testid="ai-output"], [data-testid="result"]').first();
    await expect(output).toBeVisible({ timeout: 45000 });

    // Verify output is not empty
    const outputText = await output.textContent();
    expect(outputText?.length).toBeGreaterThan(0);
  });

  test('handles AI errors gracefully', async ({ page }) => {
    // Submit empty input
    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    // Should show appropriate error
    const errorMessage = page.locator('[data-testid="error-message"]').first();
    await expect(errorMessage).toBeVisible();
  });

  test('respects rate limiting', async ({ page }) => {
    const textInput = page.locator('textarea').first();
    const generateButton = page.locator('button:has-text("Generate")').first();

    // Send multiple requests quickly
    for (let i = 0; i < 5; i++) {
      await textInput.fill(\`Test input \${i}\`);
      await generateButton.click();
    }

    // Should show rate limit warning
    const rateLimitWarning = page.locator('[data-testid="rate-limit-warning"]').first();
    await expect(rateLimitWarning).toBeVisible();
  });
});

test.describe('{{toolName}} - AI Quality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('AI output is relevant to input', async ({ page }) => {
    const testInput = 'Convert this text to uppercase';
    const textInput = page.locator('textarea').first();
    await textInput.fill(testInput);

    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    const output = page.locator('[data-testid="ai-output"]').first();
    await expect(output).toBeVisible({ timeout: 45000 });

    // Basic relevance check
    const outputText = await output.textContent();
    expect(outputText?.toUpperCase()).toBe(testInput.toUpperCase());
  });

  test('provides feedback mechanism', async ({ page }) => {
    const textInput = page.locator('textarea').first();
    await textInput.fill('Test input');

    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();

    // Wait for output
    await page.waitForSelector('[data-testid="ai-output"]', { timeout: 45000 });

    // Check for feedback buttons
    const thumbsUp = page.locator('[data-testid="thumbs-up"], button:has-text("👍")').first();
    const thumbsDown = page.locator('[data-testid="thumbs-down"], button:has-text("👎")').first();

    await expect(thumbsUp.or(thumbsDown)).toBeVisible();
  });
});
`;
  }

  private getUtilityTestTemplate(): string {
    return `/**
 * {{toolName}} - Utility Tool Tests
 *
 * Generated automatically on ${new Date().toISOString()}
 */

import { test, expect } from '@playwright/test';
import { waitForReactHydration } from '../utils/hydration';

test.describe('{{toolName}} - Core Utility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('utility function is accessible', async ({ page }) => {
    // Check main input is present
    const mainInput = page.locator('input[type="text"], textarea, input[type="number"]').first();
    await expect(mainInput).toBeVisible();

    // Check convert/process button
    const actionButton = page.locator('button:has-text("Convert"), button:has-text("Process"), button:has-text("Generate")').first();
    await expect(actionButton).toBeVisible();
  });

  test('converts input correctly', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('test input');

    const convertButton = page.locator('button:has-text("Convert")').first();
    await convertButton.click();

    // Check output
    const output = page.locator('[data-testid="output"], output, .result').first();
    await expect(output).toBeVisible();

    const outputText = await output.textContent();
    expect(outputText?.length).toBeGreaterThan(0);
  });

  test('handles invalid input gracefully', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('invalid-input-!@#$%');

    const convertButton = page.locator('button:has-text("Convert")').first();
    await convertButton.click();

    // Should show error or empty result
    const errorMessage = page.locator('[data-testid="error-message"]').first();
    const output = page.locator('[data-testid="output"]').first();

    await expect(errorMessage.or(output)).toBeVisible();
  });

  test('provides copy functionality', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('test input');

    const convertButton = page.locator('button:has-text("Convert")').first();
    await convertButton.click();

    // Wait for output
    await page.waitForSelector('[data-testid="output"]', { timeout: 5000 });

    // Check for copy button
    const copyButton = page.locator('button:has-text("Copy"), [data-testid="copy-button"]').first();
    await expect(copyButton).toBeVisible();

    // Test copy functionality
    await copyButton.click();

    // Verify success message
    const successMessage = page.locator('[data-testid="copy-success"]').first();
    await expect(successMessage).toBeVisible();
  });
});

test.describe('{{toolName}} - Batch Processing Tests', () => {
  test('handles multiple inputs', async ({ page }) => {
    // Check if batch mode is available
    const batchInput = page.locator('[data-testid="batch-input"], textarea[rows="10"]').first();

    if (await batchInput.isVisible()) {
      await batchInput.fill('input1\\ninput2\\ninput3');

      const processButton = page.locator('button:has-text("Process All")').first();
      await processButton.click();

      // Verify multiple outputs
      const outputs = page.locator('[data-testid="output-item"]').all();
      await expect(outputs).toHaveCount(3);
    }
  });
});
`;
  }

  private getGamesTestTemplate(): string {
    return `/**
 * {{toolName}} - Game Tests
 *
 * Generated automatically on ${new Date().toISOString()}
 */

import { test, expect } from '@playwright/test';
import { waitForReactHydration } from '../utils/hydration';

test.describe('{{toolName}} - Game Initialization', () => {
  test('game loads without errors', async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);

    // Check game canvas or container
    const gameCanvas = page.locator('canvas, [data-testid="game-container"]').first();
    await expect(gameCanvas).toBeVisible({ timeout: 10000 });
  });

  test('game controls are accessible', async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);

    // Check for game controls
    const controls = page.locator('[data-testid="game-controls"], button, .control').first();
    await expect(controls).toBeVisible();
  });

  test('displays game instructions', async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);

    // Check for instructions or help
    const instructions = page.locator('[data-testid="instructions"], .help, .rules').first();
    await expect(instructions).toBeVisible();
  });
});

test.describe('{{toolName}} - Gameplay Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);
  });

  test('game responds to user input', async ({ page }) => {
    const gameArea = page.locator('canvas, [data-testid="game-area"]').first();
    await expect(gameArea).toBeVisible();

    // Click or interact with game
    await gameArea.click();

    // Check for response (score change, animation, etc.)
    const score = page.locator('[data-testid="score"], .score').first();
    const feedback = page.locator('[data-testid="feedback"], .feedback').first();

    await expect(score.or(feedback)).toBeVisible();
  });

  test('game tracks score correctly', async ({ page }) => {
    const initialScore = await page.locator('[data-testid="score"]').textContent() || '0';

    // Make a move that should increase score
    const gameArea = page.locator('canvas').first();
    await gameArea.click();

    // Wait for score update
    await page.waitForTimeout(1000);

    const newScore = await page.locator('[data-testid="score"]').textContent();
    expect(newScore).not.toBe(initialScore);
  });

  test('game handles game over', async ({ page }) => {
    // Play until game over
    const gameArea = page.locator('canvas').first();

    // Simulate gameplay
    for (let i = 0; i < 10; i++) {
      await gameArea.click();
      await page.waitForTimeout(500);
    }

    // Check for game over
    const gameOver = page.locator('[data-testid="game-over"], .game-over').first();
    await expect(gameOver).toBeVisible({ timeout: 30000 });

    // Should show restart option
    const restartButton = page.locator('button:has-text("Restart"), button:has-text("Play Again")').first();
    await expect(restartButton).toBeVisible();
  });

  test('restart functionality works', async ({ page }) => {
    // Play and get score
    const gameArea = page.locator('canvas').first();
    await gameArea.click();

    const scoreBefore = await page.locator('[data-testid="score"]').textContent() || '0';

    // Restart
    const restartButton = page.locator('button:has-text("Restart")').first();
    await restartButton.click();

    // Score should reset
    await page.waitForTimeout(1000);
    const scoreAfter = await page.locator('[data-testid="score"]').textContent();
    expect(scoreAfter).not.toBe(scoreBefore);
  });
});

test.describe('{{toolName}} - Mobile Game Tests', () => {
  test('touch controls work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('{{toolHref}}');
    await waitForReactHydration(page);

    const gameArea = page.locator('canvas, [data-testid="game-area"]').first();

    // Simulate touch
    await gameArea.tap();

    // Should respond to touch
    const score = page.locator('[data-testid="score"]').first();
    await expect(score).toBeVisible();
  });
});
`;
  }

  private async generateFixtures(tool: Tool): Promise<void> {
    const fixturesDir = join(__dirname, '../../fixtures', tool.category);

    console.log(`   📁 Generating fixtures for ${tool.id}...`);

    // Create fixtures directory if needed
    if (!existsSync(fixturesDir)) {
      mkdirSync(fixturesDir, { recursive: true });
    }

    // Generate fixture manifest
    const manifest = {
      tool: tool.id,
      category: tool.category,
      fixtures: this.getFixtureList(tool.category),
      generatedAt: new Date().toISOString()
    };

    writeFileSync(
      join(fixturesDir, `${tool.id}-fixtures.json`),
      JSON.stringify(manifest, null, 2)
    );
  }

  private getFixtureList(category: Tool['category']): string[] {
    const fixtures = {
      document: [
        'sample.pdf',
        'sample-1.pdf',
        'sample-2.pdf',
        'sample-3.pdf',
        'large-file.pdf',
        'corrupted.pdf',
        'password-protected.pdf',
        'empty.pdf'
      ],
      media: [
        'sample.jpg',
        'sample-1.jpg',
        'sample-2.png',
        'sample-3.webp',
        'sample.mp4',
        'sample.mp3',
        'large-image.jpg',
        'transparent.png'
      ],
      ai: [
        'sample-text.txt',
        'sample-article.txt',
        'sample-image.jpg',
        'long-text.txt'
      ],
      utility: [
        'sample-data.json',
        'sample-text.txt',
        'sample-csv.csv',
        'sample-xml.xml'
      ],
      games: []
    };

    return fixtures[category] || [];
  }

  private async validateExistingTests(): Promise<void> {
    console.log('🔍 Validating existing tests...');

    const testFiles = await glob('**/*.spec.ts', {
      cwd: join(__dirname, '../categories')
    });

    console.log(`   Found ${testFiles.length} test files`);

    const validationResults = {
      total: testFiles.length,
      valid: 0,
      invalid: 0,
      errors: [] as string[]
    };

    for (const file of testFiles) {
      try {
        const filePath = join(__dirname, '../categories', file);
        const content = readFileSync(filePath, 'utf-8');

        // Basic validation checks
        const checks = {
          hasImports: /import.*from.*playwright/.test(content),
          hasTestDescribe: /test\.describe/.test(content),
          hasTests: /test\(/g.test(content),
          hasAccessibility: /checkAccessibility/.test(content),
          hasPerformance: /measurePerformance/.test(content),
          hasErrorHandling: /Error Handling/.test(content)
        };

        const passedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;

        if (passedChecks === totalChecks) {
          validationResults.valid++;
        } else {
          validationResults.invalid++;
          validationResults.errors.push(
            `${file}: Missing ${totalChecks - passedChecks} required patterns`
          );
        }
      } catch (error) {
        validationResults.invalid++;
        validationResults.errors.push(`${file}: ${error.message}`);
      }
    }

    console.log(`   ✅ Valid: ${validationResults.valid}`);
    console.log(`   ❌ Invalid: ${validationResults.invalid}`);

    if (validationResults.errors.length > 0) {
      console.log('\n   Errors found:');
      validationResults.errors.forEach(error => console.log(`     - ${error}`));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: TestGeneratorOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--tool=')) {
      options.tool = arg.split('=')[1];
    } else if (arg.startsWith('--category=')) {
      options.category = arg.split('=')[1];
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--validate') {
      options.validate = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  const generator = new TestGenerator();

  try {
    await generator.generate(options);
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestGenerator };