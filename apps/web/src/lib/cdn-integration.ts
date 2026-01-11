/**
 * CDN Integration Helpers
 *
 * Provides seamless integration with CDN providers for cache management,
   * asset optimization, and performance monitoring
   */

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'gcp' | 'azure' | 'fastly' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  zoneId?: string;
  distributionId?: string;
  endpoint?: string;
  customHeaders?: Record<string, string>;

  // Cache settings
  cacheLevel?: 'aggressive' | 'standard' | 'basic';
  browserCacheTTL?: number; // seconds
  edgeCacheTTL?: number; // seconds

  // Features
  autoPurge?: boolean;
  autoMinify?: boolean;
  brotli?: boolean;
  http2?: boolean;
  http3?: boolean;

  // Monitoring
  enableAnalytics?: boolean;
  sampleRate?: number;

  // Retry settings
  maxRetries?: number;
  retryDelay?: number; // ms
}

export interface CacheStats {
  hitRatio: number;
  bandwidthSaved: number; // bytes
  requests: number;
  cachedRequests: number;
  uncachedRequests: number;
}

export interface PurgeResult {
  success: boolean;
  purged: string[];
  failed: string[];
  errors: string[];
  duration: number;
}

export interface CDNStatus {
  connected: boolean;
  provider: string;
  lastSync: number;
  cacheStats: CacheStats;
  zones: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'error';
  }>;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savings: number; // percentage
  format?: string;
  quality?: number;
}

class CDNIntegration {
  private config: CDNConfig = {
    provider: 'cloudflare',
    cacheLevel: 'standard',
    browserCacheTTL: 14400, // 4 hours
    edgeCacheTTL: 7200, // 2 hours
    autoPurge: true,
    autoMinify: true,
    brotli: true,
    http2: true,
    http3: false,
    enableAnalytics: true,
    sampleRate: 1.0,
    maxRetries: 3,
    retryDelay: 1000
  };

  private cache: Map<string, any> = new Map();
  private analytics: Array<{
    timestamp: number;
    type: string;
    data: any;
  }> = [];

  private providers: Record<string, any> = {
    cloudflare: {
      apiUrl: 'https://api.cloudflare.com/client/v4',
      endpoints: {
        purge: '/zones/{zoneId}/purge_cache',
        stats: '/zones/{zoneId}/analytics/dashboard',
        settings: '/zones/{zoneId}/settings'
      }
    },
    aws: {
      apiUrl: 'https://cloudfront.amazonaws.com/2020-05-31',
      endpoints: {
        purge: '/distribution/{distributionId}/invalidation',
        stats: '/distribution/{distributionId}/stats'
      }
    },
    fastly: {
      apiUrl: 'https://api.fastly.com',
      endpoints: {
        purge: '/service/{serviceId}/purge',
        stats: '/stats/service/{serviceId}'
      }
    }
  };

  constructor() {
    this.initializeCDN();
  }

  /**
   * Configure CDN integration
   */
  configure(config: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.provider === 'custom' && !this.config.endpoint) {
      console.warn('Custom CDN requires endpoint configuration');
    }

    console.log(`🌐 CDN configured: ${this.config.provider}`);
  }

  /**
   * Initialize CDN connection
   */
  private async initializeCDN(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Check if we have required credentials
    if (!this.hasRequiredCredentials()) {
      console.warn('CDN credentials not configured');
      return;
    }

    // Test connection
    try {
      await this.testConnection();
      console.log('🌐 CDN connection established');
    } catch (error) {
      console.error('CDN connection failed:', error);
    }

    // Set up auto-purge if enabled
    if (this.config.autoPurge) {
      this.setupAutoPurge();
    }

    // Start analytics collection
    if (this.config.enableAnalytics) {
      this.startAnalyticsCollection();
    }
  }

  /**
   * Check if we have required credentials
   */
  private hasRequiredCredentials(): boolean {
    switch (this.config.provider) {
      case 'cloudflare':
        return !!(this.config.apiKey && this.config.zoneId);
      case 'aws':
        return !!(this.config.apiKey && this.config.apiSecret && this.config.distributionId);
      case 'fastly':
        return !!(this.config.apiKey);
      case 'custom':
        return !!(this.config.endpoint);
      default:
        return false;
    }
  }

  /**
   * Test CDN connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/test');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make API request to CDN provider
   */
  private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
    const provider = this.providers[this.config.provider];
    if (!provider) {
      throw new Error(`Unknown CDN provider: ${this.config.provider}`);
    }

    const url = this.config.endpoint || provider.apiUrl + path;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.customHeaders
    };

    // Add authentication headers
    if (this.config.provider === 'cloudflare' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.provider === 'aws') {
      // AWS requires signature v4
      headers['Authorization'] = this.signAWSRequest(method, path);
    } else if (this.config.provider === 'fastly' && this.config.apiKey) {
      headers['Fastly-Key'] = this.config.apiKey;
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };

    // Retry logic
    for (let attempt = 0; attempt <= this.config.maxRetries!; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        }
        if (attempt === this.config.maxRetries) {
          throw new Error(`CDN request failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          throw error;
        }
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay! * Math.pow(2, attempt)));
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Sign AWS request (simplified)
   */
  private signAWSRequest(method: string, path: string): string {
    // This is a simplified implementation
    // In production, use AWS SDK or proper signature v4 implementation
    const date = new Date().toISOString().replace(/[:\-]|\\.\d{3}/g, '');
    return `AWS4-HMAC-SHA256 Credential=${this.config.apiKey}/${date}/us-east-1/cloudfront/aws4_request`;
  }

  /**
   * Purge cache
   */
  async purgeCache(paths?: string[]): Promise<PurgeResult> {
    const startTime = Date.now();
    const result: PurgeResult = {
      success: false,
      purged: [],
      failed: [],
      errors: [],
      duration: 0
    };

    try {
      if (this.config.provider === 'cloudflare') {
        result.purged = await this.purgeCloudflare(paths);
      } else if (this.config.provider === 'aws') {
        result.purged = await this.purgeAWS(paths);
      } else if (this.config.provider === 'fastly') {
        result.purged = await this.purgeFastly(paths);
      } else if (this.config.provider === 'custom') {
        result.purged = await this.purgeCustom(paths);
      }

      result.success = result.failed.length === 0;
      result.duration = Date.now() - startTime;

      // Track analytics
      this.trackAnalytics('purge', {
        provider: this.config.provider,
        paths: paths?.length || 0,
        success: result.success,
        duration: result.duration
      });

      console.log(`🗑️ Cache purge completed in ${result.duration}ms`);
    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Purge Cloudflare cache
   */
  private async purgeCloudflare(paths?: string[]): Promise<string[]> {
    const body = paths && paths.length > 0
      ? { files: paths }
      : { purge_everything: true };

    const response = await this.makeRequest(
      'POST',
      `/zones/${this.config.zoneId}/purge_cache`,
      body
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Cloudflare purge failed: ${data.errors?.[0]?.message}`);
    }

    return paths || ['*'];
  }

  /**
   * Purge AWS CloudFront cache
   */
  private async purgeAWS(paths?: string[]): Promise<string[]> {
    const body = {
      Paths: {
        Quantity: paths?.length || 1,
        Items: paths || ['/*']
      },
      CallerReference: Date.now().toString()
    };

    const response = await this.makeRequest(
      'POST',
      `/distribution/${this.config.distributionId}/invalidation`,
      body
    );

    const data = await response.json();
    if (response.status !== 201) {
      throw new Error(`AWS purge failed: ${data.Error?.Message}`);
    }

    return paths || ['/*'];
  }

  /**
   * Purge Fastly cache
   */
  private async purgeFastly(paths?: string[]): Promise<string[]> {
    if (paths && paths.length > 0) {
      // Purge specific paths
      for (const path of paths) {
        await this.makeRequest(
          'POST',
          `/purge/${encodeURIComponent(path)}`
        );
      }
      return paths;
    } else {
      // Purge all
      await this.makeRequest('POST', '/purge_all');
      return ['*'];
    }
  }

  /**
   * Purge custom CDN
   */
  private async purgeCustom(paths?: string[]): Promise<string[]> {
    const response = await this.makeRequest('POST', '/purge', {
      paths: paths || ['/*'],
      timestamp: Date.now()
    });

    if (!response.ok) {
      throw new Error(`Custom CDN purge failed: ${response.statusText}`);
    }

    return paths || ['/*'];
  }

  /**
   * Get CDN status
   */
  getStatus(): CDNStatus {
    const stats = this.getCacheStats();

    return {
      connected: this.hasRequiredCredentials(),
      provider: this.config.provider,
      lastSync: Date.now(),
      cacheStats: stats,
      zones: [
        {
          id: this.config.zoneId || this.config.distributionId || 'default',
          name: 'Primary Zone',
          status: stats.hitRatio > 0 ? 'active' : 'inactive'
        }
      ]
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const total = this.metrics.networkRequests || 0;
    const cached = this.metrics.cacheHits || 0;
    const hitRatio = total > 0 ? (cached / total) * 100 : 0;

    return {
      hitRatio,
      bandwidthSaved: this.metrics.bandwidthSaved || 0,
      requests: total,
      cachedRequests: cached,
      uncachedRequests: total - cached
    };
  }

  /**
   * Set up auto-purge
   */
  private setupAutoPurge(): void {
    // Listen for changes that might affect cache
    if (typeof window !== 'undefined') {
      // Purge on deployment (detected by version change)
      const currentVersion = localStorage.getItem('app_version');
      const newVersion = '__APP_VERSION__'; // This would be replaced at build time

      if (currentVersion !== newVersion) {
        this.purgeCache().then(() => {
          localStorage.setItem('app_version', newVersion);
        });
      }

      // Purge on critical updates
      window.addEventListener('beforeunload', () => {
        if (this.shouldPurgeOnExit()) {
          navigator.sendBeacon('/api/purge-cache', JSON.stringify({
            paths: ['/api/*', '/assets/*']
          }));
        }
      });
    }
  }

  /**
   * Check if we should purge on exit
   */
  private shouldPurgeOnExit(): boolean {
    // Check if any critical updates were made
    return sessionStorage.getItem('critical_update') === 'true';
  }

  /**
   * Start analytics collection
   */
  private startAnalyticsCollection(): void {
    if (typeof window === 'undefined') return;

    // Monitor performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
            this.analytics.push({
              timestamp: Date.now(),
              type: 'performance',
              data: {
                name: entry.name,
                duration: entry.duration,
                cached: (entry as any).transferSize === 0
              }
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });
    }

    // Sample analytics
    setInterval(() => {
      if (Math.random() < this.config.sampleRate!) {
        this.sendAnalyticsBatch();
      }
    }, 60000); // Every minute
  }

  /**
   * Track analytics event
   */
  private trackAnalytics(type: string, data: any): void {
    this.analytics.push({
      timestamp: Date.now(),
      type,
      data
    });

    // Keep only last 1000 events
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000);
    }
  }

  /**
   * Send analytics batch
   */
  private async sendAnalyticsBatch(): Promise<void> {
    if (this.analytics.length === 0) return;

    const batch = [...this.analytics];
    this.analytics = [];

    try {
      await this.makeRequest('POST', '/analytics', {
        events: batch,
        provider: this.config.provider
      });
    } catch (error) {
      // Put events back in queue
      this.analytics.unshift(...batch);
    }
  }

  /**
   * Optimize asset
   */
  async optimizeAsset(url: string): Promise<OptimizationResult> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('POST', '/optimize', {
        url,
        options: {
          autoMinify: this.config.autoMinify,
          brotli: this.config.brotli,
          webp: true,
          avif: true
        }
      });

      const result = await response.json();

      this.trackAnalytics('optimization', {
        url,
        duration: Date.now() - startTime,
        savings: result.savings
      });

      return result;
    } catch (error) {
      throw new Error(`Asset optimization failed: ${error.message}`);
    }
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(urls: string[]): Promise<Array<{
    url: string;
    suggestions: string[];
    priority: 'high' | 'medium' | 'low';
  }>> {
    try {
      const response = await this.makeRequest('POST', '/suggestions', {
        urls,
        metrics: this.getCacheStats()
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to get optimization suggestions:', error);
      return [];
    }
  }

  // Metrics tracking
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    bandwidthSaved: 0,
    networkRequests: 0
  };
}

// Export singleton
export const cdnIntegration = new CDNIntegration();
export type { CDNConfig, CacheStats, PurgeResult, CDNStatus, OptimizationResult };

// Auto-initialize
if (typeof window !== 'undefined') {
  const initCDN = () => {
    // Check if CDN is configured via environment
    const cdnConfig = window.__CDN_CONFIG__; // This would be set by server

    if (cdnConfig) {
      cdnIntegration.configure(cdnConfig);
      console.log('🌐 CDN integration initialized');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCDN);
  } else {
    initCDN();
  }
}

// Global declaration
declare global {
  interface Window {
    __CDN_CONFIG__?: Partial<CDNConfig>;
  }
}

console.log('🌐 CDN integration module loaded');