# Example: Creating "PDF Organizer" Tool

This example walks through creating a new PDF Organizer tool using the automated testing framework.

## Step 1: Create Tool Structure

```bash
# From project root
node scripts/create-new-tool.js "PDF Organizer" pdf-organizer document
```

Output:
```
Creating PDF Organizer (pdf-organizer)...
✓ Created src/components/tools/pdf-organizer.tsx
✓ Created src/pages/tools/pdf-organizer.astro
✓ Created tests/pdf-organizer.spec.ts
✓ Created tests/accessibility/pdf-organizer.spec.ts
✓ Created tests/visual/pdf-organizer.spec.ts
✓ Created public/thumbnails/pdf-organizer.svg

⚠️  Manual step required:
Add this tool entry to apps/web/src/lib/tools.ts:
```

## Step 2: Register Tool

Add to `apps/web/src/lib/tools.ts`:

```typescript
{
  id: 'pdf-organizer',
  name: 'PDF Organizer',
  description: 'Reorder, delete, and organize PDF pages visually. Drag-and-drop interface with instant preview.',
  icon: '📋',
  thumbnail: '/thumbnails/pdf-organizer.svg',
  category: 'document',
  tier: 'free',
  href: '/tools/pdf-organizer',
  color: 'from-purple-500 to-pink-500',
  tags: ['pdf', 'organize', 'reorder', 'pages', 'arrange'],
  popular: false,
  releaseDate: '2025-01-10',
  answer: 'PDF Organizer lets you reorder, delete, and arrange PDF pages with a visual drag-and-drop interface. Preview changes instantly, merge pages from different PDFs, and export your organized document. All processing happens locally in your browser for complete privacy.',
  seo: {
    title: 'Organize PDF Pages Online Free - Reorder, Delete, Arrange | New Life',
    metaDescription: 'Reorder, delete, and organize PDF pages visually. Drag-and-drop interface with instant preview. 100% free, no uploads, works offline.',
    h1: 'Organize PDF Pages - Free Online Tool',
    keywords: ['organize pdf', 'reorder pdf pages', 'delete pdf pages', 'arrange pdf', 'pdf organizer online', 'pdf page manager']
  },
  faq: [
    {
      question: 'How do I reorder PDF pages?',
      answer: 'Simply drag and drop pages in the visual interface. Changes are previewed instantly.'
    },
    {
      question: 'Can I delete pages from a PDF?',
      answer: 'Yes, click the X button on any page thumbnail to remove it from your PDF.'
    },
    {
      question: 'Will this affect my original PDF?',
      answer: 'No, your original file remains unchanged. We create a new organized PDF.'
    }
  ],
  stats: [
    { label: 'Maximum file size', value: 'Up to 100MB' },
    { label: 'Pages per PDF', value: 'Unlimited' },
    { label: 'Processing', value: '100% client-side' }
  ]
}
```

## Step 3: Implement Component Logic

Replace the placeholder in `src/components/tools/pdf-organizer.tsx`:

```typescript
import { useState, useRef, useCallback } from 'react';
import { validateFile, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

interface PDFOrganizerProps {}

interface PDFPage {
  id: string;
  blob: Blob;
  url: string;
}

export default function PDFOrganizer({}: PDFOrganizerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    try {
      setError('');
      await validateFile(selectedFile, 'pdf');
      setFile(selectedFile);
      await loadPDF(selectedFile);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Invalid PDF file'));
    }
  }, []);

  const loadPDF = async (pdfFile: File) => {
    setProcessing(true);
    setProgress(0);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);

      const pageCount = pdf.getPageCount();
      const loadedPages: PDFPage[] = [];

      for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });

        loadedPages.push({
          id: `page-${i}`,
          blob,
          url: URL.createObjectURL(blob)
        });

        setProgress(((i + 1) / pageCount) * 50);
      }

      setPages(loadedPages);
      setProgress(100);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to load PDF'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newPages = [...pages];
    const draggedPage = newPages[draggedIndex];
    newPages.splice(draggedIndex, 1);
    newPages.splice(dropIndex, 0, draggedPage);

    setPages(newPages);
    setDraggedIndex(null);
  };

  const deletePage = (index: number) => {
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
  };

  const exportPDF = async () => {
    if (pages.length === 0) return;

    setProcessing(true);
    setProgress(0);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const newPdf = await PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const arrayBuffer = await page.blob.arrayBuffer();
        const pagePdf = await PDFDocument.load(arrayBuffer);
        const [copiedPage] = await newPdf.copyPages(pagePdf, [0]);
        newPdf.addPage(copiedPage);
        setProgress((i + 1) / pages.length * 100);
      }

      const bytes = await newPdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizeFilename(file!.name, 'organized.pdf');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to export PDF'));
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup URLs on unmount
  useState(() => {
    return () => {
      pages.forEach(page => URL.revokeObjectURL(page.url));
    };
  });

  return (
    <div className="glass-card p-6">
      <div className="space-y-6">
        {!file ? (
          <div
            className="drop-zone border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium">Drop your PDF here or click to browse</p>
            <p className="text-sm text-gray-400 mt-2">Maximum 100MB file size</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-400">{pages.length} pages</p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setPages([]);
                  pages.forEach(p => URL.revokeObjectURL(p.url));
                }}
                className="btn-secondary"
              >
                Upload Different PDF
              </button>
            </div>

            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {pages.length > 0 && !processing && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pages.map((page, index) => (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="relative group cursor-move"
                    >
                      <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={page.url}
                          alt={`Page ${index + 1}`}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-2 text-center">
                          <p className="text-sm text-gray-700">Page {index + 1}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={exportPDF}
                    disabled={processing}
                    className="btn-primary flex-1"
                  >
                    {processing ? 'Exporting...' : 'Export Organized PDF'}
                  </button>
                  <button
                    onClick={() => {
                      // Reset to original order
                      if (file) loadPDF(file);
                    }}
                    className="btn-secondary"
                  >
                    Reset Order
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          ⚡ Your PDF is processed locally and never leaves your browser
        </div>
      </div>
    </div>
  );
}
```

## Step 4: Run Tests

```bash
# Functional tests
cd apps/web
npx playwright test tests/pdf-organizer.spec.ts

# Accessibility tests
npx playwright test tests/accessibility/pdf-organizer.spec.ts

# Visual tests (will create baseline screenshots)
npx playwright test tests/visual/pdf-organizer.spec.ts
```

## Step 5: Validate Tool

```bash
# From project root
node scripts/validate-new-tool.js pdf-organizer
```

Expected output:
```
🔍 Validating tool: pdf-organizer

✅ Tool Registration: Tool found in tools.ts
✅ Component File: File exists
✅ Component Quality: Basic quality checks passed
✅ Astro Page: File exists
✅ Page Quality: Basic quality checks passed
✅ Functional Tests: File exists
✅ Accessibility Tests: File exists
✅ Visual Tests: File exists
✅ Thumbnail: File exists

🧪 Running tests...

Running Functional Tests...
✅ Functional Tests Results: All tests passed
Running Accessibility Tests...
✅ Accessibility Tests Results: All tests passed
Running Visual Tests...
✅ Visual Tests Results: All tests passed

📊 Validation Summary

✅ Passed: 10
❌ Failed: 0
⚠️  Warnings: 0

✨ All checks passed!
```

## Step 6: Manual Testing Checklist

After automated tests pass, verify:

- [ ] Upload a 90MB PDF (stress test)
- [ ] Delete pages from beginning, middle, and end
- [ ] Reorder pages multiple times
- [ ] Export with 1 page remaining
- [ ] Export with all pages deleted (should show error)
- [ ] Test on mobile device
- [ ] Test with keyboard only
- [ ] Test with screen reader
- [ ] Verify no memory leaks (check DevTools Performance tab)

## Step 7: Create Pull Request

```bash
git checkout -b feat/pdf-organizer
git add .
git commit -m "feat: Add PDF Organizer tool with drag-and-drop interface
git push origin feat/pdf-organizer
```

Then create PR with:
- Description of features
- Screenshots of tool in action
- Test results summary
- Any known limitations

## Common Issues & Solutions

### Issue: Visual tests fail on CI
**Solution**: Update snapshots if changes are intentional:
```bash
npx playwright test tests/visual/pdf-organizer.spec.ts --update-snapshots
```

### Issue: Memory warnings in large PDFs
**Solution**: Implement page virtualization or pagination:
```typescript
// Show only 20 pages at a time
const visiblePages = pages.slice(startIndex, startIndex + 20);
```

### Issue: Drag-and-drop not working on mobile
**Solution**: Add touch event handlers or use a library like react-beautiful-dnd

### Issue: Accessibility test fails on color contrast
**Solution**: Check the thumbnail gradient colors meet WCAG standards

## Performance Optimization

For tools processing large files:

1. **Web Workers**: Move processing off main thread
2. **Streaming**: Process in chunks
3. **Progress Updates**: Show incremental progress
4. **Memory Management**: Clean up object URLs

Example optimization:
```typescript
// Use Web Worker for heavy processing
const worker = new Worker(new URL('./pdf-worker.ts', import.meta.url));
worker.postMessage({ file: arrayBuffer });
worker.onmessage = (e) => {
  setProgress(e.data.progress);
  if (e.data.complete) {
    setPages(e.data.pages);
  }
};
```

## Summary

Total time: **15 minutes** (vs 60+ minutes manual)
- Tool creation: 2 minutes
- Implementation: 10 minutes
- Testing: 2 minutes
- Validation: 1 minute

The framework handles:
- ✅ Test scaffolding
- ✅ Accessibility validation
- ✅ Visual regression setup
- ✅ Code quality checks
- ✅ Documentation generation

You focus on:
- 🎯 Core processing logic
- 🎯 UX improvements
- 🎯 Performance optimization

---

*Next: Check out the Testing Framework documentation for advanced features*,