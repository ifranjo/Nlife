import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { createSafeErrorMessage, sanitizeFilename } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

interface SvgStats {
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
}

interface SvgDimensions {
  width: number;
  height: number;
  viewBox: string | null;
}

export default function SvgEditor() {
  
  const [inputSvg, setInputSvg] = useState('');
  const [outputSvg, setOutputSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [stats, setStats] = useState<SvgStats | null>(null);
  const [dimensions, setDimensions] = useState<SvgDimensions | null>(null);

  // Editing options
  const [fillColor, setFillColor] = useState('#ffffff');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [scalePercent, setScalePercent] = useState(100);
  const [applyFill, setApplyFill] = useState(false);
  const [applyStroke, setApplyStroke] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Parse SVG dimensions
  const parseSvgDimensions = useCallback((svgString: string): SvgDimensions | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      if (!svg) return null;

      const width = parseFloat(svg.getAttribute('width') || '0');
      const height = parseFloat(svg.getAttribute('height') || '0');
      const viewBox = svg.getAttribute('viewBox');

      return { width, height, viewBox };
    } catch {
      return null;
    }
  }, []);

  // Update dimensions when input changes
  useEffect(() => {
    if (inputSvg) {
      const dims = parseSvgDimensions(inputSvg);
      setDimensions(dims);
    } else {
      setDimensions(null);
    }
  }, [inputSvg, parseSvgDimensions]);

  // Validate SVG
  const isValidSvg = useCallback((svgString: string): boolean => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      const svg = doc.querySelector('svg');
      return !parserError && svg !== null;
    } catch {
      return false;
    }
  }, []);

  // Basic SVG optimization (browser-side without SVGO)
  const optimizeSvg = useCallback((svgString: string): string => {
    let optimized = svgString;

    // Remove XML declaration
    optimized = optimized.replace(/<\?xml[^>]*\?>\s*/gi, '');

    // Remove comments
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

    // Remove unnecessary whitespace between tags
    optimized = optimized.replace(/>\s+</g, '><');

    // Remove empty lines
    optimized = optimized.replace(/^\s*[\r\n]/gm, '');

    // Remove DOCTYPE
    optimized = optimized.replace(/<!DOCTYPE[^>]*>/gi, '');

    // Remove metadata elements
    optimized = optimized.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');

    // Remove title and desc if they're empty
    optimized = optimized.replace(/<title>\s*<\/title>/gi, '');
    optimized = optimized.replace(/<desc>\s*<\/desc>/gi, '');

    // Remove editor-specific attributes (Inkscape, Illustrator, etc.)
    optimized = optimized.replace(/\s*(inkscape|sodipodi|xmlns:(inkscape|sodipodi|dc|cc|rdf))[^=]*="[^"]*"/gi, '');

    // Remove style attributes with empty values
    optimized = optimized.replace(/\s+style="\s*"/gi, '');

    // Remove id attributes that look auto-generated
    optimized = optimized.replace(/\s+id="(path|rect|circle|ellipse|line|polygon|polyline|group|layer)\d+"/gi, '');

    // Collapse multiple spaces in attributes
    optimized = optimized.replace(/\s{2,}/g, ' ');

    // Remove default attribute values
    optimized = optimized.replace(/\s+fill-opacity="1"/gi, '');
    optimized = optimized.replace(/\s+stroke-opacity="1"/gi, '');
    optimized = optimized.replace(/\s+opacity="1"/gi, '');
    optimized = optimized.replace(/\s+fill-rule="nonzero"/gi, '');

    // Trim
    optimized = optimized.trim();

    return optimized;
  }, []);

  // Apply color changes
  const applyColorChanges = useCallback((svgString: string): string => {
    let modified = svgString;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      if (!svg) return svgString;

      // Apply fill color
      if (applyFill) {
        const elements = svg.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
        elements.forEach(el => {
          const currentFill = el.getAttribute('fill');
          // Don't replace 'none' fills
          if (currentFill !== 'none') {
            el.setAttribute('fill', fillColor);
          }
        });
        // Also set on root svg if it has a fill
        if (svg.getAttribute('fill') && svg.getAttribute('fill') !== 'none') {
          svg.setAttribute('fill', fillColor);
        }
      }

      // Apply stroke color
      if (applyStroke) {
        const elements = svg.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line');
        elements.forEach(el => {
          const currentStroke = el.getAttribute('stroke');
          if (currentStroke && currentStroke !== 'none') {
            el.setAttribute('stroke', strokeColor);
          }
        });
        if (svg.getAttribute('stroke') && svg.getAttribute('stroke') !== 'none') {
          svg.setAttribute('stroke', strokeColor);
        }
      }

      // Serialize back to string
      const serializer = new XMLSerializer();
      modified = serializer.serializeToString(svg);
    } catch {
      // If parsing fails, return original
      return svgString;
    }

    return modified;
  }, [applyFill, fillColor, applyStroke, strokeColor]);

  // Apply scale changes
  const applyScaleChanges = useCallback((svgString: string): string => {
    if (scalePercent === 100) return svgString;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      if (!svg) return svgString;

      const scaleFactor = scalePercent / 100;

      // Get current dimensions
      const width = parseFloat(svg.getAttribute('width') || '0');
      const height = parseFloat(svg.getAttribute('height') || '0');

      if (width > 0) {
        svg.setAttribute('width', String(Math.round(width * scaleFactor)));
      }
      if (height > 0) {
        svg.setAttribute('height', String(Math.round(height * scaleFactor)));
      }

      // Serialize back
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svg);
    } catch {
      return svgString;
    }
  }, [scalePercent]);

  // Process SVG
  const processSvg = useCallback(async () => {
    
    if (!inputSvg.trim()) {
      setError('Please enter or upload an SVG');
      return;
    }

    if (!isValidSvg(inputSvg)) {
      setError('Invalid SVG format. Please check your input.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Apply transformations
      let processed = inputSvg;
      processed = optimizeSvg(processed);
      processed = applyColorChanges(processed);
      processed = applyScaleChanges(processed);

      setOutputSvg(processed);

      // Calculate stats
      const originalSize = new Blob([inputSvg]).size;
      const optimizedSize = new Blob([processed]).size;
      const savings = originalSize - optimizedSize;
      const savingsPercent = originalSize > 0 ? Math.round((savings / originalSize) * 100) : 0;

      setStats({
        originalSize,
        optimizedSize,
        savings,
        savingsPercent: Math.max(0, savingsPercent)
      });

          } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to process SVG'));
    } finally {
      setIsProcessing(false);
    }
  }, [inputSvg, isValidSvg, optimizeSvg, applyColorChanges, applyScaleChanges]);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    // Check extension
    if (!file.name.toLowerCase().endsWith('.svg')) {
      setError('Please upload an SVG file');
      return;
    }

    try {
      const text = await file.text();

      if (!isValidSvg(text)) {
        setError('Invalid SVG file. Please check the file content.');
        return;
      }

      setInputSvg(text);
      setOutputSvg('');
      setStats(null);
      setError(null);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to read file'));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isValidSvg]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Create a synthetic change event
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!outputSvg) return;

    const success = await copyToClipboard(outputSvg);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      setError('Failed to copy to clipboard');
    }
  }, [outputSvg]);

  // Download SVG
  const downloadSvg = useCallback(() => {
    if (!outputSvg) return;

    try {
      const blob = new Blob([outputSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimized_${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to download file'));
    }
  }, [outputSvg]);

  // Clear all
  const clearAll = useCallback(() => {
    setInputSvg('');
    setOutputSvg('');
    setError(null);
    setStats(null);
    setDimensions(null);
    setScalePercent(100);
    setApplyFill(false);
    setApplyStroke(false);
  }, []);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto">

      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Input SVG</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
              >
                Upload .svg
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              {inputSvg && (
                <button
                  onClick={clearAll}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Drop zone / Text area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative"
          >
            <textarea
              value={inputSvg}
              onChange={(e) => {
                setInputSvg(e.target.value);
                setOutputSvg('');
                setStats(null);
                setError(null);
              }}
              placeholder='Paste SVG code here or drag & drop an SVG file...

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#3b82f6"/>
</svg>'
              rows={12}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Dimensions display */}
          {dimensions && (
            <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
              {dimensions.width > 0 && dimensions.height > 0 && (
                <span>Size: {dimensions.width} x {dimensions.height}</span>
              )}
              {dimensions.viewBox && (
                <span>ViewBox: {dimensions.viewBox}</span>
              )}
            </div>
          )}

          {/* Edit Options */}
          <div className="mt-4 space-y-4">
            {/* Color Options */}
            <div className="grid grid-cols-2 gap-4">
              {/* Fill Color */}
              <div>
                <label className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-2">
                  <input
                    type="checkbox"
                    checked={applyFill}
                    onChange={(e) => setApplyFill(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600"
                  />
                  Replace Fill Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    disabled={!applyFill}
                    aria-label="Fill color picker"
                    className="w-10 h-8 rounded cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    disabled={!applyFill}
                    aria-label="Fill color hex value"
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Stroke Color */}
              <div>
                <label className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-2">
                  <input
                    type="checkbox"
                    checked={applyStroke}
                    onChange={(e) => setApplyStroke(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600"
                  />
                  Replace Stroke Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    disabled={!applyStroke}
                    aria-label="Stroke color picker"
                    className="w-10 h-8 rounded cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    disabled={!applyStroke}
                    aria-label="Stroke color hex value"
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Scale */}
            <div>
              <label className="block text-[var(--text-muted)] text-xs mb-2">
                Scale: {scalePercent}%
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={scalePercent}
                  onChange={(e) => setScalePercent(parseInt(e.target.value))}
                  aria-label="SVG scale percentage"
                  className="flex-1"
                />
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={scalePercent}
                  onChange={(e) => setScalePercent(Math.min(500, Math.max(10, parseInt(e.target.value) || 100)))}
                  aria-label="SVG scale percentage value"
                  className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs text-center"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <button
              onClick={processSvg}
              disabled={!inputSvg.trim() || isProcessing}
              className={`
                w-full btn-primary flex items-center justify-center gap-2
                ${(!inputSvg.trim() || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Optimize SVG
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Output</h2>
            <div className="flex items-center gap-2">
              {outputSvg && (
                <>
                  <button
                    onClick={handleCopyToClipboard}
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
                  <button
                    onClick={downloadSvg}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview - SVG sanitized with DOMPurify for XSS protection */}
          <div
            ref={previewRef}
            className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden mb-4"
            style={{
              backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          >
            {outputSvg ? (
              <div
                className="max-w-full max-h-full p-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(outputSvg, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
              />
            ) : inputSvg && isValidSvg(inputSvg) ? (
              <div
                className="max-w-full max-h-full p-4 opacity-50"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inputSvg, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
              />
            ) : (
              <span className="text-slate-600 text-sm">SVG preview will appear here</span>
            )}
          </div>

          {/* Output code */}
          <textarea
            value={outputSvg}
            readOnly
            placeholder="Optimized SVG code will appear here..."
            rows={8}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none resize-none"
          />

          {/* Stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-xs text-[var(--text-muted)] mb-1">Original</div>
                <div className="text-white font-medium">{formatBytes(stats.originalSize)}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-xs text-[var(--text-muted)] mb-1">Optimized</div>
                <div className="text-white font-medium">{formatBytes(stats.optimizedSize)}</div>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                <div className="text-xs text-green-400 mb-1">Saved</div>
                <div className="text-green-300 font-medium">
                  {stats.savingsPercent > 0 ? (
                    <>-{stats.savingsPercent}%</>
                  ) : (
                    <>0%</>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        All SVG processing happens locally in your browser. No files are uploaded to any server.
      </p>
    </div>
  );
}
