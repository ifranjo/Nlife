/**
 * Auto-Scaling System for AI Traffic
 *
 * Automatically adjusts system resources and optimization levels
 * based on AI traffic volume for maximum performance
 */

import { aiAnalytics } from './ai-analytics';
import { externalIntegrations } from './external-integrations';

// Types
export interface LoadMetrics {
  currentSessions: number;
  sessionGrowthRate: number; // % per minute
  aiTrafficRatio: number; // % of total
  memoryUsage: number; // MB
  cpuUsage: number; // % (simulated for web workers)
  networkLatency: number; // ms
}

export interface ScalingThresholds {
  normal: { min: number; max: number };
  warning: { min: number; max: number };
  critical: { min: number; max: number };
  emergency: { min: number; max: number };
}

export interface ResourceAllocation {
  webWorkers: number;
  cacheSize: number; // MB
  reportingInterval: number; // ms
  eventBatchSize: number;
  abTestSampleRate: number; // %
  analyticsSampleRate: number; // %
  maxHistorySize: number; // events to retain
}

export interface ScalingMode {
  name: 'normal' | 'warning' | 'critical' | 'emergency';
  resourceTier: ResourceAllocation;
  features: {
    analytics: boolean;
    abTesting: boolean;
    personalization: boolean;
    reporting: boolean;
    externalIntegrations: boolean;
  };
  autoHeal: boolean;
}

export interface AutoScalingConfig {
  thresholds: ScalingThresholds;
  autoScale: boolean;
  notificationWebhook?: string;
  modeChangeCooldown: number; // ms
  resourceTiers: Record<'tier1' | 'tier2' | 'tier3' | 'tier4', ResourceAllocation>;
}

class AutoScalingSystem {
  private config: AutoScalingConfig = {
    thresholds: {
      normal: { min: 0, max: 1000 },
      warning: { min: 1000, max: 5000 },
      critical: { min: 5000, max: 20000 },
      emergency: { min: 20000, max: 100000 }
    },
    autoScale: true,
    modeChangeCooldown: 300000, // 5 minutes
    resourceTiers: {
      tier1: {
        webWorkers: 4,
        cacheSize: 50,
        reportingInterval: 30000, // 30 seconds
        eventBatchSize: 10,
        abTestSampleRate: 1.0, // 100%
        analyticsSampleRate: 1.0, // 100%
        maxHistorySize: 10000
      },
      tier2: {
        webWorkers: 2,
        cacheSize: 25,
        reportingInterval: 300000, // 5 minutes
        eventBatchSize: 50,
        abTestSampleRate: 0.5, // 50%
        analyticsSampleRate: 0.5, // 50%
        maxHistorySize: 5000
      },
      tier3: {
        webWorkers: 1,
        cacheSize: 10,
        reportingInterval: 1800000, // 30 minutes
        eventBatchSize: 100,
        abTestSampleRate: 0.1, // 10%
        analyticsSampleRate: 0.1, // 10%
        maxHistorySize: 1000
      },
      tier4: {
        webWorkers: 1,
        cacheSize: 5,
        reportingInterval: 3600000, // 1 hour
        eventBatchSize: 200,
        abTestSampleRate: 0.01, // 1%
        analyticsSampleRate: 0.01, // 1%
        maxHistorySize: 100
      }
    }
  };

  private currentMode: ScalingMode = this.createMode('normal');
  private monitoringInterval: number | null = null;
  private lastModeChange: number = Date.now();
  private metricsHistory: LoadMetrics[] = [];
  private alertCooldown: Set<string> = new Set();

  /**
   * Create scaling mode configuration
   */
  private createMode(modeName: 'normal' | 'warning' | 'critical' | 'emergency'): ScalingMode {
    const modes: Record<string, ScalingMode> = {
      normal: {
        name: 'normal',
        resourceTier: this.config.resourceTiers.tier1,
        features: {
          analytics: true,
          abTesting: true,
          personalization: true,
          reporting: true,
          externalIntegrations: true
        },
        autoHeal: false
      },
      warning: {
        name: 'warning',
        resourceTier: this.config.resourceTiers.tier2,
        features: {
          analytics: true,
          abTesting: true,
          personalization: false,
          reporting: true,
          externalIntegrations: true
        },
        autoHeal: true
      },
      critical: {
        name: 'critical',
        resourceTier: this.config.resourceTiers.tier3,
        features: {
          analytics: true,
          abTesting: false,
          personalization: false,
          reporting: false,
          externalIntegrations: false
        },
        autoHeal: true
      },
      emergency: {
        name: 'emergency',
        resourceTier: this.config.resourceTiers.tier4,
        features: {
          analytics: false,
          abTesting: false,
          personalization: false,
          reporting: false,
          externalIntegrations: false
        },
        autoHeal: true
      }
    };

    return modes[modeName];
  }

  /**
   * Get current load metrics
   */
  private getLoadMetrics(): LoadMetrics {
    const report = aiAnalytics.generateReport();
    const currentSessions = report.summary.totalEvents;
    const aiSessions = report.traffic.aiSessions || 0;
    const now = Date.now();

    // Calculate growth rate from history
    let sessionGrowthRate = 0;
    if (this.metricsHistory.length > 0) {
      const previousMetrics = this.metricsHistory[this.metricsHistory.length - 1];
      const timeDiff = (now - previousMetrics.timestamp) / 60000; // minutes
      if (timeDiff > 0) {
        sessionGrowthRate = ((currentSessions - previousMetrics.currentSessions) / previousMetrics.currentSessions) * 100 / timeDiff;
      }
    }

    // Estimate memory usage (simulated)
    const memoryUsage = Math.min(100 + (currentSessions * 0.01), 500); // MB

    // Estimate CPU usage (simulated)
    const cpuUsage = Math.min(20 + (currentSessions * 0.005), 80); // %

    // Network latency (simulated)
    const networkLatency = currentSessions > 10000 ? 200 + Math.random() * 100 : 50 + Math.random() * 50;

    return {
      currentSessions,
      sessionGrowthRate,
      aiTrafficRatio: currentSessions > 0 ? (aiSessions / currentSessions) * 100 : 0,
      memoryUsage,
      cpuUsage,
      networkLatency
    };
  }

  /**
   * Determine scaling mode based on metrics
   */
  private determineMode(metrics: LoadMetrics): ScalingMode {
    const aiTraffic = metrics.currentSessions * (metrics.aiTrafficRatio / 100);

    for (const [modeName, thresholds] of Object.entries(this.config.thresholds)) {
      if (aiTraffic >= thresholds.min && aiTraffic < thresholds.max) {
        return this.createMode(modeName as any);
      }
    }

    return this.createMode('emergency');
  }

  /**
   * Apply scaling mode to system
   */
  private applyScalingMode(mode: ScalingMode): void {
    // Update analytics configuration
    if (window.aiAnalytics) {
      window.aiAnalytics.configure({
        sampleRate: mode.resourceTier.analyticsSampleRate
      });
    }

    // Update A/B testing configuration
    if (window.geoABTesting) {
      window.geoABTesting.configure({
        sampleRate: mode.resourceTier.abTestSampleRate
      });
    }

    // Update reporting interval
    if (window.advancedReporting) {
      window.advancedReporting.configure({
        reportingInterval: mode.resourceTier.reportingInterval
      });
    }

    // Apply feature toggles
    this.applyFeatureToggles(mode.features);

    // Log mode change
    console.log(`🔄 Auto-scaling: ${mode.name} mode activated`);

    // Send notification
    this.sendScalingNotification(mode, this.currentMode);
  }

  /**
   * Apply feature toggles
   */
  private applyFeatureToggles(features: ScalingMode['features']): void {
    // Enable/disable features based on scaling mode
    Object.entries(features).forEach(([feature, enabled]) => {
      const flag = `geo-feature-${feature}`;
      if (enabled) {
        document.body.classList.add(flag);
      } else {
        document.body.classList.remove(flag);
      }
    });
  }

  /**
   * Send scaling notification
   */
  private sendScalingNotification(newMode: ScalingMode, oldMode: ScalingMode): void {
    const message = `System scaled from ${oldMode.name} to ${newMode.name} mode`;

    // Send to external integrations
    externalIntegrations.sendAlert({
      severity: newMode.name === 'emergency' ? 'critical' : 'info',
      title: 'Auto-Scaling Event',
      message,
      data: {
        oldMode: oldMode.name,
        newMode: newMode.name,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Check if we can change modes (cooldown period)
   */
  private canChangeMode(): boolean {
    const now = Date.now();
    return now - this.lastModeChange >= this.config.modeChangeCooldown;
  }

  /**
   * Auto-heal actions based on metrics
   */
  private autoHeal(metrics: LoadMetrics): void {
    // Clear cache if memory usage is high
    if (metrics.memoryUsage > 400) {
      console.log('🩹 Auto-heal: Clearing cache due to high memory usage');
      if (window.caches) {
        caches.keys().then(names => names.forEach(name => caches.delete(name)));
      }
    }

    // Batch analytics events if queue is growing
    if (this.currentMode.resourceTier.eventBatchSize > 50) {
      console.log('🩹 Auto-heal: Increasing event batch size');
      if (window.aiAnalytics) {
        window.aiAnalytics.configure({
          batchSize: 100
        });
      }
    }
  }

  /**
   * Scale to specific mode manually
   */
  scaleTo(modeName: 'normal' | 'warning' | 'critical' | 'emergency'): void {
    if (!this.canChangeMode()) {
      const remaining = Math.ceil((this.config.modeChangeCooldown - (Date.now() - this.lastModeChange)) / 1000);
      console.warn(`Cannot change mode yet. Cooldown: ${remaining}s remaining`);
      return;
    }

    const newMode = this.createMode(modeName);
    const oldMode = this.currentMode;

    this.currentMode = newMode;
    this.lastModeChange = Date.now();

    this.applyScalingMode(newMode);

    // Send notification about manual scaling
    externalIntegrations.sendAlert({
      severity: modeName === 'emergency' ? 'high' : 'info',
      title: 'Manual Scaling Event',
      message: `System manually scaled to ${modeName} mode`,
      data: {
        manual: true,
        operator: 'admin'
      }
    });
  }

  /**
   * Get current scaling mode
   */
  getCurrentMode(): ScalingMode {
    return this.currentMode;
  }

  /**
   * Get current load metrics
   */
  getCurrentMetrics(): LoadMetrics {
    return this.getLoadMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): LoadMetrics[] {
    return this.metricsHistory;
  }

  /**
   * Start monitoring
   */
  startMonitoring(config: {
    interval: number; // ms
    autoAdjust: boolean;
    sendNotifications: boolean;
  }): void {
    if (this.monitoringInterval) {
      console.warn('Monitoring already started');
      return;
    }

    this.monitoringInterval = window.setInterval(() => {
      const metrics = this.getLoadMetrics();

      // Store in history
      this.metricsHistory.push({ ...metrics, timestamp: Date.now() });

      // Keep only last 100 readings
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }

      // Check if we need to scale
      if (this.config.autoScale && this.canChangeMode()) {
        const targetMode = this.determineMode(metrics);

        if (targetMode.name !== this.currentMode.name) {
          console.log(`📈 Scaling triggered: ${metrics.currentSessions} sessions, ${metrics.aiTrafficRatio.toFixed(1)}% AI`);
          this.applyScalingMode(targetMode);
          this.currentMode = targetMode;
          this.lastModeChange = Date.now();
        }
      }

      // Auto-heal if needed
      if (this.currentMode.autoHeal) {
        this.autoHeal(metrics);
      }

      // Send periodic metrics
      if (config.sendNotifications && metrics.currentSessions % 100 === 0) {
        externalIntegrations.sendToWebhook('scaling-metrics', 'System metrics update', {
          sessions: metrics.currentSessions,
          mode: this.currentMode.name,
          memory: metrics.memoryUsage
        });
      }
    }, config.interval);

    console.log(`🔄 Auto-scaling monitoring started (interval: ${config.interval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Auto-scaling monitoring stopped');
    }
  }

  /**
   * Get scaling mode based on session count
   */
  private getModeForSessionCount(count: number): ScalingMode {
    if (count < this.config.thresholds.warning.min) {
      return this.createMode('normal');
    } else if (count < this.config.thresholds.critical.min) {
      return this.createMode('warning');
    } else if (count < this.config.thresholds.emergency.min) {
      return this.createMode('critical');
    } else {
      return this.createMode('emergency');
    }
  }

  /**
   * Configure scaling system
   */
  configure(config: Partial<AutoScalingConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔄 Auto-scaling configuration updated');
  }

  /**
   * Get scaling mode history
   */
  getModeHistory(): Array<{ mode: string; timestamp: number; sessions: number }> {
    return this.metricsHistory.map(m => ({
      mode: this.getModeForSessionCount(m.currentSessions).name,
      timestamp: m.timestamp,
      sessions: m.currentSessions
    }));
  }

  /**
   * Calculate capacity metrics
   */
  getCapacityMetrics() {
    const metrics = this.getCurrentMetrics();
    const maxCapacity = this.config.thresholds.emergency.max;
    const current = metrics.currentSessions;

    return {
      current,
      maxCapacity,
      utilization: (current / maxCapacity) * 100,
      headroom: maxCapacity - current,
      projectedTimeToMax: this.calculateTimeToMax(metrics)
    };
  }

  /**
   * Calculate projected time to max capacity
   */
  private calculateTimeToMax(metrics: LoadMetrics): number | null {
    if (metrics.sessionGrowthRate <= 0) return null;

    const maxCapacity = this.config.thresholds.emergency.max;
    const current = metrics.currentSessions;
    const growthPerMinute = (metrics.sessionGrowthRate / 100) * current;

    if (growthPerMinute <= 0) return null;

    const minutesToMax = (maxCapacity - current) / growthPerMinute;
    return Math.floor(minutesToMax);
  }
}

// Export singleton
export const autoScaling = new AutoScalingSystem();
export type { LoadMetrics, ScalingMode, ResourceAllocation, AutoScalingConfig };

// Auto-initialize in production
if (typeof window !== 'undefined') {
  const initAutoScaling = () => {
    if (window.location.hostname !== 'localhost') {
      autoScaling.configure({
        autoScale: true,
        modeChangeCooldown: 300000
      });
      console.log('🔄 Auto-scaling system initialized');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoScaling);
  } else {
    initAutoScaling();
  }
}
