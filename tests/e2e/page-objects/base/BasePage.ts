import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage class that provides common functionality for all page objects
 * This is the foundation of the Page Object Model pattern
 */
export class BasePage {
  readonly page: Page;
  
  // Common locators that might be present on multiple pages
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly navigationMenu: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize common locators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading, .spinner');
    this.errorMessage = page.locator('[role="alert"].error, .error-message, [data-testid="error"]');
    this.successMessage = page.locator('[role="alert"].success, .success-message, [data-testid="success"]');
    this.navigationMenu = page.locator('nav, [role="navigation"], .navigation');
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]');
  }

  /**
   * Navigate to a specific path relative to the base URL
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete(): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch (error) {
      // Loading spinner might not be present, continue
    }
  }

  /**
   * Check if an element is visible
   */
  async isElementVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElementVisible(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click element with error handling
   */
  async clickElement(locator: Locator, waitForNavigation: boolean = false): Promise<void> {
    await this.waitForElementVisible(locator);
    
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation(),
        locator.click()
      ]);
    } else {
      await locator.click();
    }
  }

  /**
   * Fill input field with validation
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.clear();
    await locator.fill(value);
    
    // Verify the value was filled correctly
    await expect(locator).toHaveValue(value);
  }

  /**
   * Select dropdown option
   */
  async selectDropdown(locator: Locator, value: string): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.selectOption(value);
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.isElementVisible(this.errorMessage);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasErrorMessage()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if success message is displayed
   */
  async hasSuccessMessage(): Promise<boolean> {
    return await this.isElementVisible(this.successMessage);
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.hasSuccessMessage()) {
      return await this.successMessage.textContent();
    }
    return null;
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp): Promise<any> {
    return await this.page.waitForResponse(urlPattern);
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string | RegExp, response: any): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Check if page has proper accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Basic accessibility checks
    const main = this.page.locator('main, [role="main"]');
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }

    // Check for proper heading hierarchy
    const h1 = this.page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1).toBeVisible();
    }
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for URL to contain specific text
   */
  async waitForUrlToContain(text: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForURL(`**/*${text}*`, { timeout });
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Go back to previous page
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Scroll to element
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   */
  async hoverOverElement(locator: Locator): Promise<void> {
    await this.waitForElementVisible(locator);
    await locator.hover();
  }

  /**
   * Get element text content
   */
  async getElementText(locator: Locator): Promise<string | null> {
    await this.waitForElementVisible(locator);
    return await locator.textContent();
  }

  /**
   * Check if element is enabled
   */
  async isElementEnabled(locator: Locator): Promise<boolean> {
    await this.waitForElementVisible(locator);
    return await locator.isEnabled();
  }

  /**
   * Wait for element to be enabled
   */
  async waitForElementEnabled(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'enabled', timeout });
  }

  /**
   * Wait for element to be disabled
   */
  async waitForElementDisabled(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'disabled', timeout });
  }
}