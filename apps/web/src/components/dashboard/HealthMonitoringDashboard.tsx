import React, { useState, useEffect, useCallback } from 'react';
import { healthMonitor, type ComponentStatus, type MetricData, type HealthScore, type Incident } from '../../lib/health-monitoring';

interface MetricCardProps {
  name: string;
  data: MetricData | undefined;
  history: MetricData[];
  unit?: string;
  onAlertClick: (metric: string) => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ name, data, history, unit, onAlertClick }) => {
  const [showHistory, setShowHistory] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'critical': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const sparklineData = history.slice(-20).map(d => d.value);
  const maxValue = Math.max(...sparklineData, 1);
  const minValue = Math.min(...sparklineData, 0);
  const range = maxValue - minValue || 1;

  return (
    <div className={`glass-card p-4 border ${getStatusBg(data?.status || 'unknown')}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-300">{name}</h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-gray-400 hover:text-white"
        >
          {showHistory ? 'Hide' : 'History'}
        </button>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white">
          {data?.value?.toFixed(2) || '0.00'}
        </span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-sm font-medium ${getStatusColor(data?.status || 'unknown')}`}>
          ● {data?.status || 'unknown'}
        </span>
        <span className="text-xs text-gray-500">
          {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'No data'}
        </span>
      </div>

      {/* Sparkline */}
      <div className="h-12 mb-2">
        <svg width="100%" height="48" className="overflow-visible">
          <polyline
            fill="none"
            stroke={data?.status === 'healthy' ? '#00ff00' : data?.status === 'warning' ? '#ffaa00' : '#ff4444'}
            strokeWidth="2"
            points={sparklineData.map((value, i) =>
              `${i * (100 / Math.max(sparklineData.length - 1, 1))},${48 - ((value - minValue) / range) * 40}`
            ).join(' ')}
          />
        </svg>
      </div>

      {/* Alert button */}
      <button
        onClick={() => onAlertClick(name)}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        Set Alert
      </button>

      {/* History view */}
      {showHistory && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="max-h-32 overflow-y-auto">
            {history.slice(-10).reverse().map((point, i) => (
              <div key={i} className="flex justify-between text-xs py-1">
                <span className={getStatusColor(point.status)}>
                  {point.value.toFixed(2)}
                </span>
                <span className="text-gray-500">
                  {new Date(point.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface AlertModalProps {
  metric: string | null;
  onClose: () => void;
  onSave: (threshold: number, type: 'above' | 'below', webhook?: string) => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ metric, onClose, onSave }) => {
  const [threshold, setThreshold] = useState('');
  const [type, setType] = useState<'above' | 'below'>('above');
  const [webhook, setWebhook] = useState('');

  const handleSave = () => {
    if (threshold && metric) {
      onSave(parseFloat(threshold), type, webhook || undefined);
      onClose();
    }
  };

  if (!metric) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Set Alert for {metric}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Alert Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'above' | 'below')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="above">Above threshold</option>
              <option value="below">Below threshold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Threshold</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              placeholder="Enter threshold value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL (optional)</label>
            <input
              type="url"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              placeholder="https://example.com/webhook"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="btn-primary flex-1"
          >
            Save Alert
          </button>
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const HealthMonitoringDashboard: React.FC = () => {
  const [statuses, setStatuses] = useState<ComponentStatus[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [metrics, setMetrics] = useState<Record<string, MetricData[]>>({});
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateData = useCallback(() => {
    setStatuses(healthMonitor.getComponentStatus());
    setHealthScore(healthMonitor.getHealthScore());
    setMetrics(healthMonitor.getMetrics());

    // Get active incidents
    const statusPage = healthMonitor.generateStatusPage();
    setIncidents(statusPage.incidents);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Initial data load
    updateData();

    // Listen for updates
    healthMonitor.addEventListener('metricUpdate', updateData);
    healthMonitor.addEventListener('incidentCreated', updateData);
    healthMonitor.addEventListener('incidentResolved', updateData);

    return () => {
      healthMonitor.removeEventListener('metricUpdate', updateData);
      healthMonitor.removeEventListener('incidentCreated', updateData);
      healthMonitor.removeEventListener('incidentResolved', updateData);
    };
  }, [isClient, updateData]);

  const handleSetAlert = (metric: string, threshold: number, type: 'above' | 'below', webhook?: string) => {
    healthMonitor.setAlert({
      id: `alert-${metric}-${Date.now()}`,
      metric,
      threshold,
      type,
      webhook,
      message: `${metric} is ${type} ${threshold}`
    });
  };

  const getOverallStatusColor = () => {
    if (!healthScore) return 'text-gray-500';
    if (healthScore.overall >= 90) return 'text-green-500';
    if (healthScore.overall >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Health Monitoring Dashboard</h1>
          <p className="text-gray-400">
            Real-time monitoring of HAMBREDEVICTORIA protocol metrics
          </p>
        </div>

        {/* Overall Health */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Overall System Health</h2>
            <span className={`text-3xl font-bold ${getOverallStatusColor()}`}>
              {healthScore?.overall || 0}%
            </span>
          </div>

          {/* Health score breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {healthScore && Object.entries(healthScore.components).map(([name, score]) => (
              <div key={name} className="text-center">
                <div className="text-sm text-gray-400 mb-1">{name}</div>
                <div className={`text-lg font-semibold ${
                  score >= 90 ? 'text-green-500' :
                  score >= 70 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {score}%
                </div>
                <div className="text-xs text-gray-500">
                  {healthScore.trends[name]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Incidents */}
        {incidents.length > 0 && (
          <div className="glass-card p-6 mb-8 border-red-500/20 bg-red-500/10">
            <h2 className="text-xl font-semibold mb-4 text-red-400">
              Active Incidents ({incidents.length})
            </h2>
            <div className="space-y-3">
              {incidents.map(incident => (
                <div key={incident.id} className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{incident.component}</div>
                    <div className="text-sm text-gray-400">{incident.description}</div>
                    <div className="text-xs text-gray-500">
                      Started: {new Date(incident.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    incident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {incident.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statuses.map(status => (
              <MetricCard
                key={status.name}
                name={status.name}
                data={status.metrics[status.name]}
                history={metrics[status.name] || []}
                unit={getMetricUnit(status.name)}
                onAlertClick={setSelectedMetric}
              />
            ))}
          </div>
        </div>

        {/* Trends */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Trends Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-green-500 mb-2">Improving</h3>
              <div className="space-y-1">
                {healthScore && Object.entries(healthScore.trends)
                  .filter(([, trend]) => trend === 'improving')
                  .map(([name]) => (
                    <div key={name} className="text-sm text-gray-300">{name}</div>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="text-yellow-500 mb-2">Stable</h3>
              <div className="space-y-1">
                {healthScore && Object.entries(healthScore.trends)
                  .filter(([, trend]) => trend === 'stable')
                  .map(([name]) => (
                    <div key={name} className="text-sm text-gray-300">{name}</div>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="text-red-500 mb-2">Declining</h3>
              <div className="space-y-1">
                {healthScore && Object.entries(healthScore.trends)
                  .filter(([, trend]) => trend === 'declining')
                  .map(([name]) => (
                    <div key={name} className="text-sm text-gray-300">{name}</div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        metric={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        onSave={(threshold, type, webhook) => {
          if (selectedMetric) {
            handleSetAlert(selectedMetric, threshold, type, webhook);
          }
        }}
      />
    </div>
  );
};

function getMetricUnit(metric: string): string | undefined {
  const units: Record<string, string> = {
    'AI Traffic Detection Rate': '%',
    'Extraction Performance': 'ms',
    'Conversion Funnel Health': '%',
    'Content Adaptation Success Rate': '%',
    'Platform Detection Accuracy': '%',
    'Cache Hit Rate': '%',
    'Error Rate': '%',
    'Memory Usage': 'MB'
  };
  return units[metric];
}

export default HealthMonitoringDashboard;