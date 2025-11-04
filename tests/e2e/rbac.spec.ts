import { test, expect } from '@playwright/test';
import { GuardsPage } from './page-objects/admin/GuardsPage';
import { test as authenticatedTest } from './fixtures/auth-fixtures';

authenticatedTest.describe('MCP guard configuration', () => {
  let guardsPage: GuardsPage;

  authenticatedTest.beforeEach(async ({ page }) => {
    guardsPage = new GuardsPage(page);
    await guardsPage.navigateToGuards();
    await guardsPage.waitForGuardsLoad();
    
    // Mock API response for guard configuration
    await guardsPage.mockGuardApiSave();
  });

  authenticatedTest('allows switching guard modes and adding entries', async () => {
    expect(await guardsPage.isGuardsHeadingVisible()).toBe(true);
    expect(await guardsPage.isGuardFormVisible()).toBe(true);

    // Switch to specific users mode
    await guardsPage.selectSpecificUsersMode();
    expect(await guardsPage.isSpecificUsersModeSelected()).toBe(true);

    // Add a user
    await guardsPage.addUser('testuser123');
    expect(await guardsPage.isUserChipVisible('testuser123')).toBe(true);

    // Add an IP address
    await guardsPage.addIpAddress('10.0.0.1');
    expect(await guardsPage.isIpChipVisible('10.0.0.1')).toBe(true);

    // Verify both are in the lists
    const users = await guardsPage.getAllUserChips();
    const ips = await guardsPage.getAllIpChips();
    
    expect(users).toContain('testuser123');
    expect(ips).toContain('10.0.0.1');
  });

  authenticatedTest('saves guards configuration and shows confirmation', async () => {
    await guardsPage.selectSpecificUsersMode();
    await guardsPage.addUser('owner123');

    await guardsPage.saveConfiguration();
    await guardsPage.waitForConfigurationSave();

    expect(await guardsPage.isSuccessMessageVisible()).toBe(true);
    
    const successMessage = await guardsPage.getSuccessMessage();
    expect(successMessage).toContain('saved successfully');
  });

  authenticatedTest('owner mode configuration', async () => {
    await guardsPage.selectOwnerMode();
    expect(await guardsPage.isOwnerModeSelected()).toBe(true);
    
    // In owner mode, user and IP inputs should not be visible
    expect(await guardsPage.isUserIdInputVisible()).toBe(false);
    expect(await guardsPage.isIpAddressInputVisible()).toBe(false);
    
    await guardsPage.saveConfiguration();
    await guardsPage.waitForConfigurationSave();
    
    expect(await guardsPage.isSuccessMessageVisible()).toBe(true);
  });

  authenticatedTest('can remove user and IP chips', async () => {
    await guardsPage.selectSpecificUsersMode();
    
    // Add multiple users and IPs
    await guardsPage.addUser('user1');
    await guardsPage.addUser('user2');
    await guardsPage.addIpAddress('192.168.1.1');
    await guardsPage.addIpAddress('10.0.0.1');
    
    // Verify they were added
    expect(await guardsPage.isUserChipVisible('user1')).toBe(true);
    expect(await guardsPage.isUserChipVisible('user2')).toBe(true);
    expect(await guardsPage.isIpChipVisible('192.168.1.1')).toBe(true);
    expect(await guardsPage.isIpChipVisible('10.0.0.1')).toBe(true);
    
    // Remove one user and one IP
    await guardsPage.removeUserChip('user1');
    await guardsPage.removeIpChip('192.168.1.1');
    
    // Verify they were removed
    expect(await guardsPage.isUserChipVisible('user1')).toBe(false);
    expect(await guardsPage.isIpChipVisible('192.168.1.1')).toBe(false);
    
    // Verify others are still there
    expect(await guardsPage.isUserChipVisible('user2')).toBe(true);
    expect(await guardsPage.isIpChipVisible('10.0.0.1')).toBe(true);
  });

  authenticatedTest('can clear all chips', async () => {
    await guardsPage.selectSpecificUsersMode();
    
    // Add multiple entries
    await guardsPage.addUser('user1');
    await guardsPage.addUser('user2');
    await guardsPage.addIpAddress('192.168.1.1');
    await guardsPage.addIpAddress('10.0.0.1');
    
    // Clear all
    await guardsPage.clearAllUserChips();
    await guardsPage.clearAllIpChips();
    
    // Verify all are cleared
    const users = await guardsPage.getAllUserChips();
    const ips = await guardsPage.getAllIpChips();
    
    expect(users.length).toBe(0);
    expect(ips.length).toBe(0);
  });

  authenticatedTest('form validation and state management', async () => {
    const initialConfig = await guardsPage.getCurrentConfiguration();
    expect(initialConfig.mode).toBeTruthy();
    
    // Switch modes and verify state changes
    await guardsPage.selectOwnerMode();
    const ownerConfig = await guardsPage.getCurrentConfiguration();
    expect(ownerConfig.mode).toBe('owner');
    
    await guardsPage.selectSpecificUsersMode();
    const specificConfig = await guardsPage.getCurrentConfiguration();
    expect(specificConfig.mode).toBe('specific_users');
  });

  authenticatedTest('handles API errors gracefully', async () => {
    // Mock API error
    await guardsPage.mockGuardApiError();
    
    await guardsPage.selectSpecificUsersMode();
    await guardsPage.addUser('testuser');
    await guardsPage.saveConfiguration();
    
    // Should not show success message on error
    expect(await guardsPage.isSuccessMessageVisible()).toBe(false);
  });

  authenticatedTest('input placeholders and labels', async () => {
    await guardsPage.selectSpecificUsersMode();
    
    const userPlaceholder = await guardsPage.getUserIdPlaceholder();
    const ipPlaceholder = await guardsPage.getIpAddressPlaceholder();
    
    expect(userPlaceholder).toBeTruthy();
    expect(ipPlaceholder).toBeTruthy();
    expect(userPlaceholder).toContain('User');
    expect(ipPlaceholder).toContain('IP');
  });

  authenticatedTest('complete guard configuration flow', async () => {
    // Test the complete configuration method
    await guardsPage.configureGuards({
      mode: 'specific_users',
      users: ['admin', 'moderator'],
      ips: ['192.168.1.100', '10.0.0.50']
    });
    
    expect(await guardsPage.isSuccessMessageVisible()).toBe(true);
    
    const finalConfig = await guardsPage.getCurrentConfiguration();
    expect(finalConfig.mode).toBe('specific_users');
    expect(finalConfig.users).toContain('admin');
    expect(finalConfig.users).toContain('moderator');
    expect(finalConfig.ips).toContain('192.168.1.100');
    expect(finalConfig.ips).toContain('10.0.0.50');
  });

  authenticatedTest('guards page accessibility', async () => {
    await guardsPage.checkAccessibility();
  });

  authenticatedTest('take guards page screenshot', async () => {
    await guardsPage.takeGuardsScreenshot('guards-test');
  });
});
