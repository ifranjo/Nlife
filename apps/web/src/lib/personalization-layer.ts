/**
 * Advanced Personalization Layer
 *
 * Unified API for AI-based content personalization that integrates
 * traffic detection, dynamic adaptation, and performance optimization
 */

import { AITrafficDetector } from './ai-detection';
import { DynamicAdaptationEngine } from './dynamic-adaptation';
import { PerformanceOptimizer } from './performance-optimizer';

interface PersonalizationEvent {
  type: 'ai_detected' | 'content_adapted' | 'optimization_applied' | 'interaction';
  platform: string;
  timestamp: number;
  metadata: Record<string, any>;
}

interface PersonalizationSession {
  sessionId: string;
  startTime: number;
  events: PersonalizationEvent[];
  platforms: Set<string>;
  adaptations: string[];
  interactions: number;
}

interface PersonalizationConfig {
  /**
   * Enable AI traffic detection
   */
  detectTraffic: boolean;

  /**
   * Enable dynamic content adaptation
   */
  adaptContent: boolean;

  /**
   * Enable performance optimizations
   */
  optimizePerformance: boolean;

  /**
   * Log personalization events
   */
  enableAnalytics: boolean;

  /**
   * Respect user privacy preferences
   */
  respectPrivacy: boolean;
}

class PersonalizationLayer {
  private static instance: PersonalizationLayer;
  private detector: AITrafficDetector;
  private adapter: DynamicAdaptationEngine;
  private optimizer: PerformanceOptimizer;
  private config: PersonalizationConfig;
  private session: PersonalizationSession;
  private initialized = false;

  private readonly DEFAULT_CONFIG: PersonalizationConfig = {
    detectTraffic: true,
    adaptContent: true,
    optimizePerformance: true,
    enableAnalytics: true,
    respectPrivacy: true
  };

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.detector = new AITrafficDetector();
    this.adapter = new DynamicAdaptationEngine();
    this.optimizer = new PerformanceOptimizer();
    this.config = { ...this.DEFAULT_CONFIG };
    this.session = this.initializeSession();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PersonalizationLayer {
    if (!PersonalizationLayer.instance) {
      PersonalizationLayer.instance = new PersonalizationLayer();
    }
    return PersonalizationLayer.instance;
  }

  /**
   * Initialize personalization layer with configuration
   */
  initialize(config: Partial<PersonalizationConfig> = {}): void {
    if (this.initialized) {
      console.warn('PersonalizationLayer already initialized');
      return;
    }

    this.config = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // Initialize components based on configuration
      if (this.config.detectTraffic) {
        this.detector.detectAITraffic();
        this.logEvent('ai_detection_init', { status: 'success' });
      }

      if (this.config.adaptContent) {
        this.adapter.initialize();
        this.logEvent('content_adaptation_init', { status: 'success' });
      }

      if (this.config.optimizePerformance) {
        this.optimizer.initialize();
        this.logEvent('optimization_init', { status: 'success' });
      }

      // Setup event listeners
      this.setupEventListeners();

      // Track initial state
      this.trackInitialState();

      this.initialized = true;
      this.logEvent('personalization_layer_init', { config: this.config });

      console.log('PersonalizationLayer initialized successfully');
      console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    } catch (error) {
      console.error('Failed to initialize PersonalizationLayer:', error);
      this.logEvent('initialization_error', { error: error.message });
    }
  }

  /**
   * Initialize new personalization session
   */
  private initializeSession(): PersonalizationSession {
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      events: [],
      platforms: new Set(),
      adaptations: [],
      interactions: 0
    };
  }

  /**
   * Generate unique session identifier
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `ps-${timestamp}-${random}`;
  }

  /**
   * Setup event listeners for tracking interactions
   */
  private setupEventListeners(): void {
    // Track page navigation
    window.addEventListener('beforeunload', () => {
      this.logEvent('session_end', {
        duration: Date.now() - this.session.startTime,
        platforms: Array.from(this.session.platforms),
        interactions: this.session.interactions
      });
    });

    // Track link clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (link) {
        this.logEvent('link_click', {
          href: link.href,
          text: link.textContent?.trim(),
          target: link.target
        });
        this.session.interactions++;
      }
    });

    // Track scroll behavior
    let scrollTimeout: number;
    let maxScrollDepth = 0;

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        const scrollDepth = window.scrollY;
        maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);

        this.logEvent('scroll', {
          depth: scrollDepth,
          maxDepthReached: maxScrollDepth
        });
      }, 250);
    });

    // Track time spent on page
    setInterval(() => {
      const timeOnPage = Date.now() - this.session.startTime;
      if (timeOnPage % 30000 === 0) { // Every 30 seconds
        this.logEvent('time_on_page', { seconds: timeOnPage / 1000 });
      }
    }, 30000);
  }

  /**
   * Track initial state of personalization
   */
  private trackInitialState(): void {
    const platform = this.getDetectedPlatform();
    if (platform && platform !== 'Unknown') {
      this.session.platforms.add(platform);
      this.logEvent('ai_detected', {
        platform,
        is_conversation_mode: this.isInConversationMode()
      });
    }

    // Track adaptations
    const adaptations = this.getCurrentAdaptations();
    if (adaptations.length > 0) {
      this.logEvent('content_adapted', { adaptations });
    }
  }

  /**
   * Get currently detected AI platform
   */
  private getDetectedPlatform(): string | null {
    const context = this.detector.detectAITraffic();
    return context?.platform || null;
  }

  /**
   * Check if user is in conversation mode (rapid navigation)
   */
  private isInConversationMode(): boolean {
    const navigationEntries = performance.getEntriesByType('navigation');
    const resourceEntries = performance.getEntriesByType('resource');

    // Check for rapid resource loading typical of AI conversations
    if (resourceEntries.length > 10) {
      const avgLoadTime = resourceEntries.reduce((sum, entry) =>
        sum + entry.duration, 0) / resourceEntries.length;
      return avgLoadTime < 100; // Less than 100ms average is likely AI
    }

    return false;
  }

  /**
   * Get current adaptations being applied
   */
  private getCurrentAdaptations(): string[] {
    const rules = this.adapter.getCurrentAdaptations();
    const adaptations: string[] = [];

    if (rules.contentFormat?.expandTLDR) adaptations.push('expanded_tldr');
    if (rules.contentFormat?.emphasizeKeywords) adaptations.push('keyword_emphasis');
    if (rules.contentFormat?.addCitations) adaptations.push('added_citations');
    if (rules.visualPresentation?.highlightAnswers) adaptations.push('highlighted_answers');

    return adaptations;
  }

  /**
   * Log personalization event
   */
  private logEvent(type: string, metadata: Record<string, any> = {}): void {
    if (!this.config.enableAnalytics) return;

    const event: PersonalizationEvent = {
      type: type as PersonalizationEvent['type'],
      platform: this.getDetectedPlatform() || 'Unknown',
      timestamp: Date.now(),
      metadata
    };

    this.session.events.push(event);

    // Store in session storage
    try {
      const existing = sessionStorage.getItem('personalization_events');
      const events = existing ? JSON.parse(existing) : [];
      events.push(event);

      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      sessionStorage.setItem('personalization_events', JSON.stringify(events));
    } catch (error) {
      // Ignore storage errors
    }

    // Dispatch custom event for external listeners
    const customEvent = new CustomEvent('personalization_event', {
      detail: event
    });
    document.dispatchEvent(customEvent);
  }

  /**
   * Get current personalization context
   */
  getContext(): PersonalizationContext | null {
    try {
      const context = sessionStorage.getItem('ai_personalization_context');
      return context ? JSON.parse(context) : null;
    } catch {
      return null;
    }
  }

  /**
   * Force personalization for a specific platform (for testing)
   */
  forcePersonalization(platform: string): void {
    // Mock AI detection context
    const mockContext = {
      isAI: true,
      platform,
      priorityKeywords: ['test', 'personalization'],
      preferredFormat: 'detailed' as const,
      citationPreference: 'technical' as const
    };

    sessionStorage.setItem('ai_personalization_context', JSON.stringify(mockContext));

    // Re-initialize components
    this.adapter.forceAdaptations({
      contentFormat: {
        expandTLDR: true,
        emphasizeKeywords: true,
        structureData: true,
        addCitations: true
      },
      visualPresentation: {
        highlightAnswers: true,
        showExpertiseSignals: true,
        displaySocialProof: true
      }
    });

    this.logEvent('forced_personalization', {
      forced_platform: platform
    });
  }

  /**
   * Get personalization session data
   */
  getSessionData(): Partial<PersonalizationSession> {
    return {
      sessionId: this.session.sessionId,
      startTime: this.session.startTime,
      duration: Date.now() - this.session.startTime,
      platforms: Array.from(this.session.platforms),
      events: this.config.enableAnalytics ? this.session.events : undefined,
      interactions: this.session.interactions
    };
  }

  /**
   * Export analytics data for A/B testing
   */
  exportAnalyticsData(): Record<string, any> {
    if (!this.config.enableAnalytics) {
      return { error: 'Analytics disabled' };
    }

    const sessionData = this.getSessionData();
    const metrics = this.optimizer.getMetrics();

    return {
      session: sessionData,
      performance: metrics,
      adaptations: this.adapter.getCurrentAdaptations(),
      timestamp: Date.now(),
      url: window.location.href
    };
  }

  /**
   * Reset personalization to default state
   */
  reset(): void {
    this.session = this.initializeSession();

    if (this.config.adaptContent) {
      this.adapter.reset();
    }

    if (this.config.optimizePerformance) {
      this.optimizer.cleanup();
    }

    // Clear stored data
    sessionStorage.removeItem('personalization_events');
    AITrafficDetector.clearDetectionData();

    this.logEvent('reset', {});
    console.log('PersonalizationLayer reset to default state');
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const data = this.exportAnalyticsData();

    if (data.session?.interactions === 0) {
      recommendations.push('Consider adding more interaction points to improve engagement');
    }

    if (!data.performance?.metrics) {
      recommendations.push('Performance metrics not available - enable performance monitoring');
    }

    if (data.session?.platforms?.length > 1) {
      recommendations.push('Multiple AI platforms detected - consider platform-specific content optimization');
    }

    return recommendations;
  }

  /**
   * Destroy personalization layer and cleanup
   */
  destroy(): void {
    this.reset();
    this.logEvent('destroy', {});
    this.initialized = false;
  }
}

// Export singleton instance
export const personalizationLayer = PersonalizationLayer.getInstance();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  const initPersonalization = () => {
    try {
      personalizationLayer.initialize();
    } catch (error) {
      console.error('Failed to initialize personalization:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonalization);
  } else {
    initPersonalization();
  }
}

// Export types
export type {
  PersonalizationEvent,
  PersonalizationSession,
  PersonalizationConfig
};
