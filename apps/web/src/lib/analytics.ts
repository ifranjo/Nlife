/**
 * Plausible Analytics Integration
 *
 * Utility functions for tracking custom events with Plausible Analytics.
 * All tracking is privacy-focused and GDPR compliant by default.
 *
 * @see https://plausible.io/docs/custom-event-goals
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Plausible custom event function signature
 */
type PlausibleFunction = (
  eventName: string,
  options?: {
    props?: Record<string, string | number | boolean>;
    callback?: () => void;
  }
) => void;

/**
 * Extend Window interface to include Plausible
 */
declare global {
  interface Window {
    plausible?: PlausibleFunction;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    analytics?: {
      trackPageView: (page_path: string, page_title?: string) => void;
      trackToolUsage: (toolName: string, category: string, action?: string) => void;
      trackFileProcessed: (toolName: string, fileType: string, fileSize: number, processingTime: number) => void;
      trackError: (errorType: string, toolName: string, errorMessage: string) => void;
      trackDownload: (toolName: string, fileType: string) => void;
      trackShare: (toolName: string, platform: string) => void;
    };
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Standard tool actions that can be tracked
 */
export type ToolAction =
  | 'file_uploaded'
  | 'file_processed'
  | 'file_downloaded'
  | 'tool_opened'
  | 'settings_changed'
  | 'error_occurred'
  | 'feature_used';

/**
 * Conversion types for goal tracking
 */
export type ConversionType =
  | 'file_processed'
  | 'download_completed'
  | 'tool_completed'
  | 'premium_viewed'
  | 'share_clicked';

/**
 * Tool categories matching the registry
 */
export type ToolCategory = 'document' | 'media' | 'ai' | 'utility';

// ============================================================================
// CORE TRACKING FUNCTIONS
// ============================================================================

/**
 * Check if Plausible is available and tracking is enabled
 */
function isTrackingAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.plausible === 'function';
}

/**
 * Send a custom event to Plausible
 *
 * @param eventName - Name of the event (e.g., 'Tool Used', 'Conversion')
 * @param props - Optional properties to attach to the event
 * @param callback - Optional callback after event is sent
 *
 * @example
 * trackEvent('Tool Used', { tool: 'pdf-merge', action: 'file_uploaded' });
 */
export function trackEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>,
  callback?: () => void
): void {
  // Try Plausible first (privacy-first analytics)
  if (isTrackingAvailable()) {
    try {
      window.plausible!(eventName, {
        props: props || {},
        callback,
      });

      if (import.meta.env.DEV) {
        console.log('[Analytics] Plausible event tracked:', { eventName, props });
      }
    } catch (error) {
      console.error('[Plausible] Failed to track event:', error);
    }
  }

  // Also track with Google Analytics 4 (for detailed analysis)
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      const ga4Props = { ...props };

      // Map custom properties to GA4 dimensions/metrics
      if (props?.tool) {
        ga4Props.tool_name = props.tool;
        ga4Props.tool_category = props.category;
      }

      window.gtag('event', eventName.toLowerCase().replace(/\s+/g, '_'), {
        event_category: 'Tool Interaction',
        event_label: ga4Props.tool || eventName,
        ...ga4Props,
        non_interaction: false
      });

      if (import.meta.env.DEV) {
        console.log('[Analytics] GA4 event tracked:', { eventName, ga4Props });
      }
    }
  } catch (error) {
    console.error('[GA4] Failed to track event:', error);
  }
}

// ============================================================================
// TOOL-SPECIFIC TRACKING
// ============================================================================

/**
 * Track when a user interacts with a tool
 *
 * @param toolId - Tool identifier (e.g., 'pdf-merge', 'video-compressor')
 * @param action - Action performed by the user
 * @param metadata - Optional additional metadata
 *
 * @example
 * trackToolUse('pdf-merge', 'file_uploaded', { file_count: 3 });
 * trackToolUse('video-compressor', 'file_processed', { duration_seconds: 120 });
 */
export function trackToolUse(
  toolId: string,
  action: ToolAction,
  metadata?: Record<string, string | number | boolean>
): void {
  trackEvent('Tool Used', {
    tool: toolId,
    action,
    ...metadata,
  });
}

/**
 * Track conversion events (successful completions)
 *
 * @param toolId - Tool identifier
 * @param type - Type of conversion
 * @param metadata - Optional additional metadata
 *
 * @example
 * trackConversion('pdf-merge', 'file_processed', { output_size_mb: 5.2 });
 * trackConversion('background-remover', 'download_completed');
 */
export function trackConversion(
  toolId: string,
  type: ConversionType,
  metadata?: Record<string, string | number | boolean>
): void {
  trackEvent('Conversion', {
    tool: toolId,
    type,
    ...metadata,
  });
}

/**
 * Track when a tool page is loaded
 *
 * @param toolId - Tool identifier
 * @param category - Tool category
 * @param tier - Tool tier (free/pro/coming)
 *
 * @example
 * trackToolPageView('pdf-merge', 'document', 'free');
 */
export function trackToolPageView(
  toolId: string,
  category: ToolCategory,
  tier: 'free' | 'pro' | 'coming'
): void {
  trackEvent('Tool Page View', {
    tool: toolId,
    category,
    tier,
  });
}

/**
 * Track errors that occur during tool usage
 *
 * @param toolId - Tool identifier
 * @param errorType - Type of error (e.g., 'validation_failed', 'processing_error')
 * @param metadata - Optional error details
 *
 * @example
 * trackToolError('pdf-merge', 'file_too_large', { max_size_mb: 50 });
 * trackToolError('video-compressor', 'unsupported_format', { format: 'avi' });
 */
export function trackToolError(
  toolId: string,
  errorType: string,
  metadata?: Record<string, string | number | boolean>
): void {
  trackEvent('Tool Error', {
    tool: toolId,
    error_type: errorType,
    ...metadata,
  });
}

// ============================================================================
// ENGAGEMENT TRACKING
// ============================================================================

/**
 * Track user engagement actions (shares, feedback, etc.)
 *
 * @param action - Type of engagement
 * @param context - Where the engagement happened
 * @param metadata - Optional additional data
 *
 * @example
 * trackEngagement('share_clicked', 'tool_page', { tool: 'pdf-merge' });
 * trackEngagement('feedback_submitted', 'footer', { rating: 5 });
 */
export function trackEngagement(
  action: string,
  context: string,
  metadata?: Record<string, string | number | boolean>
): void {
  trackEvent('Engagement', {
    action,
    context,
    ...metadata,
  });
}

/**
 * Track when users view guides or educational content
 *
 * @param guideId - Guide identifier (e.g., 'merge-pdf-online-free')
 * @param toolId - Associated tool (if applicable)
 *
 * @example
 * trackGuideView('compress-video-for-discord', 'video-compressor');
 */
export function trackGuideView(guideId: string, toolId?: string): void {
  trackEvent('Guide View', {
    guide: guideId,
    ...(toolId && { tool: toolId }),
  });
}

/**
 * Track when users view use-case landing pages
 *
 * @param useCaseId - Use case identifier
 * @param toolId - Associated tool
 *
 * @example
 * trackUseCaseView('pdf-merge-invoices', 'pdf-merge');
 */
export function trackUseCaseView(useCaseId: string, toolId: string): void {
  trackEvent('Use Case View', {
    use_case: useCaseId,
    tool: toolId,
  });
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Track processing performance metrics
 *
 * @param toolId - Tool identifier
 * @param durationMs - Processing duration in milliseconds
 * @param metadata - Optional additional metrics
 *
 * @example
 * trackPerformance('pdf-merge', 3200, { file_count: 5, output_size_mb: 12.5 });
 */
export function trackPerformance(
  toolId: string,
  durationMs: number,
  metadata?: Record<string, string | number | boolean>
): void {
  // Convert to seconds and round to 2 decimals
  const durationSeconds = Math.round(durationMs / 10) / 100;

  trackEvent('Performance', {
    tool: toolId,
    duration_seconds: durationSeconds,
    ...metadata,
  });
}

// ============================================================================
// FEATURE FLAGS & A/B TESTING
// ============================================================================

/**
 * Track feature usage for A/B testing
 *
 * @param featureName - Name of the feature
 * @param variant - Variant identifier (e.g., 'control', 'variant_a')
 * @param metadata - Optional additional context
 *
 * @example
 * trackFeatureUsage('new_ui_layout', 'variant_a', { tool: 'pdf-merge' });
 */
export function trackFeatureUsage(
  featureName: string,
  variant: string,
  metadata?: Record<string, string | number | boolean>
): void {
  trackEvent('Feature Usage', {
    feature: featureName,
    variant,
    ...metadata,
  });
}

// ============================================================================
// OUTBOUND LINK TRACKING
// ============================================================================

/**
 * Track outbound link clicks
 *
 * @param url - Destination URL
 * @param context - Where the link was clicked
 * @param callback - Optional callback after tracking
 *
 * @example
 * trackOutboundLink('https://github.com/...', 'footer');
 */
export function trackOutboundLink(
  url: string,
  context: string,
  callback?: () => void
): void {
  trackEvent('Outbound Link', {
    url,
    context,
  }, callback);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a tracked download handler
 * Returns a function that tracks download and optionally executes callback
 *
 * @param toolId - Tool identifier
 * @param metadata - Optional download metadata
 *
 * @example
 * const handleDownload = createTrackedDownload('pdf-merge', { file_count: 3 });
 * handleDownload(() => {
 *   // Trigger actual download
 *   saveAs(blob, filename);
 * });
 */
export function createTrackedDownload(
  toolId: string,
  metadata?: Record<string, string | number | boolean>
) {
  return (downloadCallback?: () => void) => {
    trackConversion(toolId, 'download_completed', metadata);

    if (downloadCallback) {
      downloadCallback();
    }
  };
}

/**
 * Create a performance timer for tracking processing duration
 *
 * @param toolId - Tool identifier
 *
 * @returns Object with start() and end() methods
 *
 * @example
 * const timer = createPerformanceTimer('pdf-merge');
 * timer.start();
 * await processPDF();
 * timer.end({ file_count: 3 });
 */
export function createPerformanceTimer(toolId: string) {
  let startTime: number | null = null;

  return {
    start() {
      startTime = performance.now();
    },
    end(metadata?: Record<string, string | number | boolean>) {
      if (startTime === null) {
        console.warn('[Analytics] Timer not started');
        return;
      }

      const duration = performance.now() - startTime;
      trackPerformance(toolId, duration, metadata);
      startTime = null;
    },
  };
}

// ============================================================================
// BATCH TRACKING (for multiple events)
// ============================================================================

/**
 * Track a complete tool workflow (opened -> processed -> downloaded)
 *
 * @param toolId - Tool identifier
 * @param workflow - Workflow steps to track
 *
 * @example
 * trackWorkflow('pdf-merge', {
 *   files_uploaded: 3,
 *   processing_duration_ms: 2500,
 *   output_size_mb: 8.2
 * });
 */
export function trackWorkflow(
  toolId: string,
  workflow: {
    files_uploaded?: number;
    processing_duration_ms?: number;
    output_size_mb?: number;
    [key: string]: string | number | boolean | undefined;
  }
): void {
  const { files_uploaded, processing_duration_ms, output_size_mb, ...rest } = workflow;

  // Track file upload if present
  if (files_uploaded) {
    trackToolUse(toolId, 'file_uploaded', { file_count: files_uploaded });
  }

  // Track processing with performance if present
  if (processing_duration_ms) {
    trackToolUse(toolId, 'file_processed', {
      ...(output_size_mb && { output_size_mb }),
      ...rest,
    });
    trackPerformance(toolId, processing_duration_ms, {
      ...(files_uploaded && { file_count: files_uploaded }),
      ...(output_size_mb && { output_size_mb }),
    });
  }

  // Track conversion
  trackConversion(toolId, 'tool_completed', {
    ...(files_uploaded && { file_count: files_uploaded }),
    ...(output_size_mb && { output_size_mb }),
    ...rest,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  trackEvent,
  trackToolUse,
  trackConversion,
  trackToolPageView,
  trackToolError,
  trackEngagement,
  trackGuideView,
  trackUseCaseView,
  trackPerformance,
  trackFeatureUsage,
  trackOutboundLink,
  createTrackedDownload,
  createPerformanceTimer,
  trackWorkflow,
};
