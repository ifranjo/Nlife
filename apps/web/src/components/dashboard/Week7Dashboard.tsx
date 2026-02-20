import React, { useState, useEffect, useCallback } from 'react';
import { autoScaling, LoadMetrics, ScalingMode } from '../../lib/auto-scaling';
import { mobileSDK, MobileMetrics } from '../../lib/mobile-sdk';
import { whiteLabel, WhiteLabelConfig } from '../../lib/white-label';
import { cdnIntegration, CDNStatus, CacheStats } from '../../lib/cdn-integration';

interface Week7DashboardProps {
  className?: string;
  refreshInterval?: number;
}

interface DashboardData {
  autoScaling: {
    mode: ScalingMode;
    metrics: LoadMetrics;
    history: Array<{ mode: string; timestamp: number; sessions: number }>;
    capacity: {
      utilization: number;
      headroom: number;
      projectedTimeToMax: number | null;
    };
  };
  mobileSDK: {
    emulation: any;
    metrics: MobileMetrics;
    session: any;
  };
  whiteLabel: {
    config: WhiteLabelConfig;
    variants: any[];
  };
  cdn: {
    status: CDNStatus;
    stats: CacheStats;
  };
}

export const Week7Dashboard: React.FC<Week7DashboardProps> = ({
  className = '',
  refreshInterval = 5000
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'scaling' | 'mobile' | 'branding' | 'cdn'>('overview');

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      const [
        mode,
        metrics,
        history,
        capacity,
        emulation,
        mobileMetrics,
        session,
        wlConfig,
        variants,
        cdnStatus,
        cacheStats
      ] = await Promise.all([
        // Auto-scaling data
        Promise.resolve(autoScaling.getCurrentMode()),
        Promise.resolve(autoScaling.getCurrentMetrics()),
        Promise.resolve(autoScaling.getModeHistory()),
        Promise.resolve(autoScaling.getCapacityMetrics()),

        // Mobile SDK data
        Promise.resolve(mobileSDK.getMobileEmulation()),
        Promise.resolve(mobileSDK.getMetrics()),
        Promise.resolve((mobileSDK as any).getSessionInfo()),

        // White-label data
        Promise.resolve(whiteLabel.getBrandConfig()),
        Promise.resolve(whiteLabel.getBrandVariants()),

        // CDN data
        Promise.resolve(cdnIntegration.getCDNStatus()),
        Promise.resolve(cdnIntegration.getCacheStats())
      ]);

      setData({
        autoScaling: {
          mode,
          metrics,
          history,
          capacity
        },
        mobileSDK: {
          emulation,
          metrics: mobileMetrics,
          session
        },
        whiteLabel: {
          config: wlConfig,
          variants
        },
        cdn: {
          status: cdnStatus,
          stats: cacheStats
        }
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchData();

    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh, refreshInterval]);

  // Manual scaling handlers
  const handleScaleTo = async (mode: 'normal' | 'warning' | 'critical' | 'emergency') => {
    autoScaling.scaleTo(mode);
    await fetchData();
  };

  const handleConfigureAutoScaling = (config: any) => {
    autoScaling.configure(config);
  };

  // Mobile SDK handlers
  const handleConfigureMobileSDK = (config: any) => {
    mobileSDK.configure(config);
  };

  // White-label handlers
  const handleConfigureWhiteLabel = (config: any) => {
    whiteLabel.configure(config);
  };

  const handleApplyBranding = () => {
    whiteLabel.applyBranding(document.body);
  };

  // CDN handlers
  const handlePurgeCache = async (paths?: string[]) => {
    const result = await cdnIntegration.purgeCache(paths);
    await fetchData();
    return result;
  };

  const handleConfigureCDN = (config: any) => {
    cdnIntegration.configure(config);
  };

  if (isLoading && !data) {
    return (
      <div className={`week7-dashboard loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Week 7 Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`week7-dashboard error ${className}`}>
        <p>Error loading dashboard data</p>
      </div>
    );
  }

  return (
    <div className={`week7-dashboard ${className}`}>
      <div className="dashboard-header">
        <h2>Week 7: Scaling & Automation Dashboard</h2>
        <div className="dashboard-controls">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={fetchData} className="refresh-btn">
            Refresh
          </button>
          {lastUpdate && (
            <span className="last-update">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="dashboard-tabs">
        {(['overview', 'scaling', 'mobile', 'branding', 'cdn'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${selectedTab === tab ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {selectedTab === 'overview' && (
          <OverviewTab
            data={data}
            onScaleTo={handleScaleTo}
            onApplyBranding={handleApplyBranding}
            onPurgeCache={handlePurgeCache}
          />
        )}

        {selectedTab === 'scaling' && (
          <ScalingTab
            data={data.autoScaling}
            onScaleTo={handleScaleTo}
            onConfigure={handleConfigureAutoScaling}
          />
        )}

        {selectedTab === 'mobile' && (
          <MobileTab
            data={data.mobileSDK}
            onConfigure={handleConfigureMobileSDK}
          />
        )}

        {selectedTab === 'branding' && (
          <BrandingTab
            data={data.whiteLabel}
            onConfigure={handleConfigureWhiteLabel}
          />
        )}

        {selectedTab === 'cdn' && (
          <CDNTab
            data={data.cdn}
            onPurgeCache={handlePurgeCache}
            onConfigure={handleConfigureCDN}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab: React.FC<{
  data: DashboardData;
  onScaleTo: (mode: any) => void;
  onApplyBranding: () => void;
  onPurgeCache: (paths?: string[]) => void;
}> = ({ data, onScaleTo, onApplyBranding, onPurgeCache }) => {
  const { autoScaling, mobileSDK, whiteLabel, cdn } = data;

  return (
    <div className="tab-content overview">
      <div className="overview-grid">
        <div className="metric-card">
          <h3>Auto-Scaling Status</h3>
          <div className="metric-value">
            <span className={`status-indicator ${autoScaling.mode.name}`}>
              {autoScaling.mode.name.toUpperCase()}
            </span>
          </div>
          <div className="metric-details">
            <p>Sessions: {autoScaling.metrics.currentSessions.toLocaleString()}</p>
            <p>AI Traffic: {autoScaling.metrics.aiTrafficRatio.toFixed(1)}%</p>
          </div>
          <div className="quick-actions">
            <button onClick={() => onScaleTo('normal')} className="btn-small">Normal</button>
            <button onClick={() => onScaleTo('warning')} className="btn-small">Warning</button>
          </div>
        </div>

        <div className="metric-card">
          <h3>Capacity</h3>
          <div className="metric-value">
            {autoScaling.capacity.utilization.toFixed(1)}%
          </div>
          <div className="metric-details">
            <p>Headroom: {autoScaling.capacity.headroom.toLocaleString()}</p>
            {autoScaling.capacity.projectedTimeToMax && (
              <p>Time to max: {autoScaling.capacity.projectedTimeToMax}min</p>
            )}
          </div>
          <div className="capacity-bar">
            <div
              className="capacity-fill"
              style={{ width: `${Math.min(autoScaling.capacity.utilization, 100)}%` }}
            />
          </div>
        </div>

        <div className="metric-card">
          <h3>Mobile SDK</h3>
          <div className="metric-value">
            {mobileSDK.metrics.eventsTracked}
          </div>
          <div className="metric-details">
            <p>Session Duration: {Math.floor(mobileSDK.session.duration / 1000)}s</p>
            <p>Platform: {mobileSDK.emulation.deviceInfo.platform}</p>
          </div>
        </div>

        <div className="metric-card">
          <h3>CDN Cache</h3>
          <div className="metric-value">
            {cdn.stats.hitRatio.toFixed(1)}%
          </div>
          <div className="metric-details">
            <p>Status: {cdn.status.connected ? 'Connected' : 'Disconnected'}</p>
            <p>Requests: {cdn.stats.requests.toLocaleString()}</p>
          </div>
          <button onClick={() => onPurgeCache()} className="btn-small">Purge Cache</button>
        </div>

        <div className="metric-card wide">
          <h3>Branding</h3>
          <div className="brand-preview">
            <div className="brand-info">
              <p>Brand: {whiteLabel.config.brandName}</p>
              <p>Primary Color: {whiteLabel.config.colors.primary}</p>
              <p>Variants: {whiteLabel.variants.length}</p>
            </div>
            <button onClick={onApplyBranding} className="btn-small">Apply Branding</button>
          </div>
        </div>

        <div className="metric-card wide">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {autoScaling.history.slice(-5).reverse().map((entry, idx) => (
              <div key={idx} className="activity-item">
                <span className="activity-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={`activity-mode ${entry.mode}`}>
                  {entry.mode}
                </span>
                <span className="activity-sessions">
                  {entry.sessions.toLocaleString()} sessions
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Scaling Tab
const ScalingTab: React.FC<{
  data: DashboardData['autoScaling'];
  onScaleTo: (mode: any) => void;
  onConfigure: (config: any) => void;
}> = ({ data, onScaleTo, onConfigure }) => {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="tab-content scaling">
      <div className="scaling-controls">
        <h3>Manual Scaling</h3>
        <div className="scaling-buttons">
          {(['normal', 'warning', 'critical', 'emergency'] as const).map((mode) => (
            <button
              key={mode}
              className={`scaling-btn ${mode} ${data.mode.name === mode ? 'active' : ''}`}
              onClick={() => onScaleTo(mode)}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="scaling-metrics">
        <h3>Current Metrics</h3>
        <div className="metrics-grid">
          <div className="metric">
            <label>Current Sessions</label>
            <value>{data.metrics.currentSessions.toLocaleString()}</value>
          </div>
          <div className="metric">
            <label>AI Traffic Ratio</label>
            <value>{data.metrics.aiTrafficRatio.toFixed(1)}%</value>
          </div>
          <div className="metric">
            <label>Memory Usage</label>
            <value>{data.metrics.memoryUsage.toFixed(0)} MB</value>
          </div>
          <div className="metric">
            <label>CPU Usage</label>
            <value>{data.metrics.cpuUsage.toFixed(1)}%</value>
          </div>
          <div className="metric">
            <label>Network Latency</label>
            <value>{data.metrics.networkLatency.toFixed(0)} ms</value>
          </div>
          <div className="metric">
            <label>Growth Rate</label>
            <value>{data.metrics.sessionGrowthRate.toFixed(1)}%/min</value>
          </div>
        </div>
      </div>

      <div className="scaling-configuration">
        <button onClick={() => setShowConfig(!showConfig)} className="btn-config">
          {showConfig ? 'Hide' : 'Show'} Configuration
        </button>

        {showConfig && (
          <div className="config-panel">
            <h4>Auto-Scaling Configuration</h4>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onConfigure({
                autoScale: formData.get('autoScale') === 'on',
                modeChangeCooldown: parseInt(formData.get('cooldown') as string),
                thresholds: {
                  normal: { min: 0, max: parseInt(formData.get('normalMax') as string) },
                  warning: { min: parseInt(formData.get('warningMin') as string), max: parseInt(formData.get('warningMax') as string) },
                  critical: { min: parseInt(formData.get('criticalMin') as string), max: parseInt(formData.get('criticalMax') as string) },
                  emergency: { min: parseInt(formData.get('emergencyMin') as string), max: parseInt(formData.get('emergencyMax') as string) }
                }
              });
            }}>
              <label>
                <input type="checkbox" name="autoScale" defaultChecked />
                Enable Auto-Scaling
              </label>
              <label>
                Mode Change Cooldown (ms):
                <input type="number" name="cooldown" defaultValue="300000" />
              </label>
              <div className="threshold-config">
                <h5>Thresholds</h5>
                <div className="threshold-row">
                  <label>Normal Max: <input type="number" name="normalMax" defaultValue="1000" /></label>
                  <label>Warning Min: <input type="number" name="warningMin" defaultValue="1000" /></label>
                  <label>Warning Max: <input type="number" name="warningMax" defaultValue="5000" /></label>
                </div>
                <div className="threshold-row">
                  <label>Critical Min: <input type="number" name="criticalMin" defaultValue="5000" /></label>
                  <label>Critical Max: <input type="number" name="criticalMax" defaultValue="20000" /></label>
                  <label>Emergency Min: <input type="number" name="emergencyMin" defaultValue="20000" /></label>
                </div>
                <label>Emergency Max: <input type="number" name="emergencyMax" defaultValue="100000" /></label>
              </div>
              <button type="submit">Apply Configuration</button>
            </form>
          </div>
        )}
      </div>

      <div className="scaling-history">
        <h3>Mode History</h3>
        <div className="history-chart">
          {data.history.map((entry, idx) => (
            <div
              key={idx}
              className={`history-entry ${entry.mode}`}
              style={{
                height: `${(entry.sessions / Math.max(...data.history.map(h => h.sessions))) * 100}%`
              }}
              title={`${entry.mode} - ${entry.sessions} sessions at ${new Date(entry.timestamp).toLocaleTimeString()}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Mobile Tab
const MobileTab: React.FC<{
  data: DashboardData['mobileSDK'];
  onConfigure: (config: any) => void;
}> = ({ data, onConfigure }) => {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="tab-content mobile">
      <div className="mobile-device-info">
        <h3>Device Information</h3>
        <div className="device-details">
          <div className="detail-row">
            <span>Platform:</span>
            <span>{data.emulation.deviceInfo.platform}</span>
          </div>
          <div className="detail-row">
            <span>Manufacturer:</span>
            <span>{data.emulation.deviceInfo.manufacturer}</span>
          </div>
          <div className="detail-row">
            <span>Model:</span>
            <span>{data.emulation.deviceInfo.model}</span>
          </div>
          <div className="detail-row">
            <span>Version:</span>
            <span>{data.emulation.deviceInfo.version}</span>
          </div>
          <div className="detail-row">
            <span>UUID:</span>
            <span>{data.emulation.deviceInfo.uuid}</span>
          </div>
        </div>
      </div>

      <div className="mobile-screen-info">
        <h3>Screen Information</h3>
        <div className="screen-details">
          <div className="detail-row">
            <span>Resolution:</span>
            <span>{data.emulation.screen.width} × {data.emulation.screen.height}</span>
          </div>
          <div className="detail-row">
            <span>Scale:</span>
            <span>{data.emulation.screen.scale}x</span>
          </div>
          <div className="detail-row">
            <span>Orientation:</span>
            <span>{data.emulation.screen.orientation}</span>
          </div>
        </div>
      </div>

      <div className="mobile-network-info">
        <h3>Network Information</h3>
        <div className="network-details">
          <div className="detail-row">
            <span>Type:</span>
            <span>{data.emulation.network.type}</span>
          </div>
          {data.emulation.network.effectiveType && (
            <div className="detail-row">
              <span>Effective Type:</span>
              <span>{data.emulation.network.effectiveType}</span>
            </div>
          )}
          {data.emulation.network.downlink && (
            <div className="detail-row">
              <span>Downlink:</span>
              <span>{data.emulation.network.downlink} Mbps</span>
            </div>
          )}
        </div>
      </div>

      <div className="mobile-metrics">
        <h3>Session Metrics</h3>
        <div className="metrics-grid">
          <div className="metric">
            <label>Session Duration</label>
            <value>{Math.floor(data.session.duration / 1000)}s</value>
          </div>
          <div className="metric">
            <label>Events Tracked</label>
            <value>{data.metrics.eventsTracked}</value>
          </div>
          <div className="metric">
            <label>Location Updates</label>
            <value>{data.metrics.locationUpdates}</value>
          </div>
          <div className="metric">
            <label>Network Requests</label>
            <value>{data.metrics.networkRequests}</value>
          </div>
          <div className="metric">
            <label>Cache Hits</label>
            <value>{data.metrics.cacheHits}</value>
          </div>
          <div className="metric">
            <label>Cache Misses</label>
            <value>{data.metrics.cacheMisses}</value>
          </div>
        </div>
      </div>

      <div className="mobile-configuration">
        <button onClick={() => setShowConfig(!showConfig)} className="btn-config">
          {showConfig ? 'Hide' : 'Show'} Configuration
        </button>

        {showConfig && (
          <div className="config-panel">
            <h4>Mobile SDK Configuration</h4>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onConfigure({
                appId: formData.get('appId'),
                deviceId: formData.get('deviceId'),
                platform: formData.get('platform'),
                appVersion: formData.get('appVersion'),
                trackEvents: formData.get('trackEvents') === 'on',
                trackLocation: formData.get('trackLocation') === 'on',
                emulateNative: formData.get('emulateNative') === 'on',
                debug: formData.get('debug') === 'on'
              });
            }}>
              <label>
                App ID:
                <input type="text" name="appId" defaultValue="com.newlife.tools" />
              </label>
              <label>
                Device ID:
                <input type="text" name="deviceId" placeholder="Auto-generated if empty" />
              </label>
              <label>
                Platform:
                <select name="platform" defaultValue="web">
                  <option value="web">Web</option>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                </select>
              </label>
              <label>
                App Version:
                <input type="text" name="appVersion" defaultValue="1.0.0" />
              </label>
              <label>
                <input type="checkbox" name="trackEvents" defaultChecked />
                Track Events
              </label>
              <label>
                <input type="checkbox" name="trackLocation" />
                Track Location
              </label>
              <label>
                <input type="checkbox" name="emulateNative" defaultChecked />
                Emulate Native Behavior
              </label>
              <label>
                <input type="checkbox" name="debug" />
                Debug Mode
              </label>
              <button type="submit">Apply Configuration</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// Branding Tab
const BrandingTab: React.FC<{
  data: DashboardData['whiteLabel'];
  onConfigure: (config: any) => void;
}> = ({ data, onConfigure }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  return (
    <div className="tab-content branding">
      <div className="brand-preview-section">
        <h3>Current Brand Configuration</h3>
        <div className="brand-info">
          <div className="brand-field">
            <label>Brand Name:</label>
            <span>{data.config.brandName}</span>
          </div>
          <div className="brand-field">
            <label>Primary Color:</label>
            <div className="color-preview">
              <div
                className="color-swatch"
                style={{ backgroundColor: data.config.colors.primary }}
              />
              <span>{data.config.colors.primary}</span>
            </div>
          </div>
          {data.config.colors.secondary && (
            <div className="brand-field">
              <label>Secondary Color:</label>
              <div className="color-preview">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: data.config.colors.secondary }}
                />
                <span>{data.config.colors.secondary}</span>
              </div>
            </div>
          )}
          {data.config.content?.companyName && (
            <div className="brand-field">
              <label>Company Name:</label>
              <span>{data.config.content.companyName}</span>
            </div>
          )}
          {data.config.content?.supportEmail && (
            <div className="brand-field">
              <label>Support Email:</label>
              <span>{data.config.content.supportEmail}</span>
            </div>
          )}
        </div>
      </div>

      <div className="brand-features">
        <h3>Features</h3>
        <div className="features-list">
          <div className="feature">
            <span>Show Powered By:</span>
            <span>{data.config.features?.showPoweredBy ? 'Yes' : 'No'}</span>
          </div>
          <div className="feature">
            <span>Custom Watermark:</span>
            <span>{data.config.features?.customWatermark ? 'Yes' : 'No'}</span>
          </div>
          <div className="feature">
            <span>White-Label Mode:</span>
            <span>{data.config.features?.whiteLabelMode ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {data.variants.length > 0 && (
        <div className="brand-variants">
          <h3>Saved Variants</h3>
          <div className="variants-list">
            {data.variants.map((variant) => (
              <div key={variant.id} className="variant-item">
                <span>{variant.name}</span>
                <button
                  onClick={() => {
                    (whiteLabel as any).loadBrandVariant(variant.id);
                  }}
                  className="btn-small"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="branding-actions">
        <button onClick={() => setShowConfig(!showConfig)} className="btn-config">
          {showConfig ? 'Hide' : 'Show'} Configuration
        </button>
        <button onClick={() => setShowImportExport(!showImportExport)} className="btn-config">
          Import/Export
        </button>
      </div>

      {showConfig && (
        <div className="config-panel">
          <h4>White-Label Configuration</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onConfigure({
              brandName: formData.get('brandName'),
              colors: {
                primary: formData.get('primaryColor'),
                secondary: formData.get('secondaryColor'),
                accent: formData.get('accentColor'),
                background: formData.get('backgroundColor'),
                text: formData.get('textColor')
              },
              content: {
                companyName: formData.get('companyName'),
                supportEmail: formData.get('supportEmail'),
                website: formData.get('website'),
                customFooter: formData.get('customFooter')
              },
              features: {
                showPoweredBy: formData.get('showPoweredBy') === 'on',
                customWatermark: formData.get('customWatermark') === 'on',
                whiteLabelMode: formData.get('whiteLabelMode') === 'on'
              }
            });
          }}>
            <label>
              Brand Name:
              <input type="text" name="brandName" defaultValue={data.config.brandName} />
            </label>
            <div className="color-config">
              <label>
                Primary Color:
                <input type="color" name="primaryColor" defaultValue={data.config.colors.primary} />
              </label>
              <label>
                Secondary Color:
                <input type="color" name="secondaryColor" defaultValue={data.config.colors.secondary} />
              </label>
              <label>
                Accent Color:
                <input type="color" name="accentColor" defaultValue={data.config.colors.accent} />
              </label>
              <label>
                Background Color:
                <input type="color" name="backgroundColor" defaultValue={data.config.colors.background} />
              </label>
              <label>
                Text Color:
                <input type="color" name="textColor" defaultValue={data.config.colors.text} />
              </label>
            </div>
            <label>
              Company Name:
              <input type="text" name="companyName" defaultValue={data.config.content?.companyName} />
            </label>
            <label>
              Support Email:
              <input type="email" name="supportEmail" defaultValue={data.config.content?.supportEmail} />
            </label>
            <label>
              Website:
              <input type="url" name="website" defaultValue={data.config.content?.website} />
            </label>
            <label>
              Custom Footer:
              <textarea name="customFooter" defaultValue={data.config.content?.customFooter} />
            </label>
            <div className="feature-config">
              <label>
                <input type="checkbox" name="showPoweredBy" defaultChecked={data.config.features?.showPoweredBy} />
                Show Powered By
              </label>
              <label>
                <input type="checkbox" name="customWatermark" defaultChecked={data.config.features?.customWatermark} />
                Custom Watermark
              </label>
              <label>
                <input type="checkbox" name="whiteLabelMode" defaultChecked={data.config.features?.whiteLabelMode} />
                White-Label Mode
              </label>
            </div>
            <button type="submit">Apply Configuration</button>
          </form>
        </div>
      )}

      {showImportExport && (
        <div className="import-export-panel">
          <h4>Import/Export Configuration</h4>
          <div className="export-section">
            <button
              onClick={() => {
                const config = whiteLabel.exportConfig();
                const blob = new Blob([config], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'white-label-config.json';
                a.click();
              }}
              className="btn-export"
            >
              Export Configuration
            </button>
          </div>
          <div className="import-section">
            <label>
              Import Configuration:
              <textarea
                placeholder="Paste JSON configuration here..."
                onChange={(e) => {
                  try {
                    const config = JSON.parse(e.target.value);
                    onConfigure(config);
                    e.target.value = '';
                  } catch (error) {
                    console.error('Invalid JSON:', error);
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// CDN Tab
const CDNTab: React.FC<{
  data: DashboardData['cdn'];
  onPurgeCache: (paths?: string[]) => void;
  onConfigure: (config: any) => void;
}> = ({ data, onPurgeCache, onConfigure }) => {
  const [purgePaths, setPurgePaths] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const handlePurge = () => {
    const paths = purgePaths.split('\n').filter(p => p.trim());
    onPurgeCache(paths.length > 0 ? paths : undefined);
    setPurgePaths('');
  };

  return (
    <div className="tab-content cdn">
      <div className="cdn-status">
        <h3>CDN Status</h3>
        <div className="status-indicator">
          <span className={`status-dot ${data.status.connected ? 'connected' : 'disconnected'}`} />
          {data.status.connected ? 'Connected' : 'Disconnected'}
        </div>
        <div className="provider-info">
          <p>Provider: {data.status.provider}</p>
          <p>Last Sync: {new Date(data.status.lastSync).toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="cdn-zones">
        <h3>Zones</h3>
        <div className="zones-list">
          {data.status.zones.map((zone) => (
            <div key={zone.id} className={`zone-item ${zone.status}`}>
              <span>{zone.name}</span>
              <span className="zone-status">{zone.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cdn-cache-stats">
        <h3>Cache Statistics</h3>
        <div className="stats-grid">
          <div className="stat">
            <label>Hit Ratio</label>
            <value>{data.stats.hitRatio.toFixed(1)}%</value>
          </div>
          <div className="stat">
            <label>Total Requests</label>
            <value>{data.stats.requests.toLocaleString()}</value>
          </div>
          <div className="stat">
            <label>Cached Requests</label>
            <value>{data.stats.cachedRequests.toLocaleString()}</value>
          </div>
          <div className="stat">
            <label>Uncached Requests</label>
            <value>{data.stats.uncachedRequests.toLocaleString()}</value>
          </div>
          <div className="stat">
            <label>Bandwidth Saved</label>
            <value>{formatBytes(data.stats.bandwidthSaved)}</value>
          </div>
        </div>
      </div>

      <div className="cdn-purge">
        <h3>Purge Cache</h3>
        <div className="purge-form">
          <label>
            Paths to purge (one per line, leave empty for all):
            <textarea
              value={purgePaths}
              onChange={(e) => setPurgePaths(e.target.value)}
              placeholder="/api/*&#10;/assets/main.js&#10;/images/*"
            />
          </label>
          <button onClick={handlePurge} className="btn-purge">
            Purge Cache
          </button>
        </div>
      </div>

      <div className="cdn-configuration">
        <button onClick={() => setShowConfig(!showConfig)} className="btn-config">
          {showConfig ? 'Hide' : 'Show'} Configuration
        </button>

        {showConfig && (
          <div className="config-panel">
            <h4>CDN Configuration</h4>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onConfigure({
                provider: formData.get('provider'),
                apiKey: formData.get('apiKey'),
                zoneId: formData.get('zoneId'),
                cacheLevel: formData.get('cacheLevel'),
                browserCacheTTL: parseInt(formData.get('browserCacheTTL') as string),
                edgeCacheTTL: parseInt(formData.get('edgeCacheTTL') as string),
                autoPurge: formData.get('autoPurge') === 'on',
                autoMinify: formData.get('autoMinify') === 'on',
                brotli: formData.get('brotli') === 'on',
                http2: formData.get('http2') === 'on',
                enableAnalytics: formData.get('enableAnalytics') === 'on'
              });
            }}>
              <label>
                Provider:
                <select name="provider" defaultValue="cloudflare">
                  <option value="cloudflare">Cloudflare</option>
                  <option value="aws">AWS CloudFront</option>
                  <option value="fastly">Fastly</option>
                  <option value="gcp">Google Cloud CDN</option>
                  <option value="azure">Azure CDN</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                API Key:
                <input type="password" name="apiKey" placeholder="Your API key" />
              </label>
              <label>
                Zone ID:
                <input type="text" name="zoneId" placeholder="Your zone ID" />
              </label>
              <label>
                Cache Level:
                <select name="cacheLevel" defaultValue="standard">
                  <option value="aggressive">Aggressive</option>
                  <option value="standard">Standard</option>
                  <option value="basic">Basic</option>
                </select>
              </label>
              <label>
                Browser Cache TTL (seconds):
                <input type="number" name="browserCacheTTL" defaultValue="14400" />
              </label>
              <label>
                Edge Cache TTL (seconds):
                <input type="number" name="edgeCacheTTL" defaultValue="7200" />
              </label>
              <div className="feature-config">
                <label>
                  <input type="checkbox" name="autoPurge" defaultChecked />
                  Auto Purge
                </label>
                <label>
                  <input type="checkbox" name="autoMinify" defaultChecked />
                  Auto Minify
                </label>
                <label>
                  <input type="checkbox" name="brotli" defaultChecked />
                  Brotli Compression
                </label>
                <label>
                  <input type="checkbox" name="http2" defaultChecked />
                  HTTP/2
                </label>
                <label>
                  <input type="checkbox" name="enableAnalytics" defaultChecked />
                  Enable Analytics
                </label>
              </div>
              <button type="submit">Apply Configuration</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default Week7Dashboard;