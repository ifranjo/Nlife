/**
 * Video Tools Lazy Loader
 *
 * Centralized loader for video/audio tools that use FFmpeg
 * Reduces initial bundle size by ~50MB
 */

const VIDEO_TOOLS = {
  'video-compress': () => import('../components/tools/VideoCompressor'),
  'video-trimmer': () => import('../components/tools/VideoTrimmer'),
  'video-to-mp3': () => import('../components/tools/VideoToMp3'),
  'gif-maker': () => import('../components/tools/GifMaker'),
  'audiogram-maker': () => import('../components/tools/AudiogramMaker'),
  'audio-editor': () => import('../components/tools/AudioWaveformEditor'),
};

export type VideoToolId = keyof typeof VIDEO_TOOLS;

/**
 * Load a video tool component dynamically
 */
export async function loadVideoTool(toolId: VideoToolId) {
  const loader = VIDEO_TOOLS[toolId];
  if (!loader) {
    throw new Error(`Video tool "${toolId}" not found`);
  }

  return loader();
}

/**
 * Check if a tool is a video tool
 */
export function isVideoTool(toolId: string): toolId is VideoToolId {
  return toolId in VIDEO_TOOLS;
}

/**
 * Preload video tools in background (after initial page load)
 */
export function preloadVideoTools() {
  // Only preload in browser
  if (typeof window === 'undefined') return;

  // Wait for page to be interactive
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        Object.values(VIDEO_TOOLS).forEach(loader => {
          loader().catch(() => {
            // Silently fail preloading
          });
        });
      }, 2000); // Wait 2 seconds after page load
    });
  } else {
    // Page already loaded
    setTimeout(() => {
      Object.values(VIDEO_TOOLS).forEach(loader => {
        loader().catch(() => {
          // Silently fail preloading
        });
      });
    }, 2000);
  }
}
