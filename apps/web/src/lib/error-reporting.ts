/**
 * Error Reporting Service
 * Captures and reports errors to analytics and logging service
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  component?: string;
  toolId?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  category: 'react' | 'javascript' | 'network' | 'wasm' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private buffer: ErrorReport[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBufferSize: number = 50;
  private isInitialized: boolean = false;

  private constructor() {
    this.init();
  }

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.isInitialized = true;

    // Set up periodic flush
    setInterval(() => this.flush(), this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());

    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        category: 'javascript',
        severity: this.getSeverityFromError(event.error),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        category: 'javascript',
        severity: 'high',
        metadata: {
          reason: String(event.reason),
        },
      });
    });
  }

  private getSeverityFromError(error: Error | undefined): ErrorReport['severity'] {
    if (!error) return 'medium';

    const message = error.message?.toLowerCase() || '';

    if (message.includes('out of memory') || message.includes('memory')) {
      return 'critical';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'high';
    }
    if (message.includes('wasm') || message.includes('webassembly')) {
      return 'high';
    }
    if (message.includes('undefined') || message.includes('null')) {
      return 'medium';
    }

    return 'medium';
  }

  captureError(partialReport: Partial<ErrorReport>) {
    if (typeof window === 'undefined') return;

    // Filter out known non-critical errors
    if (this.shouldIgnoreError(partialReport.message)) {
      return;
    }

    const report: ErrorReport = {
      message: partialReport.message || 'Unknown error',
      stack: partialReport.stack,
      component: partialReport.component,
      toolId: partialReport.toolId || this.detectToolFromUrl(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      category: partialReport.category || 'unknown',
      severity: partialReport.severity || 'medium',
      metadata: partialReport.metadata,
    };

    this.buffer.push(report);

    // Flush immediately if critical
    if (report.severity === 'critical') {
      this.flush();
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Reporting]', report);
    }

    // Send to analytics if available
    this.sendToAnalytics(report);
  }

  private shouldIgnoreError(message: string | undefined): boolean {
    if (!message) return false;

    const ignoredPatterns = [
      'ResizeObserver loop limit exceeded',
      'Script error.',
      'The play() request was interrupted',
      'AbortError: The user aborted a request',
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      'Download the React DevTools',
      'source map',
      'webpack',
    ];

    return ignoredPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private detectToolFromUrl(): string | undefined {
    if (typeof window === 'undefined') return undefined;

    const match = window.location.pathname.match(/\/tools\/([^/]+)/);
    return match ? match[1] : undefined;
  }

  private sendToAnalytics(report: ErrorReport) {
    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: report.message,
        fatal: report.severity === 'critical',
        custom_parameters: {
          component: report.component,
          tool_id: report.toolId,
          category: report.category,
        },
      });
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const errors = [...this.buffer];
    this.buffer = [];

    // In production, send to your error reporting service
    // For now, we just log to console and analytics
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to error reporting endpoint
        // await fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ errors }),
        //   keepalive: true,
        // });

        // Store in localStorage for debugging
        const existing = JSON.parse(localStorage.getItem('error_reports') || '[]');
        const updated = [...existing, ...errors].slice(-100); // Keep last 100
        localStorage.setItem('error_reports', JSON.stringify(updated));
      } catch (e) {
        // Silent fail - don't cause more errors
      }
    }
  }

  // Get recent errors from localStorage (for admin dashboard)
  getRecentErrors(): ErrorReport[] {
    if (typeof window === 'undefined') return [];

    try {
      return JSON.parse(localStorage.getItem('error_reports') || '[]');
    } catch {
      return [];
    }
  }

  // Clear error history
  clearErrors() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('error_reports');
  }
}

export const errorReporting = ErrorReportingService.getInstance();

// React Error Boundary helper
export function captureReactError(
  error: Error,
  errorInfo: { componentStack?: string },
  componentName?: string
) {
  errorReporting.captureError({
    message: error.message,
    stack: error.stack,
    component: componentName,
    category: 'react',
    severity: 'high',
    metadata: {
      componentStack: errorInfo.componentStack,
    },
  });
}

// Tool-specific error helper
export function captureToolError(
  toolId: string,
  error: Error,
  context?: Record<string, unknown>
) {
  errorReporting.captureError({
    message: error.message,
    stack: error.stack,
    toolId,
    category: 'wasm',
    severity: 'high',
    metadata: context,
  });
}

// Network error helper
export function captureNetworkError(
  url: string,
  error: Error,
  context?: Record<string, unknown>
) {
  errorReporting.captureError({
    message: `Network error: ${error.message}`,
    stack: error.stack,
    category: 'network',
    severity: 'medium',
    metadata: {
      url,
      ...context,
    },
  });
}
