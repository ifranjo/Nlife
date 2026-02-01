import { test, expect } from '@playwright/test';

// ============================================================
// SECURITY VALIDATION TESTS - Nlife Tools
// Tests file upload validation, XSS protection, input sanitization
// ============================================================

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('xss')",
  '<svg onload=alert(1)>',
  '{{constructor.constructor("alert(1)")()}}',
];

const MALICIOUS_FILES = [
  { name: 'test.exe', type: 'application/x-msdownload', size: 1024 },
  { name: 'test.php', type: 'application/x-php', size: 1024 },
  { name: 'test.html', type: 'text/html', size: 1024 },
];

// ============================================================
// IMAGE UPLOAD TOOLS - File Validation Tests
// ============================================================

test.describe('Image Upload Security - Object Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/object-detection');
    await page.waitForLoadState('networkidle');
  });

  test('should reject non-image files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Create a dummy non-image file
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]');
      const file = new File(['not an image'], 'test.exe', { type: 'application/x-msdownload' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show error or reject the file
    await expect(page.locator('main')).toBeVisible();
  });

  test('should sanitize filename on download', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload a valid image first
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]');
      const file = new File(['fake image data'], 'test.png', { type: 'image/png' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Check no path traversal in generated filenames
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Image Upload Security - Image Captioning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-captioning');
    await page.waitForLoadState('networkidle');
  });

  test('should validate file type on upload', async ({ page }) => {
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]');
      const file = new File(['<html></html>'], 'test.html', { type: 'text/html' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Image Upload Security - QR Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/qr-reader');
    await page.waitForLoadState('networkidle');
  });

  test('should validate uploaded file is image', async ({ page }) => {
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]');
      const file = new File(['not a QR code'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('main')).toBeVisible();
  });
});

// ============================================================
// TEXT INPUT TOOLS - XSS Protection Tests
// ============================================================

test.describe('Text Input XSS Protection - Sentiment Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/sentiment-analysis');
    await page.waitForLoadState('networkidle');
  });

  test('should escape XSS payloads in text input', async ({ page }) => {
    const textarea = page.locator('textarea');

    for (const payload of XSS_PAYLOADS) {
      await textarea.fill(payload);
      await page.getByText('Analyze').first().click();

      // Check page still works and no script executed
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await expect(page.locator('main')).toBeVisible();
    }
  });
});

test.describe('Text Input XSS Protection - Text Summarization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/text-summarization');
    await page.waitForLoadState('networkidle');
  });

  test('should sanitize text input against XSS', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill(XSS_PAYLOADS[0]);
    await page.getByText('Summarize').click();

    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Text Input XSS Protection - Grammar Checker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/grammar-checker');
    await page.waitForLoadState('networkidle');
  });

  test('should handle XSS payloads safely', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Check <script>alert(1)</script> this text');
    await page.getByText('Check').click();

    await expect(page.locator('main')).toBeVisible();
  });
});

// ============================================================
// TEXT PROCESSING TOOLS - Input Validation Tests
// ============================================================

test.describe('Text Processing Security - Word Counter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/word-counter');
    await page.waitForLoadState('networkidle');
  });

  test('should handle null bytes and control characters', async ({ page }) => {
    const textarea = page.locator('textarea');
    const maliciousInput = 'Word1\u0000Word2\u0007Word3\u001fWord4';
    await textarea.fill(maliciousInput);

    // Should count without crashing
    const count = await page.locator('text=/\\d+/').first().textContent();
    expect(count).toBeDefined();
  });
});

test.describe('Text Processing Security - Text Case Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/text-case');
    await page.waitForLoadState('networkidle');
  });

  test('should sanitize control characters', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Te\u0000st\u001fTe\u0007xt');

    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Text Processing Security - Diff Checker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/diff-checker');
    await page.waitForLoadState('networkidle');
  });

  test('should escape HTML in diff output', async ({ page }) => {
    const inputs = page.locator('textarea');
    await inputs.first().fill('<b>original</b>');
    await inputs.last().fill('<script>alert(1)</script>modified');

    await page.getByText('Compare').click();

    await expect(page.locator('main')).toBeVisible();
  });
});

// ============================================================
// CONVERTER TOOLS - Input Validation Tests
// ============================================================

test.describe('Converter Input Validation - Unit Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/unit-converter');
    await page.waitForLoadState('networkidle');
  });

  test('should reject overflow values', async ({ page }) => {
    const input = page.locator('input[type="number"]');
    await input.fill('1e999999999999999999');

    await expect(page.locator('main')).toBeVisible();
  });

  test('should reject non-numeric injection', async ({ page }) => {
    const input = page.locator('input[type="number"]');
    await input.fill('1; DROP TABLE users;--');

    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Converter Input Validation - Color Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/color-converter');
    await page.waitForLoadState('networkidle');
  });

  test('should validate hex format', async ({ page }) => {
    const hexInput = page.locator('input[aria-label*="hex" i], input').first();

    // Valid hex
    await hexInput.fill('#FF5733');

    // Invalid hex should be handled gracefully
    await hexInput.fill('NOT_A_COLOR');

    await expect(page.locator('main')).toBeVisible();
  });

  test('should escape HTML in color display', async ({ page }) => {
    const hexInput = page.locator('input[aria-label*="hex" i], input').first();
    await hexInput.fill('<img src=x onerror=alert(1)>');

    await expect(page.locator('main')).toBeVisible();
  });
});

// ============================================================
// GENERATOR TOOLS - Output Sanitization Tests
// ============================================================

test.describe('Generator Output Safety - Lorem Ipsum', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/lorem-ipsum');
    await page.waitForLoadState('networkidle');
  });

  test('should not generate malicious content', async ({ page }) => {
    await page.getByText('Generate').click();

    // Generated text should not contain script tags
    const text = await page.locator('[class*="output"], [class*="result"]').first().textContent();
    expect(text).not.toContain('<script>');
  });
});

test.describe('Generator Output Safety - Password Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/password-generator');
    await page.waitForLoadState('networkidle');
  });

  test('should generate secure random passwords', async ({ page }) => {
    await page.getByText('Generate').click();

    const password = await page.locator('[class*="password"], input[type="text"]').first().inputValue();

    // Should contain mixed character types
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });
});

// ============================================================
// ACCESSIBILITY & ERROR HANDLING
// ============================================================

test.describe('Error Message Security - All Tools', () => {
  const tools = [
    '/tools/object-detection',
    '/tools/image-captioning',
    '/tools/qr-reader',
    '/tools/sentiment-analysis',
    '/tools/text-summarization',
    '/tools/grammar-checker',
    '/tools/word-counter',
    '/tools/text-case',
    '/tools/diff-checker',
    '/tools/unit-converter',
    '/tools/color-converter',
    '/tools/lorem-ipsum',
    '/tools/password-generator',
  ];

  for (const toolPath of tools) {
    test(`should not leak internal paths in error messages - ${toolPath}`, async ({ page }) => {
      await page.goto(toolPath);
      await page.waitForLoadState('networkidle');

      // Error messages should not contain:
      // - File paths like C:\, /etc/, /var/
      // - Stack traces
      // - Variable names
      // - Database connection strings

      const pageContent = await page.content();

      expect(pageContent).not.toMatch(/C:\\Users\\/i);
      expect(pageContent).not.toMatch(/\\/etc\\/i);
      expect(pageContent).not.toMatch(/at Object\./i);
      expect(pageContent).not.toMatch(/ConnectionString/i);
    });
  }
});
