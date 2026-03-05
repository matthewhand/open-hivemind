import { expect, Locator, Page } from '@playwright/test';

/**
 * BasePage provides common functionality for all page objects.
 * It encapsulates basic interactions like navigation, clicks, and waits.
 */
export class BasePage {
  readonly page: Page;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading, .spinner');
  }

  /**
   * Navigates to a specific URL path.
   * @param path The URL path to navigate to.
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Waits for the main page content to be loaded and visible.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForLoadingToComplete();
  }

  /**
   * Waits for any loading indicators to disappear.
   */
  async waitForLoadingToComplete(): Promise<void> {
    await expect(this.loadingSpinner).not.toBeVisible({ timeout: 15000 });
  }

  /**
   * Clicks a locator and optionally waits for navigation.
   * @param locator The Locator to click.
   * @param waitForNavigation Whether to wait for a navigation event.
   */
  async clickElement(locator: Locator, waitForNavigation = false): Promise<void> {
    if (waitForNavigation) {
      await Promise.all([this.page.waitForNavigation(), locator.click()]);
    } else {
      await locator.click();
    }
  }

  /**
   * Fills an input field with the given text.
   * @param locator The Locator for the input field.
   * @param text The text to fill.
   */
  async fillInput(locator: Locator, text: string): Promise<void> {
    await locator.fill(text);
  }

  /**
   * Checks if an element is visible on the page.
   * @param locator The Locator to check.
   */
  async isElementVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Checks if an element is enabled.
   * @param locator The Locator to check.
   */
  async isElementEnabled(locator: Locator): Promise<boolean> {
    return await locator.isEnabled();
  }

  /**
   * Gets the text content of an element.
   * @param locator The Locator to get text from.
   */
  async getElementText(locator: Locator): Promise<string | null> {
    return await locator.textContent();
  }

  /**
   * Waits for an element to be disabled.
   * @param locator The Locator to wait for.
   */
  async waitForElementDisabled(locator: Locator): Promise<void> {
    await expect(locator).toBeDisabled();
  }

  /**
   * Waits for an element to be enabled.
   * @param locator The Locator to wait for.
   */
  async waitForElementEnabled(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled();
  }

  /**
   * Waits for an element to be visible.
   * @param locator The Locator to wait for.
   * @param timeout Optional timeout in milliseconds.
   */
  async waitForElementVisible(locator: Locator, timeout = 15000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Waits for the URL to contain a specific string.
   * @param urlSubstring The substring to find in the URL.
   */
  async waitForUrlToContain(urlSubstring: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(urlSubstring));
  }

  /**
   * Runs a basic accessibility check on the current page.
   */
  async checkAccessibility(): Promise<void> {
    // This is a placeholder for a more robust a11y check.
    // Consider integrating a library like axe-playwright.
    await expect(this.page.locator('body')).toBeVisible();
  }

  /**
   * Waits for an element to be hidden.
   * @param locator The Locator to wait for.
   * @param timeout Optional timeout in milliseconds.
   */
  async waitForElementHidden(locator: Locator, timeout = 15000): Promise<void> {
    await expect(locator).not.toBeVisible({ timeout });
  }

  /**
   * Takes a screenshot of the current page.
   * @param name The name for the screenshot file.
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }
}
