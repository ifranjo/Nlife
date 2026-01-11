/**
 * Health Monitoring System for HAMBREDEVICTORIA Protocol
 * Real-time monitoring of GEO metrics without external dependencies
 */

export interface MetricDefinition {
  name: string;
  getter: () => number | Promise<number>;
  interval: number; // milliseconds
  unit?: string;
  thresholds?: {
    warning?: number;
    critical?: number;
    min?: number;
    max?: number;
  };
  description?: string;
}

export interface MetricData {
  value: number;
  timestamp: number;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface Alert {
  id: string;
  metric: string;
  threshold: number;
  type: 'above' | 'below';
  triggeredAt?: number;
  webhook?: string;
  message?: string;
}

export interface ComponentStatus {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  metrics: Record<string, MetricData>;
  lastCheck: number;
  uptime: number;
}

export interface HealthScore {
  overall: number; // 0-100
  components: Record<string, number>;
  trends: Record<string, 'improving' | 'stable' | 'declining'>;
}

export interface StatusPageData {
  status: 'operational' | 'degraded' | 'major_outage';
  components: ComponentStatus[];
  incidents: Incident[];
  metrics: Record<string, MetricData[]>;
  lastUpdated: number;
}

export interface Incident {
  id: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startedAt: number;
  resolvedAt?: number;
  description: string;
}

class HealthMonitor extends EventTarget {
  private metrics: Map<string, MetricDefinition> = new Map();
  private metricData: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private intervals: Map<string, number> = new Map();
  private incidents: Incident[] = [];
  private storageKey = 'hambredevictoria-health-metrics';
  private maxDataPoints = 100;
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  /**
   * Register a new metric for monitoring
   */
  registerMetric(definition: MetricDefinition): void {
    this.metrics.set(definition.name, definition);

    // Initialize metric data array
    if (!this.metricData.has(definition.name)) {
      this.metricData.set(definition.name, []);
    }

    // Start monitoring interval
    const intervalId = window.setInterval(async () => {
      await this.collectMetric(definition.name);
    }, definition.interval);

    this.intervals.set(definition.name, intervalId);

    // Initial collection
    this.collectMetric(definition.name);
  }

  /**
   * Collect a single metric
   */
  private async collectMetric(name: string): Promise<void> {
    const definition = this.metrics.get(name);
    if (!definition) return;

    try {
      const value = await definition.getter();
      const timestamp = Date.now();
      const status = this.calculateStatus(value, definition.thresholds);

      const dataPoint: MetricData = {
        value,
        timestamp,
        status
      };

      // Store data point
      const data = this.metricData.get(name) || [];
      data.push(dataPoint);

      // Keep only recent data points
      if (data.length > this.maxDataPoints) {
        data.shift();
      }

      this.metricData.set(name, data);
      this.saveToStorage();

      // Check alerts
      this.checkAlerts(name, value);

      // Emit event
      this.dispatchEvent(new CustomEvent('metricUpdate', {
        detail: { name, data: dataPoint }
      }));

    } catch (error) {
      console.error(`Failed to collect metric ${name}:`, error);

      // Create error data point
      const errorData: MetricData = {
        value: 0,
        timestamp: Date.now(),
        status: 'unknown'
      };

      this.dispatchEvent(new CustomEvent('metricError', {
        detail: { name, error }
      }));
    }
  }

  /**
   * Calculate status based on thresholds
   */
  private calculateStatus(value: number, thresholds?: MetricDefinition['thresholds']): MetricData['status'] {
    if (!thresholds) return 'healthy';

    if (thresholds.critical !== undefined) {
      if ((thresholds.critical < thresholds.warning!) && value <= thresholds.critical) return 'critical';
      if ((thresholds.critical > thresholds.warning!) && value >= thresholds.critical) return 'critical';
    }

    if (thresholds.warning !== undefined) {
      if ((thresholds.warning < thresholds.min!) && value <= thresholds.warning) return 'warning';
      if ((thresholds.warning > thresholds.max!) && value >= thresholds.warning) return 'warning';
    }

    return 'healthy';
  }

  /**
   * Set up an alert for a metric
   */
  setAlert(alert: Alert): void {
    this.alerts.set(alert.id, alert);
  }

  /**
   * Check if alerts should be triggered
   */
  private checkAlerts(metric: string, value: number): void {
    for (const alert of this.alerts.values()) {
      if (alert.metric !== metric) continue;

      const shouldTrigger = alert.type === 'above'
        ? value > alert.threshold
        : value < alert.threshold;

      const wasTriggered = alert.triggeredAt !== undefined;

      if (shouldTrigger && !wasTriggered) {
        // Alert triggered
        alert.triggeredAt = Date.now();
        this.dispatchEvent(new CustomEvent('alertTriggered', {
          detail: { alert, value }
        }));

        // Send webhook if configured
        if (alert.webhook) {
          this.sendWebhook(alert, value);
        }

        // Create incident
        this.createIncident(metric, 'medium', `Alert triggered: ${alert.message || metric} exceeded threshold`);
      } else if (!shouldTrigger && wasTriggered) {
        // Alert resolved
        alert.triggeredAt = undefined;
        this.dispatchEvent(new CustomEvent('alertResolved', {
          detail: { alert, value }
        }));
      }
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(alert: Alert, value: number): Promise<void> {
    if (!alert.webhook) return;

    try {
      await fetch(alert.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          metric: alert.metric,
          value,
          threshold: alert.threshold,
          type: alert.type,
          timestamp: Date.now(),
          message: alert.message
        })
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  /**
   * Create an incident
   */
  private createIncident(component: string, severity: Incident['severity'], description: string): void {
    const incident: Incident = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      component,
      severity,
      startedAt: Date.now(),
      description
    };

    this.incidents.push(incident);

    this.dispatchEvent(new CustomEvent('incidentCreated', {
      detail: { incident }
    }));
  }

  /**
   * Resolve an incident
   */
  resolveIncident(incidentId: string): void {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.resolvedAt = Date.now();

      this.dispatchEvent(new CustomEvent('incidentResolved', {
        detail: { incident }
      }));
    }
  }

  /**
   * Get current health score
   */
  getHealthScore(): HealthScore {
    const components: Record<string, number> = {};
    const trends: Record<string, HealthScore['trends']> = {};
    let totalWeight = 0;
    let weightedScore = 0;

    for (const [name, definition] of this.metrics) {
      const data = this.metricData.get(name) || [];
      if (data.length === 0) continue;

      // Get latest value
      const latest = data[data.length - 1];

      // Calculate component score based on status
      let score = 100;
      if (latest.status === 'warning') score = 70;
      if (latest.status === 'critical') score = 30;
      if (latest.status === 'unknown') score = 0;

      components[name] = score;

      // Calculate trend
      if (data.length >= 2) {
        const recent = data.slice(-10);
        const older = data.slice(-20, -10);

        if (recent.length > 0 && older.length > 0) {
          const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
          const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;

          if (recentAvg > olderAvg * 1.05) trends[name] = 'improving';
          else if (recentAvg < olderAvg * 0.95) trends[name] = 'declining';
          else trends[name] = 'stable';
        }
      }

      // Weight by importance (can be customized)
      const weight = definition.thresholds?.critical !== undefined ? 2 : 1;
      totalWeight += weight;
      weightedScore += score * weight;
    }

    const overall = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;

    return {
      overall,
      components,
      trends
    };
  }

  /**
   * Get component status
   */
  getComponentStatus(): ComponentStatus[] {
    const statuses: ComponentStatus[] = [];

    for (const [name, definition] of this.metrics) {
      const data = this.metricData.get(name) || [];
      if (data.length === 0) continue;

      const latest = data[data.length - 1];
      const uptime = this.calculateUptime(name);

      statuses.push({
        name,
        status: latest.status,
        metrics: { [name]: latest },
        lastCheck: latest.timestamp,
        uptime
      });
    }

    return statuses;
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(metric: string): number {
    const data = this.metricData.get(metric) || [];
    if (data.length === 0) return 100;

    const healthyCount = data.filter(d => d.status === 'healthy').length;
    return Math.round((healthyCount / data.length) * 100);
  }

  /**
   * Generate status page data
   */
  generateStatusPage(): StatusPageData {
    const components = this.getComponentStatus();
    const metrics: Record<string, MetricData[]> = {};

    for (const [name, data] of this.metricData) {
      metrics[name] = data.slice(-30); // Last 30 data points
    }

    // Determine overall status
    const healthScore = this.getHealthScore();
    let status: StatusPageData['status'] = 'operational';

    if (healthScore.overall < 30) status = 'major_outage';
    else if (healthScore.overall < 70) status = 'degraded';

    return {
      status,
      components,
      incidents: this.incidents.filter(i => !i.resolvedAt),
      metrics,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get metric history
   */
  getMetricHistory(name: string, hours: number = 24): MetricData[] {
    const data = this.metricData.get(name) || [];
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return data.filter(d => d.timestamp >= cutoff);
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, MetricData[]> {
    const result: Record<string, MetricData[]> = {};
    for (const [name, data] of this.metricData) {
      result[name] = [...data];
    }
    return result;
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        metrics: Array.from(this.metricData.entries()),
        incidents: this.incidents,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save metrics to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);

        // Check TTL
        if (Date.now() - data.timestamp > this.TTL) {
          localStorage.removeItem(this.storageKey);
          return;
        }

        // Restore metric data
        if (data.metrics) {
          for (const [name, metricData] of data.metrics) {
            this.metricData.set(name, metricData);
          }
        }

        // Restore incidents
        if (data.incidents) {
          this.incidents = data.incidents;
        }
      }
    } catch (error) {
      console.error('Failed to load metrics from storage:', error);
    }
  }

  /**
   * Clean up old data
   */
  private startCleanupInterval(): void {
    // Clean up every hour
    setInterval(() => {
      const cutoff = Date.now() - this.TTL;

      // Clean metric data
      for (const [name, data] of this.metricData) {
        const filtered = data.filter(d => d.timestamp > cutoff);
        if (filtered.length !== data.length) {
          this.metricData.set(name, filtered);
        }
      }

      // Clean incidents
      this.incidents = this.incidents.filter(i => i.startedAt > cutoff);

      this.saveToStorage();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
  }

  /**
   * Remove a metric
   */
  removeMetric(name: string): void {
    const intervalId = this.intervals.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(name);
    }

    this.metrics.delete(name);
    this.metricData.delete(name);

    // Remove related alerts
    for (const [id, alert] of this.alerts) {
      if (alert.metric === name) {
        this.alerts.delete(id);
      }
    }
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();

// Export types
export type {
  MetricDefinition,
  MetricData,
  Alert,
  ComponentStatus,
  HealthScore,
  StatusPageData,
  Incident
};