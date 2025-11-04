import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * DashboardPage object for dashboard functionality
 */
export class DashboardPage extends BasePage {
  readonly dashboardHeading: Locator;
  readonly overviewTab: Locator;
  readonly performanceTab: Locator;
  readonly botStatusCard: Locator;
  readonly activeBotsCard: Locator;
  readonly totalMessagesCard: Locator;
  readonly errorRateCard: Locator;
  readonly uptimeCard: Locator;
  readonly performanceMetrics: Locator;
  readonly refreshButton: Locator;
  readonly navigationMenu: Locator;
  readonly statsCards: Locator;
  readonly createBotButton: Locator;
  readonly createBotModal: Locator;
  readonly dataTableRows: Locator;
  readonly dataTableSearch: Locator;
  readonly selectionAlert: Locator;
  readonly dataTableCheckboxes: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize dashboard-specific locators
    this.dashboardHeading = page.locator('h1:has-text("Open-Hivemind Dashboard"), [data-testid="dashboard-title"]');
    this.overviewTab = page.locator('button[role="tab"]:has-text("Overview"), [data-testid="overview-tab"]');
    this.performanceTab = page.locator('button[role="tab"]:has-text("Performance"), [data-testid="performance-tab"]');
    this.botStatusCard = page.locator('[data-testid="bot-status"], .bot-status-card');
    this.activeBotsCard = page.locator('text=Active Bots, [data-testid="active-bots"]');
    this.totalMessagesCard = page.locator('text=Total Messages, [data-testid="total-messages"]');
    this.errorRateCard = page.locator('text=Error Rate, [data-testid="error-rate"]');
    this.uptimeCard = page.locator('text=Uptime, [data-testid="uptime"]');
    this.performanceMetrics = page.locator('text=Performance Metrics, [data-testid="performance-metrics"]');
    this.refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh-button"]');
    this.navigationMenu = page.locator('nav, [role="navigation"], .navigation');
    this.statsCards = page.locator('.stats, [data-testid="dashboard-stats"]');
    this.createBotButton = page.locator('button:has-text("Create Bot")');
    this.createBotModal = page.locator('.modal.modal-open');
    this.dataTableRows = page.locator('table tbody tr');
    this.dataTableCheckboxes = page.locator('table tbody tr input[type="checkbox"]');
    this.dataTableSearch = page.locator('input[placeholder="Search..."]');
    this.selectionAlert = page.locator('.alert.alert-info, [role="alert"].info');
  }

  /**
   * Navigate to dashboard
   */
  async navigateToDashboard(): Promise<void> {
    await this.navigateTo('/admin/overview');
    await this.waitForPageLoad();
    await this.waitForLoadingToComplete();
  }

  /**
   * Wait for dashboard to be fully loaded
   */
  async waitForDashboardLoad(): Promise<void> {
    await this.waitForElementVisible(this.dashboardHeading);
    await this.waitForLoadingToComplete();
  }

  /**
   * Click on Overview tab
   */
  async clickOverviewTab(): Promise<void> {
    await this.clickElement(this.overviewTab);
    await this.waitForLoadingToComplete();
  }

  /**
   * Click on Performance tab
   */
  async clickPerformanceTab(): Promise<void> {
    await this.clickElement(this.performanceTab);
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if dashboard heading is visible
   */
  async isDashboardHeadingVisible(): Promise<boolean> {
    return await this.isElementVisible(this.dashboardHeading);
  }

  /**
   * Check if Bot Status is visible
   */
  async isBotStatusVisible(): Promise<boolean> {
    return await this.isElementVisible(this.botStatusCard);
  }

  /**
   * Check if Performance Metrics are visible
   */
  async isPerformanceMetricsVisible(): Promise<boolean> {
    return await this.isElementVisible(this.performanceMetrics);
  }

  /**
   * Check if all summary cards are visible
   */
  async areSummaryCardsVisible(): Promise<boolean> {
    const cards = [
      this.activeBotsCard,
      this.totalMessagesCard,
      this.errorRateCard,
      this.uptimeCard
    ];
    
    for (const card of cards) {
      if (!await this.isElementVisible(card)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get text content of a specific card
   */
  async getCardText(cardName: string): Promise<string | null> {
    let card: Locator;
    
    switch (cardName.toLowerCase()) {
      case 'active bots':
        card = this.activeBotsCard;
        break;
      case 'total messages':
        card = this.totalMessagesCard;
        break;
      case 'error rate':
        card = this.errorRateCard;
        break;
      case 'uptime':
        card = this.uptimeCard;
        break;
      default:
        throw new Error(`Unknown card: ${cardName}`);
    }
    
    return await this.getElementText(card);
  }

  /**
   * Check if Overview tab is active
   */
  async isOverviewTabActive(): Promise<boolean> {
    return await this.overviewTab.getAttribute('aria-selected') === 'true' ||
           await this.overviewTab.hasClass('active');
  }

  /**
   * Check if Performance tab is active
   */
  async isPerformanceTabActive(): Promise<boolean> {
    return await this.performanceTab.getAttribute('aria-selected') === 'true' ||
           await this.performanceTab.hasClass('active');
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
   * Wait for refresh button to be enabled
   */
  async waitForRefreshEnabled(): Promise<void> {
    if (await this.isElementVisible(this.refreshButton)) {
      await this.waitForElementEnabled(this.refreshButton);
    }
  }

  /**
   * Get all available tabs
   */
  async getAvailableTabs(): Promise<string[]> {
    const tabs = this.page.locator('[role="tab"]');
    const count = await tabs.count();
    const tabNames: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const tabText = await tabs.nth(i).textContent();
      if (tabText) {
        tabNames.push(tabText.trim());
      }
    }
    
    return tabNames;
  }

  /**
   * Navigate to specific tab by name
   */
  async navigateToTab(tabName: string): Promise<void> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`);
    if (await this.isElementVisible(tab)) {
      await this.clickElement(tab);
      await this.waitForLoadingToComplete();
    } else {
      throw new Error(`Tab "${tabName}" not found`);
    }
  }

  /**
   * Get number of stats cards rendered
   */
  async getStatsCardCount(): Promise<number> {
    return await this.statsCards.locator('.stat, [data-testid="dashboard-stat"]').count();
  }

  /**
   * Open the Create Bot modal
   */
  async openCreateBotModal(): Promise<void> {
    if (await this.isElementVisible(this.createBotButton)) {
      await this.clickElement(this.createBotButton);
      await this.waitForElementVisible(this.createBotModal);
    }
  }

  /**
   * Close the Create Bot modal
   */
  async closeCreateBotModal(): Promise<void> {
    const closeButton = this.createBotModal.locator('button.btn-circle, button:has-text("Cancel")');
    if (await this.isElementVisible(closeButton)) {
      await closeButton.first().click();
      await this.waitForElementHidden(this.createBotModal);
    }
  }

  /**
   * Check if Create Bot modal is visible
   */
  async isCreateBotModalVisible(): Promise<boolean> {
    return await this.createBotModal.isVisible();
  }

  /**
   * Get count of bot rows
   */
  async getBotRowCount(): Promise<number> {
    return await this.dataTableRows.count();
  }

  /**
   * Select the first bot row in the table
   */
  async selectFirstBotRow(): Promise<void> {
    if (await this.dataTableCheckboxes.count() > 0) {
      const checkbox = this.dataTableCheckboxes.first();
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    }
  }

  /**
   * Clear selection in the table
   */
  async clearSelection(): Promise<void> {
    const checkboxes = this.dataTableCheckboxes;
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) {
        await checkboxes.nth(i).uncheck();
      }
    }
  }

  /**
   * Check if selection alert is visible
   */
  async isSelectionAlertVisible(): Promise<boolean> {
    return await this.isElementVisible(this.selectionAlert);
  }

  /**
   * Get selection alert text
   */
  async getSelectionAlertText(): Promise<string | null> {
    if (await this.isSelectionAlertVisible()) {
      return await this.getElementText(this.selectionAlert);
    }
    return null;
  }

  /**
   * Filter bots in table using search
   */
  async searchBots(term: string): Promise<void> {
    if (await this.dataTableSearch.count() > 0) {
      await this.dataTableSearch.fill(term);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Check if navigation menu is visible
   */
  async isNavigationMenuVisible(): Promise<boolean> {
    return await this.isElementVisible(this.navigationMenu);
  }

  /**
   * Get navigation menu items
   */
  async getNavigationMenuItems(): Promise<string[]> {
    const menuItems = this.navigationMenu.locator('a, button');
    const count = await menuItems.count();
    const itemTexts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const itemText = await menuItems.nth(i).textContent();
      if (itemText) {
        itemTexts.push(itemText.trim());
      }
    }
    
    return itemTexts;
  }

  /**
   * Click on navigation menu item
   */
  async clickNavigationMenuItem(itemName: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`a:has-text("${itemName}"), button:has-text("${itemName}")`);
    if (await this.isElementVisible(menuItem)) {
      await this.clickElement(menuItem, true);
    } else {
      throw new Error(`Navigation menu item "${itemName}" not found`);
    }
  }

  /**
   * Get dashboard metrics data
   */
  async getDashboardMetrics(): Promise<Record<string, string | null>> {
    const metrics: Record<string, string | null> = {};
    
    const cardNames = ['Active Bots', 'Total Messages', 'Error Rate', 'Uptime'];
    
    for (const cardName of cardNames) {
      metrics[cardName] = await this.getCardText(cardName);
    }
    
    return metrics;
  }

  /**
   * Wait for metrics to load
   */
  async waitForMetricsToLoad(): Promise<void> {
    // Wait for at least one metric card to be visible
    await this.waitForElementVisible(this.activeBotsCard);
  }

  /**
   * Check if dashboard has data
   */
  async hasDashboardData(): Promise<boolean> {
    const metrics = await this.getDashboardMetrics();
    return Object.values(metrics).some(value => value !== null && value !== '');
  }

  /**
   * Take screenshot of dashboard
   */
  async takeDashboardScreenshot(name: string = 'dashboard'): Promise<void> {
    await this.takeScreenshot(name);
  }

  /**
   * Check if dashboard is responsive
   */
  async checkResponsiveDesign(): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.waitForPageLoad();
      
      // Check if dashboard heading is still visible
      await this.waitForElementVisible(this.dashboardHeading);
      
      // Check if tabs are accessible
      if (viewport.width < 768) {
        // On mobile, tabs might be in a dropdown or collapsed
        const mobileMenu = this.page.locator('.mobile-menu, .hamburger-menu');
        if (await mobileMenu.isVisible()) {
          await this.clickElement(mobileMenu);
          await this.waitForElementVisible(this.overviewTab);
        }
      }
    }
  }

  /**
   * Check if dashboard has proper accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Check for proper heading hierarchy
    await expect(this.dashboardHeading).toBeVisible();
    
    // Check for proper tab structure
    const tablist = this.page.locator('[role="tablist"]');
    if (await tablist.count() > 0) {
      await expect(tablist.first()).toBeVisible();
      
      // Check that tabs have proper attributes
      const tabs = this.page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        await expect(tab).toHaveAttribute('role', 'tab');
        await expect(tab).toHaveAttribute('tabindex');
      }
    }

    // Check for proper landmark regions
    const main = this.page.locator('main, [role="main"]');
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible();
    }

    // Call base accessibility check
    await super.checkAccessibility();
  }
}
