import { useState, useCallback, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { createSafeErrorMessage } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

// Sample markdown content
const SAMPLE_MARKDOWN = `# Welcome to Markdown Editor

A powerful, browser-based markdown editor with **live preview**.

## Features

- **Live Preview** - See changes as you type
- **Syntax Highlighting** - Code blocks are beautifully highlighted
- **Export Options** - Download as HTML or PDF
- **100% Private** - Everything runs in your browser

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

## Table Example

| Feature | Status |
|---------|--------|
| Live Preview | Yes |
| Syntax Highlighting | Yes |
| Export HTML | Yes |
| Export PDF | Yes |

## Links and Images

Visit [New Life Solutions](https://www.newlifesolutions.dev) for more tools.

> **Tip:** Use the toolbar above to quickly insert formatting.

---

*Start editing to see the preview update in real-time!*
`;

// Configure marked with highlight.js
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Custom renderer for code highlighting
const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.use({ renderer });

type ExportFormat = 'html' | 'pdf';

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Parse markdown to HTML
  const htmlContent = useMemo(() => {
    try {
      const rawHtml = marked.parse(markdown);
      // Sanitize HTML to prevent XSS
      return DOMPurify.sanitize(rawHtml as string, {
        ADD_TAGS: ['pre', 'code'],
        ADD_ATTR: ['class'],
      });
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to parse markdown'));
      return '';
    }
  }, [markdown]);

  // Clear error when markdown changes
  useEffect(() => {
    setError(null);
  }, [markdown]);

  // Toolbar actions
  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = document.getElementById('markdown-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end) || placeholder;

    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    setMarkdown(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [markdown]);

  const toolbarActions = {
    bold: () => insertText('**', '**', 'bold text'),
    italic: () => insertText('*', '*', 'italic text'),
    heading1: () => insertText('# ', '', 'Heading 1'),
    heading2: () => insertText('## ', '', 'Heading 2'),
    heading3: () => insertText('### ', '', 'Heading 3'),
    link: () => insertText('[', '](https://)', 'link text'),
    image: () => insertText('![', '](https://)', 'alt text'),
    code: () => insertText('`', '`', 'code'),
    codeBlock: () => insertText('```\n', '\n```', 'code here'),
    quote: () => insertText('> ', '', 'quote'),
    bulletList: () => insertText('- ', '', 'list item'),
    numberedList: () => insertText('1. ', '', 'list item'),
    horizontalRule: () => insertText('\n---\n', '', ''),
    table: () => insertText('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |\n', '', ''),
  };

  // Export functions
  const exportAsHtml = useCallback(() => {
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    pre {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      background: #f5f5f5;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Fira Code', 'Monaco', monospace;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1rem 0;
      padding-left: 1rem;
      color: #888;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background: #f5f5f5;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    a {
      color: #0066cc;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `markdown_export_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
      }, [htmlContent]);

  const exportAsPdf = useCallback(async () => {
        setIsExporting(true);
    setError(null);

    try {
      // Dynamically import jspdf
      const { jsPDF } = await import('jspdf');

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Create temporary container for HTML rendering
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        width: 170mm;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.5;
        color: #333;
      `;
      document.body.appendChild(container);

      // Use html method for better rendering
      await pdf.html(container, {
        callback: function(doc) {
          doc.save(`markdown_export_${Date.now()}.pdf`);
          document.body.removeChild(container);
          setIsExporting(false);
                  },
        x: 15,
        y: 15,
        width: 170,
        windowWidth: 650,
      });
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to export PDF. Try exporting as HTML instead.'));
      setIsExporting(false);
    }
  }, [htmlContent]);

  const handleExport = useCallback((format: ExportFormat) => {
    if (format === 'html') {
      exportAsHtml();
    } else {
      exportAsPdf();
    }
  }, [exportAsHtml, exportAsPdf]);

  // Copy markdown to clipboard
  const copyMarkdown = useCallback(async () => {
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      setError('Failed to copy to clipboard');
    }
  }, [markdown]);

  // Clear editor
  const clearEditor = useCallback(() => {
    setMarkdown('');
    setError(null);
  }, []);

  // Load sample
  const loadSample = useCallback(() => {
    setMarkdown(SAMPLE_MARKDOWN);
    setError(null);
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
                  {/* Toolbar */}
      <div className="glass-card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {/* Text formatting */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
            <ToolbarButton
              onClick={toolbarActions.bold}
              title="Bold (Ctrl+B)"
              icon={<span className="font-bold">B</span>}
            />
            <ToolbarButton
              onClick={toolbarActions.italic}
              title="Italic (Ctrl+I)"
              icon={<span className="italic">I</span>}
            />
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
            <ToolbarButton
              onClick={toolbarActions.heading1}
              title="Heading 1"
              icon={<span className="text-xs font-bold">H1</span>}
            />
            <ToolbarButton
              onClick={toolbarActions.heading2}
              title="Heading 2"
              icon={<span className="text-xs font-bold">H2</span>}
            />
            <ToolbarButton
              onClick={toolbarActions.heading3}
              title="Heading 3"
              icon={<span className="text-xs font-bold">H3</span>}
            />
          </div>

          {/* Links and media */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
            <ToolbarButton
              onClick={toolbarActions.link}
              title="Insert Link"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
            />
            <ToolbarButton
              onClick={toolbarActions.image}
              title="Insert Image"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>

          {/* Code */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
            <ToolbarButton
              onClick={toolbarActions.code}
              title="Inline Code"
              icon={<span className="font-mono text-xs">&lt;/&gt;</span>}
            />
            <ToolbarButton
              onClick={toolbarActions.codeBlock}
              title="Code Block"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              }
            />
          </div>

          {/* Lists and blocks */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
            <ToolbarButton
              onClick={toolbarActions.bulletList}
              title="Bullet List"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              }
            />
            <ToolbarButton
              onClick={toolbarActions.numberedList}
              title="Numbered List"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              }
            />
            <ToolbarButton
              onClick={toolbarActions.quote}
              title="Blockquote"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
            />
            <ToolbarButton
              onClick={toolbarActions.table}
              title="Insert Table"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
            />
            <ToolbarButton
              onClick={toolbarActions.horizontalRule}
              title="Horizontal Rule"
              icon={<span className="text-xs">---</span>}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={loadSample}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
            >
              Sample
            </button>
            <button
              onClick={clearEditor}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Split Pane Editor */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Editor Panel */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-medium flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Markdown
            </h2>
            <button
              onClick={copyMarkdown}
              className={`
                text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5
                ${copySuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white'
                }
              `}
            >
              {copySuccess ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <textarea
            id="markdown-input"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Write your markdown here..."
            className="w-full h-[500px] px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{markdown.length.toLocaleString()} characters</span>
            <span>{markdown.split('\n').length} lines</span>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-medium flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('html')}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                HTML
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className={`
                  text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors flex items-center gap-1.5
                  ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isExporting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    PDF
                  </>
                )}
              </button>
            </div>
          </div>
          <div
            className="w-full h-[500px] px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 overflow-auto prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-medium">Error</div>
              <div>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        All markdown processing happens locally in your browser. No data is sent to any server.
      </p>

      {/* Highlight.js styles */}
      <style>{`
        .prose pre {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }
        .prose code {
          background: #1e293b;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .prose pre code {
          background: none;
          padding: 0;
        }
        .prose blockquote {
          border-left: 4px solid #4f46e5;
          padding-left: 1rem;
          color: #94a3b8;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
        }
        .prose th, .prose td {
          border: 1px solid #334155;
          padding: 0.5rem;
          text-align: left;
        }
        .prose th {
          background: #1e293b;
        }
        .prose a {
          color: #818cf8;
          text-decoration: underline;
        }
        .prose a:hover {
          color: #a5b4fc;
        }
        .prose img {
          max-width: 100%;
          border-radius: 0.5rem;
        }
        .prose hr {
          border-color: #334155;
        }
        /* Highlight.js theme (GitHub Dark) */
        .hljs {
          color: #c9d1d9;
        }
        .hljs-comment, .hljs-quote {
          color: #8b949e;
          font-style: italic;
        }
        .hljs-keyword, .hljs-selector-tag {
          color: #ff7b72;
        }
        .hljs-string, .hljs-title, .hljs-section, .hljs-attr {
          color: #a5d6ff;
        }
        .hljs-variable, .hljs-template-variable {
          color: #ffa657;
        }
        .hljs-literal, .hljs-number {
          color: #79c0ff;
        }
        .hljs-function, .hljs-built_in {
          color: #d2a8ff;
        }
        .hljs-type, .hljs-class {
          color: #7ee787;
        }
        .hljs-emphasis {
          font-style: italic;
        }
        .hljs-strong {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}

function ToolbarButton({ onClick, title, icon }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white transition-colors"
    >
      {icon}
    </button>
  );
}
