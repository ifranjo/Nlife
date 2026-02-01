#!/usr/bin/env node
/**
 * Security Validation Script - Nlife Tools
 * Uses Playwright MCP or standalone Playwright to test security validations
 */

import { chromium } from 'playwright';

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('xss')",
  '<svg onload=alert(1)>',
];

const TOOLS_TO_TEST = [
  { name: 'Sentiment Analysis', url: '/tools/sentiment-analysis', type: 'text', payload: XSS_PAYLOADS[0] },
  { name: 'Text Summarization', url: '/tools/text-summarization', type: 'text', payload: XSS_PAYLOADS[0] },
  { name: 'Grammar Checker', url: '/tools/grammar-checker', type: 'text', payload: XSS_PAYLOADS[0] },
  { name: 'Word Counter', url: '/tools/word-counter', type: 'text', payload: 'Word\u0000Test' },
  { name: 'Text Case Converter', url: '/tools/text-case', type: 'text', payload: XSS_PAYLOADS[0] },
  { name: 'Diff Checker', url: '/tools/diff-checker', type: 'text', payload: XSS_PAYLOADS[0] },
  { name: 'Unit Converter', url: '/tools/unit-converter', type: 'number', payload: '1e9999' },
  { name: 'Color Converter', url: '/tools/color-converter', type: 'text', payload: '#FF5733' },
  { name: 'Object Detection', url: '/tools/object-detection', type: 'file', payload: 'image/png' },
  { name: 'Image Captioning', url: '/tools/image-captioning', type: 'file', payload: 'image/png' },
  { name: 'QR Reader', url: '/tools/qr-reader', type: 'file', payload: 'image/png' },
];

async function runSecurityTests() {
  console.log('='.repeat(60));
  console.log('🔒 Nlife Security Validation Tests');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push({ page: page.url(), error: msg.text() });
    }
  });

  for (const tool of TOOLS_TO_TEST) {
    console.log(`\n📋 Testing: ${tool.name}`);
    console.log('-'.repeat(40));

    try {
      await page.goto(`http://localhost:4321${tool.url}`, { waitUntil: 'networkidle' });
      console.log(`  ✓ Page loaded`);

      // Test based on tool type
      if (tool.type === 'text') {
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(tool.payload);
          console.log(`  ✓ Text input filled with test payload`);

          // Look for submit button
          const submitBtn = page.locator('button:has-text("Analyze"), button:has-text("Summarize"), button:has-text("Check"), button:has-text("Compare"), button:has-text("Count"), button:has-text("Convert")').first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(500);
            console.log(`  ✓ Action completed`);
          }
        }
      } else if (tool.type === 'number') {
        const input = page.locator('input[type="number"]').first();
        if (await input.isVisible()) {
          await input.fill(tool.payload);
          console.log(`  ✓ Number input filled`);
        }
      } else if (tool.type === 'file') {
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible()) {
          // Create mock file
          await page.evaluate((type) => {
            const input = document.querySelector('input[type="file"]');
            const file = new File(['mock'], 'test.png', { type });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }, tool.payload);
          console.log(`  ✓ File input tested`);
        }
      }

      // Check page is still stable
      await page.waitForTimeout(200);
      const mainVisible = await page.locator('main').isVisible();
      if (mainVisible) {
        console.log(`  ✅ PASSED - ${tool.name}`);
        results.passed++;
      } else {
        console.log(`  ❌ FAILED - ${tool.name} - Page unstable`);
        results.failed++;
      }

    } catch (error) {
      console.log(`  ❌ ERROR - ${tool.name}: ${error.message}`);
      results.failed++;
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Console Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n🔍 Console Errors:');
    results.errors.forEach(e => console.log(`  - ${e.error}`));
  }

  console.log('\n' + '='.repeat(60));
  return results;
}

runSecurityTests().catch(console.error);
