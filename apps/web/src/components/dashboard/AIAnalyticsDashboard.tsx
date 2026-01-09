/**
 * AI Analytics Dashboard
 *
 * Real-time dashboard for monitoring AI traffic, GEO optimization performance,
 * and A/B test results
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { AnalyticsReport } from '../../lib/ai-analytics';
import { aiAnalytics } from '../../lib/ai-analytics';
import { geoABTesting } from '../../lib/geo-ab-testing';

interface DashboardProps {
  className?: string;
}

interface DashboardMetrics {
  traffic: {
    totalSessions: number;
    aiSessions: number;
    aiPercentage: string;
  };
  platforms: Array<{
    name: string;
    sessions: number;
    percentage: string;
    conversionRate: string;
  }>;
  extraction: {
    citationRate: string;
    avgExtractionTime: string;
  };
  conversions: {
    total: number;
    rate: string;
    byPlatform: Record<string, number>;
  };
}

export default function AIAnalyticsDashboard({ className = '' }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    traffic: { totalSessions: 0, aiSessions: 0, aiPercentage: '0%' },
    platforms: [],
    extraction: { citationRate: '0%', avgExtractionTime: '0ms' },
    conversions: { total: 0, rate: '0%', byPlatform: {} }
  });

  const [isAutoUpdate, setIsAutoUpdate] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  /**
   * Refresh dashboard metrics
   */
  const refreshMetrics = useCallback(() => {
    const report = aiAnalytics.generateReport();

    // Process traffic metrics
    const totalSessions = report.summary.totalEvents;
    const aiSessions = report.traffic.aiSessions || 0;
    const aiPercentage = totalSessions > 0 ? `${((aiSessions / totalSessions) * 100).toFixed(1)}%` : '0%';

    // Process platform metrics
    const platforms = Object.entries(report.traffic.byPlatform || {})
      .filter(([name]) => name !== 'Unknown' && name !== 'None')
      .map(([name, sessions]) => {
        const percentage = report.summary.totalEvents > 0
          ? `${((sessions / report.summary.totalEvents) * 100).toFixed(1)}%`
          : '0%';

        const conversionRate = report.platformInsights[name]
          ? `${(report.platformInsights[name].conversionRate * 100).toFixed(1)}%`
          : '0%';

        return { name, sessions, percentage, conversionRate };
      })
      .sort((a, b) => b.sessions - a.sessions);

    // Process extraction metrics
    const citationRate = report.extraction.citationRate
      ? `${(report.extraction.citationRate * 100).toFixed(1)}%`
      : '0%';
    const avgExtractionTime = report.extraction.averageExtractionTime
      ? `${report.extraction.averageExtractionTime.toFixed(0)}ms`
      : '0ms';

    // Process conversions
    const conversions = {
      total: report.conversions.length,
      rate: `${(report.summary.conversionRate * 100).toFixed(2)}%`,
      byPlatform: report.conversions.reduce((acc, conv) => {
        acc[conv.platform] = (acc[conv.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    setMetrics({
      traffic: { totalSessions, aiSessions, aiPercentage },
      platforms,
      extraction: { citationRate, avgExtractionTime },
      conversions
    });

    setLastUpdate(new Date());
  }, []);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (!isAutoUpdate) return;

    // Initial load
    refreshMetrics();

    // Listen for analytics events
    const handleAnalyticsEvent = () => {
      refreshMetrics();
    };

    document.addEventListener('ai_analytics_report', handleAnalyticsEvent);

    // Poll every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);

    return () => {
      document.removeEventListener('ai_analytics_report', handleAnalyticsEvent);
      clearInterval(interval);
    };
  }, [isAutoUpdate, refreshMetrics]);

  /**
   * Manual refresh handler
   */
  const handleManualRefresh = useCallback(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  /**
   * Export data for analysis
   */
  const handleExport = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      exportedFrom: 'AI Analytics Dashboard'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analytics-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics]);

  return (
    <div className={`ai-analytics-dashboard ${className}`}>
      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">AI Traffic Analytics</h1>
            <p className="text-[var(--text-dim)] text-sm">
              Real-time monitoring of AI platform traffic and GEO performance
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              🔄 Refresh
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-[var(--success)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              📊 Export Data
            </button>

            <button
              onClick={() => setIsAutoUpdate(!isAutoUpdate)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isAutoUpdate
                  ? 'bg-[var(--success)] text-[var(--bg)]'
                  : 'bg-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--border-hover)]'
              }`}
            >
              {isAutoUpdate ? '🟢 Auto' : '⚪ Manual'}
            </button>
          </div>
        </div>

        <div className="text-sm text-[var(--text-dim)] mb-6">
          Last updated: <span className="font-mono">{lastUpdate.toLocaleTimeString()}</span>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              Total Sessions
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">
              {metrics.traffic.totalSessions.toLocaleString()}
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              AI sessions: {metrics.traffic.aiSessions.toLocaleString()}
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              AI Traffic Percentage
            </div>
            <div className="text-2xl font-bold text-[var(--success)] mb-1">
              {metrics.traffic.aiPercentage}
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              Of total traffic
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              Citation Rate
            </div>
            <div className="text-2xl font-bold text-[var(--primary)] mb-1">
              {metrics.extraction.citationRate}
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              Average extraction: {metrics.extraction.avgExtractionTime}
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              Conversion Rate
            </div>
            <div className="text-2xl font-bold text-[var(--warning)] mb-1">
              {metrics.conversions.rate}
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              {metrics.conversions.total} total conversions
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
            Platform Distribution
          </h2>

          {metrics.platforms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-semibold text-[var(--text)]">
                      {platform.name}
                    </div>
                    <div className="text-sm text-[var(--text-dim)]">
                      {platform.percentage}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)]">
                        Sessions
                      </div>
                      <div className="font-medium">{platform.sessions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)]">
                        Conv. Rate
                      </div>
                      <div className="font-medium text-[var(--success)]">
                        {platform.conversionRate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] p-8 rounded-lg border border-[var(--border)] text-center">
              <div className="text-[var(--text-dim)] mb-2">No AI traffic detected yet</div>
              <div className="text-xs text-[var(--text-dim)">Start monitoring to see platform distribution</div>
            </div>
          )}
        </div>

        {/* Conversions by Platform */}
        {Object.keys(metrics.conversions.byPlatform).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
              Conversions by Platform
            </h2>

            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics.conversions.byPlatform)
                  .sort(([, a], [, b]) => b - a)
                  .map(([platform, count]) => (
                    <div key={platform} className="text-center">
                      <div className="text-2xl font-bold text-[var(--text)]">{count}</div>
                      <div className="text-xs text-[var(--text-dim)] uppercase tracking-[0.15em] mt-1">
                        {platform}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
              Performance Insights
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auto-update</span>
                <span className={`font-medium ${isAutoUpdate ? 'text-[var(--success)]' : 'text-[var(--text-dim)]'}`}>
                  {isAutoUpdate ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data retention</span>
                <span className="text-[var(--text-dim)]">30 days</span>
              </div>
              <div className="flex justify-between">
                <span>Privacy mode</span>
                <span className="text-[var(--success)]">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span>Sample rate</span>
                <span className="text-[var(--text-dim)]">100%</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
              Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleManualRefresh}
                className="w-full px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
              >
                🔄 Refresh data
              </button>
              <button
                onClick={handleExport}
                className="w-full px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
              >
                📊 Export JSON
              </button>
              <button
                onClick={() => window.open('/docs/geo-system/WEEK5_ANALYTICS.md', '_blank')}
                className="w-full px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
              >
                📖 View documentation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Collection Notice */}
      <div className="glass-card p-4 border border-[var(--border)]">
        <div className="flex items-start gap-3">
          <div className="text-[var(--success)] mt-1">🔒</div>
          <div className="text-sm text-[var(--text-dim)]">
            <p className="mb-1">
              <strong>Privacy Notice:</strong> All analytics data is collected anonymously and stored locally in your browser.
              No personal data is transmitted to external servers.
            </p>
            <p className="text-xs">
              Data retention: 30 days | Sample rate: 100% | DNT respected: Yes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
