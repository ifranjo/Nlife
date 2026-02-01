# useFileProcessor Hook - Migration Examples

This document shows how to migrate existing tool components to use the new `useFileProcessor` hook.

## Table of Contents
1. [Simple Single File Processing](#simple-single-file-processing)
2. [Multiple File Processing](#multiple-file-processing)
3. [Multi-file Operations (Merge/ZIP)](#multi-file-operations-mergezip)
4. [Migration from ImageCompress](#migration-from-imagecompress)
5. [Migration from PdfCompress](#migration-from-pdfcompress)
6. [Migration from VideoCompressor](#migration-from-videocompressor)

---

## Simple Single File Processing

For tools that process a single file at a time (e.g., VideoCompressor):

```tsx
import useFileProcessor from '../hooks/useFileProcessor';

export default function MyTool() {
  const { state, handlers, utils, refs, computed } = useFileProcessor({
    fileCategory: 'video',
    maxFiles: 1,
    processor: async (file, signal) => {
      // Your processing logic here
      const blob = await processVideo(file);
      return {
        blob,
        filename: file.name.replace(/\.[^.]+$/, '_processed.mp4'),
      };
    },
  });

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onClick={() => refs.fileInputRef.current?.click()}
        className={`drop-zone ${state.dragDrop.isDragOver ? 'drag-over' : ''}`}
      >
        <input
          ref={refs.fileInputRef}
          type="file"
          accept="video/*"
          onChange={handlers.onFileSelect}
          className="hidden"
        />
        <p>Drop video here or click to browse</p>
      </div>

      {/* Status */}
      {state.status === 'processing' && (
        <div>Processing: {state.progress}%</div>
      )}

      {/* Error */}
      {state.error && (
        <div className="error">{state.error}</div>
      )}

      {/* Process Button */}
      {computed.hasFiles && state.status !== 'processing' && (
        <button onClick={handlers.onProcess} disabled={state.status === 'processing'}>
          Process Video
        </button>
      )}

      {/* Download Button */}
      {state.status === 'done' && (
        <button onClick={() => handlers.onDownload()}>
          Download Processed Video
        </button>
      )}
    </div>
  );
}
```

---

## Multiple File Processing

For tools that process multiple files individually (e.g., ImageCompress):

```tsx
import useFileProcessor from '../hooks/useFileProcessor';

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80);

  const { state, handlers, utils, refs, computed } = useFileProcessor({
    fileCategory: 'image',
    maxFiles: 20,
    processor: async (file) => {
      // Process individual image with quality setting
      const blob = await compressImage(file, quality);
      return {
        blob,
        filename: file.name.replace(/\.[^.]+$/, '_compressed.jpg'),
        metadata: { originalSize: file.size, compressedSize: blob.size },
      };
    },
  });

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onClick={() => refs.fileInputRef.current?.click()}
        className={`drop-zone ${state.dragDrop.isDragOver ? 'drag-over' : ''}`}
      >
        <input
          ref={refs.fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlers.onFileSelect}
          className="hidden"
        />
        <p>Drop images here or click to browse</p>
      </div>

      {/* Quality Setting */}
      <input
        type="range"
        min="1"
        max="100"
        value={quality}
        onChange={(e) => setQuality(Number(e.target.value))}
      />

      {/* File List */}
      {computed.hasFiles && (
        <div>
          <h4>{computed.totalFiles} files selected</h4>
          {state.files.map((file) => (
            <div key={file.id}>
              <span>{file.name}</span>
              <span>{utils.formatFileSize(file.originalSize)}</span>
              {file.status === 'processing' && <span>Processing...</span>}
              {file.status === 'done' && (
                <span>Done - {utils.formatFileSize(file.result?.blob.size || 0)}</span>
              )}
              {file.status === 'error' && <span>Error: {file.error}</span>}
              <button onClick={() => handlers.onRemoveFile(file.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Process Button */}
      <button onClick={handlers.onProcess} disabled={state.status === 'processing'}>
        Compress {computed.totalFiles} Images
      </button>

      {/* Download All */}
      {computed.hasCompletedFiles && (
        <button onClick={handlers.onDownloadAll}>
          Download All (ZIP)
        </button>
      )}
    </div>
  );
}
```

---

## Multi-file Operations (Merge/ZIP)

For tools that combine multiple files into one (e.g., PdfMerge):

```tsx
import useFileProcessor from '../hooks/useFileProcessor';

export default function PdfMerger() {
  const { state, handlers, utils, refs, computed } = useFileProcessor({
    fileCategory: 'pdf',
    maxFiles: 50,
    multiFileProcessor: async (files) => {
      // Merge all PDFs into one
      const blob = await mergePDFs(files);
      return {
        blob,
        filename: 'merged.pdf',
      };
    },
  });

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onClick={() => refs.fileInputRef.current?.click()}
        className={`drop-zone ${state.dragDrop.isDragOver ? 'drag-over' : ''}`}
      >
        <input
          ref={refs.fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handlers.onFileSelect}
          className="hidden"
        />
        <p>Drop PDFs here to merge</p>
      </div>

      {/* File List */}
      {computed.hasFiles && (
        <div>
          <h4>{computed.totalFiles} PDFs to merge</h4>
          {state.files.map((file, index) => (
            <div key={file.id}>
              <span>{index + 1}. {file.name}</span>
              <button onClick={() => handlers.onRemoveFile(file.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Merge Button */}
      {computed.totalFiles >= 2 && (
        <button onClick={handlers.onProcess} disabled={state.status === 'processing'}>
          Merge {computed.totalFiles} PDFs
        </button>
      )}

      {/* Download */}
      {state.status === 'done' && (
        <button onClick={() => handlers.onDownload()}>
          Download Merged PDF
        </button>
      )}
    </div>
  );
}
```

---

## Migration from ImageCompress

**Before (original):**
```tsx
export default function ImageCompress() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    // ... validation logic
    // ... file processing logic
  }, [files.length]);

  const compressImage = async (file: File, quality: number) => {
    // ... compression logic
  };

  const downloadSingleImage = (imageFile: ImageFile) => {
    // ... download logic
  };

  // ... 400+ lines of state management
}
```

**After (with useFileProcessor):**
```tsx
import useFileProcessor from '../hooks/useFileProcessor';

interface ImageMetadata {
  originalSize: number;
  compressedSize: number;
}

export default function ImageCompress() {
  const [quality, setQuality] = useState(80);

  const { state, handlers, utils, refs, computed } = useFileProcessor<ImageMetadata>({
    fileCategory: 'image',
    maxFiles: 20,
    processor: async (file) => {
      const img = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not create canvas context');

      ctx.drawImage(img, 0, 0);

      const mimeType = 'image/jpeg';
      const blob = await canvas.convertToBlob({ type: mimeType, quality: quality / 100 });

      return {
        blob,
        filename: file.name.replace(/\.[^.]+$/, '_compressed.jpg'),
        metadata: {
          originalSize: file.size,
          compressedSize: blob.size,
        },
      };
    },
  });

  // Rest of component focuses on UI rendering
  return (
    <div className="max-w-4xl mx-auto">
      {/* Drop Zone - drag state from hook */}
      <div
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onClick={() => refs.fileInputRef.current?.click()}
        className={`drop-zone ${state.dragDrop.isDragOver ? 'drag-over' : ''}`}
      >
        <input
          ref={refs.fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handlers.onFileSelect}
          className="hidden"
        />
        {/* Drop zone content */}
      </div>

      {/* Error message */}
      {state.error && (
        <div className="error-state">{state.error}</div>
      )}

      {/* Settings Panel */}
      {computed.hasFiles && (
        <div className="glass-card">
          <input
            type="range"
            min="1"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
          <button
            onClick={handlers.onProcess}
            disabled={state.status === 'processing'}
          >
            Compress {computed.totalFiles} Images
          </button>
        </div>
      )}

      {/* File List */}
      {computed.hasFiles && (
        <div>
          {state.files.map((file) => (
            <div key={file.id}>
              <p>{file.name}</p>
              <p>{utils.formatFileSize(file.originalSize)}</p>
              {file.status === 'processing' && <span>Compressing...</span>}
              {file.status === 'done' && file.result?.metadata && (
                <span>
                  {utils.formatFileSize(file.result.metadata.compressedSize)}
                  {' '}
                  ({Math.round((1 - file.result.metadata.compressedSize / file.result.metadata.originalSize) * 100)}% smaller)
                </span>
              )}
              {file.status === 'error' && <span>{file.error}</span>}
              {file.status === 'done' && (
                <button onClick={() => handlers.onDownload(file)}>Download</button>
              )}
              <button onClick={() => handlers.onRemoveFile(file.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Download All */}
      {computed.hasCompletedFiles && (
        <button onClick={handlers.onDownloadAll}>
          Download All (ZIP)
        </button>
      )}
    </div>
  );
}
```

**Benefits:**
- Removed ~200 lines of boilerplate
- No need to manage validation logic
- No need to manage drag/drop state
- Built-in error handling and retry
- Built-in download functionality
- Consistent behavior across tools

---

## Migration from PdfCompress

**Before:**
```tsx
export default function PdfCompress() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ... more state
  // ... 200+ lines of file management logic
}
```

**After:**
```tsx
import useFileProcessor from '../hooks/useFileProcessor';

export default function PdfCompress() {
  const [options, setOptions] = useState({
    removeMetadata: true,
    flattenForms: false,
    quality: 'medium',
  });

  const { state, handlers, utils, refs, computed } = useFileProcessor({
    fileCategory: 'pdf',
    maxFiles: 20,
    processor: async (file) => {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Apply options
      if (options.removeMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        // ... more metadata removal
      }

      if (options.flattenForms) {
        const form = pdfDoc.getForm();
        form.flatten();
      }

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: options.quality === 'low' ? 100 : 50,
      });

      const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'application/pdf' });

      return {
        blob,
        filename: file.name.replace(/\.pdf$/i, '_compressed.pdf'),
        metadata: { size: compressedBytes.length },
      };
    },
  });

  // UI rendering with hook state
  return (
    // ... component JSX
  );
}
```

---

## Migration from VideoCompressor

**Before:**
```tsx
export default function VideoCompressor() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  // ... 100+ lines of state management
}
```

**After:**
```tsx
import useFileProcessor from '../hooks/useFileProcessor';

export default function VideoCompressor() {
  const [quality, setQuality] = useState('medium');
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const qualitySettings = {
    low: { crf: '32', preset: 'fast' },
    medium: { crf: '26', preset: 'medium' },
    high: { crf: '20', preset: 'slow' },
  };

  const { state, handlers, utils, refs, computed } = useFileProcessor({
    fileCategory: 'video',
    maxFiles: 1,
    processor: async (file, signal) => {
      if (!ffmpegLoaded) {
        await loadFFmpeg();
      }

      const ffmpeg = getFFmpegInstance();
      const settings = qualitySettings[quality];

      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Check for abort signal
      if (signal?.aborted) {
        throw new Error('Cancelled');
      }

      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-crf', settings.crf,
        '-preset', settings.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        outputName
      ]);

      if (signal?.aborted) {
        throw new Error('Cancelled');
      }

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const blob = new Blob([new Uint8Array(data)], { type: 'video/mp4' });

      return {
        blob,
        filename: file.name.replace(/\.[^.]+$/, '_compressed.mp4'),
      };
    },
  });

  // UI rendering
  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        onClick={() => refs.fileInputRef.current?.click()}
        className={`drop-zone ${state.dragDrop.isDragOver ? 'drag-over' : ''}`}
      >
        <input
          ref={refs.fileInputRef}
          type="file"
          accept="video/*"
          onChange={handlers.onFileSelect}
          className="hidden"
        />
      </div>

      {/* Quality Settings */}
      {computed.hasFiles && (
        <div>
          {Object.keys(qualitySettings).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={quality === q ? 'active' : ''}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Progress */}
      {state.status === 'processing' && (
        <div>
          <div>Compressing... {state.progress}%</div>
          <div className="progress-bar">
            <div style={{ width: `${state.progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {state.error && <div className="error">{state.error}</div>}

      {/* Process Button */}
      {computed.hasFiles && state.status !== 'processing' && state.status !== 'done' && (
        <button onClick={handlers.onProcess}>
          Compress Video
        </button>
      )}

      {/* Download */}
      {state.status === 'done' && (
        <button onClick={() => handlers.onDownload()}>
          Download Compressed Video
        </button>
      )}
    </div>
  );
}
```

---

## TypeScript Generics Examples

### With Custom Metadata

```tsx
interface ImageResult {
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  format: string;
}

const { state } = useFileProcessor<unknown, ImageResult>({
  fileCategory: 'image',
  processor: async (file) => {
    const result = await processImage(file);
    return {
      blob: result.blob,
      filename: result.filename,
      metadata: {
        width: result.width,
        height: result.height,
        originalSize: file.size,
        compressedSize: result.blob.size,
        format: result.format,
      },
    };
  },
});

// TypeScript knows the type of metadata
state.files[0].result?.metadata?.width; // number
```

### With Custom File State

```tsx
interface CustomFileState {
  id: string;
  thumbnail: string;
  selected: boolean;
}

const { state } = useFileProcessor<CustomFileState>({
  fileCategory: 'image',
  processor: async (file) => {
    const thumbnail = await generateThumbnail(file);
    return {
      blob: await processImage(file),
      metadata: { thumbnail },
    };
  },
});
```

---

## Advanced Features

### Custom Validation

```tsx
const { state, handlers } = useFileProcessor({
  fileCategory: 'image',
  maxFiles: 10,
  customValidation: async (file) => {
    // Check minimum resolution
    const img = await createImageBitmap(file);
    if (img.width < 1920 || img.height < 1080) {
      return {
        valid: false,
        error: 'Image must be at least 1920x1080',
      };
    }
    return { valid: true };
  },
  processor: async (file) => {
    // ... processing logic
  },
});
```

### Auto-processing

```tsx
const { state } = useFileProcessor({
  fileCategory: 'image',
  autoProcess: true, // Automatically start processing after file selection
  processor: async (file) => {
    // ... processing logic
  },
});
```

### Callbacks

```tsx
const { state } = useFileProcessor({
  fileCategory: 'pdf',
  processor: async (file) => {
    // ... processing logic
  },
  onFilesAdded: (files) => {
    console.log(`Added ${files.length} files`);
    // Announce to screen readers
    announce(`${files.length} files added`);
  },
  onProcessingComplete: (result) => {
    console.log('Processing complete!', result);
    // Track analytics
    trackEvent('processing_complete');
  },
  onError: (error) => {
    console.error('Processing failed:', error);
    // Report to error tracking
    reportError(error);
  },
});
```

### Batch Processing with Abort Support

```tsx
const { state, handlers, refs } = useFileProcessor({
  fileCategory: 'video',
  enableBatchMode: true,
  batchConcurrency: 2,
  processor: async (file, signal) => {
    // Check for abort periodically
    if (signal?.aborted) {
      throw new Error('Cancelled');
    }

    // Long-running operation
    const result = await processVideo(file);

    // Check again
    if (signal?.aborted) {
      throw new Error('Cancelled');
    }

    return result;
  },
});

// Cancel button
<button onClick={handlers.onCancelProcessing}>
  Cancel Processing
</button>
```

---

## Summary of Benefits

1. **Reduced Boilerplate**: ~150-200 lines less per component
2. **Consistent Validation**: All tools use the same security validation
3. **Type Safety**: Full TypeScript support with generics
4. **Accessibility**: Built-in support for ARIA attributes
5. **Error Handling**: Consistent error messages with sanitization
6. **Download Support**: Single file and ZIP download built-in
7. **Progress Tracking**: Automatic progress calculation for multi-file operations
8. **Abort Support**: Built-in cancellation for long-running operations
9. **Drag & Drop**: Standardized drag/drop behavior
10. **Memory Management**: Automatic cleanup of blob URLs

---

## Component Migration Checklist

- [ ] Import `useFileProcessor` from hooks
- [ ] Define metadata type if needed
- [ ] Configure options (fileCategory, maxFiles, etc.)
- [ ] Move processing logic to `processor` or `multiFileProcessor`
- [ ] Replace local state with hook state
- [ ] Replace local handlers with hook handlers
- [ ] Update JSX to use hook values
- [ ] Test file validation
- [ ] Test drag and drop
- [ ] Test processing flow
- [ ] Test error handling
- [ ] Test download functionality
- [ ] Test accessibility (keyboard navigation, screen readers)
