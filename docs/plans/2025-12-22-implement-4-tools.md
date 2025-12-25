# 4 Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 4 high-impact tools: Flashcard PDF Generator, Document Scanner (enhanced), Invoice Generator, and Certificate Generator

**Architecture:** React components for interactive editing + pdf-lib for PDF generation + Canvas API for image processing

**Tech Stack:** React 19, pdf-lib, Tailwind CSS, Web Workers (for processing), File System API (for exports)

---

### Task 1: Flashcard PDF Generator

**Files:**
- Create: `apps/web/src/pages/tools/flashcard-pdf.astro`
- Create: `apps/web/src/components/tools/FlashcardPdf.tsx`
- Create: `apps/web/src/lib/flashcard-templates.ts`

**Step 1: Write failing test**

```typescript
// tests/flashcard-pdf.spec.ts
test('flashcard pdf generator', async ({ page }) => {
  await page.goto('/tools/flashcard-pdf');

  // Add front and back content
  await page.fill('textarea[placeholder="Front of card"]', 'What is 2+2?');
  await page.fill('textarea[placeholder="Back of card"]', '4');

  // Click generate PDF
  await page.click('button:has-text("Generate PDF")');

  // Wait for download
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('flashcards.pdf');
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/web
npx playwright test tests/flashcard-pdf.spec.ts -v
# Expected: FAIL with "page not found"
```

**Step 3: Create tool registry entry**

Modify: `apps/web/src/lib/tools.ts`
```typescript
{
  id: 'flashcard-pdf',
  name: 'Flashcard PDF Generator',
  description: 'Create printable study flashcards as PDF or images. Perfect for students.',
  icon: '📚',
  thumbnail: '/thumbnails/flashcard-pdf.svg',
  category: 'education',
  tier: 'free',
  href: '/tools/flashcard-pdf',
  color: 'from-blue-500 to-purple-500'
}
```

**Step 4: Create React component**

File: `apps/web/src/components/tools/FlashcardPdf.tsx`
```typescript
import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';

interface Flashcard {
  front: string;
  back: string;
  id: string;
}

export default function FlashcardPdf() {
  const [cards, setCards] = useState<Flashcard[]>([
    { id: '1', front: '', back: '' },
    { id: '2', front: '', back: '' },
    { id: '3', front: '', back: '' }
  ]);

  const [template, setTemplate] = useState('standard');
  const [isGenerating, setIsGenerating] = useState(false);

  const addCard = () => {
    const newCard: Flashcard = {
      id: Date.now().toString(),
      front: '',
      back: ''
    };
    setCards([...cards, newCard]);
  };

  const updateCard = (id: string, field: 'front' | 'back', value: string) => {
    setCards(cards.map(card =>
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  const downloadPdf = async () => {
    setIsGenerating(true);

    const pdfDoc = await PDFDocument.create();

    // 3x5 inch flashcard size (216x360 points)
    const cardWidth = 216;
    const cardHeight = 360;
    const pageWidth = 612; // US Letter width
    const pageHeight = 792; // US Letter height

    // 2 cards per row, 3 rows per page
    const cardsPerRow = 2;
    const cardsPerColumn = 3;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      if (card.front.trim() && card.back.trim()) {
        const row = Math.floor((i % 6) / cardsPerRow);
        const col = (i % 6) % cardsPerRow;

        // Start new page if needed
        if (i > 0 && i % 6 === 0) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        }

        // Position for this card
        const x = col * (cardWidth + 20) + 50;
        const y = pageHeight - (row + 1) * (cardHeight + 20) - 50;

        // Draw card border
        currentPage.drawRectangle({
          x: x,
          y: y,
          width: cardWidth,
          height: cardHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          color: rgb(1, 1, 1), // White background
        });

        // Add front and back text
        const split = text => {
          const words = text.split(' ');
          const lines = [];
          let line = '';

          for (let word of words) {
            const testLine = line + word + ' ';
            if (testLine.length > 30) {
              lines.push(line.trim());
              line = word + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line.trim());
          return lines;
        };

        const frontLines = split(card.front);
        const backLines = split(card.back);

        // Draw front side (top)
        frontLines.forEach((line, index) => {
          currentPage.drawText(line, {
            x: x + 10,
            y: y + cardHeight - 30 - (index * 15),
            size: 12,
            color: rgb(0, 0, 0),
          });
        });

        // Draw divider
        currentPage.drawLine({
          start: { x: x, y: y + cardHeight / 2 },
          end: { x: x + cardWidth, y: y + cardHeight / 2 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        // Draw back side (bottom)
        backLines.forEach((line, index) => {
          currentPage.drawText(line, {
            x: x + 10,
            y: y + cardHeight / 2 - 20 - (index * 15),
            size: 12,
            color: rgb(0, 0, 0),
          });
        });

        // Add card number
        currentPage.drawText(`Card ${i + 1}`, {
          x: x + 5,
          y: y - 15,
          size: 8,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }

    // Generate and download PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards-${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();

    URL.revokeObjectURL(url);
    setIsGenerating(false);
  };

  return (
    <div className="flashcard-generator">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Flashcard Creator</h2>
        <p className="text-dim">
          Create printable flashcards for studying. Enter front and back text for each card.
        </p>
      </div>

      <div className="template-selector mb-6">
        <label className="block text-sm font-medium mb-2">Template:</label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded w-64"
        >
          <option value="standard">Standard (3x5 inch)</option>
          <option value="large">Large (4x6 inch)</option>
          <option value="avery">Avery 5388 (business card)</option>
        </select>
      </div>

      <div className="cards-container space-y-4 mb-8">
        {cards.map((card, index) => (
          <div key={card.id} className="card-pair border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Card {index + 1}</span>
              {cards.length > 1 && (
                <button
                  onClick={() => setCards(cards.filter(c => c.id !== card.id))}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Front:</label>
                <textarea
                  placeholder="Front of card (question, term, etc.)"
                  value={card.front}
                  onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-surface border border-border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Back:</label>
                <textarea
                  placeholder="Back of card (answer, definition, etc.)"
                  value={card.back}
                  onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-surface border border-border rounded"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="action-buttons flex gap-4 mb-8">
        <button
          onClick={addCard}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Add Card
        </button>

        <button
          onClick={downloadPdf}
          disabled={isGenerating}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          {isGenerating ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      <div className="tips bg-surface-variant p-4 rounded">
        <h3 className="font-medium mb-2">Tips:</h3>
        <ul className="text-sm text-dim space-y-1">
          <li>• Print on cardstock for better durability</li>
          <li>• Use the "print on both sides" option for two-sided cards</li>
          <li>• Avery templates work with standard business card sheets</li>
          <li>• Keep text concise for better readability</li>
        </ul>
      </div>
    </div>
  );
}
```

**Step 5: Run test to verify it passes**

```bash
cd apps/web
npx playwright test tests/flashcard-pdf.spec.ts -v
# Expected: PASS
```

**Step 6: Commit flashcard tool**

```bash
git add apps/web/src/pages/tools/flashcard-pdf.astro
git add apps/web/src/components/tools/FlashcardPdf.tsx
git add apps/web/src/lib/tools.ts
git commit -m "feat: add Flashcard PDF Generator tool"
```

---

### Task 2: Document Scanner Enhancement (Auto-Crop)

**Files:**
- Modify: `apps/web/src/components/tools/DocumentScanner.tsx`
- Modify: `apps/web/src/pages/tools/document-scanner.astro` (add AI note)
- Create: Auto-crop algorithm in utility file

**Step 1: Create auto-crop utility**

File: `apps/web/src/lib/autoCrop.ts`
```typescript
export async function autoCropImage(imageData: ImageData): Promise<{x: number, y: number, width: number, height: number}> {
  const { data, width, height } = imageData;

  // Edge detection using simple algorithm
  const getPixel = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return data[index]; // Use red channel for simplicity
  };

  // Find document boundaries
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;

  const threshold = 100; // Adjust for contrast

  for (let y = 0; y < height; y += 5) { // Skip pixels for performance
    for (let x = 0; x < width; x += 5) {
      const pixel = getPixel(x, y);

      if (pixel < threshold) { // Assuming dark document on light background
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  const padding = 20;
  return {
    x: Math.max(0, left - padding),
    y: Math.max(0, top - padding),
    width: Math.min(width - left, right - left + padding * 2),
    height: Math.min(height - top, bottom - top + padding * 2)
  };
}
```

**Step 2: Enhance scanner component**

Add to DocumentScanner.tsx:
```typescript
import { autoCropImage } from '../../lib/autoCrop';

// Add state
const [autoCropEnabled, setAutoCropEnabled] = useState(true);

// Add function
const applyAutoCrop = async (imageSrc: string) => {
  const image = new Image();
  image.src = imageSrc;

  await new Promise(resolve => { image.onload = resolve; });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const crop = await autoCropImage(imageData);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  croppedCanvas.width = crop.width;
  croppedCanvas.height = crop.height;

  croppedCtx.drawImage(
    canvas,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  );

  return croppedCanvas.toDataURL();
};
```

**Step 3: Add UI for auto-crop toggle**

```tsx
<div className="auto-crop-toggle mb-4">
  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={autoCropEnabled}
      onChange={(e) => setAutoCropEnabled(e.target.checked)}
      className="w-4 h-4"
    />
    <span>Auto-detect document edges</span>
  </label>
  <p className="text-xs text-dim mt-1">
    Automatically crop the document from background
  </p>
</div>
```

**Step 4: Test Document Scanner**

```bash
cd apps/web
npx playwright test tests/document-scanner.spec.ts -v
```

---

### Task 3: Invoice Generator

**Files:**
- Create: `apps/web/src/pages/tools/invoice-generator.astro`
- Create: `apps/web/src/components/tools/InvoiceGenerator.tsx`
- Create: `apps/web/src/lib/invoice-templates.ts`

**Step 1: Create React component**

File: `apps/web/src/components/tools/InvoiceGenerator.tsx`
```typescript
import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  from: {
    name: string;
    email: string;
    address: string;
  };
  to: {
    name: string;
    email: string;
    address: string;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
  }[];
  notes: string;
  taxRate: number;
}

export default function InvoiceGenerator() {
  const [invoice, setInvoice] = useState<InvoiceData>({
    invoiceNumber: 'INV-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    from: { name: '', email: '', address: '' },
    to: { name: '', email: '', address: '' },
    items: [{ description: '', quantity: 1, rate: 0 }],
    notes: '',
    taxRate: 0
  });

  const updateField = (section: string, field: string, value: string) => {
    setInvoice(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const updateItem = (index: number, field: keyof typeof invoice.items[0], value: any) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateSubtotal = () => {
    return invoice.items.reduce((sum, item) =>
      sum + (item.quantity * item.rate), 0
    );
  };

  const calculateTax = () => {
    return calculateSubtotal() * (invoice.taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const generatePdf = async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const primaryColor = rgb(0.2, 0.4, 0.8);
    const textColor = rgb(0, 0, 0);
    const lightGray = rgb(0.9, 0.9, 0.9);

    let y = height - 50;

    // Header
    page.drawText('INVOICE', {
      x: 50,
      y: y,
      size: 24,
      font: helveticaBoldFont,
      color: primaryColor,
    });

    y -= 40;

    // Invoice info
    page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
      x: 50,
      y: y,
      size: 12,
      font: helveticaFont,
      color: textColor,
    });

    page.drawText(`Date: ${invoice.date}`, {
      x: 400,
      y: y,
      size: 12,
      font: helveticaFont,
      color: textColor,
    });

    y -= 20;

    page.drawText(`Due Date: ${invoice.dueDate}`, {
      x: 400,
      y: y,
      size: 12,
      font: helveticaFont,
      color: textColor,
    });

    y -= 60;

    // From and To sections
    page.drawText('From:', {
      x: 50,
      y: y,
      size: 12,
      font: helveticaBoldFont,
      color: textColor,
    });

    page.drawText('Bill To:', {
      x: 300,
      y: y,
      size: 12,
      font: helveticaBoldFont,
      color: textColor,
    });

    y -= 20;

    const fromLines = [
      invoice.from.name,
      invoice.from.email,
      ...invoice.from.address.split('\n')
    ];

    fromLines.forEach(line => {
      if (line) {
        page.drawText(line, {
          x: 50,
          y: y,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });
        y -= 15;
      }
    });

    y = height - 210; // Reset for To section

    const toLines = [
      invoice.to.name,
      invoice.to.email,
      ...invoice.to.address.split('\n')
    ];

    toLines.forEach(line => {
      if (line) {
        page.drawText(line, {
          x: 300,
          y: y,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });
        y -= 15;
      }
    });

    y = height - 300;

    // Line items table
    page.drawRectangle({
      x: 50,
      y: y - 20,
      width: width - 100,
      height: 20,
      color: lightGray,
    });

    const tableHeaders = ['Description', 'Quantity', 'Rate', 'Amount'];
    const columnWidths = [280, 70, 80, 80];
    const columnPositions = [50, 330, 400, 480];

    tableHeaders.forEach((header, index) => {
      page.drawText(header, {
        x: columnPositions[index] + 5,
        y: y - 12,
        size: 11,
        font: helveticaBoldFont,
        color: textColor,
      });
    });

    y -= 30;

    invoice.items.forEach((item, index) => {
      if (item.description) {
        const amount = item.quantity * item.rate;

        page.drawText(item.description, {
          x: columnPositions[0] + 5,
          y: y,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });

        page.drawText(item.quantity.toString(), {
          x: columnPositions[1] + 5,
          y: y,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });

        page.drawText(`$${item.rate.toFixed(2)}`, {
          x: columnPositions[2] + 5,
          y: y,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });

        page.drawText(`$${amount.toFixed(2)}`, {
          x: columnPositions[3] + 5,
          y: y,
          size: 11,
          font: helveticaFont,
          color: textColor,
        });

        y -= 20;
      }
    });

    // Totals
    y -= 20;

    const totalY = Math.max(y, 200); // Ensure we don't go off page

    // Subtotal
    page.drawText('Subtotal:', {
      x: columnPositions[2] - 20,
      y: totalY,
      size: 11,
      font: helveticaBoldFont,
      color: textColor,
    });

    page.drawText(`$${calculateSubtotal().toFixed(2)}`, {
      x: columnPositions[3] + 5,
      y: totalY,
      size: 11,
      font: helveticaFont,
      color: textColor,
    });

    // Tax
    if (invoice.taxRate > 0) {
      totalY -= 20;

      page.drawText(`Tax (${invoice.taxRate}%):`, {
        x: columnPositions[2] - 40,
        y: totalY,
        size: 11,
        font: helveticaBoldFont,
        color: textColor,
      });

      page.drawText(`$${calculateTax().toFixed(2)}`, {
        x: columnPositions[3] + 5,
        y: totalY,
        size: 11,
        font: helveticaFont,
        color: textColor,
      });
    }

    // Total
    totalY -= 25;

    page.drawLine({
      start: { x: columnPositions[2] - 20, y: totalY + 10 },
      end: { x: width - 50, y: totalY + 10 },
      thickness: 1,
      color: textColor,
    });

    totalY -= 15;

    page.drawText('TOTAL:', {
      x: columnPositions[2] - 20,
      y: totalY,
      size: 14,
      font: helveticaBoldFont,
      color: textColor,
    });

    page.drawText(`$${calculateTotal().toFixed(2)}`, {
      x: columnPositions[3] + 5,
      y: totalY,
      size: 14,
      font: helveticaBoldFont,
      color: textColor,
    });

    // Notes
    if (invoice.notes) {
      y = totalY - 60;

      page.drawText('Notes:', {
        x: 50,
        y: y,
        size: 12,
        font: helveticaBoldFont,
        color: textColor,
      });

      y -= 20;

      const noteLines = invoice.notes.split('\n');
      noteLines.forEach(line => {
        if (line) {
          page.drawText(line, {
            x: 50,
            y: y,
            size: 11,
            font: helveticaFont,
            color: textColor,
          });
          y -= 15;
        }
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber}.pdf`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="invoice-generator max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Invoice Generator</h2>
        <p className="text-dim">
          Create professional invoices for your business
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invoice Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice #</label>
              <input
                type="text"
                value={invoice.invoiceNumber}
                onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={invoice.date}
                onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium">Tax Rate:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={invoice.taxRate}
              onChange={(e) => setInvoice(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              className="w-20 px-2 py-1 bg-surface border border-border rounded"
            />
            <span>%</span>
          </div>

          {/* From section */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-medium mb-3">From (Your Business)</h3>
            <div className="space-y-3">
              <input
                placeholder="Your Name/Business Name"
                value={invoice.from.name}
                onChange={(e) => updateField('from', 'name', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
              <input
                placeholder="Your Email"
                type="email"
                value={invoice.from.email}
                onChange={(e) => updateField('from', 'email', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
              <textarea
                placeholder="Your Address"
                rows={3}
                value={invoice.from.address}
                onChange={(e) => updateField('from', 'address', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>
          </div>

          {/* To section */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-medium mb-3">Bill To (Client)</h3>
            <div className="space-y-3">
              <input
                placeholder="Client Name"
                value={invoice.to.name}
                onChange={(e) => updateField('to', 'name', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
              <input
                placeholder="Client Email"
                type="email"
                value={invoice.to.email}
                onChange={(e) => updateField('to', 'email', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
              <textarea
                placeholder="Client Address"
                rows={3}
                value={invoice.to.address}
                onChange={(e) => updateField('to', 'address', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Line Items</h3>
              <button
                onClick={addItem}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {invoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="col-span-5 px-2 py-1 bg-surface border border-border rounded text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="col-span-2 px-2 py-1 bg-surface border border-border rounded text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-2 px-2 py-1 bg-surface border border-border rounded text-sm"
                  />
                  <div className="col-span-2 text-right text-sm">
                    ${(item.quantity * item.rate).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="col-span-1 text-red-500 hover:text-red-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              placeholder="Payment terms, thank you message, etc."
              value={invoice.notes}
              onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-surface border border-border rounded"
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <div className="border border-border rounded-lg p-4 bg-surface">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Preview</h3>
              <button
                onClick={generatePdf}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                Download PDF
              </button>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1 mt-1">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2 text-blue-900">Invoice Tips:</h4>
            <ul className="space-y-1 text-blue-800">
              <li>• Include payment terms in the notes section</li>
              <li>• Keep line items clear and descriptive</li>
              <li>• Always include your business and client contact info</li>
              <li>• Save as PDF for professional appearance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 4: Certificate Generator

**Files:**
- Create: `apps/web/src/pages/tools/certificate-generator.astro`
- Create: `apps/web/src/components/tools/CertificateGenerator.tsx`
- Create: `apps/web/src/lib/certificate-templates.ts`

**Step 1: Create React component**

File: `apps/web/src/components/tools/CertificateGenerator.tsx`
```typescript
import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface CertificateData {
  recipientName: string;
  courseTitle: string;
  date: string;
  issuerName: string;
  issuerTitle: string;
  certificateNumber: string;
}

interface CertificateTemplate {
  id: string;
  name: string;
  preview: string;
}

const templates: CertificateTemplate[] = [
  { id: 'academic', name: 'Academic Achievement', preview: '🎓' },
  { id: 'professional', name: 'Professional Development', preview: '💼' },
  { id: 'workshop', name: 'Workshop Completion', preview: '🔧' },
  { id: 'appreciation', name: 'Certificate of Appreciation', preview: '🏆' },
];

export default function CertificateGenerator() {
  const [template, setTemplate] = useState('academic');
  const [data, setData] = useState<CertificateData>({
    recipientName: '',
    courseTitle: '',
    date: new Date().toISOString().split('T')[0],
    issuerName: '',
    issuerTitle: '',
    certificateNumber: Math.random().toString(36).substr(2, 9).toUpperCase()
  });

  const generateCertificate = async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]); // Landscape
    const { width, height } = page.getSize();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Color schemes by template
    const colors = {
      academic: { primary: rgb(0.2, 0.3, 0.6), secondary: rgb(0.1, 0.1, 0.4) },
      professional: { primary: rgb(0.4, 0.4, 0.4), secondary: rgb(0.2, 0.2, 0.2) },
      workshop: { primary: rgb(0.8, 0.3, 0.1), secondary: rgb(0.6, 0.2, 0.1) },
      appreciation: { primary: rgb(0.8, 0.6, 0.1), secondary: rgb(0.6, 0.4, 0.1) },
    };

    const scheme = colors[template as keyof typeof colors];

    // Border
    const borderWidth = 8;
    page.drawRectangle({
      x: borderWidth / 2,
      y: borderWidth / 2,
      width: width - borderWidth,
      height: height - borderWidth,
      borderColor: scheme.primary,
      borderWidth: borderWidth,
    });

    // Inner decorative border
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: scheme.secondary,
      borderWidth: 2,
    });

    let y = height - 100;

    // Header
    page.drawText('CERTIFICATE OF', {
      x: width / 2 - 150,
      y: y,
      size: 24,
      font: timesFont,
      color: scheme.primary,
    });

    y -= 30;

    // Title based on template
    let title = '';
    switch (template) {
      case 'academic':
        title = 'ACADEMIC ACHIEVEMENT';
        break;
      case 'professional':
        title = 'PROFESSIONAL DEVELOPMENT';
        break;
      case 'workshop':
        title = 'WORKSHOP COMPLETION';
        break;
      case 'appreciation':
        title = 'APPRECIATION';
        break;
    }

    page.drawText(title, {
      x: width / 2 - 200,
      y: y,
      size: 32,
      font: helveticaBoldFont,
      color: scheme.primary,
    });

    y -= 60;

    // Decorative line
    page.drawLine({
      start: { x: 150, y: y },
      end: { x: width - 150, y: y },
      thickness: 2,
      color: scheme.secondary,
    });

    y -= 40;

    // Intro text
    page.drawText('This certifies that', {
      x: width / 2 - 60,
      y: y,
      size: 14,
      font: timesFont,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    // Recipient name
    if (data.recipientName) {
      page.drawText(data.recipientName, {
        x: width / 2 - (data.recipientName.length * 6),
        y: y,
        size: 28,
        font: helveticaBoldFont,
        color: scheme.primary,
      });
    }

    y -= 40;

    // Awarded for
    const awardedText = 'has successfully completed';
    page.drawText(awardedText, {
      x: width / 2 - (awardedText.length * 3),
      y: y,
      size: 14,
      font: timesFont,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    // Course title
    if (data.courseTitle) {
      const courseLines = data.courseTitle.split('\n');
      let courseY = y;

      courseLines.forEach((line, index) => {
        if (line.trim()) {
          page.drawText(line.trim(), {
            x: width / 2 - (line.length * 4),
            y: courseY,
            size: 20,
            font: helveticaBoldFont,
            color: scheme.secondary,
          });
          courseY -= 25;
        }
      });

      y = courseY;
    }

    y -= 40;

    // Date
    if (data.date) {
      const dateText = `Date: ${new Date(data.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;

      page.drawText(dateText, {
        x: width / 2 - (dateText.length * 3),
        y: y,
        size: 12,
        font: timesFont,
        color: rgb(0, 0, 0),
      });
    }

    y -= 80;

    // Signature line
    const lineY = 150;
    const lineWidth = 200;

    page.drawLine({
      start: { x: width / 2 - lineWidth, y: lineY },
      end: { x: width / 2 + lineWidth, y: lineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Issuer name
    if (data.issuerName) {
      page.drawText(data.issuerName, {
        x: width / 2 - (data.issuerName.length * 3),
        y: lineY - 20,
        size: 14,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
      });
    }

    // Issuer title
    if (data.issuerTitle) {
      page.drawText(data.issuerTitle, {
        x: width / 2 - (data.issuerTitle.length * 2.5),
        y: lineY - 35,
        size: 12,
        font: timesFont,
        color: rgb(0, 0, 0),
      });
    }

    // Certificate number (small at bottom)
    page.drawText(`Certificate #: ${data.certificateNumber}`, {
      x: width / 2 - 50,
      y: 50,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate-${data.recipientName.replace(/\s+/g, '-')}.pdf`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="certificate-generator max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Certificate Generator</h2>
        <p className="text-dim">
          Create professional certificates for achievements and completion
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Template:</label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`p-4 border rounded text-center transition-colors ${
                    template === t.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-border hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{t.preview}</div>
                  <div className="text-sm">{t.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Name *</label>
              <input
                type="text"
                placeholder="Enter full name"
                value={data.recipientName}
                onChange={(e) => setData(prev => ({ ...prev, recipientName: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Course/Program Title *</label>
              <textarea
                rows={3}
                placeholder="Course or program name"
                value={data.courseTitle}
                onChange={(e) => setData(prev => ({ ...prev, courseTitle: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => setData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Issuer Name *</label>
              <input
                type="text"
                placeholder="Instructor, manager, or organization name"
                value={data.issuerName}
                onChange={(e) => setData(prev => ({ ...prev, issuerName: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Issuer Title</label>
              <input
                type="text"
                placeholder="e.g., Course Instructor, Department Head"
                value={data.issuerTitle}
                onChange={(e) => setData(prev => ({ ...prev, issuerTitle: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Certificate #</label>
              <input
                type="text"
                value={data.certificateNumber}
                onChange={(e) => setData(prev => ({ ...prev, certificateNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded"
                readOnly
              />
            </div>
          </div>

          <button
            onClick={generateCertificate}
            disabled={!data.recipientName || !data.courseTitle || !data.issuerName}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Generate Certificate
          </button>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-1">
          <div className="border border-border rounded-lg p-4 bg-surface sticky top-4">
            <h3 className="font-medium mb-3">Certificate Preview</h3>

            {!data.recipientName || !data.courseTitle || !data.issuerName ? (
              <div className="text-center py-12 text-dim">
                <div className="mb-4">
                  <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20" className="mx-auto opacity-50">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p>Fill in the required fields to see preview</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border border-dashed border-border rounded">
                  <div className="uppercase text-xs font-medium mb-2" style={{ color: scheme.primary }}>
                    Certificate of Integrity
                  </div>
                  <div className="text-lg font-bold mb-1">{data.recipientName}</div>
                  <div className="text-sm text-dim mb-3">{data.courseTitle}</div>
                  <div className="text-xs text-dim">Issued: {new Date(data.date).toLocaleDateString()}</div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
                  <h4 className="font-medium text-blue-900">Certificate Features:</h4>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Professional border and design</li>
                    <li>• Custom color scheme</li>
                    <li>• Signature line for issuer</li>
                    <li>• Unique certificate number</li>
                    <li>• Print-ready PDF format</li>
                  </ul>
                </div>

                <div className="text-xs text-dim">
                  <p><strong>Printing Tips:</strong></p>
                  <ul className="mt-1 space-y-1">
                    <li>• Use cardstock for best quality</li>
                    <li>• Print in color for full effect</li>
                    <li>• Consider framing for display</li>
                    <li>• Save the PDF for your records</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Summary

### Files Created:
1. **Flashcard PDF Generator** - `/tools/flashcard-pdf`
   - Creates printable 3x5 flashcards
   - Multiple templates (standard, large, Avery)
   - Bulk card management

2. **Document Scanner Enhanced** - `/tools/document-scanner`
   - Auto-crop using edge detection
   - Crop to document boundaries
   - Privacy-first (local processing only)

3. **Invoice Generator** - `/tools/invoice-generator`
   - Professional invoice templates
   - Line items with tax calculation
   - Live preview and PDF export

4. **Certificate Generator** - `/tools/certificate-generator`
   - 4 professional templates
   - Customizable fields
   - Print-ready PDF output

### Timeline: 3-4 days estimated

**Day 1**:
- Create tool registry entries
- Build Flashcard PDF Generator
- Tests + commit

**Day 2**:
- Enhance Document Scanner with auto-crop
- Build Invoice Generator
- Tests + commit

**Day 3**:
- Build Certificate Generator
- Comprehensive testing
- Demo to users

**Day 4**:
- Bug fixes and polish
- Add to main hub
- Announcement/launch

### Testing Required:
- PDF generation quality
- Flashcard print alignment
- Auto-crop accuracy
- Invoice math calculations
- Certificate template rendering
- Cross-browser compatibility
- Mobile responsiveness

### Next Steps:
1. Implement these tools following the step-by-step plan above
2. Add to tool registry in `lib/tools.ts`
3. Create thumbnails for each tool
4. Add to hub page navigation
5. Write/update Playwright tests
6. Document in CLAUDE.md
