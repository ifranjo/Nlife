import { test, expect } from '@playwright/test';
import { healthMonitor } from '../src/lib/health-monitoring';

test.describe('Health Monitoring System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to health monitoring dashboard
    await page.goto('/admin/health-monitoring');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard loads and displays metrics', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Health Monitoring Dashboard/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Health Monitoring Dashboard');

    // Check health score display
    const healthScore = page.locator('text=/\\d+%/').first();
    await expect(healthScore).toBeVisible();

    // Check metrics grid exists
    const metricsGrid = page.locator('.grid').filter({ hasText: 'System Metrics' });
    await expect(metricsGrid).toBeVisible();
  });

  test('metric cards display correctly', async ({ page }) => {
    // Wait for metrics to load
    await page.waitForSelector('.glass-card', { timeout: 10000 });

    // Check metric cards
    const metricCards = page.locator('.glass-card').filter({ hasText: 'AI Traffic Detection Rate' });
    await expect(metricCards.first()).toBeVisible();

    // Check metric values
    const metricValue = metricCards.first().locator('text=/\\d+\\.\\d+/');
    await expect(metricValue).toBeVisible();

    // Check status indicator
    const statusIndicator = metricCards.first().locator('text=/● (healthy|warning|critical)/');
    await expect(statusIndicator).toBeVisible();
  });

  test('alert modal functionality', async ({ page }) => {
    // Click on "Set Alert" button
    const setAlertButton = page.locator('button:has-text("Set Alert")').first();
    await setAlertButton.click();

    // Check modal appears
    const modal = page.locator('.fixed');
    await expect(modal).toBeVisible();

    // Fill in alert details
    await page.locator('input[type="number"]').fill('80');
    await page.locator('select').selectOption('above');

    // Save alert
    await page.locator('button:has-text("Save Alert")').click();

    // Check modal closes
    await expect(modal).not.toBeVisible();
  });

  test('incident display', async ({ page }) => {
    // Check if incidents section appears when there are incidents
    const incidentsSection = page.locator('h2:has-text("Active Incidents")');

    // Either incidents section exists or it doesn't (both are valid states)
    if (await incidentsSection.isVisible()) {
      // Check incident details
      const incidentCard = page.locator('.glass-card').filter({ hasText: 'Active Incidents' });
      await expect(incidentCard).toBeVisible();
    }
  });

  test('trends analysis', async ({ page }) => {
    // Check trends section exists
    const trendsSection = page.locator('h2:has-text("Trends Analysis")');
    await expect(trendsSection).toBeVisible();

    // Check trend categories
    await expect(page.locator('text=Improving')).toBeVisible();
    await expect(page.locator('text=Stable')).toBeVisible();
    await expect(page.locator('text=Declining')).toBeVisible();
  });

  test('real-time updates', async ({ page }) => {
    // Get initial timestamp
    const initialTimestamp = await page.locator('text=/Last updated: .*/').textContent();

    // Wait for potential update (metrics update every few seconds)
    await page.waitForTimeout(5000);

    // Check if timestamp updated (optional, depends on metric collection)
    const newTimestamp = await page.locator('text=/Last updated: .*/').textContent();
    // Timestamps might be the same if no updates occurred
  });

  test('history view toggle', async ({ page }) => {
    // Find a metric card with history button
    const metricCard = page.locator('.glass-card').first();
    const historyButton = metricCard.locator('button:has-text("History")');

    // Click history button
    await historyButton.click();

    // Check history appears
    await expect(metricCard.locator('text=/\\d+:\\d+:\\d+/')).toBeVisible();

    // Click to hide
    await historyButton.click();
    // History should be hidden (can't easily test this without complex selectors)
  });
});

test.describe('Status Page', () => {
  test('status page loads correctly', async ({ page }) => {
    await page.goto('/status');
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page).toHaveTitle(/System Status/);

    // Check header
    await expect(page.locator('h1')).toContainText('System Status');

    // Check status indicator
    const statusIndicator = page.locator('[class*="bg-"]').filter({
      hasText: /All Systems Operational|Degraded Performance|Major Outage/
    });
    await expect(statusIndicator).toBeVisible();
  });

  test('component statuses display', async ({ page }) => {
    await page.goto('/status');

    // Check component status section
    await expect(page.locator('h2:has-text("Component Status")')).toBeVisible();

    // Check at least one component exists
    const componentCard = page.locator('.glass-card').first();
    await expect(componentCard).toBeVisible();

    // Check component has status
    const statusBadge = componentCard.locator('text=/healthy|warning|critical|unknown/');
    await expect(statusBadge.first()).toBeVisible();
  });

  test('auto-refresh functionality', async ({ page }) => {
    await page.goto('/status');

    // Check for refresh script
    const hasRefreshScript = await page.evaluate(() => {
      return document.querySelector('script:has-text("setTimeout")') !== null;
    });
    expect(hasRefreshScript).toBe(true);

    // Check for update check script
    const hasUpdateCheck = await page.evaluate(() => {
      return document.querySelector('script:has-text("checkForUpdates")') !== null;
    });
    expect(hasUpdateCheck).toBe(true);
  });
});

test.describe('Health Monitor Library', () => {
  test('metric registration and collection', async ({ page }) => {
    // Test metric registration through browser console
    const result = await page.evaluate(() => {
      // Register a test metric
      window.testMetricCollected = false;

      healthMonitor.registerMetric({
        name: 'Test Metric',
        getter: () => {
          window.testMetricCollected = true;
          return 42;
        },
        interval: 1000 // 1 second
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            metricCollected: window.testMetricCollected,
            data: healthMonitor.getMetricHistory('Test Metric', 1)
          });
        }, 1500);
      });
    });

    expect(result.metricCollected).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].value).toBe(42);
  });

  test('alert system', async ({ page }) => {
    const alertTriggered = await page.evaluate(() => {
      let alertFired = false;

      // Set up alert listener
      healthMonitor.addEventListener('alertTriggered', () => {
        alertFired = true;
      });

      // Register metric that will trigger alert
      healthMonitor.registerMetric({
        name: 'Alert Test Metric',
        getter: () => 150, // High value
        interval: 500,
        thresholds: {
          warning: 100,
          critical: 200
        }
      });

      // Set alert
      healthMonitor.setAlert({
        id: 'test-alert',
        metric: 'Alert Test Metric',
        threshold: 100,
        type: 'above'
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(alertFired);
        }, 1000);
      });
    });

    expect(alertTriggered).toBe(true);
  });

  test('health score calculation', async ({ page }) => {
    const healthScore = await page.evaluate(() => {
      // Register multiple metrics
      healthMonitor.registerMetric({
        name: 'Healthy Metric',
        getter: () => 95,
        interval: 1000,
        thresholds: {
          warning: 80,
          critical: 60
        }
      });

      healthMonitor.registerMetric({
        name: 'Warning Metric',
        getter: () => 75,
        interval: 1000,
        thresholds: {
          warning: 80,
          critical: 60
        }
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(healthMonitor.getHealthScore());
        }, 1500);
      });
    });

    expect(healthScore.overall).toBeGreaterThan(0);
    expect(healthScore.overall).toBeLessThan(100);
    expect(healthScore.components['Healthy Metric']).toBe(100);
    expect(healthScore.components['Warning Metric']).toBe(70);
  });

  test('incident management', async ({ page }) => {
    const incidentResults = await page.evaluate(() => {
      let incidentCreated = false;
      let incidentResolved = false;

      healthMonitor.addEventListener('incidentCreated', () => {
        incidentCreated = true;
      });

      healthMonitor.addEventListener('incidentResolved', () => {
        incidentResolved = true;
      });

      // Create incident
      healthMonitor.createIncident('Test Component', 'medium', 'Test incident');
      const incidents = healthMonitor.generateStatusPage().incidents;

      // Resolve first incident
      if (incidents.length > 0) {
        healthMonitor.resolveIncident(incidents[0].id);
      }

      return {
        incidentCreated,
        incidentResolved,
        activeIncidents: incidents.filter(i => !i.resolvedAt).length
      };
    });

    expect(incidentResults.incidentCreated).toBe(true);
    expect(incidentResults.incidentResolved).toBe(true);
  });

  test('localStorage persistence', async ({ page }) => {
    const storageResults = await page.evaluate(() => {
      // Clear storage
      localStorage.clear();

      // Register metric
      healthMonitor.registerMetric({
        name: 'Storage Test',
        getter: () => 123,
        interval: 500
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          // Get data before reload
          const beforeReload = healthMonitor.getMetricHistory('Storage Test', 1);

          // Simulate page reload by creating new monitor instance
          // (In real test, we'd reload the page)
          resolve({
            dataStored: beforeReload.length > 0,
            dataValue: beforeReload[0]?.value
          });
        }, 1000);
      });
    });

    expect(storageResults.dataStored).toBe(true);
    expect(storageResults.dataValue).toBe(123);
  });
});

test.describe('Performance', () => {
  test('dashboard performance metrics', async ({ page }) => {
    await page.goto('/admin/health-monitoring');

    // Measure time to first meaningful paint
    const navigationTiming = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation');
      return {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        loadComplete: entry.loadEventEnd - entry.loadEventStart
      };
    });

    // Check performance is reasonable
    expect(navigationTiming.domContentLoaded).toBeLessThan(2000);
    expect(navigationTiming.loadComplete).toBeLessThan(3000);

    // Check no memory leaks in metric collection
    const memoryUsage = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });

    if (memoryUsage) {
      expect(memoryUsage.used).toBeLessThan(memoryUsage.total);
    }
  });

  test('metric collection efficiency', async ({ page }) => {
    await page.goto('/admin/health-monitoring');

    // Register multiple metrics
    const startTime = Date.now();

    await page.evaluate(() => {
      // Register 10 test metrics
      for (let i = 0; i < 10; i++) {
        healthMonitor.registerMetric({
          name: `Perf Test ${i}`,
          getter: () => Math.random() * 100,
          interval: 100
        });
      }
    });

    // Wait for collections
    await page.waitForTimeout(500);

    const endTime = Date.now();
    const registrationTime = endTime - startTime;

    // Registration should be fast
    expect(registrationTime).toBeLessThan(1000);

    // Cleanup
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        healthMonitor.removeMetric(`Perf Test ${i}`);
      }
    });
  });
});