/**
 * AI Traffic Analytics & Monitoring System
 *
 * Real-time analytics for AI crawler traffic with pattern analysis,
 * behavior tracking, and conversion attribution for GEO optimization
 */

import type { PersonalizationContext } from './ai-detection';

// Analytics Configuration
interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of sessions to track
  batchSize: number; // Events to batch before sending
  reportingInterval: number; // ms between reports
  retentionDays: number; // How long to keep data
  privacyMode: boolean; // Anonymize IPs, respect DNT
}

// Core Event Types
interface AIEvent {
  eventId: string;
  sessionId: string;
  timestamp: number;
  type: 'page_view' | 'tool_use' | 'content_extraction' | 'citation' | 'query' | 'conversion';
  platform: string;
  url: string;
  metadata: Record<string, any>;
}

// Traffic Metrics
interface TrafficMetrics {
  totalSessions: number;
  aiSessions: number;
  byPlatform: Record<string, number>;
  byTool: Record<string, number>;
  byPageType: Record<string, number>;
  timeRange: { start: number; end: number };
}

// Content Extraction Metrics
interface ExtractionMetrics {
  answerBoxRate: number; // % of pages where AI extracted answer
  schemaParseSuccess: number; // % successful schema parsing
  averageExtractionTime: number; // ms
  topExtractedSections: Array<{ section: string; count: number }>;
  citationRate: number; // % of sessions that resulted in citation
}

// Conversion Attribution
interface ConversionAttribution {
  sessionId: string;
  platform: string;
  entryUrl: string;
  conversionUrl: string;
  timestamp: number;
  attributionModel: 'first_touch' | 'last_touch' | 'linear';
  value: number; // Can be weighted by tool importance
}

// Performance Metrics
interface PerformanceMetrics {
  pageLoadTime: {
    avg: number;
    p95: number;
    byPlatform: Record<string, number>;
  };
  adaptationTime: {
    detection: number;
    application: number;
  };
  errorRate: number;
}

class AIAnalytics {
  private static instance: AIAnalytics;
  private config: AnalyticsConfig;
  private eventQueue: AIEvent[] = [];
  private metrics: Partial<TrafficMetrics & ExtractionMetrics & PerformanceMetrics> = {};
  private conversions: ConversionAttribution[] = [];
  private isInitialized = false;
  private reportingTimer: number | null = null;

  // Default configuration
  private readonly DEFAULT_CONFIG: AnalyticsConfig = {
    enabled: true,
    sampleRate: 1.0, // Track 100% by default
    batchSize: 10,
    reportingInterval: 30000, // 30 seconds
    retentionDays: 30,
    privacyMode: true
  };

  /**
   * Private constructor for singleton
   */
  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.initializeMetrics();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIAnalytics {
    if (!AIAnalytics.instance) {
      AIAnalytics.instance = new AIAnalytics();
    }
    return AIAnalytics.instance;
  }

  /**
   * Initialize analytics with configuration
   */
  initialize(config: Partial<AnalyticsConfig> = {}): void {
    if (this.isInitialized) {
      console.warn('AIAnalytics already initialized');
      return;
    }

    this.config = { ...this.DEFAULT_CONFIG, ...config };

    // Check if should track this session
    if (!this.shouldTrackSession()) {
      console.log('AI Analytics: Session not sampled for tracking');
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Start reporting timer
    this.startReporting();

    this.isInitialized = true;
    console.log('🤖 AI Analytics initialized');

    // Log initial event
    this.trackEvent('page_view', {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    });
  }

  /**
   * Check if this session should be tracked based on sample rate
   */
  private shouldTrackSession(): boolean {
    if (this.config.sampleRate >= 1.0) return true;
    if (this.config.sampleRate <= 0.0) return false;
    return Math.random() <= this.config.sampleRate;
  }

  /**
   * Setup automatic event listeners
   */
  private setupEventListeners(): void {
    // Track page views
    window.addEventListener('beforeunload', () => {
      this.trackEvent('page_view', {
        url: window.location.href,
        exit: true
      });
    });

    // Track link clicks (potential citations)
    document.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement;
      if (link && this.isExternalLink(link.href)) {
        this.trackEvent('citation', {
          url: link.href,
          text: link.textContent,
          target: link.target
        });
      }
    });

    // Track personalization events
    document.addEventListener('personalization_event', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.trackEvent('query', {
        event_type: customEvent.detail?.type,
        platform: customEvent.detail?.platform
      });
    });

    // Track tool usage (if tool-specific events are available)
    if ('ToolEvents' in window) {
      window.addEventListener('tool_use', (event: Event) => {
        const customEvent = event as CustomEvent;
        this.trackEvent('tool_use', {
          tool: customEvent.detail?.toolName,
          action: customEvent.detail?.action
        });
      });
    }
  }

  /**
   * Check if link is external (potential citation)
   */
  private isExternalLink(href: string): boolean {
    try {
      const url = new URL(href);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Start periodic reporting timer
   */
  private startReporting(): void {
    if (this.reportingTimer) {
      window.clearInterval(this.reportingTimer);
    }

    this.reportingTimer = window.setInterval(() => {
      this.generateReport();
    }, this.config.reportingInterval);

    // Also send on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.generateReport();
      }
    });
  }

  /**
   * Track an analytics event
   */
  trackEvent(type: AIEvent['type'], metadata: Record<string, any> = {}): void {
    if (!this.isInitialized || !this.config.enabled) return;

    const event: AIEvent = {
      eventId: this.generateEventId(),
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      type,
      platform: this.getDetectedPlatform(),
      url: window.location.href,
      metadata
    };

    this.eventQueue.push(event);

    // Update metrics incrementally
    this.updateMetrics(event);

    // Send if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Track conversion attribution
   */
  trackConversion(conversionUrl: string, value: number = 1): void {
    const attribution = this.determineAttribution();

    if (attribution) {
      const conversion: ConversionAttribution = {
        ...attribution,
        conversionUrl,
        timestamp: Date.now(),
        attributionModel: 'last_touch', // Can be made configurable
        value
      };

      this.conversions.push(conversion);
      this.trackEvent('conversion', {
        ...conversion,
        attribution_type: 'tool_use'
      });
    }
  }

  /**
   * Determine attribution for current conversion
   */
  private determineAttribution(): Omit<ConversionAttribution, 'conversionUrl' | 'timestamp' | 'value'> | null {
    const context = this.getStoredContext();
    if (!context?.isAI) return null;

    // Get session history
    const history = this.getNavigationHistory();
    const currentUrl = window.location.href;

    return {
      sessionId: this.getSessionId(),
      platform: context.platform,
      entryUrl: history[0]?.url || currentUrl,
      attributionModel: 'last_touch'
    };
  }

  /**
   * Update metrics based on event
   */
  private updateMetrics(event: AIEvent): void {
    // Traffic metrics
    this.metrics.totalSessions = (this.metrics.totalSessions || 0) + 1;

    if (event.platform && event.platform !== 'Unknown' && event.platform !== 'None') {
      this.metrics.aiSessions = (this.metrics.aiSessions || 0) + 1;
      this.metrics.byPlatform = {
        ...this.metrics.byPlatform,
        [event.platform]: (this.metrics.byPlatform?.[event.platform] || 0) + 1
      };
    }

    // Content extraction metrics
    if (event.type === 'content_extraction') {
      this.metrics.answerBoxRate = (this.metrics.answerBoxRate || 0) + 1;
      this.metrics.averageExtractionTime = event.metadata.duration || 0;
    }

    // Citation metrics
    if (event.type === 'citation') {
      this.metrics.citationRate = (this.metrics.citationRate || 0) + 1;
    }
  }

  /**
   * Process queued events in batch
   */
  private processBatch(): void {
    if (this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    // Store in local storage for persistence
    this.storeEvents(batch);

    // In production, this would send to analytics server
    // For now, log to console (in dev mode)
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 AI Analytics batch:', batch);
    }

    // Dispatch custom event for external integrations
    const event = new CustomEvent('ai_analytics_batch', {
      detail: { batch, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Generate analytics report
   */
  generateReport(): AnalyticsReport {
    // Process any pending events
    this.processBatch();

    const report: AnalyticsReport = {
      summary: {
        period: this.metrics.timeRange || {
          start: Date.now() - this.config.reportingInterval,
          end: Date.now()
        },
        totalEvents: this.getStoredEvents().length,
        uniqueSessions: this.getUniqueSessions().size,
        conversionRate: this.calculateConversionRate()
      },
      traffic: this.metrics as TrafficMetrics,
      extraction: this.metrics as ExtractionMetrics,
      performance: this.calculatePerformanceMetrics(),
      conversions: this.conversions,
      topPages: this.getTopPages(),
      platformInsights: this.getPlatformInsights()
    };

    // Reset metrics for next period
    this.resetPeriodMetrics();

    // Dispatch report event
    const event = new CustomEvent('ai_analytics_report', {
      detail: report
    });
    document.dispatchEvent(event);

    return report;
  }

  /**
   * Calculate performance metrics using browser Performance API
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    // Use browser Performance API to get real metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType('paint');

    const fpEntry = paint.find(e => e.name === 'first-contentful-paint');
    const fcpTime = fpEntry ? fpEntry.startTime : 0;
    const loadTime = navigation ? navigation.loadEventEnd - navigation.startTime : 0;

    // Estimate error rate from conversions (simplified approach)
    const conversions = this.conversions.length;
    const errorRate = 0; // Would need error tracking integration

    return {
      pageLoadTime: {
        avg: loadTime,
        p95: loadTime * 1.5, // Approximate p95
        byPlatform: {}
      },
      adaptationTime: {
        detection: 0, // Would need instrumentation in AITrafficDetector
        application: 0
      },
      errorRate
    };
  }

  /**
   * Calculate conversion rate
   */
  private calculateConversionRate(): number {
    const aiSessions = this.metrics.aiSessions || 0;
    const conversions = this.conversions.length;
    return aiSessions > 0 ? conversions / aiSessions : 0;
  }

  /**
   * Get top pages by traffic
   */
  private getTopPages(): Array<{ url: string; count: number }> {
    const pageCounts = new Map<string, number>();
    const events = this.getStoredEvents();

    events.forEach(event => {
      if (event.platform && event.platform !== 'Unknown') {
        pageCounts.set(event.url, (pageCounts.get(event.url) || 0) + 1);
      }
    });

    return Array.from(pageCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get platform-specific insights
   */
  private getPlatformInsights(): Record<string, any> {
    const insights: Record<string, any> = {};
    const platformCounts = this.metrics.byPlatform || {};

    Object.entries(platformCounts).forEach(([platform, count]) => {
      if (platform === 'Unknown' || platform === 'None') return;

      insights[platform] = {
        sessionCount: count,
        percentage: this.calculatePlatformPercentage(platform),
        conversionRate: this.getPlatformConversionRate(platform),
        popularPages: this.getPlatformPages(platform)
      };
    });

    return insights;
  }

  /**
   * Calculate platform percentage
   */
  private calculatePlatformPercentage(platform: string): number {
    const platformCount = this.metrics.byPlatform?.[platform] || 0;
    const totalAI = this.metrics.aiSessions || 1;
    return (platformCount / totalAI) * 100;
  }

  /**
   * Get platform conversion rate
   */
  private getPlatformConversionRate(platform: string): number {
    const platformConversions = this.conversions.filter(c => c.platform === platform);
    const platformSessions = this.metrics.byPlatform?.[platform] || 0;
    return platformSessions > 0 ? platformConversions.length / platformSessions : 0;
  }

  /**
   * Get popular pages for a platform
   */
  private getPlatformPages(platform: string): string[] {
    const events = this.getStoredEvents();
    const pages = events
      .filter(e => e.platform === platform)
      .map(e => e.url);

    return [...new Set(pages)].slice(0, 5);
  }

  /**
   * Store events in local storage
   */
  private storeEvents(events: AIEvent[]): void {
    try {
      const key = `ai_events_${this.getSessionId()}`;
      const keyHistory = `ai_events_history`;
      const existing = JSON.parse(localStorage.getItem(keyHistory) || '[]');

      const updated = [...existing, ...events];

      // Cleanup old events based on retention
      const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      const filtered = updated.filter(e => e.timestamp > cutoff);

      localStorage.setItem(key, JSON.stringify(filtered));
      localStorage.setItem(keyHistory, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to store events:', error);
    }
  }

  /**
   * Get stored events
   */
  private getStoredEvents(): AIEvent[] {
    try {
      const keyHistory = `ai_events_history`;
      return JSON.parse(localStorage.getItem(keyHistory) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Get unique sessions from stored events
   */
  private getUniqueSessions(): Set<string> {
    const events = this.getStoredEvents();
    return new Set(events.map(e => e.sessionId));
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalSessions: 0,
      aiSessions: 0,
      byPlatform: {},
      byTool: {},
      byPageType: {},
      timeRange: { start: Date.now(), end: Date.now() },
      answerBoxRate: 0,
      schemaParseSuccess: 0,
      averageExtractionTime: 0,
      topExtractedSections: [],
      citationRate: 0
    };
  }

  /**
   * Reset metrics for new reporting period
   */
  private resetPeriodMetrics(): void {
    this.initializeMetrics();
    this.metrics.timeRange = {
      start: Date.now(),
      end: Date.now()
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('ai_analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ai_analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get stored personalization context
   */
  private getStoredContext(): PersonalizationContext | null {
    try {
      const context = sessionStorage.getItem('ai_personalization_context');
      return context ? JSON.parse(context) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get navigation history
   */
  private getNavigationHistory(): Array<{ url: string; timestamp: number }> {
    try {
      const history = sessionStorage.getItem('ai_navigation_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get detected platform
   */
  private getDetectedPlatform(): string {
    const context = this.getStoredContext();
    return context?.platform || 'Unknown';
  }

  /**
   * Cleanup and destroy analytics
   */
  destroy(): void {
    if (this.reportingTimer) {
      window.clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }

    this.processBatch(); // Send any pending events
    this.isInitialized = false;
  }
}

// Analytics Report Interface
interface AnalyticsReport {
  summary: {
    period: { start: number; end: number };
    totalEvents: number;
    uniqueSessions: number;
    conversionRate: number;
  };
  traffic: TrafficMetrics;
  extraction: ExtractionMetrics;
  performance: PerformanceMetrics;
  conversions: ConversionAttribution[];
  topPages: Array<{ url: string; count: number }>;
  platformInsights: Record<string, any>;
}

// Export singleton
export const aiAnalytics = AIAnalytics.getInstance();

// Auto-initialize in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const initAnalytics = () => {
    aiAnalytics.initialize();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }
}

// Export types
export type {
  AnalyticsConfig,
  AIEvent,
  TrafficMetrics,
  ExtractionMetrics,
  ConversionAttribution,
  PerformanceMetrics,
  AnalyticsReport
};
