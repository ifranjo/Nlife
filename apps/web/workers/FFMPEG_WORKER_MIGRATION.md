# FFmpeg Web Worker Migration Guide

## Overview

This guide explains how to migrate from direct FFmpeg loading to the Web Worker-based approach to prevent UI freezing.

## Problem

Previously, FFmpeg was loaded directly in the main thread:
- ~50MB download + WASM compilation blocked the UI
- Users experienced frozen interface during loading
- Poor UX especially on slower connections

## Solution

Web Worker handles FFmpeg operations in the background:
- Loading happens off the main thread
- UI remains responsive during initialization
- Progress updates keep users informed

## Architecture

```
Before:
┌─────────────────────────────────────┐
│         Main Thread (UI)            │
│  ┌───────────────────────────────┐  │
│  │  FFmpeg.load() - 50MB freeze  │  │
│  └───────────────────────────────┘  │
│         ↓ UI Frozen                 │
└─────────────────────────────────────┘

After:
┌─────────────────────────────────────┐   ┌──────────────────────────┐
│         Main Thread (UI)            │   │    Web Worker            │
│  ┌───────────────────────────────┐  │   │  ┌────────────────────┐  │
│  │  React Component              │  │──▶│  │  FFmpeg loading    │  │
│  │  - Responsive UI              │  │   │  │  - Background      │  │
│  │  - Progress indicators        │  │   │  │  - No UI freeze    │  │
│  └───────────────────────────────┘  │   │  └────────────────────┘  │
└─────────────────────────────────────┘   └──────────────────────────┘
```

## File Structure

```
apps/web/
├── workers/
│   └── ffmpeg-worker.ts           # Worker implementation
├── src/
│   └── hooks/
│       └── useFFmpegWorker.ts     # React hook for worker management
└── src/
    └── components/
        └── tools/
            └── *.tsx              # Tool components (migrated)
```

## Migration Steps

### Step 1: Remove Direct FFmpeg Imports

**Before:**
```tsx
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpegRef = useRef<FFmpeg | null>(null);
const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
```

**After:**
```tsx
import { useFFmpegWorker } from '../../hooks/useFFmpegWorker';

const { isReady, progress, error, load, exec, writeFile, readFile, deleteFile } = useFFmpegWorker();
```

### Step 2: Remove loadFFmpeg Function

**Before:**
```tsx
const loadFFmpeg = async () => {
  if (ffmpegRef.current && ffmpegLoaded) return;
  setStatus('loading');
  const ffmpeg = new FFmpeg();
  ffmpegRef.current = ffmpeg;
  ffmpeg.on('progress', ({ progress }) => {
    setProgress(Math.round(progress * 100));
  });
  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setFfmpegLoaded(true);
    setStatus('idle');
  } catch (err) {
    setError('Failed to load FFmpeg.');
    setStatus('error');
  }
};
```

**After:**
```tsx
// No need for custom load function - hook handles it
// Just call: await load();
```

### Step 3: Update File Operations

**Before:**
```tsx
await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
await ffmpeg.exec(['-i', inputName, 'output.mp4']);
const data = await ffmpeg.readFile(outputName) as Uint8Array;
```

**After:**
```tsx
const fileData = await file.arrayBuffer();
await writeFile(inputName, fileData);
await exec(['-i', inputName, 'output.mp4']);
const data = await readFile(outputName);
```

### Step 4: Update Component State

**Before:**
```tsx
const [status, setStatus] = useState<Status>('idle');
const [progress, setProgress] = useState(0);
const [error, setError] = useState<string | null>(null);
const ffmpegRef = useRef<FFmpeg | null>(null);
const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
```

**After:**
```tsx
const [status, setStatus] = useState<Status>('idle');
const { isReady, progress, error, load, exec, writeFile, readFile, deleteFile } = useFFmpegWorker();
```

### Step 5: Update Status Checks

**Before:**
```tsx
if (!ffmpegLoaded) {
  await loadFFmpeg();
}
```

**After:**
```tsx
if (!isReady) {
  await load();
}
```

## Complete Example: VideoCompressor Migration

### Before (Direct FFmpeg):

```tsx
import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function VideoCompressor() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current && ffmpegLoaded) return;
    setStatus('loading');
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setFfmpegLoaded(true);
    setStatus('idle');
  };

  const handleCompress = async () => {
    if (!videoFile || !ffmpegRef.current) return;
    setStatus('processing');
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    await ffmpeg.exec(['-i', 'input.mp4', 'output.mp4']);
    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    // ... handle output
  };
}
```

### After (Web Worker):

```tsx
import { useState, useEffect } from 'react';
import { useFFmpegWorker } from '../../hooks/useFFmpegWorker';

export default function VideoCompressor() {
  const [status, setStatus] = useState<Status>('idle');
  const { isReady, progress, error, load, exec, writeFile, readFile, deleteFile } = useFFmpegWorker();

  const handleCompress = async () => {
    if (!videoFile || !isReady) {
      await load();
      return;
    }
    setStatus('processing');
    const fileData = await videoFile.arrayBuffer();
    await writeFile('input.mp4', fileData);
    await exec(['-i', 'input.mp4', 'output.mp4']);
    const data = await readFile('output.mp4');
    // ... handle output
  };
}
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| UI Freeze | Yes (~5-10s) | No |
| Initial Load | Blocks main thread | Background worker |
| Progress Updates | Manual implementation | Built-in |
| Code Complexity | Per-tool implementation | Centralized hook |
| Memory Management | Manual cleanup | Automatic on unmount |

## Browser Compatibility

- Chrome 80+
- Firefox 80+
- Safari 15+
- Edge 80+

**Note:** Requires SharedArrayBuffer support (COOP/COEP headers).

## Testing Checklist

- [ ] FFmpeg loads without UI freeze
- [ ] Progress indicator shows during loading
- [ ] Tool operations work correctly
- [ ] Cleanup happens on component unmount
- [ ] Error handling works as expected
- [ ] Multiple tools can share the worker

## Tools to Migrate

1. VideoCompressor.tsx
2. VideoTrimmer.tsx
3. VideoToMp3.tsx
4. GifMaker.tsx
5. AudioWaveformEditor.tsx
6. AudiogramMaker.tsx

## Rollback Plan

If issues occur, revert to previous implementation by:
1. Restoring direct FFmpeg imports
2. Removing `useFFmpegWorker` hook usage
3. Restoring `loadFFmpeg` function

## Performance Metrics

Expected improvements:
- Initial load: No UI freeze (vs 5-10s freeze)
- Memory usage: Similar (~50-100MB for FFmpeg)
- Processing speed: Identical (same WASM code)

## Troubleshooting

### Worker fails to initialize

Check browser console for:
- SharedArrayBuffer availability
- COOP/COEP headers
- Module loading errors

### Operations timeout

Increase timeout in `useFFmpegWorker.ts`:
```typescript
const timeout = setTimeout(() => {
  // ...
}, 300000); // Increase from 300000 (5min) to higher value
```

### Memory leaks

Ensure cleanup on unmount:
```tsx
useEffect(() => {
  return () => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
  };
}, []);
```

## Future Enhancements

- Worker pool for concurrent operations
- Persistent worker across page navigation
- Shared ArrayBuffer for zero-copy data transfer
- Service Worker integration for offline support
