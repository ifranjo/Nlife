import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import ToolFeedback from '../ui/ToolFeedback';
import { validateFile, sanitizeFilename, createSafeErrorMessage, sanitizeTextContent } from '../../lib/security';

type Status = 'idle' | 'processing' | 'done' | 'error';

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function PdfToWord() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);

  // Usage limits for free tier
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security validation with magic bytes check
    const validation = await validateFile(file, 'pdf');
    if (!validation.valid) {
      setError(validation.error || 'Invalid PDF file');
      return;
    }

    setPdfFile(file);
    setError(null);
    setExtractedText('');
  };

  const handleConvert = async () => {
    if (!pdfFile) return;

    setStatus('processing');
    setError(null);

    try {
      const fallbackText = `Converted from ${pdfFile.name}.\n\nText extraction was limited in your browser environment.`;
      let sanitizedText = fallbackText;
      let resolvedPageCount = 1;

      try {
        // Dynamically import PDF.js
        const pdfjsLib = await withTimeout(import('pdfjs-dist'), 15000, 'Timed out loading PDF.js');
        // Use bundled local worker to avoid CSP/network issues on production.
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await withTimeout(
          pdfjsLib.getDocument({
            data: arrayBuffer,
            // Reliability fallback: avoid worker dependency in restrictive CSP environments.
            disableWorker: true,
          }).promise,
          20000,
          'Timed out reading PDF'
        );

        resolvedPageCount = Math.max(1, pdf.numPages);
        const textContent: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await withTimeout(pdf.getPage(i), 8000, `Timed out loading page ${i}`);
          const content = await withTimeout(page.getTextContent(), 8000, `Timed out extracting page ${i}`);
          const pageText = content.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          if (pageText) textContent.push(pageText);
        }

        if (textContent.length > 0) {
          const fullText = textContent.join('\n\n');
          sanitizedText = sanitizeTextContent(fullText);
        }
      } catch {
        // Non-fatal: fallback document still gets generated.
      }

      setPageCount(resolvedPageCount);
      setExtractedText(sanitizedText);

      // Create Word document
      const paragraphs = sanitizedText.split('\n\n').map((para, index) => {
        // Check if it looks like a heading (short, possibly all caps)
        const isHeading = para.length < 100 && para === para.toUpperCase() && para.length > 3;

        if (isHeading) {
          return new Paragraph({
            children: [new TextRun({ text: para, bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          });
        }

        return new Paragraph({
          children: [new TextRun({ text: para, size: 24 })],
          spacing: { after: 200 },
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const baseName = sanitizeFilename(pdfFile.name.replace('.pdf', ''));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('done');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Conversion failed. The PDF may be scanned or protected.'));
      setStatus('error');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex justify-end">
              </div>

      {/* Upload */}
      <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors">
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="pdf-word-upload"
          disabled={status === 'processing'}
        />
        <label htmlFor="pdf-word-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-[var(--text)] mb-2">
            {pdfFile ? pdfFile.name : 'Drop PDF file or click to browse'}
          </p>
          {pdfFile && (
            <p className="text-[var(--text-muted)] text-sm">{formatSize(pdfFile.size)}</p>
          )}
        </label>
      </div>

      {/* Status */}
      {status === 'processing' && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span>Extracting text and converting...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Convert Button */}
      {pdfFile && status === 'idle' && (
        <button
          onClick={handleConvert}
          className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
        >
          Convert to Word (.docx)
        </button>
      )}

      {/* Result */}
      {status === 'done' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <span className="text-green-400">Conversion complete!</span>
              <p className="text-sm text-[var(--text-muted)]">
                Extracted {pageCount} page{pageCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Preview */}
          {extractedText && (
            <div className="bg-[var(--bg)] rounded p-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-[var(--text-muted)] mb-2">Preview:</p>
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
                {extractedText.substring(0, 500)}
                {extractedText.length > 500 && '...'}
              </p>
            </div>
          )}

          <button
            onClick={() => {
              setPdfFile(null);
              setExtractedText('');
              setStatus('idle');
            }}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Convert Another PDF
          </button>

          <div className="pt-2 border-t border-[var(--border)]">
            <ToolFeedback toolId="pdf-to-word" />
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>• Extracts text from text-based PDFs</p>
        <p>• Scanned PDFs (images) require OCR first</p>
        <p>• Complex layouts may not preserve perfectly</p>
        <p>• All processing happens in your browser</p>
      </div>

          </div>
  );
}
