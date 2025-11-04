import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * GuardsPage object for MCP guard configuration functionality
 */
export class GuardsPage extends BasePage {
  readonly guardsHeading: Locator;
  readonly ownerModeRadio: Locator;
  readonly specificUsersRadio: Locator;
  readonly userIdInput: Locator;
  readonly ipAddressInput: Locator;
  readonly addUserButton: Locator;
  readonly addIpButton: Locator;
  readonly saveConfigurationButton: Locator;
  readonly successMessage: Locator;
  readonly userChips: Locator;
  readonly ipChips: Locator;
  readonly guardConfigurationForm: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize guards-specific locators
    this.guardsHeading = page.locator('h1:has-text("MCP Tool Guards"), [data-testid="guards-title"]');
    this.ownerModeRadio = page.locator('input[type="radio"][value="owner"], label:has-text("Owner"), [data-testid="owner-mode"]');
    this.specificUsersRadio = page.locator('input[type="radio"][value="specific_users"], label:has-text("Specific Users"), [data-testid="specific-users-mode"]');
    this.userIdInput = page.locator('input[placeholder*="User ID"], input[placeholder*="Username"], [data-testid="user-id-input"]');
    this.ipAddressInput = page.locator('input[placeholder*="IP Address"], [data-testid="ip-address-input"]');
    this.addUserButton = page.locator('button:has-text("Add"), [data-testid="add-user-button"]');
    this.addIpButton = page.locator('button:has-text("Add"):nth-of-type(2), [data-testid="add-ip-button"]');
    this.saveConfigurationButton = page.locator('button:has-text("Save Configuration"), [data-testid="save-configuration"]');
    this.successMessage = page.locator('[role="alert"]:has-text("saved"), .success-message:has-text("saved"), [data-testid="success-message"]');
    this.userChips = page.locator('.MuiChip-label:has-text("test"), [data-testid="user-chip"]');
    this.ipChips = page.locator('.MuiChip-label:has-text("10."), [data-testid="ip-chip"]');
    this.guardConfigurationForm = page.locator('form, [data-testid="guard-form"]');
  }

  /**
   * Navigate to guards page
   */
  async navigateToGuards(): Promise<void> {
    await this.navigateTo('/admin/guards');
    await this.waitForPageLoad();
    await this.waitForLoadingToComplete();
  }

  /**
   * Wait for guards page to be fully loaded
   */
  async waitForGuardsLoad(): Promise<void> {
    await this.waitForElementVisible(this.guardsHeading);
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if guards heading is visible
   */
  async isGuardsHeadingVisible(): Promise<boolean> {
    return await this.isElementVisible(this.guardsHeading);
  }

  /**
   * Check if guard configuration form is visible
   */
  async isGuardFormVisible(): Promise<boolean> {
    return await this.isElementVisible(this.guardConfigurationForm);
  }

  /**
   * Select owner mode
   */
  async selectOwnerMode(): Promise<void> {
    await this.clickElement(this.ownerModeRadio);
    await this.waitForLoadingToComplete();
  }

  /**
   * Select specific users mode
   */
  async selectSpecificUsersMode(): Promise<void> {
    await this.clickElement(this.specificUsersRadio);
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if owner mode is selected
   */
  async isOwnerModeSelected(): Promise<boolean> {
    return await this.ownerModeRadio.isChecked();
  }

  /**
   * Check if specific users mode is selected
   */
  async isSpecificUsersModeSelected(): Promise<boolean> {
    return await this.specificUsersRadio.isChecked();
  }

  /**
   * Fill user ID input
   */
  async fillUserId(userId: string): Promise<void> {
    await this.fillInput(this.userIdInput, userId);
  }

  /**
   * Fill IP address input
   */
  async fillIpAddress(ipAddress: string): Promise<void> {
    await this.fillInput(this.ipAddressInput, ipAddress);
  }

  /**
   * Add user to allowed list
   */
  async addUser(userId: string): Promise<void> {
    await this.fillUserId(userId);
    await this.clickElement(this.addUserButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Add IP address to allowed list
   */
  async addIpAddress(ipAddress: string): Promise<void> {
    await this.fillIpAddress(ipAddress);
    await this.clickElement(this.addIpButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Save guard configuration
   */
  async saveConfiguration(): Promise<void> {
    await this.clickElement(this.saveConfigurationButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if success message is displayed
   */
  async isSuccessMessageVisible(): Promise<boolean> {
    return await this.isElementVisible(this.successMessage);
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.isSuccessMessageVisible()) {
      return await this.getElementText(this.successMessage);
    }
    return null;
  }

  /**
   * Check if user chip is visible for specific user
   */
  async isUserChipVisible(userId: string): Promise<boolean> {
    const userChip = this.page.locator(`.MuiChip-label:has-text("${userId}"), [data-testid="user-${userId}"]`);
    return await this.isElementVisible(userChip);
  }

  /**
   * Check if IP chip is visible for specific IP
   */
  async isIpChipVisible(ipAddress: string): Promise<boolean> {
    const ipChip = this.page.locator(`.MuiChip-label:has-text("${ipAddress}"), [data-testid="ip-${ipAddress}"]`);
    return await this.isElementVisible(ipChip);
  }

  /**
   * Get all user chips
   */
  async getAllUserChips(): Promise<string[]> {
    const chips = this.page.locator('.MuiChip-label, [data-testid="user-chip"]');
    const count = await chips.count();
    const userIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const chipText = await chips.nth(i).textContent();
      if (chipText && !chipText.includes('.') && chipText.trim()) { // Exclude IP addresses
        userIds.push(chipText.trim());
      }
    }
    
    return userIds;
  }

  /**
   * Get all IP chips
   */
  async getAllIpChips(): Promise<string[]> {
    const chips = this.page.locator('.MuiChip-label, [data-testid="ip-chip"]');
    const count = await chips.count();
    const ipAddresses: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const chipText = await chips.nth(i).textContent();
      if (chipText && chipText.includes('.') && chipText.trim()) { // Include only IP-like patterns
        ipAddresses.push(chipText.trim());
      }
    }
    
    return ipAddresses;
  }

  /**
   * Remove user chip
   */
  async removeUserChip(userId: string): Promise<void> {
    const userChip = this.page.locator(`.MuiChip-label:has-text("${userId}")`);
    const removeButton = userChip.locator('..').locator('button[aria-label="Delete"], .MuiChip-deleteIcon');
    
    if (await removeButton.isVisible()) {
      await this.clickElement(removeButton);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Remove IP chip
   */
  async removeIpChip(ipAddress: string): Promise<void> {
    const ipChip = this.page.locator(`.MuiChip-label:has-text("${ipAddress}")`);
    const removeButton = ipChip.locator('..').locator('button[aria-label="Delete"], .MuiChip-deleteIcon');
    
    if (await removeButton.isVisible()) {
      await this.clickElement(removeButton);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Clear all user chips
   */
  async clearAllUserChips(): Promise<void> {
    const userChips = await this.getAllUserChips();
    for (const userId of userChips) {
      await this.removeUserChip(userId);
    }
  }

  /**
   * Clear all IP chips
   */
  async clearAllIpChips(): Promise<void> {
    const ipChips = await this.getAllIpChips();
    for (const ipAddress of ipChips) {
      await this.removeIpChip(ipAddress);
    }
  }

  /**
   * Get current guard configuration
   */
  async getCurrentConfiguration(): Promise<{
    mode: 'owner' | 'specific_users' | null;
    users: string[];
    ips: string[];
  }> {
    const mode = await this.isOwnerModeSelected() ? 'owner' : 
                  await this.isSpecificUsersModeSelected() ? 'specific_users' : null;
    
    const users = await this.getAllUserChips();
    const ips = await this.getAllIpChips();
    
    return { mode, users, ips };
  }

  /**
   * Check if form is valid for submission
   */
  async isFormValid(): Promise<boolean> {
    const saveButton = this.saveConfigurationButton;
    return await this.isElementEnabled(saveButton);
  }

  /**
   * Wait for configuration to be saved
   */
  async waitForConfigurationSave(): Promise<void> {
    await this.waitForElementVisible(this.successMessage);
    await this.waitForLoadingToComplete();
  }

  /**
   * Mock API response for guard configuration
   */
  async mockGuardApiSave(): Promise<void> {
    await this.mockApiResponse('**/api/uber/guards', { success: true });
  }

  /**
   * Mock API error response
   */
  async mockGuardApiError(): Promise<void> {
    await this.mockApiError('**/api/uber/guards', 500, 'Failed to save guard configuration');
  }

  /**
   * Check if user ID input is visible
   */
  async isUserIdInputVisible(): Promise<boolean> {
    return await this.isElementVisible(this.userIdInput);
  }

  /**
   * Check if IP address input is visible
   */
  async isIpAddressInputVisible(): Promise<boolean> {
    return await this.isElementVisible(this.ipAddressInput);
  }

  /**
   * Get placeholder text for user ID input
   */
  async getUserIdPlaceholder(): Promise<string | null> {
    return await this.userIdInput.getAttribute('placeholder');
  }

  /**
   * Get placeholder text for IP address input
   */
  async getIpAddressPlaceholder(): Promise<string | null> {
    return await this.ipAddressInput.getAttribute('placeholder');
  }

  /**
   * Take screenshot of guards page
   */
  async takeGuardsScreenshot(name: string = 'guards'): Promise<void> {
    await this.takeScreenshot(name);
  }

  /**
   * Check if guards page has proper accessibility attributes
   */
  async checkAccessibility(): Promise<void> {
    // Check for proper heading hierarchy
    await expect(this.guardsHeading).toBeVisible();
    
    // Check for proper form labels
    const ownerLabel = this.page.locator('label[for*="owner"], label:has-text("Owner")');
    const specificUsersLabel = this.page.locator('label[for*="specific"], label:has-text("Specific Users")');
    
    if (await ownerLabel.count() > 0) {
      await expect(ownerLabel.first()).toBeVisible();
    }
    
    if (await specificUsersLabel.count() > 0) {
      await expect(specificUsersLabel.first()).toBeVisible();
    }

    // Check for proper input labels
    const userIdLabel = this.page.locator('label[for*="user"], label:has-text("User ID")');
    const ipAddressLabel = this.page.locator('label[for*="ip"], label:has-text("IP Address")');
    
    if (await userIdLabel.count() > 0 && await this.userIdInput.isVisible()) {
      await expect(userIdLabel.first()).toBeVisible();
    }
    
    if (await ipAddressLabel.count() > 0 && await this.ipAddressInput.isVisible()) {
      await expect(ipAddressLabel.first()).toBeVisible();
    }

    // Check for proper button labels
    await expect(this.saveConfigurationButton).toBeVisible();

    // Call base accessibility check
    await super.checkAccessibility();
  }

  /**
   * Test complete guard configuration flow
   */
  async configureGuards(config: {
    mode: 'owner' | 'specific_users';
    users?: string[];
    ips?: string[];
  }): Promise<void> {
    // Select mode
    if (config.mode === 'owner') {
      await this.selectOwnerMode();
    } else {
      await this.selectSpecificUsersMode();
      
      // Add users if provided
      if (config.users) {
        for (const user of config.users) {
          await this.addUser(user);
        }
      }
      
      // Add IPs if provided
      if (config.ips) {
        for (const ip of config.ips) {
          await this.addIpAddress(ip);
        }
      }
    }
    
    // Save configuration
    await this.saveConfiguration();
    await this.waitForConfigurationSave();
  }
}