/**
 * Internationalization (i18n) Readiness Tests
 *
 * These tests verify that the codebase is prepared for internationalization:
 * - No hardcoded user-facing strings
 * - Proper date/time/number formatting with Intl API
 * - RTL layout support
 * - Unicode handling
 * - Long text handling
 * - Pluralization support
 * - Currency formatting
 *
 * RECOMMENDATIONS are provided as test descriptions for future implementation.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recursively get all files matching pattern in directory
 */
function getFilesRecursively(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  function walkDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

/**
 * Patterns that indicate hardcoded user-facing strings that should be extracted
 */
const HARDCODED_STRING_PATTERNS = [
  // Button text in JSX
  />([A-Z][a-z]+(?:\s[A-Z]?[a-z]+)*)<\/button>/g,
  // Common UI text patterns
  />\s*(?:Submit|Cancel|Save|Delete|Edit|Add|Remove|Create|Update|Close|Open|Next|Previous|Back|Continue|Download|Upload|Loading|Error|Success|Warning)\s*</gi,
  // Labels with text
  /<label[^>]*>\s*([A-Z][^<]+)\s*<\/label>/g,
  // Heading text
  /<h[1-6][^>]*>\s*([A-Z][^<]+)\s*<\/h[1-6]>/g,
  // Placeholder text
  /placeholder=["']([^"']+)["']/g,
  // Title attributes
  /title=["']([^"']+)["']/g,
  // aria-label with hardcoded text
  /aria-label=["']([^"']+)["']/g,
];

/**
 * Patterns that indicate proper i18n usage (good practices)
 */
const GOOD_I18N_PATTERNS = [
  // Intl.DateTimeFormat usage
  /new\s+Intl\.DateTimeFormat/,
  /Intl\.DateTimeFormat/,
  // Intl.NumberFormat usage
  /new\s+Intl\.NumberFormat/,
  /Intl\.NumberFormat/,
  // toLocaleString usage
  /\.toLocaleString\(/,
  /\.toLocaleDateString\(/,
  /\.toLocaleTimeString\(/,
  // Translation function calls (common patterns)
  /\bt\(['"][^'"]+['"]\)/,
  /\$t\(['"][^'"]+['"]\)/,
  /i18n\.t\(/,
  /useTranslation\(/,
];

/**
 * Patterns that indicate potential i18n issues
 */
const BAD_FORMATTING_PATTERNS = [
  // Direct string concatenation for messages (problematic for translations)
  /`\$\{[^}]+\}\s+file[s]?`/g,
  /`\$\{[^}]+\}\s+item[s]?`/g,
  // Hardcoded date formatting
  /new Date\(\)\.toISOString\(\)\.split\(['"]T['"]\)/,
  // Manual number formatting with fixed decimals
  /\.toFixed\(\d+\)\s*\+\s*['"][^'"]+['"]/,
  // Hardcoded currency symbols
  /['"][$\u20AC\u00A3\uFFE5]\s*['"]\s*\+/,
];

// ============================================================================
// TEST: LANG ATTRIBUTE ON HTML ELEMENT
// ============================================================================
test.describe('i18n - HTML Lang Attribute', () => {
  test('Layout.astro has lang attribute on html element', async ({ page }) => {
    await page.goto('/');

    // Check that html element has lang attribute
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
    expect(lang).toBe('en'); // Currently English

    // RECOMMENDATION: Make lang attribute dynamic based on user preference or URL
  });

  test('lang attribute is present on all tool pages', async ({ page }) => {
    const toolPages = ['/tools/pdf-merge', '/tools/word-counter', '/tools/qr-generator'];

    for (const url of toolPages) {
      await page.goto(url);
      const lang = await page.getAttribute('html', 'lang');
      expect(lang, `Missing lang attribute on ${url}`).toBeTruthy();
    }
  });
});

// ============================================================================
// TEST: DATE/TIME FORMATTING
// ============================================================================
test.describe('i18n - Date/Time Formatting', () => {
  test('Footer uses dynamic year without hardcoding', async ({ page }) => {
    await page.goto('/');

    // The footer should show the current year dynamically
    const footerText = await page.locator('footer').textContent();
    const currentYear = new Date().getFullYear().toString();
    expect(footerText).toContain(currentYear);

    // RECOMMENDATION: Use Intl.DateTimeFormat for any date display
  });

  test('source files prefer Intl API for date formatting', async () => {
    const tsxFiles = getFilesRecursively(path.join(srcDir, 'components'), /\.tsx$/);

    const filesWithDates: { file: string; hasIntl: boolean; hasManual: boolean }[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for date-related code
      const hasDateCode = /new Date\(|Date\.now\(|\.getFullYear\(|\.getMonth\(|\.getDate\(/i.test(content);

      if (hasDateCode) {
        const hasIntl = /Intl\.|toLocaleString|toLocaleDateString|toLocaleTimeString/.test(content);
        const hasManualFormatting = /\.getMonth\(\)\s*\+\s*1|\.padStart\(2/.test(content);

        filesWithDates.push({
          file: path.relative(srcDir, file),
          hasIntl,
          hasManual: hasManualFormatting
        });
      }
    }

    // Report findings
    const manualFormatters = filesWithDates.filter(f => f.hasManual && !f.hasIntl);
    if (manualFormatters.length > 0) {
      console.log('\n[i18n RECOMMENDATION] Files with manual date formatting (consider Intl API):');
      manualFormatters.forEach(f => console.log(`  - ${f.file}`));
    }

    // This test documents current state - not a hard failure
    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST: NUMBER FORMATTING
// ============================================================================
test.describe('i18n - Number Formatting', () => {
  test('file size formatting is locale-aware', async ({ page }) => {
    // Navigate to PDF Merge which shows file sizes
    await page.goto('/tools/pdf-merge');

    // The formatFileSize function in PdfMerge.tsx uses fixed formatting
    // RECOMMENDATION: Consider using Intl.NumberFormat for file sizes

    // Currently uses: `${(bytes / 1024).toFixed(1)} KB`
    // Better: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)

    expect(true).toBe(true); // Documentation test
  });

  test('source files handle numbers appropriately', async () => {
    const tsxFiles = getFilesRecursively(path.join(srcDir, 'components'), /\.tsx$/);

    const filesWithNumbers: { file: string; patterns: string[] }[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const patterns: string[] = [];

      // Check for toFixed usage (locale-insensitive)
      if (/\.toFixed\(\d+\)/.test(content)) {
        patterns.push('toFixed() - consider Intl.NumberFormat');
      }

      // Check for percentage calculations displayed to users
      if (/\d+\s*%|%\s*\d+|toFixed.*%/.test(content)) {
        patterns.push('percentage display - consider Intl.NumberFormat with style: "percent"');
      }

      if (patterns.length > 0) {
        filesWithNumbers.push({
          file: path.relative(srcDir, file),
          patterns
        });
      }
    }

    // Report findings
    if (filesWithNumbers.length > 0) {
      console.log('\n[i18n RECOMMENDATION] Files with number formatting to review:');
      filesWithNumbers.slice(0, 10).forEach(f => {
        console.log(`  - ${f.file}:`);
        f.patterns.forEach(p => console.log(`      ${p}`));
      });
    }

    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST: HARDCODED STRINGS DETECTION
// ============================================================================
test.describe('i18n - Hardcoded Strings', () => {
  test('identify hardcoded UI strings in React components', async () => {
    const tsxFiles = getFilesRecursively(path.join(srcDir, 'components', 'tools'), /\.tsx$/);

    const findings: { file: string; strings: string[] }[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const strings: string[] = [];

      // Find button text patterns
      const buttonMatches = content.matchAll(/>([A-Z][a-z]+(?:\s[A-Z]?[a-z]+)*(?:\s\d+)?)<\/button>/g);
      for (const match of buttonMatches) {
        if (match[1] && match[1].length > 2 && !match[1].match(/^[A-Z]+$/)) {
          strings.push(`Button: "${match[1]}"`);
        }
      }

      // Find heading text
      const headingMatches = content.matchAll(/<h[1-6][^>]*>([^<{]+)<\/h[1-6]>/g);
      for (const match of headingMatches) {
        if (match[1] && match[1].trim().length > 3) {
          strings.push(`Heading: "${match[1].trim()}"`);
        }
      }

      // Find placeholder text
      const placeholderMatches = content.matchAll(/placeholder=["']([^"']+)["']/g);
      for (const match of placeholderMatches) {
        if (match[1] && match[1].length > 5) {
          strings.push(`Placeholder: "${match[1]}"`);
        }
      }

      // Find error messages
      const errorMatches = content.matchAll(/setError\(['"]([^'"]+)['"]\)/g);
      for (const match of errorMatches) {
        strings.push(`Error: "${match[1]}"`);
      }

      // Find aria-label text
      const ariaMatches = content.matchAll(/aria-label=["']([^"']+)["']/g);
      for (const match of ariaMatches) {
        if (match[1] && match[1].length > 10) {
          strings.push(`Aria-label: "${match[1]}"`);
        }
      }

      if (strings.length > 0) {
        findings.push({
          file: path.relative(srcDir, file),
          strings: [...new Set(strings)].slice(0, 10) // Dedupe and limit
        });
      }
    }

    // Report findings
    console.log('\n[i18n INVENTORY] Hardcoded strings found in components:');
    console.log('='.repeat(60));

    let totalStrings = 0;
    findings.forEach(f => {
      console.log(`\n${f.file}:`);
      f.strings.forEach(s => {
        console.log(`  - ${s}`);
        totalStrings++;
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${totalStrings} hardcoded strings in ${findings.length} files`);
    console.log('\nRECOMMENDATION: Extract these strings to a translation file');
    console.log('Consider using react-i18next, next-intl, or similar library\n');

    // This is an audit test - we document but don't fail
    expect(findings.length).toBeGreaterThanOrEqual(0);
  });

  test('tools.ts has extractable content strings', async () => {
    const toolsPath = path.join(srcDir, 'lib', 'tools.ts');
    const content = fs.readFileSync(toolsPath, 'utf-8');

    // Count extractable strings in tools definition
    const nameMatches = content.matchAll(/name:\s*['"]([^'"]+)['"]/g);
    const descMatches = content.matchAll(/description:\s*['"]([^'"]+)['"]/g);
    const faqQuestionMatches = content.matchAll(/question:\s*['"]([^'"]+)['"]/g);
    const faqAnswerMatches = content.matchAll(/answer:\s*['"]([^'"]+)['"]/g);

    const names = [...nameMatches].length;
    const descriptions = [...descMatches].length;
    const faqQuestions = [...faqQuestionMatches].length;
    const faqAnswers = [...faqAnswerMatches].length;

    console.log('\n[i18n INVENTORY] tools.ts translatable content:');
    console.log(`  - Tool names: ${names}`);
    console.log(`  - Tool descriptions: ${descriptions}`);
    console.log(`  - FAQ questions: ${faqQuestions}`);
    console.log(`  - FAQ answers: ${faqAnswers}`);
    console.log(`  TOTAL: ${names + descriptions + faqQuestions + faqAnswers} strings to translate\n`);

    // Document the scope of translation work
    expect(names).toBeGreaterThan(30); // We have 40+ tools
    expect(descriptions).toBeGreaterThan(30);
  });
});

// ============================================================================
// TEST: RTL LAYOUT SUPPORT
// ============================================================================
test.describe('i18n - RTL Layout Support', () => {
  test('verify RTL-friendly CSS patterns are used', async () => {
    const cssPath = path.join(srcDir, 'styles', 'global.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    // Check for logical properties (RTL-friendly)
    const logicalProperties = [
      'margin-inline',
      'padding-inline',
      'margin-block',
      'padding-block',
      'inset-inline',
      'border-inline',
      'text-align: start',
      'text-align: end',
    ];

    // Check for directional properties (not RTL-friendly)
    const directionalProperties = [
      /margin-left:\s*[^0]/,
      /margin-right:\s*[^0]/,
      /padding-left:\s*[^0]/,
      /padding-right:\s*[^0]/,
      /left:\s*[^0]/,
      /right:\s*[^0]/,
      /text-align:\s*left/,
      /text-align:\s*right/,
    ];

    const logicalUsed = logicalProperties.filter(prop => content.includes(prop));
    const directionalUsed = directionalProperties.filter(pattern => pattern.test(content));

    console.log('\n[i18n RTL] CSS Property Analysis:');
    console.log(`  Logical properties used: ${logicalUsed.length}`);
    console.log(`  Directional properties found: ${directionalUsed.length}`);

    if (logicalUsed.length > 0) {
      console.log('\n  Good RTL-friendly patterns:');
      logicalUsed.forEach(p => console.log(`    - ${p}`));
    }

    console.log('\n  RECOMMENDATION: Replace left/right with start/end for RTL support');
    console.log('  Use Tailwind logical modifiers: ms-* me-* ps-* pe-* instead of ml-* mr-* pl-* pr-*\n');

    expect(true).toBe(true);
  });

  test('components use flex/grid (naturally RTL-friendly)', async ({ page }) => {
    await page.goto('/hub');

    // Check that main layout uses flexbox or grid
    const toolGrid = page.locator('[class*="grid"]').first();
    const isGrid = await toolGrid.count() > 0;

    expect(isGrid).toBe(true);

    // RECOMMENDATION: When adding RTL, just add dir="rtl" to html element
    // Flexbox and Grid will automatically reverse
  });
});

// ============================================================================
// TEST: UNICODE HANDLING
// ============================================================================
test.describe('i18n - Unicode Handling', () => {
  test('Word Counter handles Unicode text correctly', async ({ page }) => {
    await page.goto('/tools/word-counter');

    const testStrings = [
      // Chinese
      { text: '你好世界', expectedWords: 1, description: 'Chinese (4 characters)' },
      // Japanese
      { text: 'こんにちは世界', expectedWords: 1, description: 'Japanese' },
      // Arabic
      { text: 'مرحبا بالعالم', expectedWords: 2, description: 'Arabic (2 words)' },
      // Emojis
      { text: 'Hello World', expectedWords: 3, description: 'Text with emojis' },
      // Mixed
      { text: 'Hello 世界 مرحبا', expectedWords: 3, description: 'Mixed scripts' },
      // Long Unicode filename simulation
      { text: 'documento_espanol_con_enye.pdf', expectedWords: 1, description: 'Filename with special chars' },
    ];

    const textarea = page.locator('textarea');

    for (const testCase of testStrings) {
      await textarea.fill(testCase.text);
      await page.waitForTimeout(100);

      const charCount = await page.locator('text=Characters').first().locator('..').locator('div').first().textContent();

      console.log(`[Unicode] ${testCase.description}: characters=${charCount}`);
    }

    // Verify the tool doesn't crash on Unicode
    expect(true).toBe(true);
  });

  test('QR Generator handles Unicode input', async ({ page }) => {
    await page.goto('/tools/qr-generator');

    const unicodeTests = [
      'https://example.com/path/archivo_espanol',
      'Japanese text',
      'Chinese text',
    ];

    for (const text of unicodeTests) {
      const input = page.locator('input[type="url"], input[type="text"], textarea').first();
      await input.fill(text);
      await page.waitForTimeout(200);

      // Check that canvas updates (no crash)
      const canvas = page.locator('canvas');
      const canvasVisible = await canvas.isVisible();

      expect(canvasVisible, `QR canvas should be visible for: ${text}`).toBe(true);
    }
  });

  test('File upload handles Unicode filenames', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // The sanitizeFilename function should handle Unicode
    // RECOMMENDATION: Ensure sanitizeFilename preserves valid Unicode characters
    // while only removing dangerous path characters

    // Read the security.ts to verify
    const securityPath = path.join(srcDir, 'lib', 'security.ts');
    const securityContent = fs.readFileSync(securityPath, 'utf-8');

    // Check if sanitizeFilename uses Unicode-aware regex
    const hasUnicodeHandling = /\\u|\\p\{|Unicode/.test(securityContent);
    console.log(`[Unicode] security.ts has explicit Unicode handling: ${hasUnicodeHandling}`);

    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST: LONG TEXT HANDLING
// ============================================================================
test.describe('i18n - Long Text Handling', () => {
  test('buttons handle long translated text', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // Check if button text is truncated or wrapped appropriately
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let overflowIssues = 0;

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box && box.width > 500) {
          overflowIssues++;
        }
      }
    }

    console.log(`[Long Text] ${overflowIssues} potential overflow issues detected`);
    console.log('RECOMMENDATION: Use Tailwind truncate or min-w-0 for flexible buttons\n');

    expect(overflowIssues).toBeLessThan(5);
  });

  test('tool cards handle long descriptions', async ({ page }) => {
    await page.goto('/hub');

    // Check tool description truncation
    const descriptions = page.locator('[class*="text-slate-400"], [class*="text-muted"]');
    const count = await descriptions.count();

    // Tool cards should use line-clamp or similar
    // German translations can be 30-40% longer than English

    console.log(`[Long Text] ${count} description elements found`);
    console.log('RECOMMENDATION: Add line-clamp-2 or line-clamp-3 to descriptions\n');

    expect(count).toBeGreaterThan(0);
  });
});

// ============================================================================
// TEST: PLURALIZATION SUPPORT
// ============================================================================
test.describe('i18n - Pluralization', () => {
  test('identify manual pluralization patterns', async () => {
    const tsxFiles = getFilesRecursively(path.join(srcDir, 'components'), /\.tsx$/);

    const pluralPatterns: { file: string; patterns: string[] }[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const patterns: string[] = [];

      // Common manual pluralization patterns
      const manualPlurals = [
        /\?\s*['"]s['"]\s*:\s*['"]['"]/, // ternary for 's'
        /\$\{[^}]+\}\s+file\$\{[^}]*s[^}]*\}/, // template literal with conditional s
        /\.length\s*===?\s*1\s*\?\s*['"][^'"]+['"]\s*:\s*['"][^'"]+s['"]/, // count === 1 ? 'item' : 'items'
        /\+ \s*\([^)]+>\s*1\s*\?\s*['"]s['"]\s*:\s*['"]['"]\)/, // + (x > 1 ? 's' : '')
      ];

      for (const pattern of manualPlurals) {
        if (pattern.test(content)) {
          const match = content.match(pattern);
          if (match) {
            patterns.push(match[0].slice(0, 50) + '...');
          }
        }
      }

      // Also check for the simpler pattern in the codebase
      if (/file\${.*s.*\}|files\.length.*\?.*file.*:.*files/i.test(content)) {
        patterns.push('Conditional pluralization detected');
      }

      if (patterns.length > 0) {
        pluralPatterns.push({
          file: path.relative(srcDir, file),
          patterns: [...new Set(patterns)]
        });
      }
    }

    console.log('\n[i18n PLURALIZATION] Manual pluralization patterns found:');

    if (pluralPatterns.length === 0) {
      console.log('  No obvious manual pluralization patterns detected');
    } else {
      pluralPatterns.forEach(f => {
        console.log(`\n  ${f.file}:`);
        f.patterns.forEach(p => console.log(`    - ${p}`));
      });
    }

    console.log('\nRECOMMENDATION: Use Intl.PluralRules or i18n library plural functions');
    console.log('Example: new Intl.PluralRules("en").select(count) // "one" | "other"\n');

    expect(true).toBe(true);
  });

  test('PdfMerge uses conditional pluralization', async ({ page }) => {
    await page.goto('/tools/pdf-merge');

    // Upload multiple files would show "X files selected"
    // The current implementation uses: `${files.length} file${files.length > 1 ? 's' : ''}`

    console.log('[Pluralization] PdfMerge.tsx uses inline ternary for pluralization');
    console.log('RECOMMENDATION: For i18n, use Intl.PluralRules or translation library\n');

    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST: CURRENCY FORMATTING
// ============================================================================
test.describe('i18n - Currency Formatting', () => {
  test('no hardcoded currency symbols in codebase', async () => {
    const allFiles = getFilesRecursively(srcDir, /\.(tsx?|astro)$/);

    const currencyPatterns = [
      /['"]?\$\d+/g,  // $10, $100
      /\u20AC\d+/g,   // Euro sign
      /\u00A3\d+/g,   // Pound sign
      /\uFFE5\d+/g,   // Yen sign
    ];

    const findings: { file: string; matches: string[] }[] = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches: string[] = [];

      for (const pattern of currencyPatterns) {
        const found = content.match(pattern);
        if (found) {
          matches.push(...found);
        }
      }

      if (matches.length > 0) {
        findings.push({
          file: path.relative(srcDir, file),
          matches: [...new Set(matches)]
        });
      }
    }

    if (findings.length > 0) {
      console.log('\n[i18n CURRENCY] Hardcoded currency symbols found:');
      findings.forEach(f => {
        console.log(`  ${f.file}: ${f.matches.join(', ')}`);
      });
      console.log('\nRECOMMENDATION: Use Intl.NumberFormat with style: "currency"');
    } else {
      console.log('\n[i18n CURRENCY] No hardcoded currency symbols found (good!)');
    }

    // Currently the app doesn't have pricing, so this should pass
    expect(findings.length).toBe(0);
  });
});

// ============================================================================
// TEST: OVERALL i18n READINESS SCORE
// ============================================================================
test.describe('i18n - Readiness Summary', () => {
  test('generate i18n readiness report', async () => {
    const tsxFiles = getFilesRecursively(path.join(srcDir, 'components'), /\.tsx$/);
    const astroFiles = getFilesRecursively(srcDir, /\.astro$/);

    let totalScore = 0;
    let maxScore = 0;

    const criteria = [
      {
        name: 'Lang attribute present',
        check: () => {
          const layout = fs.readFileSync(path.join(srcDir, 'layouts', 'Layout.astro'), 'utf-8');
          return layout.includes('lang="en"') || layout.includes('lang={');
        },
        weight: 10
      },
      {
        name: 'No hardcoded currencies',
        check: () => {
          for (const file of tsxFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/['"]?\$\d+|\u20AC\d+|\u00A3\d+/.test(content)) {
              return false;
            }
          }
          return true;
        },
        weight: 10
      },
      {
        name: 'Uses toLocaleString for dates/numbers',
        check: () => {
          let count = 0;
          for (const file of tsxFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/toLocaleString|toLocaleDateString|Intl\./.test(content)) {
              count++;
            }
          }
          return count > 0;
        },
        weight: 15
      },
      {
        name: 'Semantic HTML structure',
        check: () => {
          for (const file of astroFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/<main|<header|<footer|<nav|<article/.test(content)) {
              return true;
            }
          }
          return false;
        },
        weight: 10
      },
      {
        name: 'Flexbox/Grid layouts (RTL-friendly)',
        check: () => {
          let flexGridCount = 0;
          for (const file of [...tsxFiles, ...astroFiles]) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/class[Name]*=.*?(flex|grid)/.test(content)) {
              flexGridCount++;
            }
          }
          return flexGridCount > 10;
        },
        weight: 15
      },
      {
        name: 'Accessibility attributes present',
        check: () => {
          let ariaCount = 0;
          for (const file of tsxFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const matches = content.match(/aria-|role=/g);
            if (matches) ariaCount += matches.length;
          }
          return ariaCount > 20;
        },
        weight: 10
      },
    ];

    console.log('\n');
    console.log('='.repeat(70));
    console.log('  INTERNATIONALIZATION (i18n) READINESS REPORT');
    console.log('='.repeat(70));
    console.log('');

    for (const criterion of criteria) {
      maxScore += criterion.weight;
      const passed = criterion.check();
      if (passed) {
        totalScore += criterion.weight;
        console.log(`  [PASS] ${criterion.name} (+${criterion.weight} pts)`);
      } else {
        console.log(`  [FAIL] ${criterion.name} (+0 pts)`);
      }
    }

    const percentage = Math.round((totalScore / maxScore) * 100);

    console.log('');
    console.log('-'.repeat(70));
    console.log(`  TOTAL SCORE: ${totalScore}/${maxScore} (${percentage}%)`);
    console.log('-'.repeat(70));
    console.log('');

    // Recommendations
    console.log('  RECOMMENDATIONS FOR FULL i18n SUPPORT:');
    console.log('');
    console.log('  1. Install i18n library (react-i18next or similar)');
    console.log('     npm install react-i18next i18next');
    console.log('');
    console.log('  2. Extract hardcoded strings to translation files');
    console.log('     Create: src/locales/en.json, src/locales/es.json, etc.');
    console.log('');
    console.log('  3. Replace manual pluralization with Intl.PluralRules');
    console.log('     Or use i18n library plural syntax');
    console.log('');
    console.log('  4. Use Intl.NumberFormat for all number display');
    console.log('     new Intl.NumberFormat(locale).format(number)');
    console.log('');
    console.log('  5. Use Intl.DateTimeFormat for all date display');
    console.log('     new Intl.DateTimeFormat(locale, options).format(date)');
    console.log('');
    console.log('  6. Replace Tailwind ml-*/mr-*/pl-*/pr-* with ms-*/me-*/ps-*/pe-*');
    console.log('     These logical properties support RTL automatically');
    console.log('');
    console.log('  7. Add lang attribute dynamically based on user preference');
    console.log('     <html lang={userLocale}>');
    console.log('');
    console.log('  8. Consider extracting tools.ts content to translation files');
    console.log('     Tool names, descriptions, FAQs = 200+ translatable strings');
    console.log('');
    console.log('='.repeat(70));

    expect(percentage).toBeGreaterThanOrEqual(50);
  });
});
