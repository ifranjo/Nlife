# Shared React Hooks

This directory contains custom React hooks that abstract common patterns across tool components, reducing boilerplate and ensuring consistency.

## Available Hooks

### `useFileProcessor`

Generic hook for file processing operations. Handles validation, drag-and-drop, processing state, error handling, and downloads.

**Use Cases:**
- Image compression/conversion (ImageCompress, ImageConverter)
- PDF operations (PdfCompress, PdfMerge, PdfSplit)
- Video/audio processing (VideoCompressor, VideoToMp3)
- Any tool that accepts file uploads

**Key Features:**
- Built-in security validation via `lib/security.ts`
- Drag and drop handling
- Single-file and multi-file processing modes
- Progress tracking
- Error handling with sanitized messages
- Single file and ZIP download
- Abort/cancel support
- TypeScript generics for type safety

**Quick Start:**
```tsx
import { useFileProcessor } from '../hooks';

export default function MyTool() {
  const { state, handlers, utils, refs, computed } = useFileProcessor({
    fileCategory: 'image',
    maxFiles: 20,
    processor: async (file) => {
      const blob = await processImage(file);
      return { blob, filename: file.name };
    },
  });

  return (
    <div>
      <input
        ref={refs.fileInputRef}
        type="file"
        onChange={handlers.onFileSelect}
      />
      {/* ... rest of component */}
    </div>
  );
}
```

**Documentation:** See [`useFileProcessor.examples.md`](./useFileProcessor.examples.md) for full API docs and migration guide.

### `useDragAndDrop`

Reusable hook for drag-and-drop file uploads across all tool components.

**Key Features:**
- Consistent drag-and-drop state management
- Built-in file validation integration
- Accessibility support (ARIA, keyboard navigation)
- File size and count limits
- Error handling with clear messages

**Documentation:** See [`useDragAndDrop.migration.md`](./useDragAndDrop.migration.md)

### `useFFmpegWorker`

Hook for working with FFmpeg in a Web Worker.

**Use Cases:**
- Video processing
- Audio extraction
- Media conversion

## Migration Guides

- **File Processing Tools:** [`useFileProcessor.examples.md`](./useFileProcessor.examples.md)
- **Drag and Drop:** [`useDragAndDrop.migration.md`](./useDragAndDrop.migration.md)

## File Structure

```
hooks/
├── index.ts                          # Main exports
├── useFileProcessor.ts               # Generic file processing hook
├── useFileProcessor.examples.md      # Migration guide and examples
├── useFileProcessor.example.tsx      # Complete example component
├── useDragAndDrop.ts                 # Drag and drop hook
├── useDragAndDrop.migration.md       # Drag and drop migration guide
├── useFFmpegWorker.ts                # FFmpeg worker hook
└── README.md                         # This file
```

## Best Practices

1. **Type Safety:** Use TypeScript generics for flexible, type-safe APIs
2. **Documentation:** Include JSDoc comments with examples
3. **Error Handling:** Always sanitize error messages using `createSafeErrorMessage`
4. **Security:** Use validation from `lib/security.ts` for file operations
5. **Performance:** Use `useCallback` and `useMemo` appropriately
6. **Cleanup:** Always cleanup resources (blob URLs, workers) in useEffect

## Contributing

When adding a new hook:

1. **Create hook file**: `src/hooks/useHookName.ts`
2. **Export types**: Include all TypeScript interfaces
3. **Add JSDoc comments**: Document parameters, return values, examples
4. **Write migration guide**: If replacing existing patterns
5. **Update this README**: Document the new hook
6. **Create example file**: Show complete usage example
