/**
 * Week 7: Scaling & Automation Index
 *
 * Export all scaling and automation modules for easy importing
 * and provide unified API for Week 7 HAMBREDEVICTORIA protocol
 */

// Auto-Scaling System
export { autoScaling } from './auto-scaling';
export type {
  LoadMetrics,
  ScalingMode,
  ResourceAllocation,
  AutoScalingConfig,
  ScalingThresholds
} from './auto-scaling';

// Mobile SDK Emulation
export { mobileSDK } from './mobile-sdk';
export type { MobileSDKConfig } from './mobile-sdk';

// White-Label Configuration
export { whiteLabel } from './white-label';
export type { WhiteLabelConfig } from './white-label';

// CDN Integration
export { cdnIntegration } from './cdn-integration';
export type { CDNConfig } from './cdn-integration';

// Week 7 Integration Layer
export { week7Integration } from './week7-integration';
export type { Week7IntegrationConfig } from './week7-integration';

// Health Check System
export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastCheck: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: HealthCheck[];
  uptime: number;
  version: string;
}

// Week 7 API Interface
export interface Week7API {
  // Auto-scaling
  getCurrentMode: typeof autoScaling.getCurrentMode;
  getCurrentMetrics: typeof autoScaling.getCurrentMetrics;
  scaleTo: typeof autoScaling.scaleTo;
  startMonitoring: typeof autoScaling.startMonitoring;
  stopMonitoring: typeof autoScaling.stopMonitoring;

  // Mobile SDK
  configureMobileSDK: typeof mobileSDK.configure;
  getMobileEmulation: typeof mobileSDK.getEmulationData;
  trackMobileEvent: typeof mobileSDK.trackEvent;

  // White-label
  configureWhiteLabel: typeof whiteLabel.configure;
  getBrandConfig: typeof whiteLabel.getBrandConfig;
  applyBranding: typeof whiteLabel.applyBranding;

  // CDN
  configureCDN: typeof cdnIntegration.configure;
  getCDNStatus: typeof cdnIntegration.getStatus;
  purgeCache: typeof cdnIntegration.purgeCache;

  // Health checks
  getSystemStatus: () => Promise<SystemStatus>;
  getComponentHealth: (component: string) => Promise<HealthCheck>;
  runHealthChecks: () => Promise<SystemStatus>;
}

// Combined Week 7 instance
export const week7ScalingAutomation = {
  // Auto-scaling methods
  getCurrentMode: autoScaling.getCurrentMode.bind(autoScaling),
  getCurrentMetrics: autoScaling.getCurrentMetrics.bind(autoScaling),
  getMetricsHistory: autoScaling.getMetricsHistory.bind(autoScaling),
  getCapacityMetrics: autoScaling.getCapacityMetrics.bind(autoScaling),
  getModeHistory: autoScaling.getModeHistory.bind(autoScaling),
  scaleTo: autoScaling.scaleTo.bind(autoScaling),
  startMonitoring: autoScaling.startMonitoring.bind(autoScaling),
  stopMonitoring: autoScaling.stopMonitoring.bind(autoScaling),
  configure: autoScaling.configure.bind(autoScaling),

  // Integration layer methods
  getIntegrationStatus: () => week7Integration.getStatus(),
  subscribeToEvents: (eventType: string, callback: Function) => week7Integration.subscribe(eventType as any, callback),
  getRecentEvents: (count?: number) => week7Integration.getRecentEvents(count),
  configureIntegration: (config: Partial<Week7IntegrationConfig>) => week7Integration.configure(config),

  // Mobile SDK methods
  configureMobileSDK: (config: MobileSDKConfig) => mobileSDK.configure(config),
  getMobileEmulation: () => mobileSDK.getEmulationData(),
  trackMobileEvent: (event: string, data: any) => mobileSDK.trackEvent(event, data),
  getMobileMetrics: () => mobileSDK.getMetrics(),

  // White-label methods
  configureWhiteLabel: (config: WhiteLabelConfig) => whiteLabel.configure(config),
  getBrandConfig: () => whiteLabel.getBrandConfig(),
  applyBranding: (element: HTMLElement) => whiteLabel.applyBranding(element),
  getBrandVariants: () => whiteLabel.getBrandVariants(),

  // CDN methods
  configureCDN: (config: CDNConfig) => cdnIntegration.configure(config),
  getCDNStatus: () => cdnIntegration.getStatus(),
  purgeCache: (paths?: string[]) => cdnIntegration.purgeCache(paths),
  getCacheStats: () => cdnIntegration.getCacheStats(),

  // Health check methods
  async getSystemStatus(): Promise<SystemStatus> {
    return performHealthChecks();
  },

  async getComponentHealth(component: string): Promise<HealthCheck> {
    return checkComponentHealth(component);
  },

  async runHealthChecks(): Promise<SystemStatus> {
    return performHealthChecks();
  }
};

// Health check implementation
async function performHealthChecks(): Promise<SystemStatus> {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Check auto-scaling system
  const autoScalingCheck = await checkAutoScalingHealth();
  checks.push(autoScalingCheck);

  // Check mobile SDK
  const mobileSDKCheck = await checkMobileSDKHealth();
  checks.push(mobileSDKCheck);

  // Check white-label system
  const whiteLabelCheck = await checkWhiteLabelHealth();
  checks.push(whiteLabelCheck);

  // Check CDN integration
  const cdnCheck = await checkCDNHealth();
  checks.push(cdnCheck);

  // Determine overall status
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
  const degradedCount = checks.filter(c => c.status === 'degraded').length;

  let overall: SystemStatus['overall'] = 'healthy';
  if (unhealthyCount > 0) {
    overall = 'unhealthy';
  } else if (degradedCount > 0) {
    overall = 'degraded';
  }

  return {
    overall,
    timestamp: Date.now(),
    checks,
    uptime: Date.now() - (window.__week7StartTime || startTime),
    version: '7.0.0'
  };
}

async function checkComponentHealth(component: string): Promise<HealthCheck> {
  const startTime = Date.now();

  switch (component) {
    case 'auto-scaling':
      return checkAutoScalingHealth();
    case 'mobile-sdk':
      return checkMobileSDKHealth();
    case 'white-label':
      return checkWhiteLabelHealth();
    case 'cdn':
      return checkCDNHealth();
    default:
      return {
        component,
        status: 'unknown',
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        message: 'Unknown component'
      };
  }
}

async function checkAutoScalingHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const mode = autoScaling.getCurrentMode();
    const metrics = autoScaling.getCurrentMetrics();

    let status: HealthCheck['status'] = 'healthy';
    if (metrics.aiTrafficRatio > 80) {
      status = 'degraded';
    }
    if (mode.name === 'emergency') {
      status = 'unhealthy';
    }

    return {
      component: 'auto-scaling',
      status,
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: "Running in " + mode.name + " mode",
      details: {
        mode: mode.name,
        sessions: metrics.currentSessions,
        aiTrafficRatio: metrics.aiTrafficRatio
      }
    };
  } catch (error) {
    return {
      component: 'auto-scaling',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: "Error: " + error.message
    };
  }
}

async function checkMobileSDKHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const emulation = mobileSDK.getEmulationData();

    return {
      component: 'mobile-sdk',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: 'Mobile SDK emulation active',
      details: emulation
    };
  } catch (error) {
    return {
      component: 'mobile-sdk',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: "Error: " + error.message
    };
  }
}

async function checkWhiteLabelHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const config = whiteLabel.getBrandConfig();

    return {
      component: 'white-label',
      status: config ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: config ? 'White-label configured' : 'White-label not configured',
      details: config ? { brand: config.brandName } : {}
    };
  } catch (error) {
    return {
      component: 'white-label',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: "Error: " + error.message
    };
  }
}

async function checkCDNHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    const status = cdnIntegration.getStatus();

    return {
      component: 'cdn',
      status: status.connected ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: status.connected ? 'CDN connected' : 'CDN not connected',
      details: status
    };
  } catch (error) {
    return {
      component: 'cdn',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      message: "Error: " + error.message
    };
  }
}

// Configuration helper
export function configureWeek7(options: {
  autoScaling?: Partial<AutoScalingConfig>;
  mobileSDK?: Partial<MobileSDKConfig>;
  whiteLabel?: Partial<WhiteLabelConfig>;
  cdn?: Partial<CDNConfig>;
  healthCheckInterval?: number;
}) {
  if (options.autoScaling) {
    autoScaling.configure(options.autoScaling);
  }
  if (options.mobileSDK) {
    mobileSDK.configure(options.mobileSDK);
  }
  if (options.whiteLabel) {
    whiteLabel.configure(options.whiteLabel);
  }
  if (options.cdn) {
    cdnIntegration.configure(options.cdn);
  }
  if (options.integration) {
    week7Integration.configure(options.integration);
  }

  // Store start time for uptime calculation
  if (typeof window !== 'undefined' && !window.__week7StartTime) {
    window.__week7StartTime = Date.now();
  }

  console.log('🚀 Week 7 Scaling & Automation configured');
}

// Usage example
export const week7Example = `
// Configure Week 7
configureWeek7({
  autoScaling: {
    autoScale: true,
    modeChangeCooldown: 300000,
    thresholds: {
      normal: { min: 0, max: 1000 },
      warning: { min: 1000, max: 5000 },
      critical: { min: 5000, max: 20000 },
      emergency: { min: 20000, max: 100000 }
    }
  },
  mobileSDK: {
    appId: 'com.newlife.tools',
    deviceId: 'web-emulator',
    trackEvents: true,
    emulateNative: true
  },
  whiteLabel: {
    brandName: 'New Life Solutions',
    primaryColor: '#00ff00',
    logoUrl: '/logo.svg',
    supportEmail: 'support@newlifesolutions.dev'
  },
  cdn: {
    provider: 'cloudflare',
    apiKey: 'your-api-key',
    zoneId: 'your-zone-id',
    autoPurge: true
  },
  integration: {
    enableCrossCommunication: true,
    autoOptimize: true,
    eventBusEnabled: true
  }
});

// Use auto-scaling
const mode = week7ScalingAutomation.getCurrentMode();
console.log('Current scaling mode:', mode.name);

// Monitor metrics
const metrics = week7ScalingAutomation.getCurrentMetrics();
console.log('Current sessions:', metrics.currentSessions);
console.log('AI traffic ratio:', metrics.aiTrafficRatio + '%');

// Get system status
week7ScalingAutomation.getSystemStatus().then(status => {
  console.log('System status:', status.overall);
  status.checks.forEach(check => {
    console.log(\`- \${check.component}: \${check.status} (\${check.responseTime}ms)\`);
  });
});

// Scale manually if needed
week7ScalingAutomation.scaleTo('warning');

// Configure mobile tracking
week7ScalingAutomation.configureMobileSDK({
  appId: 'com.newlife.mobile',
  trackEvents: true
});

// Apply white-label branding
week7ScalingAutomation.configureWhiteLabel({
  brandName: 'Custom Tools',
  primaryColor: '#ff6600'
});

// Purge CDN cache
week7ScalingAutomation.purgeCache(['/api/*', '/assets/*']);

// Subscribe to cross-component events
const unsubscribe = week7ScalingAutomation.subscribeToEvents('scaling_changed', (event) => {
  console.log('Scaling mode changed:', event.data.newMode);
});

// Get recent integration events
const events = week7ScalingAutomation.getRecentEvents(5);
events.forEach(event => {
  console.log('[' + new Date(event.timestamp).toLocaleTimeString() + ']' + event.type + ':', event.data);
});

// Configure integration layer
week7ScalingAutomation.configureIntegration({
  autoOptimize: true,
  enableCrossCommunication: true
});
`;

// Global type declarations
declare global {
  interface Window {
    __week7StartTime?: number;
    week7ScalingAutomation: typeof week7ScalingAutomation;
  }
}

// Auto-initialize in production
if (typeof window !== 'undefined') {
  const initWeek7 = () => {
    if (window.location.hostname !== 'localhost') {
      // Basic configuration for production
      configureWeek7({
        autoScaling: {
          autoScale: true,
          modeChangeCooldown: 300000
        }
      });
      console.log('🚀 Week 7 Scaling & Automation system initialized');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeek7);
  } else {
    initWeek7();
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.week7ScalingAutomation = week7ScalingAutomation;
}

console.log('🚀 Week 7 Scaling & Automation modules loaded');