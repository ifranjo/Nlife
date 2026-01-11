/**
 * External Integrations for GEO Optimization
 *
 * Connects with third-party tools and APIs to enhance analytics,
 * receive alerts, and synchronize data for comprehensive GEO monitoring
 */

import { aiAnalytics } from './ai-analytics';

// Global configuration
export interface ExternalIntegrationsConfig {
  enabled: boolean;
  verboseLogging: boolean;
  cacheExpiration: number; // ms
  retryAttempts: number;
  timeout: number;
}

// GA4 Integration
export interface GA4Config {
  enabled: boolean;
  measurementId: string;
  apiSecret?: string;
  events: {
    pageView: boolean;
    toolUse: boolean;
    conversion: boolean;
    extraction: boolean;
  };
  customDimensions: string[];
}

// Google Search Console Integration
export interface SearchConsoleConfig {
  enabled: boolean;
  siteUrl: string;
  apiKey?: string;
  refreshInterval: number; // hours
  metrics: {
    clicks: boolean;
    impressions: boolean;
    position: boolean;
    ctr: boolean;
  };
}

// Slack/Discord Webhook Integration
export interface WebhookConfig {
  enabled: boolean;
  url: string;
  username?: string;
  iconEmoji?: string;
  events: string[];
  rateLimit: number; // per minute
}

// SerpAPI Integration
export interface SerpAPIConfig {
  enabled: boolean;
  apiKey: string;
  rateLimit: number;
  trackKeywords: string[];
  trackPlatforms: string[]; // Claude, GPT-4, etc
}

// Event definitions
interface IntegrationEvent {
  eventId: string;
  timestamp: number;
  type: string;
  source: string;
  data: Record<string, any>;
}

class ExternalIntegrations {
  private config: ExternalIntegrationsConfig = {
    enabled: true,
    verboseLogging: false,
    cacheExpiration: 3600000, // 1 hour
    retryAttempts: 3,
    timeout: 5000
  };

  private ga4Config: GA4Config | null = null;
  private searchConsoleConfig: SearchConsoleConfig | null = null;
  private webhooks: WebhookConfig[] = [];
  private serpAPIConfig: SerpAPIConfig | null = null;

  private eventCache: Map<string, IntegrationEvent> = new Map();
  private metricsCache: Map<string, any> = new Map();

  /**
   * Configure GA4 integration
   */
  configureGA4(config: GA4Config): void {
    if (!config.measurementId) {
      console.warn('GA4 measurementId required');
      return;
    }

    this.ga4Config = config;
    this.initializeGA4();
    console.log('📊 GA4 integration configured');
  }

  /**
   * Configure Google Search Console integration
   */
  configureSearchConsole(config: SearchConsoleConfig): void {
    if (!config.siteUrl) {
      console.warn('Search Console siteUrl required');
      return;
    }

    this.searchConsoleConfig = config;
    console.log('🔍 Search Console integration configured');

    // Schedule periodic refresh
    if (config.refreshInterval > 0) {
      setInterval(() => {
        this.refreshSearchConsoleData();
      }, config.refreshInterval * 60 * 60 * 1000);
    }
  }

  /**
   * Configure Slack/Discord webhook
   */
  configureWebhook(config: WebhookConfig): void {
    if (!config.url) {
      console.warn('Webhook URL required');
      return;
    }

    this.webhooks.push(config);
    console.log('🚀 Webhook configured');
  }

  /**
   * Configure SerpAPI integration
   */
  configureSerpAPI(config: SerpAPIConfig): void {
    if (!config.apiKey) {
      console.warn('SerpAPI key required');
      return;
    }

    this.serpAPIConfig = config;
    console.log('📈 SerpAPI integration configured');
  }

  /**
   * Send event to GA4
   */
  sendToGA4(eventName: string, parameters: Record<string, any>): void {
    if (!this.ga4Config?.enabled || !window.gtag) {
      if (this.config.verboseLogging) {
        console.log('GA4 not configured or gtag not available');
      }
      return;
    }

    // Track AI-specific events
    const aiParams = {
      ...parameters,
      ai_platform: parameters.platform || 'unknown',
      ai_tool: parameters.tool || 'unknown',
      ai_session: parameters.sessionId || 'unknown'
    };

    window.gtag('event', `ai_${eventName}`, aiParams);

    // Cache event
    this.cacheEvent({
      eventId: `ga4_${Date.now()}`,
      timestamp: Date.now(),
      type: eventName,
      source: 'GA4',
      data: aiParams
    });

    if (this.config.verboseLogging) {
      console.log(`📤 Sent to GA4: ai_${eventName}`, aiParams);
    }
  }

  /**
   * Send event to webhook (Slack/Discord)
   */
  async sendToWebhook(eventType: string, message: string, data?: Record<string, any>): Promise<void> {
    const relevantWebhooks = this.webhooks.filter(w => w.enabled && w.events.includes(eventType));

    if (relevantWebhooks.length === 0) {
      if (this.config.verboseLogging) {
        console.log(`No webhooks configured for ${eventType}`);
      }
      return;
    }

    const payload = {
      text: message,
      username: 'GEO Analytics',
      icon_emoji: '📊',
      attachments: data ? [{
        color: this.getEventColor(eventType),
        fields: Object.entries(data).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true
        }))
      }] : []
    };

    // Rate limiting
    const now = Date.now();
    const recentEvents = Array.from(this.eventCache.values()).filter(e => now - e.timestamp < 60000);

    if (recentEvents.length >= this.webhooks[0]?.rateLimit || 10) {
      console.warn('Rate limit exceeded for webhooks');
      return;
    }

    for (const webhook of relevantWebhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            username: webhook.username || payload.username,
            icon_emoji: webhook.iconEmoji || payload.icon_emoji
          })
        });

        if (response.ok) {
          this.cacheEvent({
            eventId: `webhook_${Date.now()}`,
            timestamp: now,
            type: eventType,
            source: 'webhook',
            data: { status: 'sent', webhook: webhook.url }
          });
        }
      } catch (error) {
        console.error(`Webhook failed: ${webhook.url}`, error);
      }
    }
  }

  /**
   * Send high-priority alert
   */
  async sendAlert(alert: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    data?: Record<string, any>;
    notifyChannels?: Array<'email' | 'slack' | 'webhook'>;
  }): Promise<void> {
    // Log alert
    console.log(`[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);

    // Send to webhooks if critical
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await this.sendToWebhook('alert', `${alert.title}: ${alert.message}`, {
        severity: alert.severity,
        ...alert.data
      });
    }

    // Cache alert
    this.cacheEvent({
      eventId: `alert_${Date.now()}`,
      timestamp: Date.now(),
      type: 'alert',
      source: 'monitoring',
      data: alert
    });

    // Trigger browser notification if supported
    if ('Notification' in window && alert.severity === 'critical') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico'
      });
    }
  }

  /**
   * Track AI event and send to configured integrations
   */
  trackAIEvent(event: {
    type: string;
    platform: string;
    tool?: string;
    metadata?: Record<string, any>;
  }): void {
    // Track locally
    aiAnalytics.trackEvent(event.type as any, event.metadata || {});

    // Send to GA4 if enabled
    if (this.ga4Config?.enabled && this.ga4Config.events.toolUse) {
      this.sendToGA4(event.type, {
        platform: event.platform,
        tool: event.tool || 'unknown',
        ...event.metadata
      });
    }

    // Send conversion to GA4
    if (event.type === 'conversion' && this.ga4Config?.events.conversion) {
      this.sendToGA4('conversion', {
        platform: event.platform,
        value: event.metadata?.value || 1,
        currency: 'USD'
      });
    }
  }

  /**
   * Get Search Console data
   */
  async getSearchConsoleData(dateRange: string = '7d'): Promise<Record<string, any> | null> {
    if (!this.searchConsoleConfig?.enabled || !this.searchConsoleConfig.apiKey) {
      return null;
    }

    const cacheKey = `search-console-${dateRange}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Note: This is a simplified implementation
      // Real implementation would use Google Search Console API
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Simulate API call
      const mockData = {
        clicks: Math.floor(Math.random() * 1000) + 500,
        impressions: Math.floor(Math.random() * 10000) + 5000,
        ctr: (Math.random() * 5 + 1).toFixed(2),
        position: (Math.random() * 20 + 5).toFixed(1),
        queries: [
          { query: 'pdf merge online', clicks: 45, position: 2.3 },
          { query: 'merge pdf files', clicks: 38, position: 4.1 },
          { query: 'combine pdf', clicks: 29, position: 3.8 }
        ]
      };

      this.saveToCache(cacheKey, mockData);
      return mockData;
    } catch (error) {
      console.error('Failed to fetch Search Console data:', error);
      return null;
    }
  }

  /**
   * Send daily summary to webhooks
   */
  async sendDailySummary(): Promise<void> {
    const report = aiAnalytics.generateReport();

    const summary = {
      totalSessions: report.summary.totalEvents,
      aiSessions: report.traffic.aiSessions || 0,
      citationRate: (report.extraction.citationRate * 100).toFixed(1),
      topPlatform: Object.entries(report.traffic.byPlatform || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'None'
    };

    await this.sendToWebhook('daily-summary', `
📊 Daily AI Analytics Summary
Total Sessions: ${summary.totalSessions.toLocaleString()}
AI Traffic: ${summary.aiSessions.toLocaleString()}
Citation Rate: ${summary.citationRate}%
Top Platform: ${summary.topPlatform}
    `.trim(), summary);
  }

  /**
   * Initialize GA4
   */
  private initializeGA4(): void {
    if (!this.ga4Config) return;

    // Load gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.ga4Config.measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: any[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', this.ga4Config.measurementId);

    // Configure custom dimensions
    this.ga4Config.customDimensions.forEach((dimension, index) => {
      window.gtag('config', this.ga4Config!.measurementId, {
        [`custom_dimension${index + 1}`]: dimension
      });
    });
  }

  /**
   * Refresh Search Console data
   */
  private async refreshSearchConsoleData(): Promise<void> {
    const data = await this.getSearchConsoleData('7d');
    if (data && this.searchConsoleConfig) {
      this.sendToWebhook('search-console-update', 'Search Console data refreshed', data);
    }
  }

  /**
   * Cache event
   */
  private cacheEvent(event: IntegrationEvent): void {
    this.eventCache.set(event.eventId, event);

    // Clean old events
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    for (const [key, value] of this.eventCache) {
      if (value.timestamp < cutoff) {
        this.eventCache.delete(key);
      }
    }
  }

  /**
   * Get event from cache
   */
  getEvent(eventId: string): IntegrationEvent | undefined {
    return this.eventCache.get(eventId);
  }

  /**
   * Get all recent events
   */
  getRecentEvents(count: number = 50): IntegrationEvent[] {
    return Array.from(this.eventCache.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Cache metrics data
   */
  private saveToCache(key: string, data: any): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(key: string): any {
    const cached = this.metricsCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cacheExpiration) {
      this.metricsCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Get color for event type
   */
  private getEventColor(eventType: string): string {
    const colors: Record<string, string> = {
      'alert': 'danger',
      'warning': 'warning',
      'info': 'good',
      'daily-summary': '#007bff'
    };
    return colors[eventType] || 'good';
  }

  /**
   * Configure integrations
   */
  configure(config: Partial<ExternalIntegrationsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get integration status
   */
  getStatus(): Record<string, boolean> {
    return {
      ga4: this.ga4Config?.enabled || false,
      searchConsole: this.searchConsoleConfig?.enabled || false,
      webhooks: this.webhooks.some(w => w.enabled),
      serpAPI: this.serpAPIConfig?.enabled || false
    };
  }
}

// Export singleton
export const externalIntegrations = new ExternalIntegrations();
export type { GA4Config, SearchConsoleConfig, WebhookConfig, SerpAPIConfig, IntegrationEvent };

// Auto-initialize in production
if (typeof window !== 'undefined') {
  const initIntegrations = () => {
    if (window.location.hostname !== 'localhost') {
      console.log('🔌 External integrations initialized');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntegrations);
  } else {
    initIntegrations();
  }
}

// Types for Google Tag (gtag)
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
