/**
 * Tool Performance Monitor
 * Tracks and analyzes performance metrics for all tools
 * @version 1.0.0
 */

export interface PerformanceMetrics {
  toolId: string;
  timestamp: string;
  // Timing metrics
  loadTime: number;
  processingTime: number;
  totalTime: number;
  // Resource metrics
  memoryUsage?: number;
  fileSize?: number;
  fileType?: string;
  // Status
  success: boolean;
  error?: string;
  // User interaction
  userInteractions: number;
  timeToFirstInteraction?: number;
  // Browser info
  userAgent: string;
  connectionType: string;
}

export interface ToolPerformanceSummary {
  toolId: string;
  totalRuns: number;
  avgLoadTime: number;
  avgProcessingTime: number;
  avgTotalTime: number;
  successRate: number;
  lastRun: string;
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
  memoryAvg?: number;
  slowestRun: number;
  fastestRun: number;
}

export interface PerformanceBudget {
  toolId: string;
  maxLoadTime: number;
  maxProcessingTime: number;
  maxMemoryUsage: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private budgets: Map<string, PerformanceBudget> = new Map();
  private readonly maxStoredMetrics = 1000;
  private readonly storageKey = 'tool_performance_metrics';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing a tool operation
   */
  startTiming(toolId: string): PerformanceTimer {
    return new PerformanceTimer(toolId, this);
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp' | 'userAgent' | 'connectionType'>): void {
    if (typeof window === 'undefined') return;

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }

    // Save to storage
    this.saveToStorage();

    // Check budget violations
    this.checkBudgetViolation(fullMetric);

    // Send to analytics
    this.sendToAnalytics(fullMetric);
  }

  /**
   * Get performance summary for a specific tool
   */
  getToolSummary(toolId: string, days: number = 7): ToolPerformanceSummary | null {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const toolMetrics = this.metrics.filter(
      (m) => m.toolId === toolId && new Date(m.timestamp) >= cutoff
    );

    if (toolMetrics.length === 0) return null;

    const loadTimes = toolMetrics.map((m) => m.loadTime);
    const processingTimes = toolMetrics.map((m) => m.processingTime);
    const totalTimes = toolMetrics.map((m) => m.totalTime);
    const successCount = toolMetrics.filter((m) => m.success).length;

    // Calculate trend
    const trend = this.calculateTrend(toolMetrics);

    return {
      toolId,
      totalRuns: toolMetrics.length,
      avgLoadTime: this.average(loadTimes),
      avgProcessingTime: this.average(processingTimes),
      avgTotalTime: this.average(totalTimes),
      successRate: (successCount / toolMetrics.length) * 100,
      lastRun: toolMetrics[toolMetrics.length - 1].timestamp,
      trend,
      memoryAvg: this.average(
        toolMetrics.filter((m) => m.memoryUsage).map((m) => m.memoryUsage!)
      ),
      slowestRun: Math.max(...totalTimes),
      fastestRun: Math.min(...totalTimes),
    };
  }

  /**
   * Get all tool summaries
   */
  getAllToolSummaries(days: number = 7): ToolPerformanceSummary[] {
    const toolIds = [...new Set(this.metrics.map((m) => m.toolId))];
    return toolIds
      .map((id) => this.getToolSummary(id, days))
      .filter((s): s is ToolPerformanceSummary => s !== null)
      .sort((a, b) => b.avgTotalTime - a.avgTotalTime);
  }

  /**
   * Set performance budget for a tool
   */
  setBudget(budget: PerformanceBudget): void {
    this.budgets.set(budget.toolId, budget);
    this.saveToStorage();
  }

  /**
   * Get performance budget for a tool
   */
  getBudget(toolId: string): PerformanceBudget | undefined {
    return this.budgets.get(toolId);
  }

  /**
   * Check if a tool is performing within budget
   */
  isWithinBudget(toolId: string): { withinBudget: boolean; violations: string[] } {
    const budget = this.budgets.get(toolId);
    const summary = this.getToolSummary(toolId, 1);

    if (!budget || !summary) {
      return { withinBudget: true, violations: [] };
    }

    const violations: string[] = [];

    if (summary.avgLoadTime > budget.maxLoadTime) {
      violations.push(`Load time ${summary.avgLoadTime.toFixed(0)}ms exceeds budget ${budget.maxLoadTime}ms`);
    }
    if (summary.avgProcessingTime > budget.maxProcessingTime) {
      violations.push(`Processing time ${summary.avgProcessingTime.toFixed(0)}ms exceeds budget ${budget.maxProcessingTime}ms`);
    }
    if (summary.memoryAvg && summary.memoryAvg > budget.maxMemoryUsage) {
      violations.push(`Memory usage ${(summary.memoryAvg / 1024 / 1024).toFixed(1)}MB exceeds budget ${(budget.maxMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    return {
      withinBudget: violations.length === 0,
      violations,
    };
  }

  /**
   * Get slowest tools
   */
  getSlowestTools(limit: number = 5, days: number = 7): ToolPerformanceSummary[] {
    return this.getAllToolSummaries(days)
      .sort((a, b) => b.avgTotalTime - a.avgTotalTime)
      .slice(0, limit);
  }

  /**
   * Get tools with degrading performance
   */
  getDegradingTools(days: number = 7): ToolPerformanceSummary[] {
    return this.getAllToolSummaries(days).filter((t) => t.trend === 'degrading');
  }

  /**
   * Export performance report
   */
  exportReport(days: number = 7): object {
    const summaries = this.getAllToolSummaries(days);
    const overallStats = {
      totalRuns: summaries.reduce((sum, s) => sum + s.totalRuns, 0),
      avgSuccessRate: this.average(summaries.map((s) => s.successRate)),
      slowestTool: summaries[0]?.toolId || 'N/A',
      fastestTool: summaries[summaries.length - 1]?.toolId || 'N/A',
    };

    return {
      generatedAt: new Date().toISOString(),
      period: `${days} days`,
      overallStats,
      toolSummaries: summaries,
      budgetViolations: summaries
        .map((s) => ({
          toolId: s.toolId,
          ...this.isWithinBudget(s.toolId),
        }))
        .filter((v) => !v.withinBudget),
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get raw metrics for a tool
   */
  getRawMetrics(toolId?: string, limit: number = 100): PerformanceMetrics[] {
    let result = this.metrics;
    if (toolId) {
      result = result.filter((m) => m.toolId === toolId);
    }
    return result.slice(-limit);
  }

  private getConnectionType(): string {
    const conn = (navigator as any).connection;
    if (conn) {
      return `${conn.effectiveType || 'unknown'} (${conn.downlink || '?'} Mbps)`;
    }
    return 'unknown';
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateTrend(metrics: PerformanceMetrics[]): 'improving' | 'stable' | 'degrading' | 'unknown' {
    if (metrics.length < 10) return 'unknown';

    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);

    const firstAvg = this.average(firstHalf.map((m) => m.totalTime));
    const secondAvg = this.average(secondHalf.map((m) => m.totalTime));

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change < -10) return 'improving';
    if (change > 10) return 'degrading';
    return 'stable';
  }

  private checkBudgetViolation(metric: PerformanceMetrics): void {
    const budget = this.budgets.get(metric.toolId);
    if (!budget) return;

    if (metric.processingTime > budget.maxProcessingTime) {
      console.warn(
        `[Performance] ${metric.toolId} exceeded processing budget: ${metric.processingTime}ms > ${budget.maxProcessingTime}ms`
      );
    }
  }

  private sendToAnalytics(metric: PerformanceMetrics): void {
    if (typeof window === 'undefined') return;
    if (!(window as any).gtag) return;

    (window as any).gtag('event', 'tool_performance', {
      event_category: 'Performance',
      event_label: metric.toolId,
      tool_id: metric.toolId,
      load_time: Math.round(metric.loadTime),
      processing_time: Math.round(metric.processingTime),
      total_time: Math.round(metric.totalTime),
      success: metric.success,
      file_size: metric.fileSize,
      custom_parameters: {
        connection_type: metric.connectionType,
      },
    });
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        metrics: this.metrics.slice(-500), // Keep last 500 in storage
        budgets: Array.from(this.budgets.entries()),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[PerformanceMonitor] Failed to save to storage:', e);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = data.metrics || [];
        this.budgets = new Map(data.budgets || []);
      }
    } catch (e) {
      console.error('[PerformanceMonitor] Failed to load from storage:', e);
    }
  }
}

/**
 * Performance Timer for tracking operations
 */
export class PerformanceTimer {
  private toolId: string;
  private monitor: PerformanceMonitor;
  private startTime: number;
  private loadCompleteTime?: number;
  private interactions = 0;
  private firstInteractionTime?: number;
  private success = true;
  private error?: string;
  private fileSize?: number;
  private fileType?: string;

  constructor(toolId: string, monitor: PerformanceMonitor) {
    this.toolId = toolId;
    this.monitor = monitor;
    this.startTime = performance.now();
  }

  markLoadComplete(): void {
    this.loadCompleteTime = performance.now();
  }

  recordInteraction(): void {
    this.interactions++;
    if (!this.firstInteractionTime) {
      this.firstInteractionTime = performance.now();
    }
  }

  setFileInfo(size: number, type: string): void {
    this.fileSize = size;
    this.fileType = type;
  }

  markSuccess(): void {
    this.success = true;
    this.finish();
  }

  markError(error: string): void {
    this.success = false;
    this.error = error;
    this.finish();
  }

  private finish(): void {
    const endTime = performance.now();
    const loadTime = this.loadCompleteTime ? this.loadCompleteTime - this.startTime : 0;
    const processingTime = this.loadCompleteTime ? endTime - this.loadCompleteTime : endTime - this.startTime;

    this.monitor.recordMetric({
      toolId: this.toolId,
      loadTime,
      processingTime,
      totalTime: endTime - this.startTime,
      success: this.success,
      error: this.error,
      userInteractions: this.interactions,
      timeToFirstInteraction: this.firstInteractionTime
        ? this.firstInteractionTime - this.startTime
        : undefined,
      fileSize: this.fileSize,
      fileType: this.fileType,
    });
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Quick performance tracking helper
 */
export function trackToolPerformance<T>(
  toolId: string,
  operation: () => Promise<T>,
  options?: {
    fileSize?: number;
    fileType?: string;
    onComplete?: (metrics: PerformanceMetrics) => void;
  }
): Promise<T> {
  const timer = performanceMonitor.startTiming(toolId);

  if (options?.fileSize && options?.fileType) {
    timer.setFileInfo(options.fileSize, options.fileType);
  }

  return operation()
    .then((result) => {
      timer.markSuccess();
      return result;
    })
    .catch((error) => {
      timer.markError(error.message || 'Unknown error');
      throw error;
    });
}

/**
 * Set default performance budgets
 */
export function setDefaultPerformanceBudgets(): void {
  // Document tools
  performanceMonitor.setBudget({
    toolId: 'pdf-merge',
    maxLoadTime: 1000,
    maxProcessingTime: 5000,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  });

  performanceMonitor.setBudget({
    toolId: 'pdf-compress',
    maxLoadTime: 1000,
    maxProcessingTime: 3000,
    maxMemoryUsage: 50 * 1024 * 1024,
  });

  // Media tools
  performanceMonitor.setBudget({
    toolId: 'video-compressor',
    maxLoadTime: 2000,
    maxProcessingTime: 60000,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
  });

  performanceMonitor.setBudget({
    toolId: 'background-remover',
    maxLoadTime: 2000,
    maxProcessingTime: 30000,
    maxMemoryUsage: 200 * 1024 * 1024,
  });

  // AI tools
  performanceMonitor.setBudget({
    toolId: 'ocr',
    maxLoadTime: 3000,
    maxProcessingTime: 15000,
    maxMemoryUsage: 150 * 1024 * 1024,
  });

  performanceMonitor.setBudget({
    toolId: 'grammar-checker',
    maxLoadTime: 3000,
    maxProcessingTime: 5000,
    maxMemoryUsage: 100 * 1024 * 1024,
  });

  // Utility tools
  performanceMonitor.setBudget({
    toolId: 'qr-generator',
    maxLoadTime: 500,
    maxProcessingTime: 1000,
    maxMemoryUsage: 10 * 1024 * 1024,
  });

  performanceMonitor.setBudget({
    toolId: 'password-generator',
    maxLoadTime: 500,
    maxProcessingTime: 500,
    maxMemoryUsage: 5 * 1024 * 1024,
  });
}
