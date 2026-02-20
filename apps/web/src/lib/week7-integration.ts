/**
 * Week 7 Integration Layer
 *
 * Connects all Week 7 components (auto-scaling, mobile SDK, white-label, CDN)
 * and provides unified cross-component communication and coordination
 */

import { autoScaling, LoadMetrics, ScalingMode } from './auto-scaling';
import { mobileSDK, MobileSDKConfig } from './mobile-sdk';
import { whiteLabel, WhiteLabelConfig } from './white-label';
import { cdnIntegration, CDNConfig } from './cdn-integration';

// Cross-component event types
interface Week7Event {
  type: 'scaling_changed' | 'mobile_event' | 'branding_applied' | 'cdn_purged' | 'health_alert';
  source: string;
  timestamp: number;
  data: any;
}

// Integration configuration
interface Week7IntegrationConfig {
  enableCrossCommunication: boolean;
  autoOptimize: boolean;
  healthCheckInterval: number;
  eventBusEnabled: boolean;
}

class Week7Integration {
  private config: Week7IntegrationConfig = {
    enableCrossCommunication: true,
    autoOptimize: true,
    healthCheckInterval: 30000, // 30 seconds
    eventBusEnabled: true
  };

  private eventQueue: Week7Event[] = [];
  private eventSubscribers: Map<string, Array<(event: Week7Event) => void>> = new Map();
  private optimizationInterval: number | null = null;

  constructor() {
    this.initializeIntegration();
  }

  /**
   * Initialize cross-component integration
   */
  private initializeIntegration(): void {
    if (!this.config.enableCrossCommunication) return;

    // Subscribe to auto-scaling events
    this.subscribeToScalingEvents();

    // Subscribe to mobile SDK events
    this.subscribeToMobileEvents();

    // Subscribe to white-label events
    this.subscribeToWhiteLabelEvents();

    // Subscribe to CDN events
    this.subscribeToCDNEvents();

    // Start cross-component optimization
    if (this.config.autoOptimize) {
      this.startCrossOptimization();
    }

    console.log('🔄 Week 7 Integration Layer initialized');
  }

  /**
   * Subscribe to scaling events
   */
  private subscribeToScalingEvents(): void {
    // Listen for mode changes
    const originalScaleTo = autoScaling.scaleTo.bind(autoScaling);
    autoScaling.scaleTo = (modeName: 'normal' | 'warning' | 'critical' | 'emergency') => {
      originalScaleTo(modeName);
      this.publishEvent({
        type: 'scaling_changed',
        source: 'auto-scaling',
        timestamp: Date.now(),
        data: { newMode: modeName, previousMode: autoScaling.getCurrentMode().name }
      });

      // Apply cross-component optimizations based on scaling mode
      this.applyScalingOptimizations(modeName);
    };
  }

  /**
   * Subscribe to mobile SDK events
   */
  private subscribeToMobileEvents(): void {
    // Intercept mobile events for cross-component processing
    const originalTrackEvent = mobileSDK.trackEvent.bind(mobileSDK);
    mobileSDK.trackEvent = (name: string, properties?: Record<string, any>) => {
      originalTrackEvent(name, properties);

      this.publishEvent({
        type: 'mobile_event',
        source: 'mobile-sdk',
        timestamp: Date.now(),
        data: { eventName: name, properties }
      });

      // Check if we need to scale based on mobile activity
      this.checkMobileActivityForScaling(name, properties);
    };
  }

  /**
   * Subscribe to white-label events
   */
  private subscribeToWhiteLabelEvents(): void {
    // Monitor white-label applications
    const originalApplyBranding = whiteLabel.applyBranding.bind(whiteLabel);
    whiteLabel.applyBranding = (element: HTMLElement) => {
      originalApplyBranding(element);

      this.publishEvent({
        type: 'branding_applied',
        source: 'white-label',
        timestamp: Date.now(),
        data: { element: element.tagName, brandName: whiteLabel.getBrandConfig().brandName }
      });
    };
  }

  /**
   * Subscribe to CDN events
   */
  private subscribeToCDNEvents(): void {
    // Monitor cache purges
    const originalPurgeCache = cdnIntegration.purgeCache.bind(cdnIntegration);
    cdnIntegration.purgeCache = async (paths?: string[]) => {
      const result = await originalPurgeCache(paths);

      this.publishEvent({
        type: 'cdn_purged',
        source: 'cdn-integration',
        timestamp: Date.now(),
        data: { paths, success: result.success, duration: result.duration }
      });

      return result;
    };
  }

  /**
   * Apply optimizations based on scaling mode
   */
  private applyScalingOptimizations(mode: string): void {
    switch (mode) {
      case 'emergency':
        // Disable non-essential features
        this.optimizeForEmergency();
        break;
      case 'critical':
        // Reduce mobile tracking
        this.optimizeForCritical();
        break;
      case 'warning':
        // Moderate optimizations
        this.optimizeForWarning();
        break;
      case 'normal':
        // Full functionality
        this.optimizeForNormal();
        break;
    }
  }

  /**
   * Emergency mode optimizations
   */
  private optimizeForEmergency(): void {
    // Disable mobile event tracking
    mobileSDK.configure({ trackEvents: false });

    // Disable white-label features
    whiteLabel.configure({ features: { showPoweredBy: false } });

    // Reduce CDN analytics
    cdnIntegration.configure({ enableAnalytics: false });

    console.log('🔴 Emergency optimizations applied');
  }

  /**
   * Critical mode optimizations
   */
  private optimizeForCritical(): void {
    // Sample mobile events
    mobileSDK.configure({ trackEvents: true });

    // Basic white-label only
    whiteLabel.configure({ features: { customWatermark: false } });

    // Basic CDN operations
    cdnIntegration.configure({ enableAnalytics: true });

    console.log('🟡 Critical optimizations applied');
  }

  /**
   * Warning mode optimizations
   */
  private optimizeForWarning(): void {
    // Full mobile tracking
    mobileSDK.configure({ trackEvents: true });

    // Standard white-label
    whiteLabel.configure({ features: { showPoweredBy: true } });

    // Standard CDN
    cdnIntegration.configure({ enableAnalytics: true });

    console.log('🟠 Warning optimizations applied');
  }

  /**
   * Normal mode optimizations
   */
  private optimizeForNormal(): void {
    // Full functionality
    mobileSDK.configure({ trackEvents: true });

    // Full white-label features
    whiteLabel.configure({ features: { showPoweredBy: true, customWatermark: true } });

    // Full CDN features
    cdnIntegration.configure({ enableAnalytics: true });

    console.log('🟢 Normal optimizations applied');
  }

  /**
   * Check mobile activity for scaling decisions
   */
  private checkMobileActivityForScaling(eventName: string, properties?: Record<string, any>): void {
    // If we see high mobile activity, consider scaling up
    if (eventName === 'tool_used' && properties?.filesProcessed > 10) {
      const metrics = autoScaling.getCurrentMetrics();
      if (metrics.currentSessions > 8000) {
        console.log('📱 High mobile activity detected, considering scale up');
        // Could trigger proactive scaling here
      }
    }
  }

  /**
   * Start cross-component optimization
   */
  private startCrossOptimization(): void {
    this.optimizationInterval = window.setInterval(() => {
      this.performCrossOptimization();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform cross-component optimization
   */
  private performCrossOptimization(): void {
    const mode = autoScaling.getCurrentMode();
    const metrics = autoScaling.getCurrentMetrics();

    // Optimize based on current load
    if (metrics.aiTrafficRatio > 80) {
      // High AI traffic - optimize for extraction
      this.optimizeForAIExtraction();
    }

    if (metrics.memoryUsage > 400) {
      // High memory usage - optimize memory
      this.optimizeMemoryUsage();
    }

    if (metrics.networkLatency > 200) {
      // High latency - optimize network
      this.optimizeNetworkUsage();
    }
  }

  /**
   * Optimize for AI extraction
   */
  private optimizeForAIExtraction(): void {
    // Ensure CDN is warmed for critical paths
    cdnIntegration.purgeCache(['/api/*', '/assets/*']);

    // Optimize mobile SDK for better tracking
    mobileSDK.configure({ trackEvents: true });

    console.log('🤖 AI extraction optimizations applied');
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemoryUsage(): void {
    // Reduce mobile SDK queue size
    const currentMetrics = mobileSDK.getMetrics();
    if (currentMetrics.eventsTracked > 1000) {
      // Process event queue
      console.log('🧹 Processing mobile event queue to reduce memory');
    }

    // Clear CDN cache if needed
    const cdnStats = cdnIntegration.getCacheStats();
    if (cdnStats.requests > 10000) {
      console.log('🗑️ CDN cache may need purging');
    }
  }

  /**
   * Optimize network usage
   */
  private optimizeNetworkUsage(): void {
    // Batch mobile events more aggressively
    console.log('📡 Network optimization - batching events');

    // Use CDN more aggressively
    cdnIntegration.configure({
      cacheLevel: 'aggressive',
      browserCacheTTL: 28800 // 8 hours
    });
  }

  /**
   * Publish event to subscribers
   */
  private publishEvent(event: Week7Event): void {
    this.eventQueue.push(event);

    // Keep only last 100 events
    if (this.eventQueue.length > 100) {
      this.eventQueue = this.eventQueue.slice(-100);
    }

    // Notify subscribers
    const subscribers = this.eventSubscribers.get(event.type) || [];
    subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event subscriber:', error);
      }
    });
  }

  /**
   * Subscribe to Week 7 events
   */
  subscribe(eventType: Week7Event['type'], callback: (event: Week7Event) => void): () => void {
    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, []);
    }

    this.eventSubscribers.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.eventSubscribers.get(eventType) || [];
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): Week7Event[] {
    return this.eventQueue.slice(-count);
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      enabled: this.config.enableCrossCommunication,
      eventBus: this.config.eventBusEnabled,
      subscribers: Array.from(this.eventSubscribers.keys()).length,
      recentEvents: this.eventQueue.length,
      autoOptimize: this.config.autoOptimize
    };
  }

  /**
   * Configure integration
   */
  configure(config: Partial<Week7IntegrationConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.autoOptimize && !this.optimizationInterval) {
      this.startCrossOptimization();
    } else if (!this.config.autoOptimize && this.optimizationInterval) {
      window.clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    console.log('🔄 Week 7 Integration configuration updated');
  }

  /**
   * Stop integration
   */
  stop(): void {
    if (this.optimizationInterval) {
      window.clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    this.eventSubscribers.clear();
    this.eventQueue = [];

    console.log('🔄 Week 7 Integration stopped');
  }
}

// Export singleton
export const week7Integration = new Week7Integration();
export type { Week7Event, Week7IntegrationConfig };

// Auto-initialize
if (typeof window !== 'undefined') {
  const initIntegration = () => {
    console.log('🔄 Week 7 Integration Layer auto-initialized');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntegration);
  } else {
    initIntegration();
  }
}