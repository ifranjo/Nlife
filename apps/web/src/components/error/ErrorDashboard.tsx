import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Trash2, Download, RefreshCw, Filter, Search } from 'lucide-react';
import type { ErrorReport } from '../../lib/error-reporting';

interface ErrorGroup {
  message: string;
  source: string;
  count: number;
  lastOccurred: string;
  errors: ErrorReport[];
}

export default function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Load errors from localStorage
  const loadErrors = () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('nls_error_reports');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setErrors(parsed.errors || []);
      } catch (e) {
        console.error('Failed to parse error reports:', e);
      }
    }
  };

  useEffect(() => {
    loadErrors();

    // Refresh every 30 seconds
    const interval = setInterval(loadErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group errors by message and source
  const groupedErrors = useMemo((): ErrorGroup[] => {
    const groups = new Map<string, ErrorGroup>();

    errors.forEach(error => {
      const key = `${error.message}|${error.source}`;

      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.count++;
        if (new Date(error.timestamp) > new Date(group.lastOccurred)) {
          group.lastOccurred = error.timestamp;
        }
        group.errors.push(error);
      } else {
        groups.set(key, {
          message: error.message,
          source: error.source,
          count: 1,
          lastOccurred: error.timestamp,
          errors: [error],
        });
      }
    });

    return Array.from(groups.values())
      .sort((a, b) => new Date(b.lastOccurred).getTime() - new Date(a.lastOccurred).getTime());
  }, [errors]);

  // Filter errors
  const filteredGroups = useMemo(() => {
    return groupedErrors.filter(group => {
      const matchesSearch = searchQuery === '' ||
        group.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSource = filterSource === 'all' || group.source === filterSource;
      const matchesType = filterType === 'all' ||
        (filterType === 'react' && group.source.includes('React')) ||
        (filterType === 'js' && !group.source.includes('React'));

      return matchesSearch && matchesSource && matchesType;
    });
  }, [groupedErrors, searchQuery, filterSource, filterType]);

  // Get unique sources for filter
  const sources = useMemo(() => {
    return [...new Set(errors.map(e => e.source))];
  }, [errors]);

  // Stats
  const stats = useMemo(() => {
    const totalErrors = errors.length;
    const uniqueErrors = groupedErrors.length;
    const toolErrors = errors.filter(e => e.metadata?.toolName).length;
    const recentErrors = errors.filter(e => {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 24);
      return new Date(e.timestamp) > hoursAgo;
    }).length;

    return { totalErrors, uniqueErrors, toolErrors, recentErrors };
  }, [errors, groupedErrors]);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all error reports?')) {
      localStorage.removeItem('nls_error_reports');
      setErrors([]);
    }
  };

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      totalErrors: errors.length,
      uniqueErrors: groupedErrors.length,
      errors,
      groupedErrors,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadErrors();
    setTimeout(() => setIsLoading(false), 500);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="error-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Error Monitoring</h1>
          <p className="subtitle">Track and analyze JavaScript errors across all tools</p>
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn--secondary" disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            Refresh
          </button>
          <button onClick={handleExport} className="btn btn--secondary">
            <Download size={16} />
            Export
          </button>
          <button onClick={handleClear} className="btn btn--danger">
            <Trash2 size={16} />
            Clear All
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-card--total">
          <div className="stat-value">{stats.totalErrors}</div>
          <div className="stat-label">Total Errors</div>
        </div>
        <div className="stat-card stat-card--unique">
          <div className="stat-value">{stats.uniqueErrors}</div>
          <div className="stat-label">Unique Issues</div>
        </div>
        <div className="stat-card stat-card--recent">
          <div className="stat-value">{stats.recentErrors}</div>
          <div className="stat-label">Last 24h</div>
        </div>
        <div className="stat-card stat-card--tools">
          <div className="stat-value">{stats.toolErrors}</div>
          <div className="stat-label">Tool Errors</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search errors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-selects">
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="react">React Errors</option>
            <option value="js">JS Errors</option>
          </select>
        </div>
      </div>

      {/* Error List */}
      <div className="errors-list">
        {filteredGroups.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={48} />
            <h3>No errors found</h3>
            <p>{errors.length === 0 ? 'No errors have been reported yet.' : 'No errors match your filters.'}</p>
          </div>
        ) : (
          filteredGroups.map((group, index) => (
            <ErrorGroupCard key={index} group={group} formatTimeAgo={formatTimeAgo} />
          ))
        )}
      </div>

      <style>{`
        .error-dashboard {
          max-width: 1200px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .dashboard-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.25rem;
          color: var(--text, #e0e0e0);
        }

        .subtitle {
          color: var(--text-muted, #888);
          font-size: 0.875rem;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          background: var(--bg-secondary, #1a1a1a);
          color: var(--text, #e0e0e0);
          border: 1px solid var(--border, #333);
        }

        .btn:hover:not(:disabled) {
          border-color: var(--border-hover, #444);
        }

        .btn--danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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

        .stat-card--total { border-color: rgba(239, 68, 68, 0.3); }
        .stat-card--unique { border-color: rgba(245, 158, 11, 0.3); }
        .stat-card--recent { border-color: rgba(34, 197, 94, 0.3); }
        .stat-card--tools { border-color: rgba(59, 130, 246, 0.3); }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text, #e0e0e0);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          margin-top: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
        }

        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text, #e0e0e0);
          font-size: 0.875rem;
          outline: none;
        }

        .search-box input::placeholder {
          color: var(--text-muted, #888);
        }

        .filter-selects {
          display: flex;
          gap: 0.5rem;
        }

        .filter-selects select {
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          color: var(--text, #e0e0e0);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .errors-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-muted, #888);
        }

        .empty-state h3 {
          color: var(--text, #e0e0e0);
          margin: 1rem 0 0.5rem;
        }

        .empty-state p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .filters-bar {
            flex-direction: column;
          }

          .filter-selects {
            width: 100%;
          }

          .filter-selects select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Error Group Card Component
function ErrorGroupCard({
  group,
  formatTimeAgo
}: {
  group: ErrorGroup;
  formatTimeAgo: (ts: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="error-group-card">
      <div className="error-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="error-main">
          <div className="error-message">{group.message}</div>
          <div className="error-source">{group.source}</div>
        </div>
        <div className="error-meta">
          <span className="error-count">{group.count} occurrence{group.count !== 1 ? 's' : ''}</span>
          <span className="error-time">{formatTimeAgo(group.lastOccurred)}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="error-details">
          <h4>Recent Occurrences</h4>
          <div className="occurrences-list">
            {group.errors.slice(0, 5).map((error, idx) => (
              <div key={idx} className="occurrence-item">
                <div className="occurrence-time">{new Date(error.timestamp).toLocaleString()}</div>
                {error.metadata?.toolName && (
                  <div className="occurrence-tool">Tool: {error.metadata.toolName}</div>
                )}
                {error.stack && (
                  <pre className="occurrence-stack">{error.stack.split('\n').slice(0, 3).join('\n')}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .error-group-card {
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          border-radius: 8px;
          overflow: hidden;
        }

        .error-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          cursor: pointer;
          gap: 1rem;
        }

        .error-header:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .error-main {
          flex: 1;
          min-width: 0;
        }

        .error-message {
          font-size: 0.9375rem;
          color: #ef4444;
          font-weight: 500;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .error-source {
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          font-family: 'JetBrains Mono', monospace;
        }

        .error-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          flex-shrink: 0;
        }

        .error-count {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text, #e0e0e0);
          background: rgba(239, 68, 68, 0.1);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }

        .error-time {
          font-size: 0.75rem;
          color: var(--text-muted, #888);
        }

        .error-details {
          padding: 1rem;
          border-top: 1px solid var(--border, #333);
          background: rgba(0, 0, 0, 0.2);
        }

        .error-details h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text, #e0e0e0);
          margin: 0 0 0.75rem;
        }

        .occurrences-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .occurrence-item {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          font-size: 0.8125rem;
        }

        .occurrence-time {
          color: var(--text-muted, #888);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 0.25rem;
        }

        .occurrence-tool {
          color: #22c55e;
          margin-bottom: 0.5rem;
        }

        .occurrence-stack {
          margin: 0;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
