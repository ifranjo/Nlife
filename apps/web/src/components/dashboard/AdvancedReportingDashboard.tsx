/**
 * Advanced Reporting Dashboard Component
 *
 * Visualizes advanced analytics reports, trend analysis, and insights
 * for GEO optimization monitoring
 */

import React, { useEffect, useState, useCallback } from 'react';
import { advancedReporting } from '../../lib/advanced-reporting';
import type { ExecutiveReport, TrendAnalysis, ComparativeAnalysis } from '../../lib/advanced-reporting';

interface DashboardProps {
  className?: string;
}

export default function AdvancedReportingDashboard({ className = '' }: DashboardProps) {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [comparativeAnalysis, setComparativeAnalysis] = useState<ComparativeAnalysis | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAutoUpdate, setIsAutoUpdate] = useState(false);

  /**
   * Refresh all reports and analysis
   */
  const refreshData = useCallback(() => {
    const execReport = advancedReporting.generateExecutiveReport();
    const trends = advancedReporting.generateTrendAnalysis(selectedPeriod);
    const comparative = advancedReporting.generateComparativeAnalysis();

    setReport(execReport);
    setTrendAnalysis(trends);
    setComparativeAnalysis(comparative);
    setLastUpdate(new Date());
  }, [selectedPeriod]);

  /**
   * Export report data
   */
  const handleExport = useCallback((format: 'json' | 'csv' | 'pdf') => {
    if (!report) return;

    let data: string;
    let filename: string;

    switch (format) {
      case 'csv':
        data = advancedReporting.exportToCSV(report);
        filename = `executive-report-${report.date}.csv`;
        break;
      case 'pdf':
        // For now, fall back to JSON
        data = advancedReporting.exportToJSON(report);
        filename = `executive-report-${report.date}.json`;
        break;
      default:
        data = advancedReporting.exportToJSON(report);
        filename = `executive-report-${report.date}.json`;
    }

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (!isAutoUpdate) return;

    const interval = setInterval(() => {
      refreshData();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAutoUpdate, refreshData]);

  /**
   * Initial load
   */
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className={`advanced-reporting-dashboard ${className}`}>
      {/* Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Advanced GEO Reporting</h1>
            <p className="text-[var(--text-dim)] text-sm">
              Executive reports, trend analysis, and performance insights
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              🔄 Refresh
            </button>

            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-[var(--success)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              📊 Export JSON
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-[var(--warning)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              📄 Export CSV
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

        <div className="flex gap-4 items-center mb-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <div className="text-sm text-[var(--text-dim)]">
            Last updated: <span className="font-mono">{lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              Total Sessions (24h)
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-1">
              {report.summary.totalSessions.toLocaleString()}
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              AI Traffic: {report.summary.aiSessions.toLocaleString()}
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              AI Traffic Growth
            </div>
            <div className="text-2xl font-bold text-[var(--success)] mb-1">
              {report.summary.aiTrafficGrowth > 0 ? '+' : ''}{report.summary.aiTrafficGrowth}%
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              vs previous 24h
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              Top Tool
            </div>
            <div className="text-lg font-bold text-[var(--primary)] mb-1">
              {report.summary.topPerformingTool}
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              Converting best today
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]">
            <div className="text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text-dim)] mb-2">
              Avg Extraction Time
            </div>
            <div className="text-2xl font-bold text-[var(--warning)] mb-1">
              {report.summary.avgExtractionTime}ms
            </div>
            <div className="text-[var(--text-dim)] text-xs">
              Faster is better
            </div>
          </div>
        </div>
      )}

      {/* Platform Distribution */}
      {report && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
            Platform Distribution
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.platformDistribution.map((platform) => (
              <div
                key={platform.platform}
                className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="font-semibold text-[var(--text)] flex items-center gap-2">
                    {platform.platform}
                    {platform.trend === 'up' && <span className="text-[var(--success)]">↗</span>}
                    {platform.trend === 'down' && <span className="text-[var(--error)]">↘</span>}
                    {platform.trend === 'stable' && <span className="text-[var(--text-dim)]">→</span>}
                  </div>
                  <div className="text-sm text-[var(--text-dim)]">
                    {platform.percentage}%
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
                      {platform.conversionRate}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {report && report.keyInsights.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
            Key Insights
          </h2>

          <div className="space-y-4">
            {report.keyInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.type === 'achievement'
                    ? 'border-[var(--success)] bg-[var(--success)] bg-opacity-10'
                    : insight.type === 'warning'
                    ? 'border-[var(--warning)] bg-[var(--warning)] bg-opacity-10'
                    : 'border-[var(--primary)] bg-[var(--primary)] bg-opacity-10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-lg">
                    {insight.type === 'achievement' ? '🏆' : insight.type === 'warning' ? '⚠️' : '💡'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-[var(--text)]">
                        {insight.category}
                      </div>
                      <div className={`text-xs uppercase tracking-[0.15em] ${
                        insight.impact === 'high' ? 'text-[var(--error)]' :
                        insight.impact === 'medium' ? 'text-[var(--warning)]' :
                        'text-[var(--text-dim)]'
                      }`}>
                        {insight.impact} Impact
                      </div>
                    </div>
                    <div className="text-sm text-[var(--text-dim)] mb-2">
                      {insight.message}
                    </div>
                    {insight.action && (
                      <div className="text-xs text-[var(--primary)] bg-[var(--primary)] bg-opacity-10 px-2 py-1 rounded">
                        Action: {insight.action}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
            Recommendations
          </h2>

          <div className="space-y-3">
            {report.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                <div className="text-[var(--success)] mt-1">→</div>
                <div className="text-sm text-[var(--text)]">{rec}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Analysis */}
      {trendAnalysis && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
            Trend Analysis ({selectedPeriod})
          </h2>

          {trendAnalysis.patterns.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
                Detected Patterns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendAnalysis.patterns.map((pattern, index) => (
                  <div key={index} className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-[var(--text)]">
                        {pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)}
                      </div>
                      <div className="text-xs text-[var(--text-dim)]">
                        {pattern.confidence}% confidence
                      </div>
                    </div>
                    <div className="text-sm text-[var(--text-dim)]">
                      {pattern.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
                Traffic Trend
              </h3>
              <div className="space-y-2">
                {trendAnalysis.metrics.traffic.slice(-5).map((metric, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between">
                      <span>{metric.date}</span>
                      <span className={metric.change > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                        {metric.value.toLocaleString()} {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
                Conversion Trend
              </h3>
              <div className="space-y-2">
                {trendAnalysis.metrics.conversions.slice(-5).map((metric, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between">
                      <span>{metric.date}</span>
                      <span className={metric.change > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                        {metric.value.toFixed(2)}% {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
                Predictions
              </h3>
              <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-xs text-[var(--text-dim)] mb-2">Next 7 days</div>
                <div className="text-sm space-y-1">
                  {trendAnalysis.predictions.nextWeek.map((pred, i) => (
                    <div key={i} className="flex justify-between">
                      <span>Day {i + 1}:</span>
                      <span className="text-[var(--primary)]">{pred.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[var(--text-dim)] mt-2">
                  Confidence: {(trendAnalysis.predictions.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card p-4 border border-[var(--border)]">
        <h3 className="text-sm font-semibold mb-3 text-[var(--text-dim)] uppercase tracking-[0.15em]">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
          >
            📊 Export JSON Data
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
          >
            📄 Export CSV
          </button>
          <button
            onClick={refreshData}
            className="px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
          >
            🔄 Refresh All Data
          </button>
          <button
            onClick={() => window.open('/docs/geo-system/WEEK6_ADVANCED_OPTIMIZATION.md', '_blank')}
            className="px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded hover:border-[var(--border-hover)] transition-colors text-left"
          >
            📖 View Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
