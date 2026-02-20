/**
 * GEO Feedback Loops & Continuous Improvement System
 *
 * Automated system for analyzing AI traffic patterns and generating
 * actionable insights for GEO optimization improvements
 */

import { aiAnalytics, type AnalyticsReport } from './ai-analytics';
import { geoABTesting, type ABTestResults } from './geo-ab-testing';
import { adaptationEngine, type AdaptationRules } from './dynamic-adaptation';

// Feedback Types
interface GEOFeedback {
  id: string;
  type: 'high_performer' | 'underperformer' | 'opportunity' | 'issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: Record<string, number>;
  recommendations: GEORecommendation[];
  timestamp: number;
  autoApplied?: boolean;
}

interface GEORecommendation {
  id: string;
  action: string;
  priority: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  category: 'content' | 'technical' | 'structure' | 'performance';
  autoApplicable?: boolean;
  applied?: boolean;
}

// Optimization Rules
interface AutoOptimizationRule {
  id: string;
  name: string;
  condition: (report: AnalyticsReport, history: AnalyticsReport[]) => boolean;
  actions: Array<{
    type: 'adaptation' | 'system_prompt' | 'configuration';
    target: string;
    value: any;
    reason: string;
  }>;
  cooldownHours: number; // Prevent too frequent changes
  lastApplied?: number;
  successRate?: number; // Track effectiveness
}

// Historical Performance Tracking
interface PerformanceHistory {
  reports: AnalyticsReport[];
  appliedChanges: Array<{
    timestamp: number;
    change: any;
    beforeMetrics: Record<string, number>;
    afterMetrics: Record<string, number>;
    improvement: number;
  }>;
}

class GEOFeedbackSystem {
  private static instance: GEOFeedbackSystem;
  private feedbackHistory: GEOFeedback[] = [];
  private optimizationRules: Map<string, AutoOptimizationRule> = new Map();
  private performanceHistory: PerformanceHistory = {
    reports: [],
    appliedChanges: []
  };
  private isInitialized = false;

  /**
   * Private constructor for singleton
   */
  private constructor() {
    this.initializeRules();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GEOFeedbackSystem {
    if (!GEOFeedbackSystem.instance) {
      GEOFeedbackSystem.instance = new GEOFeedbackSystem();
    }
    return GEOFeedbackSystem.instance;
  }

  /**
   * Initialize auto-optimization rules
   */
  private initializeRules(): void {
    // Rule 1: Boost extraction for low-performing platforms
    this.addRule({
      id: 'boost_low_extraction_platforms',
      name: 'Boost Low Extraction Platforms',
      condition: (report) => {
        const extractionRate = parseFloat(report.extraction.citationRate?.toString() || '0');
        return extractionRate < 0.15; // Less than 15% extraction
      },
      actions: [
        {
          type: 'adaptation',
          target: 'contentFormat.emphasizeKeywords',
          value: true,
          reason: 'Low extraction rate detected, emphasizing keywords for better AI detection'
        },
        {
          type: 'adaptation',
          target: 'visualPresentation.highlightAnswers',
          value: true,
          reason: 'Highlighting answer sections for better extraction'
        }
      ],
      cooldownHours: 24
    });

    // Rule 2: Optimize for dominant platform
    this.addRule({
      id: 'optimize_for_dominant_platform',
      name: 'Optimize for Dominant Platform',
      condition: (report) => {
        const platforms = Object.values(report.traffic.byPlatform || {});
        if (platforms.length === 0) return false;

        const total = platforms.reduce((sum, count) => sum + count, 0);
        const maxShare = Math.max(...platforms) / total;

        return maxShare > 0.5; // Single platform dominates >50%
      },
      actions: [
        {
          type: 'adaptation',
          target: 'custom.platform_optimization',
          value: 'dominant_platform',
          reason: 'Detected dominant platform, applying platform-specific optimizations'
        }
      ],
      cooldownHours: 48
    });

    // Rule 3: Improve schema for slow extraction
    this.addRule({
      id: 'enhance_schema_for_speed',
      name: 'Enhance Schema for Speed',
      condition: (report) => {
        const avgTime = report.extraction.averageExtractionTime || 0;
        return avgTime > 2000; // More than 2 seconds
      },
      actions: [
        {
          type: 'system_prompt',
          target: 'schema_optimization',
          value: 'minimal',
          reason: 'High extraction time detected, optimizing schema structure'
        }
      ],
      cooldownHours: 24
    });

    // Rule 4: Adjust content length based on engagement
    this.addRule({
      id: 'optimize_content_length',
      name: 'Optimize Content Length',
      condition: (report, history) => {
        if (history.length < 2) return false;

        const previous = history[history.length - 2];
        const timeOnPage = report.summary.totalEvents > 0 ?
          (report.summary.totalEvents / Math.max(report.traffic.aiSessions || 1, 1)) : 0;
        const prevTimeOnPage = previous.summary.totalEvents > 0 ?
          (previous.summary.totalEvents / Math.max(previous.traffic.aiSessions || 1, 1)) : 0;

        return timeOnPage < prevTimeOnPage * 0.7; // 30% drop in engagement
      },
      actions: [
        {
          type: 'adaptation',
          target: 'contentFormat.expandTLDR',
          value: false,
          reason: 'Decreased engagement detected, presenting more concise content'
        }
      ],
      cooldownHours: 48
    });

    // Rule 5: Boost underperforming platforms
    this.addRule({
      id: 'boost_underperforming_platforms',
      name: 'Boost Underperforming Platforms',
      condition: (report) => {
        const platforms = report.platformInsights || {};
        const conversionRates = Object.entries(platforms)
          .map(([platform, data]) => ({
            platform,
            rate: (data as any).conversionRate || 0
          }))
          .filter(p => p.platform !== 'Unknown' && p.platform !== 'None');

        if (conversionRates.length === 0) return false;

        const avgRate = conversionRates.reduce((sum, p) => sum + p.rate, 0) / conversionRates.length;
        const lowPerformers = conversionRates.filter(p => p.rate < avgRate * 0.5);

        return lowPerformers.length > 0;
      },
      actions: [
        {
          type: 'adaptation',
          target: 'custom.equalize_platforms',
          value: true,
          reason: 'Detected underperforming platforms, applying equalization strategies'
        }
      ],
      cooldownHours: 72
    });
  }

  /**
   * Add an optimization rule
   */
  addRule(rule: AutoOptimizationRule): void {
    this.optimizationRules.set(rule.id, rule);
  }

  /**
   * Initialize the feedback system
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Start monitoring analytics
    this.startAnalyticsMonitoring();

    // Setup periodic review
    this.setupPeriodicReview();

    this.isInitialized = true;
    console.log('🔄 GEO Feedback System initialized');
  }

  /**
   * Start monitoring analytics reports
   */
  private startAnalyticsMonitoring(): void {
    // Listen for analytics reports
    document.addEventListener('ai_analytics_report', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.analyzeReport(customEvent.detail);
    });

    // Also periodically check (every 5 minutes)
    setInterval(() => {
      const report = aiAnalytics.generateReport();
      this.analyzeReport(report);
    }, 300000);
  }

  /**
   * Setup periodic review of feedback
   */
  private setupPeriodicReview(): void {
    // Daily summary
    setInterval(() => {
      this.generateDailySummary();
    }, 86400000); // 24 hours

    // Weekly deep analysis
    setInterval(() => {
      this.generateWeeklyInsights();
    }, 604800000); // 7 days
  }

  /**
   * Analyze analytics report and generate feedback
   */
  analyzeReport(report: AnalyticsReport): GEOFeedback[] {
    const feedback: GEOFeedback[] = [];

    // Check for high performers (top 10%)
    feedback.push(...this.identifyHighPerformers(report));

    // Check for underperformers (bottom 20%)
    feedback.push(...this.identifyUnderperformers(report));

    // Detect opportunities
    feedback.push(...this.identifyOpportunities(report));

    // Detect issues
    feedback.push(...this.detectIssues(report));

    // Apply auto-optimizations
    this.evaluateAutoOptimizations(report);

    // Store in history
    this.performanceHistory.reports.push(report);

    // Keep only last 30 reports
    if (this.performanceHistory.reports.length > 30) {
      this.performanceHistory.reports = this.performanceHistory.reports.slice(-30);
    }

    return feedback;
  }

  /**
   * Identify high-performing content
   */
  private identifyHighPerformers(report: AnalyticsReport): GEOFeedback[] {
    const feedback: GEOFeedback[] = [];

    // Top converting platforms
    Object.entries(report.platformInsights).forEach(([platform, data]) => {
      const conversionRate = (data as any).conversionRate || 0;
      if (conversionRate > 0.3) { // >30% conversion
        feedback.push({
          id: `high_performer_platform_${platform}_${Date.now()}`,
          type: 'high_performer',
          severity: 'medium',
          title: `${platform} Performance Excellence`,
          description: `${platform} is showing exceptional conversion rates at ${(conversionRate * 100).toFixed(1)}%. Consider expanding content targeting this platform.`,
          metrics: {
            conversionRate,
            sessions: (data as any).sessions || 0
          },
          recommendations: [
            {
              id: `expand_${platform.toLowerCase()}_content`,
              action: `Create more content specifically optimized for ${platform}`,
              priority: 7,
              impact: 'high',
              effort: 'medium',
              category: 'content'
            }
          ],
          timestamp: Date.now()
        });
      }
    });

    return feedback;
  }

  /**
   * Identify underperforming content
   */
  private identifyUnderperformers(report: AnalyticsReport): GEOFeedback[] {
    const feedback: GEOFeedback[] = [];

    Object.entries(report.platformInsights).forEach(([platform, data]) => {
      const conversionRate = (data as any).conversionRate || 0;

      if (conversionRate < 0.05) { // <5% conversion
        feedback.push({
          id: `underperformer_platform_${platform}_${Date.now()}`,
          type: 'underperformer',
          severity: conversionRate < 0.02 ? 'high' : 'medium',
          title: `${platform} Underperformance`,
          description: `${platform} conversion rate is low at ${(conversionRate * 100).toFixed(1)}%. Review and optimize content for this platform.`,
          metrics: {
            conversionRate,
            sessions: (data as any).sessions || 0
          },
          recommendations: [
            {
              id: `analyze_${platform.toLowerCase()}_behavior`,
              action: `Analyze ${platform} behavior patterns and adjust content strategy`,
              priority: 9,
              impact: 'high',
              effort: 'high',
              category: 'content'
            },
            {
              id: `test_${platform.toLowerCase()}_variations`,
              action: `Run A/B tests for ${platform}-specific optimizations`,
              priority: 8,
              impact: 'medium',
              effort: 'medium',
              category: 'technical'
            }
          ],
          timestamp: Date.now()
        });
      }
    });

    return feedback;
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOpportunities(report: AnalyticsReport): GEOFeedback[] {
    const feedback: GEOFeedback[] = [];

    // High traffic, low extraction pages
    const underExtracted = report.topPages.filter(page => {
      const extractionCount = page.count;
      const threshold = Math.max(...report.topPages.map(p => p.count)) * 0.3; // Bottom 30%
      return extractionCount < threshold;
    });

    underExtracted.forEach(page => {
      feedback.push({
        id: `extraction_opp_${page.url}_${Date.now()}`,
        type: 'opportunity',
        severity: 'medium',
        title: 'Extraction Improvement Opportunity',
        description: `Page ${page.url} has high traffic but low AI extraction rate. Implement schema markup and answer-first formatting.`,
        metrics: {
          pageViews: page.count,
          extractionRate: page.count / Math.max(report.summary.totalEvents || 1, 1)
        },
        recommendations: [
          {
            id: `add_schema_${page.url}`,
            action: `Add structured data (FAQPage, HowTo) to ${page.url}`,
            priority: 8,
            impact: 'high',
            effort: 'low',
            category: 'technical',
            autoApplicable: true
          },
          {
            id: `add_answer_box_${page.url}`,
            action: `Add answer-first content block to ${page.url}`,
            priority: 7,
            impact: 'high',
            effort: 'medium',
            category: 'content',
            autoApplicable: false
          }
        ],
        timestamp: Date.now()
      });
    });

    return feedback;
  }

  /**
   * Detect technical issues
   */
  private detectIssues(report: AnalyticsReport): GEOFeedback[] {
    const feedback: GEOFeedback[] = [];

    // Check for slow extraction times
    const avgExtractionTime = report.extraction.averageExtractionTime || 0;
    if (avgExtractionTime > 3000) { // >3 seconds
      feedback.push({
        id: `slow_extraction_${Date.now()}`,
        type: 'issue',
        severity: avgExtractionTime > 5000 ? 'critical' : 'high',
        title: 'Slow AI Content Extraction',
        description: `Average extraction time is ${avgExtractionTime.toFixed(0)}ms, which may cause AI platforms to skip content.`,
        metrics: {
          avgExtractionTime,
          threshold: 3000
        },
        recommendations: [
          {
            id: 'optimize_schema_markup',
            action: 'Optimize JSON-LD schema markup to reduce parsing complexity',
            priority: 10,
            impact: 'critical',
            effort: 'medium',
            category: 'technical',
            autoApplicable: true
          },
          {
            id: 'streamline_dom',
            action: 'Simplify DOM structure and reduce nested elements',
            priority: 9,
            impact: 'high',
            effort: 'high',
            category: 'technical'
          }
        ],
        timestamp: Date.now()
      });
    }

    // Check for missing platform opportunities
    const platforms = Object.keys(report.platformInsights || {});
    if (!platforms.includes('Claude')) {
      feedback.push({
        id: 'missing_claude_optimization',
        type: 'opportunity',
        severity: 'medium',
        title: 'No Claude Traffic Detected',
        description: 'No Claude AI traffic detected. Consider optimizing content for Claude with constitutional AI signals.',
        metrics: {},
        recommendations: [
          {
            id: 'add_claude_content',
            action: 'Add content emphasizing safety, accuracy, and ethical AI alignment',
            priority: 6,
            impact: 'medium',
            effort: 'low',
            category: 'content'
          }
        ],
        timestamp: Date.now()
      });
    }

    return feedback;
  }

  /**
   * Evaluate and apply auto-optimizations
   */
  private evaluateAutoOptimizations(report: AnalyticsReport): void {
    this.optimizationRules.forEach((rule) => {
      if (!this.shouldApplyRule(rule)) return;

      if (rule.condition(report, this.performanceHistory.reports)) {
        this.applyRuleActions(rule, report);
      }
    });
  }

  /**
   * Check if rule should be applied (cooldown, etc.)
   */
  private shouldApplyRule(rule: AutoOptimizationRule): boolean {
    if (!rule.lastApplied) return true;

    const hoursSinceLastApply = (Date.now() - rule.lastApplied) / (1000 * 60 * 60);
    return hoursSinceLastApply >= rule.cooldownHours;
  }

  /**
   * Apply rule actions
   */
  private applyRuleActions(rule: AutoOptimizationRule, report: AnalyticsReport): void {
    console.log(`⚙️ Applying auto-optimization: ${rule.name}`);

    const beforeMetrics: Record<string, number> = {};

    rule.actions.forEach(action => {
      switch (action.type) {
        case 'adaptation':
          beforeMetrics[action.target] = this.getCurrentAdaptationValue(action.target);
          this.applyAdaptationChange(action.target, action.value);
          break;

        case 'system_prompt':
          this.applySystemPrompt(action.target, action.value);
          break;

        case 'configuration':
          this.applyConfiguration(action.target, action.value);
          break;
      }

      console.log(`  → ${action.reason}`);
    });

    // Store in history
    this.performanceHistory.appliedChanges.push({
      timestamp: Date.now(),
      change: rule,
      beforeMetrics,
      afterMetrics: {}, // Will be filled on next report
      improvement: 0
    });

    rule.lastApplied = Date.now();
  }

  /**
   * Get current adaptation value
   */
  private getCurrentAdaptationValue(target: string): number {
    const adaptations = adaptationEngine.getCurrentAdaptations();
    return this.deepGet(adaptations, target) ? 1 : 0;
  }

  /**
   * Apply adaptation change
   */
  private applyAdaptationChange(target: string, value: any): void {
    // Parse dot notation (e.g., "contentFormat.emphasizeKeywords")
    const parts = target.split('.');
    const root = parts[0];
    const key = parts.slice(1).join('.');

    const adaptations: Partial<AdaptationRules> = {};
    this.deepSet(adaptations, target, value);

    adaptationEngine.forceAdaptations(adaptations);
  }

  /**
   * Apply system prompt change
   */
  private applySystemPrompt(target: string, value: any): void {
    // Store in local storage for persistence
    try {
      const prompts = JSON.parse(localStorage.getItem('geo_system_prompts') || '{}');
      prompts[target] = value;
      localStorage.setItem('geo_system_prompts', JSON.stringify(prompts));
    } catch (error) {
      console.warn('Failed to store system prompt:', error);
    }
  }

  /**
   * Apply configuration change
   */
  private applyConfiguration(target: string, value: any): void {
    // Configuration changes would be applied here
    console.log('Applying configuration:', target, value);
  }

  /**
   * Deep get value from object
   */
  private deepGet(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Deep set value in object
   */
  private deepSet(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Generate daily summary
   */
  private generateDailySummary(): void {
    const recentReports = this.performanceHistory.reports.slice(-24); // Last 24 hours
    if (recentReports.length === 0) return;

    const summary = {
      date: new Date().toISOString().split('T')[0],
      totalSessions: recentReports.reduce((sum, r) => sum + (r.traffic.aiSessions || 0), 0),
      topPlatform: this.getTopPlatform(recentReports),
      improvements: this.performanceHistory.appliedChanges.slice(-10),
      keyInsights: this.getKeyInsights(recentReports)
    };

    // Store summary
    try {
      const summaries = JSON.parse(localStorage.getItem('geo_daily_summaries') || '[]');
      summaries.push(summary);

      // Keep last 30 days
      if (summaries.length > 30) {
        summaries.splice(0, summaries.length - 30);
      }

      localStorage.setItem('geo_daily_summaries', JSON.stringify(summaries));
    } catch (error) {
      console.warn('Failed to store daily summary:', error);
    }

    console.log('📊 Daily summary generated:', summary);
  }

  /**
   * Generate weekly insights
   */
  private generateWeeklyInsights(): void {
    const recentReports = this.performanceHistory.reports.slice(-168); // Last 7 days
    if (recentReports.length < 7) return;

    const insights = {
      week: this.getWeekNumber(),
      trend: this.calculateTrend(recentReports),
      platformGrowth: this.calculatePlatformGrowth(recentReports),
      bestPerformingPages: this.getBestPerformingPages(recentReports),
      improvementEffectiveness: this.calculateImprovementEffectiveness()
    };

    console.log('📈 Weekly insights:', insights);

    // Could trigger email report, update strategy documents, etc.
  }

  /**
   * Get top platform
   */
  private getTopPlatform(reports: AnalyticsReport[]): string {
    const platformCounts: Record<string, number> = {};

    reports.forEach(report => {
      Object.entries(report.platformInsights).forEach(([platform, data]) => {
        platformCounts[platform] = (platformCounts[platform] || 0) + ((data as any).sessions || 0);
      });
    });

    return Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';
  }

  /**
   * Calculate trend
   */
  private calculateTrend(reports: AnalyticsReport[]): 'up' | 'down' | 'stable' {
    if (reports.length < 7) return 'stable';

    const firstHalf = reports.slice(0, Math.floor(reports.length / 2));
    const secondHalf = reports.slice(Math.floor(reports.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + (r.summary.conversionRate || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + (r.summary.conversionRate || 0), 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  /**
   * Calculate platform growth
   */
  private calculatePlatformGrowth(reports: AnalyticsReport[]): Record<string, number> {
    const growth: Record<string, number> = {};
    const platforms = new Set<string>();

    reports.forEach(report => {
      Object.keys(report.platformInsights).forEach(p => platforms.add(p));
    });

    platforms.forEach(platform => {
      const platformReports = reports.map(r => {
        const data = r.platformInsights[platform] as any;
        return data?.sessions || 0;
      });

      if (platformReports.length >= 2) {
        const first = platformReports[0];
        const last = platformReports[platformReports.length - 1];
        growth[platform] = first > 0 ? (last - first) / first : 0;
      }
    });

    return growth;
  }

  /**
   * Get best performing pages
   */
  private getBestPerformingPages(reports: AnalyticsReport[]): Array<{ url: string; conversions: number }> {
    const pageConversions: Record<string, number> = {};

    reports.forEach(report => {
      report.conversions.forEach(conv => {
        pageConversions[conv.entryUrl] = (pageConversions[conv.entryUrl] || 0) + 1;
      });
    });

    return Object.entries(pageConversions)
      .map(([url, conversions]) => ({ url, conversions }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);
  }

  /**
   * Calculate improvement effectiveness
   */
  private calculateImprovementEffectiveness(): number {
    const improvements = this.performanceHistory.appliedChanges;
    if (improvements.length === 0) return 0;

    const successful = improvements.filter(imp => imp.improvement > 0).length;
    return successful / improvements.length;
  }

  /**
   * Get week number
   */
  private getWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((+now - +start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  /**
   * Get all feedback (sorted by severity and timestamp)
   */
  getRecentFeedback(limit: number = 10): GEOFeedback[] {
    return [...this.feedbackHistory]
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);
  }

  /**
   * Get specific type of feedback
   */
  getFeedbackByType(type: GEOFeedback['type']): GEOFeedback[] {
    return this.feedbackHistory.filter(f => f.type === type);
  }

  /**
   * Apply a specific recommendation
   */
  applyRecommendation(recommendationId: string): boolean {
    const feedback = this.feedbackHistory.find(f =>
      f.recommendations.some(r => r.id === recommendationId)
    );

    if (!feedback) return false;

    const recommendation = feedback.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return false;

    if (recommendation.applied) {
      console.log('Recommendation already applied:', recommendationId);
      return false;
    }

    // Apply the recommendation (implementation depends on action type)
    console.log('Applying recommendation:', recommendation.action);

    recommendation.applied = true;
    return true;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(priorityThreshold: number = 5): GEORecommendation[] {
    return this.feedbackHistory
      .flatMap(f => f.recommendations)
      .filter(r => !r.applied && r.priority >= priorityThreshold)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Export feedback data
   */
  exportFeedbackData(): string {
    return JSON.stringify({
      feedback: this.feedbackHistory,
      appliedChanges: this.performanceHistory.appliedChanges,
      rules: Array.from(this.optimizationRules.entries()),
      exported: Date.now()
    }, null, 2);
  }
}

// Export singleton
export const geoFeedbackSystem = GEOFeedbackSystem.getInstance();

// Auto-initialize
if (typeof window !== 'undefined') {
  const initFeedbackSystem = () => {
    geoFeedbackSystem.initialize();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedbackSystem);
  } else {
    initFeedbackSystem();
  }
}

// Export types
export type {
  GEOFeedback,
  GEORecommendation,
  AutoOptimizationRule,
  PerformanceHistory
};
