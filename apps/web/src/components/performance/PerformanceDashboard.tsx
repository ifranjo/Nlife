import { useState, useEffect, useMemo } from 'react';
import {
  useAllPerformanceData,
  usePerformanceBudget,
} from '../../hooks/usePerformanceMonitor';
import {
  performanceMonitor,
  setDefaultPerformanceBudgets,
  type ToolPerformanceSummary,
} from '../../lib/performance-monitor';
import ToolPerformanceCard from './ToolPerformanceCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { AlertTriangle, Download, RotateCcw, Clock } from 'lucide-react';

export default function PerformanceDashboard() {
  const [timeRange, setTimeRange] = useState(7);
  const [summaries, setSummaries] = useState<ToolPerformanceSummary[]>([]);
  const [rawMetrics, setRawMetrics] = useState<any[]>([]);

  const { getAllSummaries, getSlowestTools, getDegradingTools, exportReport } =
    useAllPerformanceData(timeRange);
  const { getBudget } = usePerformanceBudget();

  // Initialize default budgets
  useEffect(() => {
    setDefaultPerformanceBudgets();
  }, []);

  // Load data
  useEffect(() => {
    const data = getAllSummaries();
    setSummaries(data);
    setRawMetrics(performanceMonitor.getRawMetrics(undefined, 100));
  }, [timeRange, getAllSummaries]);

  const slowestTools = useMemo(() => getSlowestTools(5), [getSlowestTools]);
  const degradingTools = useMemo(() => getDegradingTools(), [getDegradingTools]);

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all performance data?')) {
      performanceMonitor.clearMetrics();
      setSummaries([]);
      setRawMetrics([]);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return summaries.map((s) => ({
      name: s.toolId.replace(/-/g, ' '),
      avgTime: Math.round(s.avgTotalTime),
      loadTime: Math.round(s.avgLoadTime),
      processingTime: Math.round(s.avgProcessingTime),
      successRate: Math.round(s.successRate),
    }));
  }, [summaries]);

  // Timeline data (last 7 days)
  const timelineData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      const dayName = days[date.getDay()];

      // Count metrics for this day
      const dayMetrics = rawMetrics.filter((m) => {
        const metricDate = new Date(m.timestamp);
        return metricDate.toDateString() === date.toDateString();
      });

      return {
        day: dayName,
        runs: dayMetrics.length,
        avgTime:
          dayMetrics.length > 0
            ? Math.round(
                dayMetrics.reduce((sum, m) => sum + m.totalTime, 0) /
                  dayMetrics.length
              )
            : 0,
      };
    });
  }, [rawMetrics]);

  return (
    <div className="performance-dashboard">
      <header className="dashboard-header">
        <h1>Performance Dashboard</h1>

        <div className="dashboard-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>

          <button onClick={handleExport} className="btn btn--secondary">
            <Download size={16} />
            Export
          </button>

          <button onClick={handleClear} className="btn btn--danger">
            <RotateCcw size={16} />
            Clear Data
          </button>
        </div>
      </header>

      {/* Alerts */}
      {degradingTools.length > 0 && (
        <div className="alert alert--warning">
          <AlertTriangle size={20} />
          <div>
            <strong>{degradingTools.length} tools</strong> showing degrading
            performance trends
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{summaries.length}</div>
          <div className="stat-label">Tools Monitored</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {summaries.length > 0
              ? Math.round(
                  summaries.reduce((sum, s) => sum + s.totalRuns, 0) /
                    summaries.length
                )
              : 0}
          </div>
          <div className="stat-label">Avg Runs/Tool</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {summaries.length > 0
              ? (
                  summaries.reduce((sum, s) => sum + s.successRate, 0) /
                  summaries.length
                ).toFixed(1) + '%'
              : 'N/A'}
          </div>
          <div className="stat-label">Overall Success</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {slowestTools.length > 0
              ? slowestTools[0].toolId.replace(/-/g, ' ')
              : 'N/A'}
          </div>
          <div className="stat-label">Slowest Tool</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Tool Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="avgTime" fill="#00d4ff" name="Avg Time (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Usage Timeline</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="runs"
                stroke="#22c55e"
                strokeWidth={2}
                name="Runs"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slowest Tools */}
      {slowestTools.length > 0 && (
        <section className="section">
          <h2>
            <Clock size={20} />
            Slowest Tools
          </h2>
          <div className="cards-grid">
            {slowestTools.map((summary) => (
              <ToolPerformanceCard
                key={summary.toolId}
                summary={summary}
                budget={getBudget(summary.toolId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Tools */}
      <section className="section">
        <h2>All Tools</h2>
        <div className="cards-grid">
          {summaries.map((summary) => (
            <ToolPerformanceCard
              key={summary.toolId}
              summary={summary}
              budget={getBudget(summary.toolId)}
            />
          ))}
        </div>
      </section>

      <style>{`
        .performance-dashboard {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .dashboard-controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .time-range-select {
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          background: var(--bg-secondary, #1a1a1a);
          border: 1px solid var(--border, #333);
          color: var(--text, #e0e0e0);
          font-size: 0.875rem;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn--secondary {
          background: var(--bg-secondary, #1a1a1a);
          color: var(--text, #e0e0e0);
          border: 1px solid var(--border, #333);
        }

        .btn--danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .alert--warning {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text, #e0e0e0);
          text-transform: capitalize;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          margin-top: 0.25rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .chart-container {
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          border-radius: 8px;
          padding: 1rem;
        }

        .chart-container h3 {
          margin: 0 0 1rem;
          font-size: 0.9375rem;
          color: var(--text, #e0e0e0);
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: var(--text, #e0e0e0);
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
