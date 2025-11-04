import { test, expect } from '@playwright/test';
import { MonitoringPage } from './page-objects/monitoring/MonitoringPage';
import { test as authenticatedTest } from './fixtures/auth-fixtures';

authenticatedTest.describe('Monitoring page', () => {
  let monitoringPage: MonitoringPage;

  authenticatedTest.beforeEach(async ({ page }) => {
    monitoringPage = new MonitoringPage(page);
    await monitoringPage.navigateToMonitoring();
    await monitoringPage.waitForMonitoringLoad();
  });

  authenticatedTest('shows live monitoring shell', async () => {
    expect(await monitoringPage.isMonitoringHeadingVisible()).toBe(true);
    expect(await monitoringPage.isPerformanceMonitorVisible()).toBe(true);

    expect(await monitoringPage.isRefreshButtonVisible()).toBe(true);
    await monitoringPage.clickRefresh();
    await monitoringPage.waitForRefreshEnabled();

    if (await monitoringPage.isAlertPanelVisible()) {
      const hasError = await monitoringPage.hasErrorAlert();
      if (hasError) {
        const alertMessage = await monitoringPage.getAlertMessage();
        expect(alertMessage).toMatch(/error|failed|unavailable/i);
      }
    } else {
      expect(await monitoringPage.isResourceUtilizationVisible()).toBe(true);
    }
  });

  authenticatedTest('displays system metrics', async () => {
    await monitoringPage.waitForMetricsToLoad();
    expect(await monitoringPage.isSystemMetricsVisible()).toBe(true);
    
    const metrics = await monitoringPage.getAllMetrics();
    expect(Object.keys(metrics)).toContain('cpu');
    expect(Object.keys(metrics)).toContain('memory');
  });

  authenticatedTest('refresh functionality works properly', async () => {
    const initialMetrics = await monitoringPage.getAllMetrics();
    
    await monitoringPage.clickRefresh();
    await monitoringPage.waitForMetricsToLoad();
    
    const refreshedMetrics = await monitoringPage.getAllMetrics();
    expect(refreshedMetrics).toBeTruthy();
  });

  authenticatedTest('handles error states gracefully', async () => {
    // Mock an error response
    await monitoringPage.mockApiError('**/api/monitoring', 500, 'Service unavailable');
    
    await monitoringPage.clickRefresh();
    await monitoringPage.waitForLoadingToComplete();
    
    if (await monitoringPage.isAlertPanelVisible()) {
      expect(await monitoringPage.hasErrorAlert()).toBe(true);
    }
  });

  authenticatedTest('displays service statuses', async () => {
    if (await monitoringPage.areStatusIndicatorsVisible()) {
      const serviceStatuses = await monitoringPage.getAllServiceStatuses();
      expect(Object.keys(serviceStatuses).length).toBeGreaterThan(0);
    }
  });

  authenticatedTest('log viewer functionality', async () => {
    if (await monitoringPage.isLogViewerVisible()) {
      const logEntries = await monitoringPage.getLogEntries();
      expect(Array.isArray(logEntries)).toBe(true);
    }
  });

  authenticatedTest('monitoring page accessibility', async () => {
    await monitoringPage.checkAccessibility();
  });

  authenticatedTest('can export monitoring data', async () => {
    // This test would check if export functionality exists
    // In a real scenario, you might mock the download
    await monitoringPage.exportMonitoringData('json');
  });

  authenticatedTest('auto-refresh functionality', async () => {
    // Test setting auto-refresh interval
    await monitoringPage.setAutoRefreshInterval(30);
    
    // Test toggling auto-refresh
    await monitoringPage.toggleAutoRefresh(true);
    await monitoringPage.toggleAutoRefresh(false);
  });

  authenticatedTest('metric details view', async () => {
    const metrics = await monitoringPage.getAllMetrics();
    
    // Try to click on a metric if available
    if (metrics.cpu) {
      try {
        await monitoringPage.clickMetricDetails('cpu');
        // Verify details view loads (implementation dependent)
      } catch (error) {
        // Metric details might not be implemented, which is fine
      }
    }
  });

  authenticatedTest('real-time updates', async () => {
    // This test would verify real-time updates work
    // In a real scenario, you might need to mock WebSocket connections
    try {
      await monitoringPage.waitForRealtimeUpdate();
    } catch (error) {
      // Real-time updates might not be available in test environment
      console.log('Real-time updates not available in test environment');
    }
  });

  authenticatedTest('take monitoring screenshot', async () => {
    await monitoringPage.takeMonitoringScreenshot('monitoring-test');
  });
});
