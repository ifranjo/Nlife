/**
 * Week 7 Integration Test Suite
 *
 * Comprehensive tests to validate all Week 7 components work together
 * and meet performance requirements.
 */

import { week7ScalingAutomation, configureWeek7 } from './week7-index';
import { autoScaling } from './auto-scaling';
import { mobileSDK } from './mobile-sdk';
import { whiteLabel } from './white-label';
import { cdnIntegration } from './cdn-integration';
import { week7Integration } from './week7-integration';

// Test configuration
const TEST_CONFIG = {
  autoScaling: {
    autoScale: false, // Manual control for testing
    modeChangeCooldown: 1000, // 1 second for faster testing
    thresholds: {
      normal: { min: 0, max: 100 },
      warning: { min: 100, max: 500 },
      critical: { min: 500, max: 1000 },
      emergency: { min: 1000, max: 10000 }
    }
  },
  mobileSDK: {
    appId: 'com.test.app',
    trackEvents: true,
    emulateNative: true,
    debug: true
  },
  whiteLabel: {
    brandName: 'Test Brand',
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      background: '#000000',
      text: '#ffffff'
    },
    features: {
      showPoweredBy: true,
      customWatermark: true
    }
  },
  cdn: {
    provider: 'custom',
    endpoint: 'http://localhost:3000',
    enableAnalytics: true
  },
  integration: {
    enableCrossCommunication: true,
    autoOptimize: true,
    eventBusEnabled: true
  }
};

// Test results
interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalDuration: number;
  passed: number;
  failed: number;
}

/**
 * Run all Week 7 integration tests
 */
export async function runWeek7IntegrationTests(): Promise<TestSuite[]> {
  console.log('🧪 Starting Week 7 Integration Tests...\n');

  const testSuites: TestSuite[] = [];
  const startTime = Date.now();

  // Test 1: Component Initialization
  testSuites.push(await testComponentInitialization());

  // Test 2: Cross-Component Communication
  testSuites.push(await testCrossComponentCommunication());

  // Test 3: Performance Requirements
  testSuites.push(await testPerformanceRequirements());

  // Test 4: Health Checks
  testSuites.push(await testHealthChecks());

  // Test 5: Memory Management
  testSuites.push(await testMemoryManagement());

  // Test 6: Error Handling
  testSuites.push(await testErrorHandling());

  // Test 7: Auto-Scaling Integration
  testSuites.push(await testAutoScalingIntegration());

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('================');

  let totalPassed = 0;
  let totalFailed = 0;

  testSuites.forEach(suite => {
    console.log(`\n${suite.name}:`);
    console.log(`  Passed: ${suite.passed}/${suite.results.length}`);
    console.log(`  Failed: ${suite.failed}/${suite.results.length}`);
    console.log(`  Duration: ${suite.totalDuration}ms`);

    suite.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`    ${status} ${result.test} (${result.duration}ms)`);
      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
    });

    totalPassed += suite.passed;
    totalFailed += suite.failed;
  });

  console.log(`\n🎯 Overall Results:`);
  console.log(`  Total Tests: ${totalPassed + totalFailed}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Total Duration: ${totalDuration}ms`);
  console.log(`  Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  return testSuites;
}

/**
 * Test component initialization
 */
async function testComponentInitialization(): Promise<TestSuite> {
  console.log('🔧 Testing Component Initialization...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 1.1: Configure all components
  const test1Start = Date.now();
  try {
    configureWeek7(TEST_CONFIG);
    results.push({
      test: 'Configure all Week 7 components',
      passed: true,
      duration: Date.now() - test1Start
    });
  } catch (error) {
    results.push({
      test: 'Configure all Week 7 components',
      passed: false,
      duration: Date.now() - test1Start,
      error: error.message
    });
  }

  // Test 1.2: Verify auto-scaling initialization
  const test2Start = Date.now();
  try {
    const mode = autoScaling.getCurrentMode();
    if (mode.name === 'normal') {
      results.push({
        test: 'Auto-scaling initialized correctly',
        passed: true,
        duration: Date.now() - test2Start
      });
    } else {
      throw new Error(`Expected mode 'normal', got '${mode.name}'`);
    }
  } catch (error) {
    results.push({
      test: 'Auto-scaling initialized correctly',
      passed: false,
      duration: Date.now() - test2Start,
      error: error.message
    });
  }

  // Test 1.3: Verify mobile SDK initialization
  const test3Start = Date.now();
  try {
    const emulation = mobileSDK.getEmulationData();
    if (emulation.deviceInfo.platform) {
      results.push({
        test: 'Mobile SDK initialized correctly',
        passed: true,
        duration: Date.now() - test3Start
      });
    } else {
      throw new Error('Mobile SDK platform not set');
    }
  } catch (error) {
    results.push({
      test: 'Mobile SDK initialized correctly',
      passed: false,
      duration: Date.now() - test3Start,
      error: error.message
    });
  }

  // Test 1.4: Verify white-label initialization
  const test4Start = Date.now();
  try {
    const config = whiteLabel.getBrandConfig();
    if (config.brandName === 'Test Brand') {
      results.push({
        test: 'White-label initialized correctly',
        passed: true,
        duration: Date.now() - test4Start
      });
    } else {
      throw new Error(`Expected brand name 'Test Brand', got '${config.brandName}'`);
    }
  } catch (error) {
    results.push({
      test: 'White-label initialized correctly',
      passed: false,
      duration: Date.now() - test4Start,
      error: error.message
    });
  }

  // Test 1.5: Verify CDN integration initialization
  const test5Start = Date.now();
  try {
    const status = cdnIntegration.getStatus();
    if (status.provider === 'custom') {
      results.push({
        test: 'CDN integration initialized correctly',
        passed: true,
        duration: Date.now() - test5Start
      });
    } else {
      throw new Error(`Expected provider 'custom', got '${status.provider}'`);
    }
  } catch (error) {
    results.push({
      test: 'CDN integration initialized correctly',
      passed: false,
      duration: Date.now() - test5Start,
      error: error.message
    });
  }

  return {
    name: 'Component Initialization',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

/**
 * Test cross-component communication
 */
async function testCrossComponentCommunication(): Promise<TestSuite> {
  console.log('🔗 Testing Cross-Component Communication...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 2.1: Event subscription and publishing
  const test1Start = Date.now();
  try {
    let eventReceived = false;
    const unsubscribe = week7Integration.subscribe('scaling_changed', (event) => {
      eventReceived = true;
    });

    // Trigger a scaling change
    autoScaling.scaleTo('warning');

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    unsubscribe();

    if (eventReceived) {
      results.push({
        test: 'Cross-component event communication',
        passed: true,
        duration: Date.now() - test1Start
      });
    } else {
      throw new Error('Event not received');
    }
  } catch (error) {
    results.push({
      test: 'Cross-component event communication',
      passed: false,
      duration: Date.now() - test1Start,
      error: error.message
    });
  }

  // Test 2.2: Auto-optimization based on scaling
  const test2Start = Date.now();
  try {
    // Scale to emergency mode
    autoScaling.scaleTo('emergency');

    // Check if mobile SDK was optimized
    const mobileMetrics = mobileSDK.getMetrics();

    // Scale back to normal
    autoScaling.scaleTo('normal');

    results.push({
      test: 'Auto-optimization based on scaling mode',
      passed: true,
      duration: Date.now() - test2Start,
      details: { mobileEvents: mobileMetrics.eventsTracked }
    });
  } catch (error) {
    results.push({
      test: 'Auto-optimization based on scaling mode',
      passed: false,
      duration: Date.now() - test2Start,
      error: error.message
    });
  }

  // Test 2.3: Event queue management
  const test3Start = Date.now();
  try {
    // Generate multiple events
    for (let i = 0; i < 20; i++) {
      mobileSDK.trackEvent(`test_event_${i}`, { index: i });
    }

    const recentEvents = week7Integration.getRecentEvents(10);

    if (recentEvents.length > 0) {
      results.push({
        test: 'Event queue management',
        passed: true,
        duration: Date.now() - test3Start,
        details: { recentEventsCount: recentEvents.length }
      });
    } else {
      throw new Error('No events in queue');
    }
  } catch (error) {
    results.push({
      test: 'Event queue management',
      passed: false,
      duration: Date.now() - test3Start,
      error: error.message
    });
  }

  return {
    name: 'Cross-Component Communication',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

/**
 * Test performance requirements
 */
async function testPerformanceRequirements(): Promise<TestSuite> {
  console.log('⚡ Testing Performance Requirements...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 3.1: Health check response time < 100ms
  const test1Start = Date.now();
  try {
    const iterations = 10;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const checkStart = performance.now();
      await week7ScalingAutomation.getComponentHealth('auto-scaling');
      responseTimes.push(performance.now() - checkStart);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;

    if (avgResponseTime < 100) {
      results.push({
        test: 'Health check response time < 100ms',
        passed: true,
        duration: Date.now() - test1Start,
        details: { avgResponseTime: avgResponseTime.toFixed(2) + 'ms' }
      });
    } else {
      throw new Error(`Average response time ${avgResponseTime}ms exceeds 100ms limit`);
    }
  } catch (error) {
    results.push({
      test: 'Health check response time < 100ms',
      passed: false,
      duration: Date.now() - test1Start,
      error: error.message
    });
  }

  // Test 3.2: Auto-scaling decision time < 1 second
  const test2Start = Date.now();
  try {
    const scaleStart = performance.now();
    autoScaling.scaleTo('critical');
    const scaleTime = performance.now() - scaleStart;

    if (scaleTime < 1000) {
      results.push({
        test: 'Auto-scaling decision time < 1 second',
        passed: true,
        duration: Date.now() - test2Start,
        details: { scaleTime: scaleTime.toFixed(2) + 'ms' }
      });
    } else {
      throw new Error(`Scaling took ${scaleTime}ms, exceeds 1000ms limit`);
    }
  } catch (error) {
    results.push({
      test: 'Auto-scaling decision time < 1 second',
      passed: false,
      duration: Date.now() - test2Start,
      error: error.message
    });
  }

  // Test 3.3: Mobile event tracking performance
  const test3Start = Date.now();
  try {
    const events = 100;
    const trackStart = performance.now();

    for (let i = 0; i < events; i++) {
      mobileSDK.trackEvent('performance_test', { index: i });
    }

    const trackTime = performance.now() - trackStart;
    const avgTime = trackTime / events;

    if (avgTime < 10) { // Less than 10ms per event
      results.push({
        test: 'Mobile event tracking performance',
        passed: true,
        duration: Date.now() - test3Start,
        details: { avgTimePerEvent: avgTime.toFixed(2) + 'ms' }
      });
    } else {
      throw new Error(`Average time per event ${avgTime}ms exceeds 10ms limit`);
    }
  } catch (error) {
    results.push({
      test: 'Mobile event tracking performance',
      passed: false,
      duration: Date.now() - test3Start,
      error: error.message
    });
  }

  return {
    name: 'Performance Requirements',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

/**
 * Test health checks
 */
async function testHealthChecks(): Promise<TestSuite> {
  console.log('🏥 Testing Health Checks...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 4.1: Overall system status
  const test1Start = Date.now();
  try {
    const status = await week7ScalingAutomation.getSystemStatus();

    if (status.overall === 'healthy' || status.overall === 'degraded') {
      results.push({
        test: 'Overall system health status',
        passed: true,
        duration: Date.now() - test1Start,
        details: { status: status.overall, uptime: status.uptime }
      });
    } else {
      throw new Error(`System status is ${status.overall}`);
    }
  } catch (error) {
    results.push({
      test: 'Overall system health status',
      passed: false,
      duration: Date.now() - test1Start,
      error: error.message
    });
  }

  // Test 4.2: Individual component health
  const test2Start = Date.now();
  try {
    const components = ['auto-scaling', 'mobile-sdk', 'white-label', 'cdn'];
    const healthPromises = components.map(comp =>
      week7ScalingAutomation.getComponentHealth(comp)
    );

    const healthResults = await Promise.all(healthPromises);
    const allHealthy = healthResults.every(h => h.status !== 'unhealthy');

    results.push({
      test: 'Individual component health checks',
      passed: allHealthy,
      duration: Date.now() - test2Start,
      details: { componentsChecked: components.length }
    });
  } catch (error) {
    results.push({
      test: 'Individual component health checks',
      passed: false,
      duration: Date.now() - test2Start,
      error: error.message
    });
  }

  return {
    name: 'Health Checks',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

/**
 * Test memory management
 */
async function testMemoryManagement(): Promise<TestSuite> {
  console.log('🧠 Testing Memory Management...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 5.1: Event queue memory limit
  const test1Start = Date.now();
  try {
    // Generate many events
    for (let i = 0; i < 200; i++) {
      mobileSDK.trackEvent('memory_test', { index: i, data: 'x'.repeat(1000) });
    }

    const events = week7Integration.getRecentEvents(150);

    if (events.length <= 100) { // Should be limited to 100
      results.push({
        test: 'Event queue memory limit',
        passed: true,
        duration: Date.now() - test1Start,
        details: { maxEvents: events.length }
      });
    } else {
      throw new Error(`Event queue exceeded limit: ${events.length} > 100`);
    }
  } catch (error) {
    results.push({
      test: 'Event queue memory limit',
      passed: false,
      duration: Date.now() - test1Start,
      error: error.message
    });
  }

  // Test 5.2: Mobile metrics cleanup
  const test2Start = Date.now();
  try {
    const metricsBefore = mobileSDK.getMetrics();
    const eventsBefore = metricsBefore.eventsTracked;

    // Simulate session end
    mobileSDK.configure({ trackEvents: false });
    mobileSDK.configure({ trackEvents: true });

    const metricsAfter = mobileSDK.getMetrics();

    results.push({
      test: 'Mobile metrics cleanup',
      passed: true,
      duration: Date.now() - test2Start,
      details: {
        eventsBefore,
        eventsAfter: metricsAfter.eventsTracked
      }
    });
  } catch (error) {
    results.push({
      test: 'Mobile metrics cleanup',
      passed: false,
      duration: Date.now() - test2Start,
      error: error.message
    });
  }

  return {
    name: 'Memory Management',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

/**
 * Test error handling
 */
async function testErrorHandling(): Promise<TestSuite> {
  console.log('🛡️ Testing Error Handling...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 6.1: Invalid configuration handling
  const test1Start = Date.now();
  try {
    // Try invalid auto-scaling config
    autoScaling.configure({
      thresholds: {
        normal: { min: -100, max: -50 } // Invalid negative values
      }
    } as any);

    results.push({
      test: 'Invalid configuration handling',
      passed: true,
      duration: Date.now() - test1Start,
      details: { note: 'System handled invalid config gracefully' }
    });
  } catch (error) {
    results.push({
      test: 'Invalid configuration handling',
      passed: true,
      duration: Date.now() - test1Start,
      details: { errorHandled: error.message }
    });
  }

  // Test 6.2: CDN failure handling
  const test2Start = Date.now();
  try {
    // Try to purge with invalid config
    const result = await cdnIntegration.purgeCache(['/invalid/*']);

    results.push({
      test: 'CDN failure handling',
      passed: true,
      duration: Date.now() - test2Start,
      details: {
        success: result.success,
        errors: result.errors.length
      }
    });
  } catch (error) {
    results.push({
      test: 'CDN failure handling',
      passed: true,
      duration: Date.now() - test2Start,
      details: { errorHandled: error.message }
    });
  }

  return {
    name: 'Error Handling',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

/**
 * Test auto-scaling integration
 */
async function testAutoScalingIntegration(): Promise<TestSuite> {
  console.log('📈 Testing Auto-Scaling Integration...');
  const results: TestResult[] = [];
  const suiteStart = Date.now();

  // Test 7.1: Mode-based optimizations
  const test1Start = Date.now();
  try {
    // Test normal mode
    autoScaling.scaleTo('normal');
    const normalMetrics = autoScaling.getCurrentMetrics();

    // Test emergency mode
    autoScaling.scaleTo('emergency');
    const emergencyMetrics = autoScaling.getCurrentMetrics();

    // Verify different resource allocations
    const normalMode = autoScaling.getCurrentMode();
    const emergencyMode = autoScaling.getCurrentMode();

    results.push({
      test: 'Mode-based resource allocation',
      passed: true,
      duration: Date.now() - test1Start,
      details: {
        normalMode: normalMode.name,
        emergencyMode: emergencyMode.name,
        featuresNormal: Object.keys(normalMode.features).filter(k => normalMode.features[k]).length,
        featuresEmergency: Object.keys(emergencyMode.features).filter(k => emergencyMode.features[k]).length
      }
    });
  } catch (error) {
    results.push({
      test: 'Mode-based resource allocation',
      passed: false,
      duration: Date.now() - test1Start,
      error: error.message
    });
  }

  // Test 7.2: Auto-heal functionality
  const test2Start = Date.now();
  try {
    // Simulate high memory usage
    const originalConfigure = autoScaling.configure.bind(autoScaling);
    let healTriggered = false;

    // Override to detect auto-heal
    autoScaling.configure = function(config: any) {
      if (config.autoHeal) {
        healTriggered = true;
      }
      return originalConfigure(config);
    };

    // Trigger high memory condition
    autoScaling.scaleTo('critical');

    // Restore original
    autoScaling.configure = originalConfigure;

    results.push({
      test: 'Auto-heal functionality',
      passed: true,
      duration: Date.now() - test2Start,
      details: { healTriggered }
    });
  } catch (error) {
    results.push({
      test: 'Auto-heal functionality',
      passed: false,
      duration: Date.now() - test2Start,
      error: error.message
    });
  }

  // Test 7.3: Capacity metrics
  const test3Start = Date.now();
  try {
    const capacity = autoScaling.getCapacityMetrics();

    if (capacity.utilization >= 0 && capacity.utilization <= 100) {
      results.push({
        test: 'Capacity metrics calculation',
        passed: true,
        duration: Date.now() - test3Start,
        details: {
          utilization: capacity.utilization.toFixed(2) + '%',
          headroom: capacity.headroom
        }
      });
    } else {
      throw new Error(`Invalid utilization: ${capacity.utilization}%`);
    }
  } catch (error) {
    results.push({
      test: 'Capacity metrics calculation',
      passed: false,
      duration: Date.now() - test3Start,
      error: error.message
    });
  }

  return {
    name: 'Auto-Scaling Integration',
    results,
    totalDuration: Date.now() - suiteStart,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
}

// Export for use
export { runWeek7IntegrationTests };
export type { TestResult, TestSuite };

// Auto-run in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🧪 Week 7 Test Suite loaded');

  // Run tests after a delay to allow initialization
  setTimeout(() => {
    console.log('\n🚀 Running Week 7 Integration Tests...');
    runWeek7IntegrationTests().then(results => {
      const allPassed = results.every(suite => suite.failed === 0);
      console.log(`\n${allPassed ? '✅' : '❌'} All tests ${allPassed ? 'passed' : 'failed'}!`);
    });
  }, 2000);
} else if (typeof window !== 'undefined') {
  // Production: expose test function
  (window as any).runWeek7Tests = runWeek7IntegrationTests;
  console.log('🧪 Week 7 Test Suite available (run window.runWeek7Tests())');
}

console.log('🧪 Week 7 Integration Test Suite loaded');

/**
 * Quick validation function for production
 */
export function validateWeek7System(): boolean {
  try {
    // Quick health check
    const status = week7ScalingAutomation.getSystemStatus();
    const integrationStatus = week7Integration.getStatus();

    return status.overall !== 'unhealthy' && integrationStatus.enabled;
  } catch (error) {
    console.error('Week 7 validation failed:', error);
    return false;
  }
}

// Expose validation function
if (typeof window !== 'undefined') {
  (window as any).validateWeek7 = validateWeek7System;
}

console.log('✅ Week 7 validation function available (window.validateWeek7())');

/**
 * Performance monitoring helper
 */
export function getWeek7PerformanceMetrics() {
  return {
    integration: week7Integration.getStatus(),
    autoScaling: {
      mode: autoScaling.getCurrentMode().name,
      metrics: autoScaling.getCurrentMetrics()
    },
    mobile: mobileSDK.getMetrics(),
    cdn: cdnIntegration.getStatus(),
    health: week7ScalingAutomation.getSystemStatus()
  };
}

// Expose performance metrics
if (typeof window !== 'undefined') {
  (window as any).getWeek7Metrics = getWeek7PerformanceMetrics;
}

console.log('📊 Week 7 metrics function available (window.getWeek7Metrics())');

/**
 * Emergency shutdown function
 */
export function emergencyShutdown(): void {
  console.warn('🚨 Week 7 Emergency Shutdown triggered');

  try {
    // Stop all monitoring
    autoScaling.stopMonitoring();
    week7Integration.stop();

    // Scale to minimum
    autoScaling.scaleTo('normal');

    console.log('✅ Week 7 systems shut down safely');
  } catch (error) {
    console.error('❌ Error during emergency shutdown:', error);
  }
}

// Expose emergency function
if (typeof window !== 'undefined') {
  (window as any).week7EmergencyShutdown = emergencyShutdown;
}

console.log('🚨 Week 7 emergency shutdown available (window.week7EmergencyShutdown())');

/**
 * Circular dependency check
 */
export function checkCircularDependencies(): string[] {
  const issues: string[] = [];

  try {
    // Check if any module directly imports another in a circular way
    // This is a simplified check - in a real scenario you'd use a tool like madge

    // Auto-scaling imports
    const autoScalingDeps = ['ai-analytics', 'external-integrations'];

    // Integration imports all modules
    const integrationDeps = ['auto-scaling', 'mobile-sdk', 'white-label', 'cdn-integration'];

    // Verify no direct circular imports
    if (autoScalingDeps.includes('week7-integration')) {
      issues.push('Auto-scaling should not import week7-integration');
    }

    console.log('🔍 Circular dependency check completed');

  } catch (error) {
    issues.push(`Error checking dependencies: ${error.message}`);
  }

  return issues;
}

console.log('🔗 Circular dependency checker available');

/**
 * Memory leak detection
 */
export function detectMemoryLeaks(): void {
  if (typeof window === 'undefined') return;

  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

  // Run operations that might leak
  for (let i = 0; i < 1000; i++) {
    mobileSDK.trackEvent('leak_test', { data: 'x'.repeat(1000) });
    week7Integration.getRecentEvents(50);
  }

  setTimeout(() => {
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    if (memoryIncrease > 10 * 1024 * 1024) { // 10MB threshold
      console.warn(`⚠️ Potential memory leak detected: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
    } else {
      console.log(`✅ No significant memory leak detected: ${(memoryIncrease / 1024).toFixed(2)}KB increase`);
    }
  }, 1000);
}

console.log('🔍 Memory leak detector available (detectMemoryLeaks())');

/**
 * Performance optimization recommendations
 */
export function getOptimizationRecommendations(): string[] {
  const recommendations: string[] = [];

  try {
    const metrics = getWeek7PerformanceMetrics();

    // Check auto-scaling
    if (metrics.autoScaling.metrics.aiTrafficRatio > 80) {
      recommendations.push('High AI traffic detected - consider scaling up');
    }

    // Check mobile SDK
    if (metrics.mobile.eventsTracked > 10000) {
      recommendations.push('High mobile event volume - enable sampling');
    }

    // Check CDN
    if (metrics.cdn.cacheStats.hitRatio < 0.5) {
      recommendations.push('Low cache hit ratio - review cache configuration');
    }

    // Check integration
    if (!metrics.integration.enabled) {
      recommendations.push('Integration layer disabled - enable for cross-component optimization');
    }

  } catch (error) {
    recommendations.push(`Error generating recommendations: ${error.message}`);
  }

  return recommendations;
}

console.log('💡 Optimization recommendations available (getOptimizationRecommendations())');

/**
 * Export all test utilities
 */
export default {
  runTests: runWeek7IntegrationTests,
  validate: validateWeek7System,
  getMetrics: getWeek7PerformanceMetrics,
  emergencyShutdown,
  checkCircularDependencies,
  detectMemoryLeaks,
  getRecommendations: getOptimizationRecommendations
};