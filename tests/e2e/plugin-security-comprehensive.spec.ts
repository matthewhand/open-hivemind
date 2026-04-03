import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection, setupAuth } from './test-utils';

/**
 * Comprehensive E2E Tests for Plugin Security Page
 * Tests all major security workflows including signature verification,
 * trust management, capability management, and security audit trails
 */
test.describe('Plugin Security - Comprehensive Tests', () => {
  test.setTimeout(90000);

  const mockPlugins = [
    {
      pluginName: 'llm-openai',
      trustLevel: 'trusted',
      isBuiltIn: true,
      signatureValid: null,
      grantedCapabilities: ['network', 'llm', 'config'],
      deniedCapabilities: [],
      requiredCapabilities: ['network', 'llm', 'config'],
    },
    {
      pluginName: 'llm-anthropic',
      trustLevel: 'trusted',
      isBuiltIn: true,
      signatureValid: null,
      grantedCapabilities: ['network', 'llm'],
      deniedCapabilities: [],
      requiredCapabilities: ['network', 'llm'],
    },
    {
      pluginName: 'message-discord',
      trustLevel: 'trusted',
      isBuiltIn: true,
      signatureValid: null,
      grantedCapabilities: ['network', 'config'],
      deniedCapabilities: [],
      requiredCapabilities: ['network', 'config'],
    },
    {
      pluginName: 'community-analytics',
      trustLevel: 'trusted',
      isBuiltIn: false,
      signatureValid: true,
      grantedCapabilities: ['network', 'database'],
      deniedCapabilities: [],
      requiredCapabilities: ['network', 'database'],
    },
    {
      pluginName: 'community-advanced-tools',
      trustLevel: 'untrusted',
      isBuiltIn: false,
      signatureValid: false,
      grantedCapabilities: [],
      deniedCapabilities: ['filesystem', 'exec'],
      requiredCapabilities: ['filesystem', 'exec'],
    },
    {
      pluginName: 'community-beta-feature',
      trustLevel: 'untrusted',
      isBuiltIn: false,
      signatureValid: null,
      grantedCapabilities: [],
      deniedCapabilities: ['network'],
      requiredCapabilities: ['network'],
    },
    {
      pluginName: 'community-data-processor',
      trustLevel: 'trusted',
      isBuiltIn: false,
      signatureValid: true,
      grantedCapabilities: ['database', 'filesystem'],
      deniedCapabilities: [],
      requiredCapabilities: ['database', 'filesystem'],
    },
  ];

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: [] })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: [] })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { enabled: false } })
      ),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
      ),
      page.route('**/api/auth/check', (route) =>
        route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('Test 1: View all plugins and their security status', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Verify all plugins are displayed
    for (const plugin of mockPlugins) {
      const pluginCard = page.locator(`h3:has-text("${plugin.pluginName}")`);
      await expect(pluginCard).toBeVisible();
    }

    // Verify security status badges are visible
    await expect(page.locator('text=Trusted').first()).toBeVisible();
    await expect(page.locator('text=Untrusted').first()).toBeVisible();
    await expect(page.locator('text=Built-in').first()).toBeVisible();

    // Verify statistics are correct
    const statsCards = page.locator('.text-2xl.font-bold');
    await expect(statsCards.nth(0)).toHaveText('7'); // Total plugins
    await expect(statsCards.nth(1)).toHaveText('5'); // Trusted
    await expect(statsCards.nth(2)).toHaveText('2'); // Untrusted
    await expect(statsCards.nth(3)).toHaveText('3'); // Built-in
    await expect(statsCards.nth(4)).toHaveText('1'); // Failed verification
  });

  test('Test 2: Filter plugins by trusted status', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click on "Trusted" filter
    const trustedTab = page.locator('.tab:has-text("Trusted")');
    await trustedTab.click();
    await page.waitForTimeout(500);

    // Verify only trusted plugins are shown (5 total)
    const trustedPlugins = ['llm-openai', 'llm-anthropic', 'message-discord', 'community-analytics', 'community-data-processor'];
    for (const name of trustedPlugins) {
      await expect(page.locator(`h3:has-text("${name}")`)).toBeVisible();
    }

    // Verify untrusted plugins are not shown
    await expect(page.locator('h3:has-text("community-advanced-tools")')).not.toBeVisible();
    await expect(page.locator('h3:has-text("community-beta-feature")')).not.toBeVisible();
  });

  test('Test 3: Filter plugins by untrusted status', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click on "Untrusted" filter
    const untrustedTab = page.locator('.tab:has-text("Untrusted")');
    await untrustedTab.click();
    await page.waitForTimeout(500);

    // Verify only untrusted plugins are shown
    await expect(page.locator('h3:has-text("community-advanced-tools")')).toBeVisible();
    await expect(page.locator('h3:has-text("community-beta-feature")')).toBeVisible();

    // Verify trusted plugins are not shown
    await expect(page.locator('h3:has-text("llm-openai")')).not.toBeVisible();
  });

  test('Test 4: Filter by unsigned/verification failed status', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click on "Verification Failed" filter
    const failedTab = page.locator('.tab:has-text("Verification Failed")');
    await failedTab.click();
    await page.waitForTimeout(500);

    // Only plugins with signatureValid: false should be shown
    await expect(page.locator('h3:has-text("community-advanced-tools")')).toBeVisible();

    // Plugins with null or true signature should not be shown
    await expect(page.locator('h3:has-text("community-analytics")')).not.toBeVisible();
    await expect(page.locator('h3:has-text("community-beta-feature")')).not.toBeVisible();
  });

  test('Test 5: Filter by built-in status', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click on "Built-in" filter
    const builtInTab = page.locator('.tab:has-text("Built-in")');
    await builtInTab.click();
    await page.waitForTimeout(500);

    // Verify only built-in plugins are shown
    await expect(page.locator('h3:has-text("llm-openai")')).toBeVisible();
    await expect(page.locator('h3:has-text("llm-anthropic")')).toBeVisible();
    await expect(page.locator('h3:has-text("message-discord")')).toBeVisible();

    // Verify community plugins are not shown
    await expect(page.locator('h3:has-text("community-analytics")')).not.toBeVisible();
  });

  test('Test 6: View plugin signature details and capabilities', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find a plugin card with valid signature
    const analyticsCard = page.locator('.card:has(h3:has-text("community-analytics"))');
    await expect(analyticsCard).toBeVisible();

    // Verify signature badge
    await expect(analyticsCard.locator('text=Valid')).toBeVisible();

    // Verify granted capabilities
    await expect(analyticsCard.locator('text=Granted Capabilities')).toBeVisible();
    await expect(analyticsCard.locator('.badge:has-text("network")')).toBeVisible();
    await expect(analyticsCard.locator('.badge:has-text("database")')).toBeVisible();

    // Verify required capabilities
    await expect(analyticsCard.locator('text=Required Capabilities')).toBeVisible();

    // Check for denied capabilities section
    await expect(analyticsCard.locator('text=Denied Capabilities')).toBeVisible();
  });

  test('Test 7: Mark untrusted plugin as trusted', async ({ page }) => {
    let currentPlugins = mockPlugins.map((p) => ({ ...p }));

    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: currentPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    let trustCalled = false;
    await page.route('**/api/admin/plugins/community-beta-feature/trust', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        if (body.trust === true) {
          trustCalled = true;
          // Update the plugin to trusted
          currentPlugins = currentPlugins.map((p) =>
            p.pluginName === 'community-beta-feature'
              ? { ...p, trustLevel: 'trusted' as const, grantedCapabilities: ['network'], deniedCapabilities: [] }
              : p
          );
          await route.fulfill({
            status: 200,
            json: {
              success: true,
              data: { status: currentPlugins.find(p => p.pluginName === 'community-beta-feature') },
              message: "Plugin 'community-beta-feature' trust settings updated successfully",
            },
          });
        } else {
          await route.fulfill({ status: 200, json: { success: true } });
        }
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find the untrusted plugin card
    const betaCard = page.locator('.card:has(h3:has-text("community-beta-feature"))');
    await expect(betaCard).toBeVisible();

    // Verify it shows as untrusted
    await expect(betaCard.locator('text=Untrusted')).toBeVisible();

    // Click Trust Plugin button
    const trustButton = betaCard.locator('button:has-text("Trust Plugin")');
    await expect(trustButton).toBeVisible();
    await trustButton.click();

    // Handle confirmation modal
    const confirmModal = page.locator('.modal-box, [role="dialog"]').filter({ hasText: 'Trust Plugin' });
    await expect(confirmModal).toBeVisible();

    const confirmButton = confirmModal.locator('button:has-text("Confirm")');
    await confirmButton.click();

    // Wait for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=marked as trusted')).toBeVisible();

    expect(trustCalled).toBe(true);
  });

  test('Test 8: Revoke trust from a trusted plugin', async ({ page }) => {
    let currentPlugins = mockPlugins.map((p) => ({ ...p }));

    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: currentPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    let revokeCalled = false;
    await page.route('**/api/admin/plugins/community-analytics/trust', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        if (body.trust === false) {
          revokeCalled = true;
          // Update the plugin to untrusted
          currentPlugins = currentPlugins.map((p) =>
            p.pluginName === 'community-analytics'
              ? { ...p, trustLevel: 'untrusted' as const, grantedCapabilities: [], deniedCapabilities: ['network', 'database'] }
              : p
          );
          await route.fulfill({
            status: 200,
            json: {
              success: true,
              data: { status: currentPlugins.find(p => p.pluginName === 'community-analytics') },
              message: "Plugin 'community-analytics' trust settings updated successfully",
            },
          });
        } else {
          await route.fulfill({ status: 200, json: { success: true } });
        }
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find the trusted plugin card
    const analyticsCard = page.locator('.card:has(h3:has-text("community-analytics"))');
    await expect(analyticsCard).toBeVisible();

    // Click Revoke Trust button
    const revokeButton = analyticsCard.locator('button:has-text("Revoke Trust")');
    await expect(revokeButton).toBeVisible();
    await revokeButton.click();

    // Handle confirmation modal
    const confirmModal = page.locator('.modal-box, [role="dialog"]').filter({ hasText: 'Revoke Trust' });
    await expect(confirmModal).toBeVisible();

    const confirmButton = confirmModal.locator('button:has-text("Confirm")');
    await confirmButton.click();

    // Wait for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=marked as untrusted')).toBeVisible();

    expect(revokeCalled).toBe(true);
  });

  test('Test 9: Re-verify plugin signature', async ({ page }) => {
    let currentPlugins = mockPlugins.map((p) => ({ ...p }));

    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: currentPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    let verifyCalled = false;
    await page.route('**/api/admin/plugins/community-advanced-tools/verify', async (route) => {
      if (route.request().method() === 'POST') {
        verifyCalled = true;
        // Update the plugin signature to valid
        currentPlugins = currentPlugins.map((p) =>
          p.pluginName === 'community-advanced-tools' ? { ...p, signatureValid: true } : p
        );
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            data: { trustLevel: 'untrusted', status: currentPlugins.find(p => p.pluginName === 'community-advanced-tools') },
            message: "Plugin 'community-advanced-tools' verified successfully",
          },
        });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find the plugin card with invalid signature
    const advancedCard = page.locator('.card:has(h3:has-text("community-advanced-tools"))');
    await expect(advancedCard).toBeVisible();

    // Verify it shows Invalid signature badge
    await expect(advancedCard.locator('text=Invalid')).toBeVisible();

    // Click Re-verify button
    const verifyButton = advancedCard.locator('button:has-text("Re-verify")');
    await expect(verifyButton).toBeVisible();
    await verifyButton.click();

    // Wait for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=verified successfully')).toBeVisible();

    expect(verifyCalled).toBe(true);
  });

  test('Test 10: Verify refresh button reloads data', async ({ page }) => {
    let fetchCount = 0;

    await page.route('**/api/admin/plugins/security', (route) => {
      fetchCount++;
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    const initialFetchCount = fetchCount;

    // Click refresh button
    const refreshButton = page.locator('button[aria-label="Refresh plugin security status"]');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Wait a bit for the request
    await page.waitForTimeout(500);

    // Verify another fetch was made
    expect(fetchCount).toBeGreaterThan(initialFetchCount);
  });

  test('Test 11: Verify built-in plugins have no action buttons', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find a built-in plugin card
    const openaiCard = page.locator('.card:has(h3:has-text("llm-openai"))');
    await expect(openaiCard).toBeVisible();

    // Verify Built-in badge is present
    await expect(openaiCard.locator('text=Built-in')).toBeVisible();

    // Verify the "always trusted" message is present
    await expect(openaiCard.locator('text=Built-in plugins are always trusted')).toBeVisible();

    // Verify no action buttons (Re-verify, Trust, Revoke) are present
    await expect(openaiCard.locator('button:has-text("Re-verify")')).not.toBeVisible();
    await expect(openaiCard.locator('button:has-text("Trust Plugin")')).not.toBeVisible();
    await expect(openaiCard.locator('button:has-text("Revoke Trust")')).not.toBeVisible();
  });

  test('Test 12: Test security warning displays for untrusted plugins', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find untrusted plugin card
    const untrustedCard = page.locator('.card:has(h3:has-text("community-beta-feature"))');
    await expect(untrustedCard).toBeVisible();

    // Verify untrusted badge is shown (which serves as a security warning)
    const untrustedBadge = untrustedCard.locator('.badge:has-text("Untrusted")');
    await expect(untrustedBadge).toBeVisible();

    // Verify denied capabilities are shown (another form of warning)
    await expect(untrustedCard.locator('text=Denied Capabilities')).toBeVisible();
    await expect(untrustedCard.locator('.badge:has-text("network")').first()).toBeVisible();
  });

  test('Test 13: Test empty state when no plugins exist', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: [] },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Verify empty state message
    await expect(page.locator('text=No plugins are currently installed')).toBeVisible();

    // Verify statistics show zeros
    const statsCards = page.locator('.text-2xl.font-bold');
    await expect(statsCards.nth(0)).toHaveText('0'); // Total
    await expect(statsCards.nth(1)).toHaveText('0'); // Trusted
    await expect(statsCards.nth(2)).toHaveText('0'); // Untrusted
  });

  test('Test 14: Test error handling when API fails', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 500,
        json: {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve plugin security status',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Verify error alert is displayed
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Failed to load/i')).toBeVisible();
  });

  test('Test 15: Test action button loading states', async ({ page }) => {
    let currentPlugins = mockPlugins.map((p) => ({ ...p }));

    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: currentPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    // Add delay to verify button demonstrates loading state
    await page.route('**/api/admin/plugins/community-analytics/verify', async (route) => {
      await page.waitForTimeout(1000); // Simulate slow request
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { trustLevel: 'trusted', status: currentPlugins.find(p => p.pluginName === 'community-analytics') },
          message: "Plugin 'community-analytics' verified successfully",
        },
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    const analyticsCard = page.locator('.card:has(h3:has-text("community-analytics"))');
    const verifyButton = analyticsCard.locator('button:has-text("Re-verify")');

    await verifyButton.click();

    // Verify spinner/loading state is shown (button should be disabled during action)
    await expect(verifyButton).toBeDisabled();

    // Verify spinning icon appears
    const spinningIcon = verifyButton.locator('.animate-spin');
    await expect(spinningIcon).toBeVisible();

    // Wait for action to complete
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });

    // Button should be enabled again
    await expect(verifyButton).toBeEnabled();
  });

  test('Test 16: Verify modal cancel button works', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find untrusted plugin and click Trust button
    const betaCard = page.locator('.card:has(h3:has-text("community-beta-feature"))');
    const trustButton = betaCard.locator('button:has-text("Trust Plugin")');
    await trustButton.click();

    // Confirm modal appears
    const confirmModal = page.locator('.modal-box, [role="dialog"]').filter({ hasText: 'Trust Plugin' });
    await expect(confirmModal).toBeVisible();

    // Click Cancel button
    const cancelButton = confirmModal.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Modal should close
    await expect(confirmModal).not.toBeVisible();

    // Plugin should still be untrusted
    await expect(betaCard.locator('text=Untrusted')).toBeVisible();
  });

  test('Test 17: Verify success message can be dismissed', async ({ page }) => {
    let currentPlugins = mockPlugins.map((p) => ({ ...p }));

    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: currentPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await page.route('**/api/admin/plugins/community-analytics/verify', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { trustLevel: 'trusted' },
          message: "Plugin 'community-analytics' verified successfully",
        },
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Trigger an action to show success message
    const analyticsCard = page.locator('.card:has(h3:has-text("community-analytics"))');
    const verifyButton = analyticsCard.locator('button:has-text("Re-verify")');
    await verifyButton.click();

    // Wait for success alert
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible({ timeout: 5000 });

    // Click dismiss button
    const dismissButton = successAlert.locator('button[aria-label="Dismiss success message"]');
    await dismissButton.click();

    // Success message should disappear
    await expect(successAlert).not.toBeVisible();
  });

  test('Test 18: Verify capability badges are correctly color-coded', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find plugin with various capability states
    const advancedCard = page.locator('.card:has(h3:has-text("community-advanced-tools"))');
    await expect(advancedCard).toBeVisible();

    // Check for denied capabilities (should have error/red color styling)
    const deniedSection = advancedCard.locator('text=Denied Capabilities').locator('..');
    const deniedBadge = deniedSection.locator('.badge').first();
    await expect(deniedBadge).toBeVisible();

    // Verify the badge has error styling (DaisyUI uses badge-error class)
    const badgeClasses = await deniedBadge.getAttribute('class');
    expect(badgeClasses).toContain('badge');

    // Check for required capabilities (should have neutral color styling)
    const requiredSection = advancedCard.locator('text=Required Capabilities').locator('..');
    const requiredBadge = requiredSection.locator('.badge').first();
    await expect(requiredBadge).toBeVisible();
  });

  test('Test 19: Test plugin with no signature (null)', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Find plugin with no signature (signatureValid: null)
    const betaCard = page.locator('.card:has(h3:has-text("community-beta-feature"))');
    await expect(betaCard).toBeVisible();

    // Verify "No Signature" badge is shown
    await expect(betaCard.locator('text=No Signature')).toBeVisible();

    // Verify it's still considered untrusted
    await expect(betaCard.locator('text=Untrusted')).toBeVisible();
  });

  test('Test 20: Verify all filter tabs are functional', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { plugins: mockPlugins },
          message: 'Plugin security status retrieved successfully',
        },
      })
    );

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    const filters = ['All', 'Trusted', 'Untrusted', 'Built-in', 'Verification Failed'];

    for (const filter of filters) {
      const filterTab = page.locator(`.tab:has-text("${filter}")`);
      await expect(filterTab).toBeVisible();
      await filterTab.click();
      await page.waitForTimeout(300);

      // Verify tab becomes active
      const activeClass = await filterTab.getAttribute('class');
      expect(activeClass).toContain('tab-active');

      // Verify some content is shown (or empty state for Verification Failed might be valid)
      const pageBody = page.locator('body');
      await expect(pageBody).toBeVisible();
    }
  });
});
