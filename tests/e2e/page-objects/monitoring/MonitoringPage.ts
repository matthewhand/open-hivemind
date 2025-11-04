import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * MonitoringPage object for system monitoring functionality
 */
export class MonitoringPage extends BasePage {
  readonly monitoringHeading: Locator;
  readonly performanceMonitorHeading: Locator;
  readonly refreshButton: Locator;
  readonly resourceUtilization: Locator;
  readonly alertPanel: Locator;
  readonly systemMetrics: Locator;
  readonly cpuUsage: Locator;
  readonly memoryUsage: Locator;
  readonly diskUsage: Locator;
  readonly networkActivity: Locator;
  readonly logViewer: Locator;
  readonly statusIndicators: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize monitoring-specific locators
    this.monitoringHeading = page.locator('h1:has-text("System Monitoring"), [data-testid="monitoring-title"]');
    this.performanceMonitorHeading = page.locator('h2:has-text("Performance Monitor"), [data-testid="performance-monitor-title"]');
    this.refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh-button"]');
    this.resourceUtilization = page.locator('text=Resource Utilisation, [data-testid="resource-utilization"]');
    this.alertPanel = page.locator('[role="alert"], .alert, [data-testid="alert-panel"]');
    this.systemMetrics = page.locator('.metrics, [data-testid="system-metrics"]');
    this.cpuUsage = page.locator('[data-testid="cpu-usage"], .cpu-usage');
    this.memoryUsage = page.locator('[data-testid="memory-usage"], .memory-usage');
    this.diskUsage = page.locator('[data-testid="disk-usage"], .disk-usage');
    this.networkActivity = page.locator('[data-testid="network-activity"], .network-activity');
    this.logViewer = page.locator('[data-testid="log-viewer"], .log-viewer');
    this.statusIndicators = page.locator('.status-indicator, [data-testid="status-indicators"]');
  }

  /**
   * Navigate to monitoring page
   */
  async navigateToMonitoring(): Promise<void> {
    await this.navigateTo('/admin/monitoring');
    await this.waitForPageLoad();
    await this.waitForLoadingToComplete();
  }

  /**
   * Wait for monitoring page to be fully loaded
   */
  async waitForMonitoringLoad(): Promise<void> {
    await this.waitForElementVisible(this.monitoringHeading);
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if monitoring heading is visible
   */
  async isMonitoringHeadingVisible(): Promise<boolean> {
    return await this.isElementVisible(this.monitoringHeading);
  }

  /**
   * Check if performance monitor heading is visible
   */
  async isPerformanceMonitorVisible(): Promise<boolean> {
    return await this.isElementVisible(this.performanceMonitorHeading);
  }

  /**
   * Check if refresh button is visible
   */
  async isRefreshButtonVisible(): Promise<boolean> {
    return await this.isElementVisible(this.refreshButton);
  }

  /**
   * Click refresh button
   */
  async clickRefresh(): Promise<void> {
    if (await this.isElementVisible(this.refreshButton)) {
      await this.clickElement(this.refreshButton);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Wait for refresh button to be enabled after clicking
   */
  async waitForRefreshEnabled(): Promise<void> {
    if (await this.isElementVisible(this.refreshButton)) {
      await this.waitForElementEnabled(this.refreshButton);
    }
  }

  /**
   * Check if resource utilization section is visible
   */
  async isResourceUtilizationVisible(): Promise<boolean> {
    return await this.isElementVisible(this.resourceUtilization);
  }

  /**
   * Check if alert panel is visible
   */
  async isAlertPanelVisible(): Promise<boolean> {
    return await this.isElementVisible(this.alertPanel);
  }

  /**
   * Get alert message text if present
   */
  async getAlertMessage(): Promise<string | null> {
    if (await this.isAlertPanelVisible()) {
      return await this.getElementText(this.alertPanel);
    }
    return null;
  }

  /**
   * Check if alert contains error-like text
   */
  async hasErrorAlert(): Promise<boolean> {
    const alertText = await this.getAlertMessage();
    if (!alertText) return false;
    
    const errorPatterns = /error|failed|unavailable|critical|warning/i;
    return errorPatterns.test(alertText);
  }

  /**
   * Check if system metrics are visible
   */
  async isSystemMetricsVisible(): Promise<boolean> {
    return await this.isElementVisible(this.systemMetrics);
  }

  /**
   * Get CPU usage value
   */
  async getCpuUsage(): Promise<string | null> {
    if (await this.isElementVisible(this.cpuUsage)) {
      return await this.getElementText(this.cpuUsage);
    }
    return null;
  }

  /**
   * Get memory usage value
   */
  async getMemoryUsage(): Promise<string | null> {
    if (await this.isElementVisible(this.memoryUsage)) {
      return await this.getElementText(this.memoryUsage);
    }
    return null;
  }

  /**
   * Get disk usage value
   */
  async getDiskUsage(): Promise<string | null> {
    if (await this.isElementVisible(this.diskUsage)) {
      return await this.getElementText(this.diskUsage);
    }
    return null;
  }

  /**
   * Get network activity information
   */
  async getNetworkActivity(): Promise<string | null> {
    if (await this.isElementVisible(this.networkActivity)) {
      return await this.getElementText(this.networkActivity);
    }
    return null;
  }

  /**
   * Get all system metrics
   */
  async getAllMetrics(): Promise<Record<string, string | null>> {
    return {
      cpu: await this.getCpuUsage(),
      memory: await this.getMemoryUsage(),
      disk: await this.getDiskUsage(),
      network: await this.getNetworkActivity(),
    };
  }

  /**
   * Check if metrics are loading
   */
  async areMetricsLoading(): Promise<boolean> {
    const loadingIndicators = this.page.locator('.loading, .spinner, [data-testid="loading"]');
    return await loadingIndicators.count() > 0;
  }

  /**
   * Wait for metrics to load
   */
  async waitForMetricsToLoad(): Promise<void> {
    // Wait for loading indicators to disappear
    await this.waitForLoadingToComplete();
    
    // Wait for at least one metric to be visible
    await this.waitForCondition(async () => {
      const metrics = await this.getAllMetrics();
      return Object.values(metrics).some(value => value !== null && value !== '');
    }, { timeout: 10000 });
  }

  /**
   * Check if log viewer is visible
   */
  async isLogViewerVisible(): Promise<boolean> {
    return await this.isElementVisible(this.logViewer);
  }

  /**
   * Get log entries
   */
  async getLogEntries(): Promise<string[]> {
    if (await this.isLogViewerVisible()) {
      const logLines = this.logViewer.locator('.log-line, .log-entry, div, p');
      const count = await logLines.count();
      const entries: string[] = [];
      
      for (let i = 0; i < Math.min(count, 50); i++) { // Limit to first 50 entries
        const entryText = await logLines.nth(i).textContent();
        if (entryText && entryText.trim()) {
          entries.push(entryText.trim());
        }
      }
      
      return entries;
    }
    return [];
  }

  /**
   * Check if status indicators are visible
   */
  async areStatusIndicatorsVisible(): Promise<boolean> {
    return await this.isElementVisible(this.statusIndicators);
  }

  /**
   * Get status of specific service
   */
  async getServiceStatus(serviceName: string): Promise<string | null> {
    const serviceIndicator = this.page.locator(`[data-testid="${serviceName}-status"], .status:has-text("${serviceName}")`);
    if (await this.isElementVisible(serviceIndicator)) {
      return await this.getElementText(serviceIndicator);
    }
    return null;
  }

  /**
   * Get all service statuses
   */
  async getAllServiceStatuses(): Promise<Record<string, string | null>> {
    const services = ['database', 'api', 'messaging', 'monitoring'];
    const statuses: Record<string, string | null> = {};
    
    for (const service of services) {
      statuses[service] = await this.getServiceStatus(service);
    }
    
    return statuses;
  }

  /**
   * Click on specific metric to view details
   */
  async clickMetricDetails(metricName: string): Promise<void> {
    const metric = this.page.locator(`[data-testid="${metricName}-details"], .metric:has-text("${metricName}")`);
    if (await this.isElementVisible(metric)) {
      await this.clickElement(metric);
      await this.waitForLoadingToComplete();
    } else {
      throw new Error(`Metric "${metricName}" not found`);
    }
  }

  /**
   * Set auto-refresh interval
   */
  async setAutoRefreshInterval(seconds: number): Promise<void> {
    const refreshControl = this.page.locator('[data-testid="auto-refresh"], .refresh-control');
    if (await this.isElementVisible(refreshControl)) {
      const intervalInput = refreshControl.locator('input, select');
      if (await intervalInput.count() > 0) {
        await intervalInput.first().fill(seconds.toString());
        await this.page.keyboard.press('Enter');
        await this.waitForLoadingToComplete();
      }
    }
  }

  /**
   * Enable/disable auto-refresh
   */
  async toggleAutoRefresh(enabled: boolean): Promise<void> {
    const toggle = this.page.locator('[data-testid="auto-refresh-toggle"], .refresh-toggle');
    if (await this.isElementVisible(toggle)) {
      const isChecked = await toggle.isChecked();
      if ((enabled && !isChecked) || (!enabled && isChecked)) {
        await this.clickElement(toggle);
        await this.waitForLoadingToComplete();
      }
    }
  }

  /**
   * Export monitoring data
   */
  async exportMonitoringData(format: 'json' | 'csv' = 'json'): Promise<void> {
    const exportButton = this.page.locator(`button:has-text("Export"), [data-testid="export-${format}"]`);
    if (await this.isElementVisible(exportButton)) {
      await this.clickElement(exportButton);
      
      // Handle download if applicable
      const downloadPromise = this.page.waitForEvent('download');
      await downloadPromise;
    }
  }

  /**
   * Take screenshot of monitoring page
   */
  async takeMonitoringScreenshot(name: string = 'monitoring'): Promise<void> {
    await this.takeScreenshot(name);
  }

  /**
   * Check if monitoring page has proper accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Check for proper heading hierarchy
    await expect(this.monitoringHeading).toBeVisible();
    
    if (await this.performanceMonitorHeading.isVisible()) {
      await expect(this.performanceMonitorHeading).toBeVisible();
    }
    
    // Check for proper landmark regions
    const main = this.page.locator('main, [role="main"]');
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible();
    }

    // Check for proper table structure if metrics are displayed in tables
    const tables = this.page.locator('table');
    const tableCount = await tables.count();
    
    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);
      await expect(table).toHaveAttribute('role', 'table');
      
      // Check for proper headers
      const headers = table.locator('th');
      if (await headers.count() > 0) {
        await expect(headers.first()).toBeVisible();
      }
    }

    // Call base accessibility check
    await super.checkAccessibility();
  }

  /**
   * Wait for real-time updates
   */
  async waitForRealtimeUpdate(): Promise<void> {
    const initialMetrics = await this.getAllMetrics();
    
    // Wait for metrics to change (indicating real-time update)
    await this.waitForCondition(async () => {
      const currentMetrics = await this.getAllMetrics();
      return JSON.stringify(initialMetrics) !== JSON.stringify(currentMetrics);
    }, { timeout: 15000 });
  }
}