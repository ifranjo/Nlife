/**
 * Integration module for HAMBREDEVICTORIA Health Monitoring
 * Connects existing GEO components to health monitoring system
 */

import { healthMonitor } from './health-monitoring';
import { aiTrafficDetector } from './ai-detection';
import { adaptationEngine } from './dynamic-adaptation';
import { performanceOptimizer } from './performance-optimizer';
import { aiAnalytics } from './ai-analytics';
import { geoABTesting } from './geo-ab-testing';
import { geoFeedbackSystem } from './geo-feedback-loops';

/**
 * Initialize health monitoring for all GEO components
 */
export function initializeHealthMonitoring(): void {
  // AI Traffic Detection Metrics
  healthMonitor.registerMetric({
    name: 'AI Traffic Detection Rate',
    getter: () => {
      const stats = aiTrafficDetector.getDetectionStats?.() || { totalRequests: 0, aiRequests: 0 };
      return stats.totalRequests > 0 ? (stats.aiRequests / stats.totalRequests) * 100 : 0;
    },
    interval: 5000, // 5 seconds
    unit: '%',
    thresholds: {
      warning: 5,
      critical: 1,
      min: 0,
      max: 100
    },
    description: 'Percentage of total traffic identified as AI crawlers'
  });

  // Platform Detection Accuracy
  healthMonitor.registerMetric({
    name: 'Platform Detection Accuracy',
    getter: () => {
      const accuracy = aiTrafficDetector.getAccuracyMetrics?.() || { correct: 0, total: 0 };
      return accuracy.total > 0 ? (accuracy.correct / accuracy.total) * 100 : 0;
    },
    interval: 30000, // 30 seconds
    unit: '%',
    thresholds: {
      warning: 85,
      critical: 70,
      min: 0,
      max: 100
    },
    description: 'Accuracy of AI platform detection'
  });

  // Content Adaptation Success Rate
  healthMonitor.registerMetric({
    name: 'Content Adaptation Success Rate',
    getter: () => {
      const metrics = adaptationEngine.getAdaptationMetrics?.() || { attempts: 0, successes: 0 };
      return metrics.attempts > 0 ? (metrics.successes / metrics.attempts) * 100 : 0;
    },
    interval: 10000, // 10 seconds
    unit: '%',
    thresholds: {
      warning: 90,
      critical: 80,
      min: 0,
      max: 100
    },
    description: 'Success rate of content adaptation attempts'
  });

  // Extraction Performance
  healthMonitor.registerMetric({
    name: 'Extraction Performance',
    getter: () => {
      const metrics = performanceOptimizer.getPerformanceMetrics?.() || { avgExtractionTime: 0 };
      return metrics.avgExtractionTime;
    },
    interval: 5000, // 5 seconds
    unit: 'ms',
    thresholds: {
      warning: 1000,
      critical: 2000,
      min: 0,
      max: 5000
    },
    description: 'Average content extraction time in milliseconds'
  });

  // Cache Hit Rate
  healthMonitor.registerMetric({
    name: 'Cache Hit Rate',
    getter: () => {
      const metrics = performanceOptimizer.getCacheMetrics?.() || { hits: 0, misses: 0 };
      const total = metrics.hits + metrics.misses;
      return total > 0 ? (metrics.hits / total) * 100 : 0;
    },
    interval: 15000, // 15 seconds
    unit: '%',
    thresholds: {
      warning: 70,
      critical: 50,
      min: 0,
      max: 100
    },
    description: 'Cache hit rate for optimized content delivery'
  });

  // Conversion Funnel Health
  healthMonitor.registerMetric({
    name: 'Conversion Funnel Health',
    getter: () => {
      const conversions = aiAnalytics.getConversionMetrics?.() || { visits: 0, conversions: 0 };
      return conversions.visits > 0 ? (conversions.conversions / conversions.visits) * 100 : 0;
    },
    interval: 30000, // 30 seconds
    unit: '%',
    thresholds: {
      warning: 2,
      critical: 1,
      min: 0,
      max: 100
    },
    description: 'Overall conversion rate from AI traffic'
  });

  // A/B Test Performance
  healthMonitor.registerMetric({
    name: 'A/B Test Performance',
    getter: () => {
      const tests = geoABTesting.getActiveTests?.() || [];
      const completedTests = tests.filter(t => t.status === 'completed');
      const successfulTests = completedTests.filter(t => t.winner !== null);
      return completedTests.length > 0 ? (successfulTests.length / completedTests.length) * 100 : 0;
    },
    interval: 60000, // 1 minute
    unit: '%',
    thresholds: {
      warning: 60,
      critical: 40,
      min: 0,
      max: 100
    },
    description: 'Success rate of completed A/B tests'
  });

  // Feedback Loop Efficiency
  healthMonitor.registerMetric({
    name: 'Feedback Loop Efficiency',
    getter: () => {
      const metrics = geoFeedbackSystem.getLoopMetrics?.() || { total: 0, optimized: 0 };
      return metrics.total > 0 ? (metrics.optimized / metrics.total) * 100 : 0;
    },
    interval: 120000, // 2 minutes
    unit: '%',
    thresholds: {
      warning: 75,
      critical: 50,
      min: 0,
      max: 100
    },
    description: 'Percentage of feedback loops that resulted in optimization'
  });

  // Memory Usage
  healthMonitor.registerMetric({
    name: 'Memory Usage',
    getter: () => {
      if (typeof window !== 'undefined' && (window as any).performance?.memory) {
        const memory = (window as any).performance.memory;
        return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
      }
      return 0;
    },
    interval: 10000, // 10 seconds
    unit: 'MB',
    thresholds: {
      warning: 200,
      critical: 400,
      min: 0,
      max: 1000
    },
    description: 'JavaScript heap memory usage in MB'
  });

  // Error Rate
  healthMonitor.registerMetric({
    name: 'Error Rate',
    getter: () => {
      const errors = getErrorMetrics();
      const total = errors.totalRequests;
      return total > 0 ? (errors.totalErrors / total) * 100 : 0;
    },
    interval: 5000, // 5 seconds
    unit: '%',
    thresholds: {
      warning: 5,
      critical: 10,
      min: 0,
      max: 100
    },
    description: 'Percentage of requests resulting in errors'
  });

  // Set up critical alerts
  setupCriticalAlerts();

  // Start monitoring
  console.log('🩺 Health monitoring initialized for HAMBREDEVICTORIA protocol');
}

/**
 * Set up critical alerts for system health
 */
function setupCriticalAlerts(): void {
  // Critical error rate alert
  healthMonitor.setAlert({
    id: 'critical-error-rate',
    metric: 'Error Rate',
    threshold: 15,
    type: 'above',
    message: 'Critical error rate detected - immediate attention required'
  });

  // AI detection failure alert
  healthMonitor.setAlert({
    id: 'ai-detection-failure',
    metric: 'AI Traffic Detection Rate',
    threshold: 0.5,
    type: 'below',
    message: 'AI traffic detection rate critically low'
  });

  // Performance degradation alert
  healthMonitor.setAlert({
    id: 'performance-degradation',
    metric: 'Extraction Performance',
    threshold: 3000,
    type: 'above',
    message: 'Content extraction performance degraded'
  });

  // Memory usage alert
  healthMonitor.setAlert({
    id: 'high-memory-usage',
    metric: 'Memory Usage',
    threshold: 500,
    type: 'above',
    message: 'High memory usage detected'
  });
}

/**
 * Get error metrics from various sources
 */
function getErrorMetrics(): { totalErrors: number; totalRequests: number } {
  // Aggregate errors from all components
  let totalErrors = 0;
  let totalRequests = 0;

  // Get errors from AI detection
  const aiErrors = aiTrafficDetector.getErrorMetrics?.();
  if (aiErrors) {
    totalErrors += aiErrors.errors;
    totalRequests += aiErrors.requests;
  }

  // Get errors from adaptation
  const adaptationErrors = adaptationEngine.getErrorMetrics?.();
  if (adaptationErrors) {
    totalErrors += adaptationErrors.errors;
    totalRequests += adaptationErrors.requests;
  }

  // Get errors from performance optimizer
  const perfErrors = performanceOptimizer.getErrorMetrics?.();
  if (perfErrors) {
    totalErrors += perfErrors.errors;
    totalRequests += perfErrors.requests;
  }

  return { totalErrors, totalRequests };
}

/**
 * Get comprehensive system health report
 */
export function getSystemHealthReport(): {
  score: number;
  components: Record<string, any>;
  recommendations: string[];
} {
  const healthScore = healthMonitor.getHealthScore();
  const components = healthMonitor.getComponentStatus();
  const recommendations: string[] = [];

  // Analyze health score and provide recommendations
  if (healthScore.overall < 50) {
    recommendations.push('Critical system issues detected - immediate intervention required');
  } else if (healthScore.overall < 70) {
    recommendations.push('System performance degraded - review component metrics');
  }

  // Check individual components
  const criticalComponents = components.filter(c => c.status === 'critical');
  if (criticalComponents.length > 0) {
    recommendations.push(`${criticalComponents.length} components in critical state`);
  }

  // Check error rate
  const errorMetric = components.find(c => c.name === 'Error Rate');
  if (errorMetric?.metrics['Error Rate']?.status === 'critical') {
    recommendations.push('High error rate detected - check system logs');
  }

  // Check performance
  const perfMetric = components.find(c => c.name === 'Extraction Performance');
  if (perfMetric?.metrics['Extraction Performance']?.status === 'critical') {
    recommendations.push('Performance degradation detected - consider optimization');
  }

  return {
    score: healthScore.overall,
    components: healthScore.components,
    recommendations
  };
}

/**
 * Export health data for external monitoring systems
 */
export function exportHealthData(format: 'json' | 'prometheus' = 'json'): string {
  const statusPage = healthMonitor.generateStatusPage();
  const healthScore = healthMonitor.getHealthScore();

  if (format === 'prometheus') {
    // Export in Prometheus format
    let output = '';

    // Overall health score
    output += `# HELP hambredevictoria_health_score Overall system health score (0-100)\n`;
    output += `# TYPE hambredevictoria_health_score gauge\n`;
    output += `hambredevictoria_health_score ${healthScore.overall}\n\n`;

    // Individual metrics
    for (const component of statusPage.components) {
      const metric = component.metrics[component.name];
      if (metric) {
        const unit = getMetricUnit(component.name);
        output += `# HELP hambredevictoria_${component.name.toLowerCase().replace(/\s+/g, '_')} ${component.name} (${unit || 'none'})\n`;
        output += `# TYPE hambredevictoria_${component.name.toLowerCase().replace(/\s+/g, '_')} gauge\n`;
        output += `hambredevictoria_${component.name.toLowerCase().replace(/\s+/g, '_')} ${metric.value}\n\n`;
      }
    }

    // Status codes
    const statusCode = statusPage.status === 'operational' ? 0 :
                      statusPage.status === 'degraded' ? 1 : 2;
    output += `# HELP hambredevictoria_status Overall system status (0=operational, 1=degraded, 2=outage)\n`;
    output += `# TYPE hambredevictoria_status gauge\n`;
    output += `hambredevictoria_status ${statusCode}\n`;

    return output;
  }

  // Default JSON format
  return JSON.stringify({
    timestamp: Date.now(),
    status: statusPage.status,
    healthScore: healthScore.overall,
    components: statusPage.components.map(c => ({
      name: c.name,
      status: c.status,
      value: c.metrics[c.name]?.value,
      uptime: c.uptime
    })),
    activeIncidents: statusPage.incidents.length
  }, null, 2);
}

function getMetricUnit(metricName: string): string | undefined {
  const units: Record<string, string> = {
    'AI Traffic Detection Rate': '%',
    'Platform Detection Accuracy': '%',
    'Content Adaptation Success Rate': '%',
    'Extraction Performance': 'ms',
    'Cache Hit Rate': '%',
    'Conversion Funnel Health': '%',
    'A/B Test Performance': '%',
    'Feedback Loop Efficiency': '%',
    'Memory Usage': 'MB',
    'Error Rate': '%'
  };
  return units[metricName];
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHealthMonitoring);
  } else {
    initializeHealthMonitoring();
  }
}