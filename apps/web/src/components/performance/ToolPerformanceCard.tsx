import { useState, useEffect } from 'react';
import type { ToolPerformanceSummary } from '../../lib/performance-monitor';
import { Clock, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface Props {
  summary: ToolPerformanceSummary;
  budget?: { maxLoadTime: number; maxProcessingTime: number };
}

export default function ToolPerformanceCard({ summary, budget }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTrendIcon = () => {
    switch (summary.trend) {
      case 'improving':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'degrading':
        return <TrendingDown size={16} className="text-red-500" />;
      case 'stable':
      default:
        return <Minus size={16} className="text-gray-500" />;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-500';
    if (rate >= 90) return 'text-yellow-500';
    return 'text-red-500';
  };

  const hasBudgetViolation = budget && (
    summary.avgLoadTime > budget.maxLoadTime ||
    summary.avgProcessingTime > budget.maxProcessingTime
  );

  return (
    <div className={`performance-card ${hasBudgetViolation ? 'performance-card--warning' : ''}`}>
      <div className="performance-card__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="performance-card__title">
          <h3>{summary.toolId}</h3>
          {hasBudgetViolation && <AlertTriangle size={16} className="text-orange-500" />}
        </div>
        <div className="performance-card__trend">
          {getTrendIcon()}
          <span className={`trend-${summary.trend}`}>{summary.trend}</span>
        </div>
      </div>

      <div className="performance-card__metrics">
        <div className="metric">
          <Clock size={14} />
          <span className="metric__value">{formatTime(summary.avgTotalTime)}</span>
          <span className="metric__label">avg total</span>
        </div>

        <div className="metric">
          <Zap size={14} />
          <span className="metric__value">{formatTime(summary.avgProcessingTime)}</span>
          <span className="metric__label">processing</span>
        </div>

        <div className="metric">
          <span className={`metric__value ${getSuccessRateColor(summary.successRate)}`}>
            {summary.successRate.toFixed(1)}%
          </span>
          <span className="metric__label">success</span>
        </div>
      </div>

      {isExpanded && (
        <div className="performance-card__details">
          <div className="detail-row">
            <span>Total Runs:</span>
            <span>{summary.totalRuns}</span>
          </div>
          <div className="detail-row">
            <span>Load Time:</span>
            <span>{formatTime(summary.avgLoadTime)}</span>
          </div>
          {summary.memoryAvg && (
            <div className="detail-row">
              <span>Memory:</span>
              <span>{(summary.memoryAvg / 1024 / 1024).toFixed(1)} MB avg</span>
            </div>
          )}
          <div className="detail-row">
            <span>Fastest:</span>
            <span>{formatTime(summary.fastestRun)}</span>
          </div>
          <div className="detail-row">
            <span>Slowest:</span>
            <span>{formatTime(summary.slowestRun)}</span>
          </div>
          <div className="detail-row">
            <span>Last Run:</span>
            <span>{new Date(summary.lastRun).toLocaleString()}</span>
          </div>

          {budget && (
            <div className="budget-section">
              <h4>Budget Status</h4>
              <div className={`budget-item ${summary.avgLoadTime > budget.maxLoadTime ? 'violation' : ''}`}>
                <span>Load:</span>
                <span>{formatTime(summary.avgLoadTime)} / {formatTime(budget.maxLoadTime)}</span>
              </div>
              <div className={`budget-item ${summary.avgProcessingTime > budget.maxProcessingTime ? 'violation' : ''}`}>
                <span>Processing:</span>
                <span>{formatTime(summary.avgProcessingTime)} / {formatTime(budget.maxProcessingTime)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .performance-card {
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s;
        }

        .performance-card--warning {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
        }

        .performance-card:hover {
          border-color: var(--border-hover, #444);
        }

        .performance-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: 0.75rem;
        }

        .performance-card__title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .performance-card__title h3 {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text, #e0e0e0);
          text-transform: capitalize;
        }

        .performance-card__trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .trend-improving { color: #22c55e; }
        .trend-degrading { color: #ef4444; }
        .trend-stable { color: #6b7280; }

        .performance-card__metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-muted, #888);
        }

        .metric__value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text, #e0e0e0);
        }

        .metric__label {
          font-size: 0.6875rem;
          text-transform: uppercase;
        }

        .performance-card__details {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border, #333);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.375rem 0;
          font-size: 0.8125rem;
        }

        .detail-row span:first-child {
          color: var(--text-muted, #888);
        }

        .detail-row span:last-child {
          color: var(--text, #e0e0e0);
          font-weight: 500;
        }

        .budget-section {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border, #333);
        }

        .budget-section h4 {
          margin: 0 0 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-muted, #888);
        }

        .budget-item {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
          font-size: 0.8125rem;
        }

        .budget-item.violation {
          color: #ef4444;
        }

        .budget-item.violation span:last-child {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
