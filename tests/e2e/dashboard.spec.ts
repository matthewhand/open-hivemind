import { test, expect } from '@playwright/test';
import { DashboardPage } from './page-objects/admin/DashboardPage';
import { test as authenticatedTest } from './fixtures/auth-fixtures';

authenticatedTest.describe('Dashboard experience', () => {
  let dashboardPage: DashboardPage;

  authenticatedTest.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.navigateToDashboard();
    await dashboardPage.waitForDashboardLoad();
  });

  authenticatedTest('shows overview and performance tabs', async () => {
    expect(await dashboardPage.isDashboardHeadingVisible()).toBe(true);
    expect(await dashboardPage.isBotStatusVisible()).toBe(true);

    await dashboardPage.clickPerformanceTab();
    expect(await dashboardPage.isPerformanceMetricsVisible()).toBe(true);
    expect(await dashboardPage.isPerformanceTabActive()).toBe(true);

    await dashboardPage.clickOverviewTab();
    expect(await dashboardPage.isOverviewTabActive()).toBe(true);
  });

  authenticatedTest('renders dashboard summary cards', async () => {
    expect(await dashboardPage.areSummaryCardsVisible()).toBe(true);
    
    const metrics = await dashboardPage.getDashboardMetrics();
    expect(metrics['Active Bots']).toBeTruthy();
    expect(metrics['Total Messages']).toBeTruthy();
    expect(metrics['Error Rate']).toBeTruthy();
    expect(metrics['Uptime']).toBeTruthy();
  });

  authenticatedTest('can navigate between tabs', async () => {
    const availableTabs = await dashboardPage.getAvailableTabs();
    expect(availableTabs.length).toBeGreaterThan(0);
    
    if (availableTabs.includes('Overview')) {
      await dashboardPage.navigateToTab('Overview');
      expect(await dashboardPage.isOverviewTabActive()).toBe(true);
    }
    
    if (availableTabs.includes('Performance')) {
      await dashboardPage.navigateToTab('Performance');
      expect(await dashboardPage.isPerformanceTabActive()).toBe(true);
    }
  });

  authenticatedTest('refresh functionality works', async () => {
    await dashboardPage.clickRefresh();
    await dashboardPage.waitForRefreshEnabled();
    expect(await dashboardPage.isRefreshButtonVisible()).toBe(true);
  });

  authenticatedTest('navigation menu is functional', async () => {
    if (await dashboardPage.isNavigationMenuVisible()) {
      const menuItems = await dashboardPage.getNavigationMenuItems();
      expect(menuItems.length).toBeGreaterThan(0);
    }
  });

  authenticatedTest('dashboard has data loaded', async () => {
    await dashboardPage.waitForMetricsToLoad();
    expect(await dashboardPage.hasDashboardData()).toBe(true);
  });

  authenticatedTest('dashboard is responsive', async () => {
    await dashboardPage.checkResponsiveDesign();
    expect(await dashboardPage.isDashboardHeadingVisible()).toBe(true);
  });

  authenticatedTest('dashboard has proper accessibility', async () => {
    await dashboardPage.checkAccessibility();
  });

  authenticatedTest('can take dashboard screenshot', async () => {
    await dashboardPage.takeDashboardScreenshot('dashboard-test');
  });

  authenticatedTest('renders DaisyUI stats and supports selection', async () => {
    expect(await dashboardPage.getStatsCardCount()).toBeGreaterThan(0);

    const rowCount = await dashboardPage.getBotRowCount();
    if (rowCount > 0) {
      await dashboardPage.selectFirstBotRow();
      expect(await dashboardPage.isSelectionAlertVisible()).toBe(true);
      const alertText = await dashboardPage.getSelectionAlertText();
      expect(alertText).toContain('Selected');
      await dashboardPage.clearSelection();
    }
  });

  authenticatedTest('opens and closes create bot modal', async () => {
    await dashboardPage.openCreateBotModal();
    expect(await dashboardPage.isCreateBotModalVisible()).toBe(true);
    await dashboardPage.closeCreateBotModal();
    expect(await dashboardPage.isCreateBotModalVisible()).toBe(false);
  });
});
