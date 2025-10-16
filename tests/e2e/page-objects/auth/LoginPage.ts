import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * LoginPage object for authentication functionality
 */
export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginForm: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize login-specific locators
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('text=Invalid username or password, [role="alert"].error');
    this.loginForm = page.locator('form');
    this.pageTitle = page.locator('h1, [data-testid="login-title"]');
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.navigateTo('/login');
    await this.waitForPageLoad();
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(username: string, password: string): Promise<void> {
    await this.fillInput(this.usernameInput, username);
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Submit login form
   */
  async submitLogin(): Promise<void> {
    await this.clickElement(this.submitButton, true); // waitForNavigation = true
  }

  /**
   * Perform complete login flow
   */
  async login(username: string, password: string): Promise<void> {
    await this.navigateToLogin();
    await this.fillCredentials(username, password);
    await this.submitLogin();
    
    // Wait for successful login redirect
    await this.waitForUrlToContain('dashboard');
    await this.waitForLoadingToComplete();
  }

  /**
   * Get error message text
   */
  async getLoginError(): Promise<string | null> {
    if (await this.isElementVisible(this.errorMessage)) {
      return await this.getElementText(this.errorMessage);
    }
    return null;
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    return await this.isElementVisible(this.loginForm);
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.isElementEnabled(this.submitButton);
  }

  /**
   * Wait for submit button to be disabled (loading state)
   */
  async waitForSubmitButtonDisabled(): Promise<void> {
    await this.waitForElementDisabled(this.submitButton);
  }

  /**
   * Wait for submit button to be enabled
   */
  async waitForSubmitButtonEnabled(): Promise<void> {
    await this.waitForElementEnabled(this.submitButton);
  }

  /**
   * Check if page redirected to dashboard after successful login
   */
  async isLoggedIn(): Promise<boolean> {
    const currentUrl = await this.getCurrentUrl();
    return currentUrl.includes('dashboard');
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.usernameInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Press Enter key on password field to submit
   */
  async submitWithEnter(): Promise<void> {
    await this.passwordInput.press('Enter');
    await this.waitForPageLoad();
  }

  /**
   * Check if username field has focus
   */
  async isUsernameFieldFocused(): Promise<boolean> {
    return await this.usernameInput.evaluate(el => document.activeElement === el);
  }

  /**
   * Check if password field has focus
   */
  async isPasswordFieldFocused(): Promise<boolean> {
    return await this.passwordInput.evaluate(el => document.activeElement === el);
  }

  /**
   * Get placeholder text for username field
   */
  async getUsernamePlaceholder(): Promise<string | null> {
    return await this.usernameInput.getAttribute('placeholder');
  }

  /**
   * Get placeholder text for password field
   */
  async getPasswordPlaceholder(): Promise<string | null> {
    return await this.passwordInput.getAttribute('placeholder');
  }

  /**
   * Check if password field is masked
   */
  async isPasswordMasked(): Promise<boolean> {
    const inputType = await this.passwordInput.getAttribute('type');
    return inputType === 'password';
  }

  /**
   * Get submit button text
   */
  async getSubmitButtonText(): Promise<string | null> {
    return await this.getElementText(this.submitButton);
  }

  /**
   * Check if login page has proper accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Check for proper form labels
    const usernameLabel = this.page.locator('label[for="username"], label:has-text("Username")');
    const passwordLabel = this.page.locator('label[for="password"], label:has-text("Password")');
    
    if (await usernameLabel.count() > 0) {
      await expect(usernameLabel.first()).toBeVisible();
    }
    
    if (await passwordLabel.count() > 0) {
      await expect(passwordLabel.first()).toBeVisible();
    }

    // Check for proper heading
    if (await this.pageTitle.count() > 0) {
      await expect(this.pageTitle.first()).toBeVisible();
    }

    // Call base accessibility check
    await super.checkAccessibility();
  }
}