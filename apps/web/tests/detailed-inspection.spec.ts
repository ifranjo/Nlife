import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:4321';

test.describe('Detailed Tool Inspection - Part 1', () => {
  test('inspect Image Compress tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/tools/image-compress`);
    await page.waitForLoadState('networkidle');

    console.log('\n=== IMAGE COMPRESS TOOL INSPECTION ===\n');

    // Check page title
    const title = await page.title();
    console.log('Page Title:', title);

    // Check meta tags
    const metaTags = await page.evaluate(() => {
      const tags: any = {};
      tags.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      tags.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      tags.ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      tags.twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute('content');
      tags.twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
      return tags;
    });
    console.log('Meta Tags:', JSON.stringify(metaTags, null, 2));

    // Check for Free tag
    const freeTag = await page.locator('text=/free/i').first();
    const freeTagVisible = await freeTag.isVisible();
    console.log('Free Tag Visible:', freeTagVisible);

    if (freeTagVisible) {
      const tagClasses = await freeTag.evaluate(el => {
        let current = el as Element;
        const classes = [];
        for (let i = 0; i < 3; i++) {
          classes.push({
            tag: current.tagName,
            classes: current.className,
            styles: {
              color: getComputedStyle(current).color,
              border: getComputedStyle(current).border,
              borderColor: getComputedStyle(current).borderColor
            }
          });
          if (current.parentElement) current = current.parentElement;
        }
        return classes;
      });
      console.log('Free Tag Styling:', JSON.stringify(tagClasses, null, 2));
    }

    // Check drop zone
    const dropZoneElements = await page.locator('[class*="border-dashed"], input[type="file"]').count();
    console.log('Drop Zone Elements Found:', dropZoneElements);

    // Check for tool icon on hub
    await page.goto(`${BASE_URL}/hub`);
    const toolCard = page.locator('[href="/tools/image-compress"]').first();
    const cardVisible = await toolCard.isVisible();
    console.log('Tool Card on Hub Visible:', cardVisible);

    if (cardVisible) {
      const iconInfo = await toolCard.evaluate(el => {
        const svg = el.querySelector('svg');
        const img = el.querySelector('img');
        return {
          hasSvg: !!svg,
          svgClasses: svg?.getAttribute('class'),
          hasImg: !!img,
          imgSrc: img?.getAttribute('src'),
          innerHTML: el.innerHTML.substring(0, 300)
        };
      });
      console.log('Icon Info:', JSON.stringify(iconInfo, null, 2));
    }

    console.log('\n');
  });

  test('inspect QR Generator tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/tools/qr-generator`);
    await page.waitForLoadState('networkidle');

    console.log('\n=== QR GENERATOR TOOL INSPECTION ===\n');

    const title = await page.title();
    console.log('Page Title:', title);

    const metaTags = await page.evaluate(() => {
      const tags: any = {};
      tags.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      tags.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      tags.ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      tags.twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute('content');
      return tags;
    });
    console.log('Meta Tags:', JSON.stringify(metaTags, null, 2));

    // Check dark theme
    const bgColor = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    console.log('Body Background Color:', bgColor);

    // Check form controls
    const formControls = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], textarea');
      const buttons = document.querySelectorAll('button');
      return {
        inputCount: inputs.length,
        buttonCount: buttons.length,
        firstInputPlaceholder: (inputs[0] as HTMLInputElement)?.placeholder,
        firstButtonText: buttons[0]?.textContent?.trim()
      };
    });
    console.log('Form Controls:', JSON.stringify(formControls, null, 2));

    console.log('\n');
  });

  test('inspect Base64 tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/tools/base64`);
    await page.waitForLoadState('networkidle');

    console.log('\n=== BASE64 ENCODER/DECODER TOOL INSPECTION ===\n');

    const title = await page.title();
    console.log('Page Title:', title);

    const metaTags = await page.evaluate(() => {
      const tags: any = {};
      tags.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      tags.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      tags.ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      tags.twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute('content');
      return tags;
    });
    console.log('Meta Tags:', JSON.stringify(metaTags, null, 2));

    // Check text areas
    const textAreaInfo = await page.evaluate(() => {
      const textAreas = document.querySelectorAll('textarea');
      return {
        count: textAreas.length,
        textAreas: Array.from(textAreas).map(ta => ({
          placeholder: ta.placeholder,
          rows: ta.rows,
          classes: ta.className,
          styles: {
            border: getComputedStyle(ta).border,
            borderRadius: getComputedStyle(ta).borderRadius,
            padding: getComputedStyle(ta).padding,
            backgroundColor: getComputedStyle(ta).backgroundColor
          }
        }))
      };
    });
    console.log('Text Area Info:', JSON.stringify(textAreaInfo, null, 2));

    // Check buttons
    const buttonInfo = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return {
        count: buttons.length,
        buttons: Array.from(buttons).map(btn => ({
          text: btn.textContent?.trim(),
          classes: btn.className,
          styles: {
            backgroundColor: getComputedStyle(btn).backgroundColor,
            color: getComputedStyle(btn).color,
            borderRadius: getComputedStyle(btn).borderRadius,
            padding: getComputedStyle(btn).padding
          }
        }))
      };
    });
    console.log('Button Info:', JSON.stringify(buttonInfo, null, 2));

    console.log('\n');
  });

  test('check SVG thumbnails exist', async ({ page }) => {
    console.log('\n=== SVG THUMBNAIL CHECK ===\n');

    const thumbnails = [
      '/thumbnails/image-compress.svg',
      '/thumbnails/qr-generator.svg',
      '/thumbnails/base64.svg'
    ];

    for (const thumb of thumbnails) {
      const response = await page.goto(`${BASE_URL}${thumb}`);
      const status = response?.status();
      const contentType = response?.headers()['content-type'];

      console.log(`${thumb}:`, {
        status,
        contentType,
        exists: status === 200,
        isSvg: contentType?.includes('svg')
      });
    }

    console.log('\n');
  });
});
