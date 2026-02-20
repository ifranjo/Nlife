/**
 * Advanced Reporting System for GEO Optimization
 *
 * Generates detailed reports, trend analysis, and comparative analytics
 * for AI traffic optimization without machine learning
 */

import { aiAnalytics } from './ai-analytics';
import { geoABTesting } from './geo-ab-testing';

// Configuration
export interface ReportingConfig {
  enabled: boolean;
  autoGenerate: boolean;
  notificationChannels: Array<'email' | 'slack' | 'webhook'>;
  retentionDays: number;
  exportFormats: Array<'json' | 'csv' | 'pdf'>;
}

// Executive Report Interface
export interface ExecutiveReport {
  date: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSessions: number;
    aiSessions: number;
    aiPercentage: string;
    aiTrafficGrowth: number;
    topPerformingTool: string;
    conversionRate: number;
    avgExtractionTime: number;
  };
  platformDistribution: Array<{
    platform: string;
    sessions: number;
    percentage: number;
    conversionRate: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  keyInsights: Array<{
    type: 'opportunity' | 'warning' | 'achievement';
    category: string;
    message: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    actionRequired?: boolean;
    action?: string;
  }>;
  recommendations: string[];
  generatedAt: string;
}

// Trend Analysis Interface
export interface TrendAnalysis {
  period: '7d' | '30d' | '90d';
  metrics: {
    traffic: TrendMetric[];
    conversions: TrendMetric[];
    extractionTime: TrendMetric[];
    byPlatform: Record<string, TrendMetric[]>;
  };
  patterns: Array<{
    type: 'growth' | 'decline' | 'seasonal' | 'anomaly';
    description: string;
    confidence: number;
    period: { start: string; end: string };
  }>;
  predictions: {
    nextWeek: number[];
    confidence: number;
    basedOnPattern: string;
  };
  generatedAt: string;
}

export interface TrendMetric {
  date: string;
  value: number;
  change: number; // percentage change from previous
  label: string;
}

// Comparative Analysis Interface
export interface ComparativeAnalysis {
  period: string;
  ourPerformance: {
    aiTraffic: number;
    citationRate: number;
    extractionSpeed: number;
    conversionRate: number;
  };
  benchmarks?: {
    industryAverage: Record<string, number>;
    topPerformers: Record<string, number>;
  };
  gapAnalysis: Array<{
    metric: string;
    ourValue: number;
    benchmarkValue: number;
    gap: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
}

class AdvancedReportingSystem {
  private config: ReportingConfig = {
    enabled: true,
    autoGenerate: true,
    notificationChannels: ['email'],
    retentionDays: 30,
    exportFormats: ['json', 'csv']
  };

  // Historical data storage
  private history: Array<{
    report: ExecutiveReport;
    timestamp: number;
  }> = [];

  /**
   * Generate executive report for the last 24 hours
   */
  generateExecutiveReport(): ExecutiveReport {
    const report = aiAnalytics.generateReport();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get historical data for comparison
    const historicalData = this.getHistoricalData(7); // 7 days

    // Calculate AI traffic growth
    const previousDayTraffic = this.getTrafficForDate(yesterday);
    const currentTraffic = report.summary.totalEvents;
    const aiTrafficGrowth = previousDayTraffic > 0
      ? ((currentTraffic - previousDayTraffic) / previousDayTraffic) * 100
      : 0;

    // Platform distribution with trends
    const platformDistribution = this.generatePlatformDistribution(report, historicalData);

    // Generate insights and recommendations
    const insights = this.generateInsights(report, historicalData);
    const recommendations = this.generateRecommendations(report, insights);

    const executiveReport: ExecutiveReport = {
      date: now.toISOString().split('T')[0],
      period: {
        start: yesterday.toISOString(),
        end: now.toISOString()
      },
      summary: {
        totalSessions: report.summary.totalEvents,
        aiSessions: report.traffic.aiSessions || 0,
        aiPercentage: report.summary.totalEvents > 0
          ? `${((report.traffic.aiSessions || 0 / report.summary.totalEvents) * 100).toFixed(1)}%`
          : '0%',
        aiTrafficGrowth: parseFloat(aiTrafficGrowth.toFixed(1)),
        topPerformingTool: this.getTopPerformingTool(report),
        conversionRate: report.summary.conversionRate * 100,
        avgExtractionTime: report.extraction.averageExtractionTime || 0
      },
      platformDistribution,
      keyInsights: insights,
      recommendations,
      generatedAt: now.toISOString()
    };

    // Store in history
    this.history.push({
      report: executiveReport,
      timestamp: now.getTime()
    });

    // Clean old history
    this.cleanupOldHistory();

    return executiveReport;
  }

  /**
   * Generate trend analysis for a given period
   */
  generateTrendAnalysis(period: '7d' | '30d' | '90d' = '30d'): TrendAnalysis {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const historicalData = this.getHistoricalData(days);

    const trafficMetrics: TrendMetric[] = [];
    const conversionMetrics: TrendMetric[] = [];
    const extractionTimeMetrics: TrendMetric[] = [];
    const byPlatform: Record<string, TrendMetric[]> = {};

    // Calculate daily metrics
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = historicalData.filter(h =>
        new Date(h.report.date).toISOString().split('T')[0] === dateStr
      );

      if (dayData.length > 0) {
        const avgTraffic = dayData.reduce((sum, h) => sum + h.report.summary.totalSessions, 0) / dayData.length;
        const avgConversion = dayData.reduce((sum, h) => sum + h.report.summary.conversionRate, 0) / dayData.length;
        const avgExtraction = dayData.reduce((sum, h) => sum + h.report.summary.avgExtractionTime, 0) / dayData.length;

        trafficMetrics.push({
          date: dateStr,
          value: Math.round(avgTraffic),
          change: this.calculateChange(trafficMetrics, avgTraffic),
          label: `${Math.round(avgTraffic)} sessions`
        });

        conversionMetrics.push({
          date: dateStr,
          value: parseFloat(avgConversion.toFixed(2)),
          change: this.calculateChange(conversionMetrics, avgConversion),
          label: `${avgConversion.toFixed(2)}% conversion`
        });

        extractionTimeMetrics.push({
          date: dateStr,
          value: Math.round(avgExtraction),
          change: this.calculateChange(extractionTimeMetrics, avgExtraction),
          label: `${Math.round(avgExtraction)}ms extraction`
        });

        // Platform metrics
        this.processPlatformMetrics(dayData, byPlatform, dateStr);
      }
    }

    // Detect patterns
    const patterns = this.detectPatterns(trafficMetrics, conversionMetrics);

    // Simple prediction based on recent trends
    const predictions = this.generatePredictions(trafficMetrics);

    return {
      period,
      metrics: {
        traffic: trafficMetrics,
        conversions: conversionMetrics,
        extractionTime: extractionTimeMetrics,
        byPlatform
      },
      patterns,
      predictions,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate comparative analysis with benchmarks
   */
  generateComparativeAnalysis(): ComparativeAnalysis {
    const report = aiAnalytics.generateReport();
    const benchmarkData = this.getBenchmarkData();

    const ourPerformance = {
      aiTraffic: report.traffic.aiSessions || 0,
      citationRate: report.extraction.citationRate || 0,
      extractionSpeed: report.extraction.averageExtractionTime || 0,
      conversionRate: report.summary.conversionRate || 0
    };

    const gapAnalysis = this.calculateGaps(ourPerformance, benchmarkData);
    const recommendations = this.generateGapRecommendations(gapAnalysis);

    return {
      period: '30d',
      ourPerformance,
      benchmarks: benchmarkData,
      gapAnalysis,
      recommendations
    };
  }

  /**
   * Export data to multiple formats
   */
  exportToCSV(data: TrendAnalysis | ExecutiveReport): string {
    if ('period' in data && 'metrics' in data) {
      // TrendAnalysis
      const rows: string[] = [];
      rows.push(['date', 'metric_type', 'value', 'change', 'label'].join(','));

      data.metrics.traffic.forEach(metric => {
        rows.push([metric.date, 'traffic', metric.value, metric.change, metric.label].join(','));
      });

      data.metrics.conversions.forEach(metric => {
        rows.push([metric.date, 'conversions', metric.value, metric.change, metric.label].join(','));
      });

      data.metrics.extractionTime.forEach(metric => {
        rows.push([metric.date, 'extraction_time', metric.value, metric.change, metric.label].join(','));
      });

      return rows.join('\n');
    } else {
      // ExecutiveReport
      const rows: string[] = [];
      rows.push(['date', 'platform', 'sessions', 'percentage', 'conversion_rate', 'trend'].join(','));

      data.platformDistribution.forEach(platform => {
        rows.push([
          data.date,
          platform.platform,
          platform.sessions,
          platform.percentage,
          platform.conversionRate,
          platform.trend
        ].join(','));
      });

      return rows.join('\n');
    }
  }

  exportToJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get historical data for trend analysis
   */
  private getHistoricalData(days: number): Array<{
    report: ExecutiveReport;
    timestamp: number;
  }> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.history.filter(h => h.timestamp > cutoff);
  }

  /**
   * Get traffic for specific date
   */
  private getTrafficForDate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    const historicalData = this.history.filter(h =>
      new Date(h.report.date).toISOString().split('T')[0] === dateStr
    );
    return historicalData.reduce((sum, h) => sum + h.report.summary.totalSessions, 0);
  }

  /**
   * Generate platform distribution with trend analysis
   */
  private generatePlatformDistribution(
    report: any,
    historicalData: any[]
  ): ExecutiveReport['platformDistribution'] {
    const platforms: ExecutiveReport['platformDistribution'] = [];
    const platformData = Object.entries(report.traffic.byPlatform || {});

    platformData.forEach(([platform, sessions]: [string, any]) => {
      if (platform === 'Unknown' || platform === 'None') return;

      const percentage = report.summary.totalEvents > 0
        ? (sessions / report.summary.totalEvents) * 100
        : 0;

      const conversionRate = report.platformInsights?.[platform]?.conversionRate || 0;

      // Calculate trend based on last 7 days
      const trend = this.calculatePlatformTrend(platform, historicalData);

      platforms.push({
        platform,
        sessions,
        percentage: parseFloat(percentage.toFixed(1)),
        conversionRate: parseFloat((conversionRate * 100).toFixed(1)),
        trend
      });
    });

    return platforms.sort((a, b) => b.sessions - a.sessions);
  }

  /**
   * Calculate trend for platform
   */
  private calculatePlatformTrend(
    platform: string,
    historicalData: any[]
  ): 'up' | 'down' | 'stable' {
    if (historicalData.length < 2) return 'stable';

    const recent = historicalData.slice(-3); // Last 3 days
    const sessions = recent.map(h => {
      const platformData = h.report.platformDistribution.find(p => p.platform === platform);
      return platformData ? platformData.sessions : 0;
    });

    if (sessions.every(s => s === 0)) return 'stable';

    const firstWeekAvg = sessions.slice(0, Math.floor(sessions.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(sessions.length / 2);
    const secondWeekAvg = sessions.slice(Math.floor(sessions.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(sessions.length / 2);

    if (secondWeekAvg > firstWeekAvg * 1.1) return 'up';
    if (secondWeekAvg < firstWeekAvg * 0.9) return 'down';
    return 'stable';
  }

  /**
   * Generate insights from data
   */
  private generateInsights(
    report: any,
    historicalData: any[]
  ): ExecutiveReport['keyInsights'] {
    const insights: ExecutiveReport['keyInsights'] = [];

    // High performers
    const topPlatforms = Object.entries(report.traffic.byPlatform || {})
      .filter(([name]) => name !== 'Unknown' && name !== 'None')
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 2);

    topPlatforms.forEach(([platform, sessions]) => {
      insights.push({
        type: 'achievement',
        category: 'Platform Performance',
        message: `${platform} showing strong performance with ${sessions} sessions`,
        impact: 'high',
        actionRequired: false
      });
    });

    // Low extraction rate warning
    if (report.extraction.citationRate < 0.15) {
      insights.push({
        type: 'warning',
        category: 'Content Extraction',
        message: 'Citation rate below 15% - consider schema optimization',
        impact: 'medium',
        actionRequired: true,
        action: 'Add FAQPage schema markup to underperforming pages'
      });
    }

    // Opportunities
    if (report.traffic.aiSessions > 0 && report.summary.conversionRate < 0.05) {
      insights.push({
        type: 'opportunity',
        category: 'Conversion Optimization',
        message: 'High AI traffic but low conversion rate',
        impact: 'high',
        actionRequired: true,
        action: 'Implement A/B testing for conversion optimization'
      });
    }

    return insights;
  }

  /**
   * Generate recommendations based on insights
   */
  private generateRecommendations(
    report: any,
    insights: ExecutiveReport['keyInsights']
  ): string[] {
    const recommendations: string[] = [];

    insights.forEach(insight => {
      if (insight.action) {
        recommendations.push(insight.action);
      }
    });

    // Platform-specific recommendations
    Object.entries(report.platformInsights || {}).forEach(([platform, data]: [string, any]) => {
      if (data.conversionRate < 0.03) {
        recommendations.push(`Optimize content for ${platform} - consider platform-specific adaptations`);
      }
    });

    // General recommendations
    if (report.traffic.aiSessions > 100) {
      recommendations.push('Scale successful tools - create variations for different use cases');
    }

    if (report.extraction.averageExtractionTime > 2000) {
      recommendations.push('Optimize schema markup to reduce extraction time');
    }

    return recommendations;
  }

  /**
   * Get top performing tool
   */
  private getTopPerformingTool(report: any): string {
    const toolTraffic = Object.entries(report.traffic.byTool || {});
    if (toolTraffic.length === 0) return 'None';

    return toolTraffic.sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(metrics: TrendMetric[], currentValue: number): number {
    if (metrics.length === 0) return 0;
    const previous = metrics[metrics.length - 1].value;
    if (previous === 0) return 0;
    return ((currentValue - previous) / previous) * 100;
  }

  /**
   * Process platform metrics for trends
   */
  private processPlatformMetrics(
    dayData: any[],
    byPlatform: Record<string, TrendMetric[]>,
    dateStr: string
  ): void {
    const platformData: Record<string, number> = {};

    dayData.forEach(h => {
      h.report.platformDistribution.forEach(p => {
        platformData[p.platform] = (platformData[p.platform] || 0) + p.sessions;
      });
    });

    Object.entries(platformData).forEach(([platform, sessions]) => {
      if (!byPlatform[platform]) {
        byPlatform[platform] = [];
      }

      byPlatform[platform].push({
        date: dateStr,
        value: sessions,
        change: this.calculateChange(byPlatform[platform], sessions),
        label: `${sessions} sessions`
      });
    });
  }

  /**
   * Detect patterns in metrics
   */
  private detectPatterns(
    trafficMetrics: TrendMetric[],
    conversionMetrics: TrendMetric[]
  ) {
    const patterns: TrendAnalysis['patterns'] = [];

    // Check for growth pattern
    const recentGrowth = trafficMetrics.slice(-3).every(m => m.change > 5);
    if (recentGrowth) {
      patterns.push({
        type: 'growth',
        description: 'Consistent traffic growth over last 3 days',
        confidence: 0.8,
        period: {
          start: trafficMetrics[trafficMetrics.length - 3].date,
          end: trafficMetrics[trafficMetrics.length - 1].date
        }
      });
    }

    // Check for anomalies
    const avgTraffic = trafficMetrics.reduce((sum, m) => sum + m.value, 0) / trafficMetrics.length;
    const anomalies = trafficMetrics.filter(m => Math.abs(m.value - avgTraffic) > avgTraffic * 0.5);

    anomalies.forEach(anomaly => {
      patterns.push({
        type: 'anomaly',
        description: `Unusual traffic spike on ${anomaly.date}`,
        confidence: 0.9,
        period: {
          start: anomaly.date,
          end: anomaly.date
        }
      });
    });

    return patterns;
  }

  /**
   * Generate simple predictions based on recent trends
   */
  private generatePredictions(trafficMetrics: TrendMetric[]) {
    if (trafficMetrics.length < 3) {
      return {
        nextWeek: [],
        confidence: 0,
        basedOnPattern: 'insufficient data'
      };
    }

    // Simple linear extrapolation based on last 3 data points
    const recent = trafficMetrics.slice(-3);
    const avgGrowth = recent.reduce((sum, m, i) => {
      if (i === 0) return sum;
      return sum + m.change;
    }, 0) / (recent.length - 1);

    const lastValue = recent[recent.length - 1].value;
    const predictions: number[] = [];

    for (let i = 1; i <= 7; i++) {
      const predicted = lastValue * Math.pow(1 + avgGrowth / 100, i);
      predictions.push(Math.round(predicted));
    }

    return {
      nextWeek: predictions,
      confidence: Math.min(Math.abs(avgGrowth) / 10, 0.8),
      basedOnPattern: avgGrowth > 0 ? 'growth trend' : 'decline trend'
    };
  }

  /**
   * Get benchmark data (simulated industry benchmarks)
   */
  private getBenchmarkData(): ComparativeAnalysis['benchmarks'] {
    return {
      industryAverage: {
        aiTraffic: 500,
        citationRate: 0.12,
        extractionSpeed: 1500,
        conversionRate: 0.08
      },
      topPerformers: {
        aiTraffic: 2000,
        citationRate: 0.25,
        extractionSpeed: 800,
        conversionRate: 0.15
      }
    };
  }

  /**
   * Calculate gaps between our performance and benchmarks
   */
  private calculateGaps(
    ourPerformance: ComparativeAnalysis['ourPerformance'],
    benchmarks: ComparativeAnalysis['benchmarks']
  ): ComparativeAnalysis['gapAnalysis'] {
    return [
      {
        metric: 'aiTraffic',
        ourValue: ourPerformance.aiTraffic,
        benchmarkValue: benchmarks!.industryAverage.aiTraffic,
        gap: ((benchmarks!.industryAverage.aiTraffic - ourPerformance.aiTraffic) / benchmarks!.industryAverage.aiTraffic) * 100,
        priority: ourPerformance.aiTraffic < benchmarks!.industryAverage.aiTraffic ? 'high' : 'low'
      },
      {
        metric: 'citationRate',
        ourValue: ourPerformance.citationRate,
        benchmarkValue: benchmarks!.industryAverage.citationRate,
        gap: ((benchmarks!.industryAverage.citationRate - ourPerformance.citationRate) / benchmarks!.industryAverage.citationRate) * 100,
        priority: ourPerformance.citationRate < benchmarks!.industryAverage.citationRate ? 'medium' : 'low'
      }
    ];
  }

  /**
   * Generate recommendations based on gaps
   */
  private generateGapRecommendations(gaps: ComparativeAnalysis['gapAnalysis']): string[] {
    const recommendations: string[] = [];

    gaps.forEach(gap => {
      if (gap.priority === 'high') {
        recommendations.push(`Improve ${gap.metric} - currently ${gap.ourValue} vs ${gap.benchmarkValue} average`);
      }
    });

    return recommendations;
  }

  /**
   * Clean history older than retention period
   */
  private cleanupOldHistory(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.history = this.history.filter(h => h.timestamp > cutoff);
  }

  /**
   * Configure reporting system
   */
  configure(config: Partial<ReportingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get trend analysis for a specific metric
   */
  getMetricTrend(metric: string, days: number = 30): TrendMetric[] {
    const historicalData = this.getHistoricalData(days);
    const trend: TrendMetric[] = [];

    historicalData.forEach(data => {
      let value = 0;

      switch (metric) {
        case 'totalSessions':
          value = data.report.summary.totalSessions;
          break;
        case 'aiSessions':
          value = data.report.summary.aiSessions;
          break;
        case 'conversionRate':
          value = data.report.summary.conversionRate;
          break;
      }

      trend.push({
        date: data.report.date,
        value,
        change: this.calculateChange(trend, value),
        label: `${value}`
      });
    });

    return trend;
  }
}

// Export singleton instance
export const advancedReporting = new AdvancedReportingSystem();
export type { ExecutiveReport, TrendAnalysis, ComparativeAnalysis, TrendMetric };
