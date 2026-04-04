import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

test.describe('Plugin Security Dashboard - Complete Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Screenshot 1: Initial page load with plugin list', async ({ page }) => {
    // Mock Plugin Security API with comprehensive plugin data
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
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
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for stats cards to appear
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible();
    await expect(page.getByText('Total Plugins')).toBeVisible();
    await expect(page.getByText('Trusted')).toBeVisible();

    // Wait for plugin cards to render
    await expect(page.getByText('llm-openai')).toBeVisible();
    await page.waitForTimeout(1000);

    // Screenshot: Initial page load with plugin list
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-initial-load.png',
      fullPage: true,
    });

    // Verify key elements
    const statsCards = page.locator('.text-2xl.font-bold');
    const count = await statsCards.count();
    expect(count).toBe(5); // Total, Trusted, Untrusted, Built-in, Failed Verification
  });

  test('Screenshot 2: Plugin details with capabilities breakdown', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'community-analytics',
                trustLevel: 'trusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: ['network', 'database', 'filesystem'],
                deniedCapabilities: ['exec', 'system'],
                requiredCapabilities: ['network', 'database', 'filesystem'],
              },
              {
                pluginName: 'community-advanced-tools',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: false,
                grantedCapabilities: [],
                deniedCapabilities: ['filesystem', 'exec', 'network'],
                requiredCapabilities: ['filesystem', 'exec', 'network'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for content
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });
    await expect(page.getByText('community-analytics')).toBeVisible();

    // Verify capability sections are visible
    await expect(page.getByText('Granted Capabilities')).toBeVisible();
    await expect(page.getByText('Denied Capabilities')).toBeVisible();
    await expect(page.getByText('Required Capabilities')).toBeVisible();

    // Wait for badges to render
    await page.waitForTimeout(1000);

    // Screenshot: Plugin details with capabilities
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-capabilities-detail.png',
      fullPage: true,
    });
  });

  test('Screenshot 3: Trust management dialog - Trust Plugin', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'community-untrusted-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: [],
                deniedCapabilities: ['network', 'filesystem'],
                requiredCapabilities: ['network', 'filesystem'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });
    await expect(page.getByText('community-untrusted-plugin')).toBeVisible();

    // Click Trust Plugin button
    const trustButton = page.locator('button:has-text("Trust Plugin")').first();
    await trustButton.click();

    // Wait for confirm modal to appear
    await expect(page.getByText('Trust Plugin')).toBeVisible();
    await expect(page.getByText(/Are you sure you want to trust the plugin/)).toBeVisible();
    await page.waitForTimeout(500);

    // Screenshot: Trust confirmation modal
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-trust-dialog.png',
      fullPage: false,
    });
  });

  test('Screenshot 4: Trust management dialog - Revoke Trust', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'community-trusted-plugin',
                trustLevel: 'trusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: ['network', 'database'],
                deniedCapabilities: [],
                requiredCapabilities: ['network', 'database'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });
    await expect(page.getByText('community-trusted-plugin')).toBeVisible();

    // Click Revoke Trust button
    const revokeButton = page.locator('button:has-text("Revoke Trust")').first();
    await revokeButton.click();

    // Wait for confirm modal
    await expect(page.getByText('Revoke Trust')).toBeVisible();
    await expect(page.getByText(/Are you sure you want to revoke trust/)).toBeVisible();
    await page.waitForTimeout(500);

    // Screenshot: Revoke trust confirmation modal
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-revoke-dialog.png',
      fullPage: false,
    });
  });

  test('Screenshot 5: Plugin signature verification display', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'verified-plugin',
                trustLevel: 'trusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: ['network'],
                deniedCapabilities: [],
                requiredCapabilities: ['network'],
              },
              {
                pluginName: 'invalid-signature-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: false,
                grantedCapabilities: [],
                deniedCapabilities: ['network'],
                requiredCapabilities: ['network'],
              },
              {
                pluginName: 'unsigned-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: null,
                grantedCapabilities: [],
                deniedCapabilities: [],
                requiredCapabilities: [],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for all signature badges to be visible
    await expect(page.getByText('Valid')).toBeVisible();
    await expect(page.getByText('Invalid')).toBeVisible();
    await expect(page.getByText('No Signature')).toBeVisible();
    await page.waitForTimeout(1000);

    // Screenshot: Signature verification display
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-signature-verification.png',
      fullPage: true,
    });
  });

  test('Screenshot 6: Security warning states - Verification Failed', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'malicious-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: false,
                grantedCapabilities: [],
                deniedCapabilities: ['filesystem', 'exec', 'network', 'system'],
                requiredCapabilities: ['filesystem', 'exec', 'network', 'system'],
              },
              {
                pluginName: 'suspicious-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: false,
                grantedCapabilities: [],
                deniedCapabilities: ['exec'],
                requiredCapabilities: ['exec'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click Verification Failed filter
    const failedTab = page.locator('.tab:has-text("Verification Failed")');
    await failedTab.click();
    await page.waitForTimeout(1000);

    // Verify failed plugins are shown
    await expect(page.getByText('malicious-plugin')).toBeVisible();
    await expect(page.getByText('suspicious-plugin')).toBeVisible();

    // Screenshot: Verification failed warning state
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-warning-states.png',
      fullPage: true,
    });
  });

  test('Screenshot 7: Empty state - No plugins', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for empty state to be visible
    await expect(page.getByText('No plugins found')).toBeVisible();
    await expect(page.getByText('No plugins are currently installed')).toBeVisible();
    await page.waitForTimeout(500);

    // Screenshot: Empty state
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-empty-state.png',
      fullPage: true,
    });
  });

  test('Screenshot 8: Loading state', async ({ page }) => {
    // Mock API with delay to capture loading state
    await page.route('/api/admin/plugins/security', async (route) => {
      // Delay response to capture loading state
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'test-plugin',
                trustLevel: 'trusted',
                isBuiltIn: true,
                signatureValid: null,
                grantedCapabilities: ['network'],
                deniedCapabilities: [],
                requiredCapabilities: ['network'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);

    // Navigate to page
    await page.goto('/admin/plugin-security');

    // Wait for loading skeleton to appear
    await page.waitForSelector('.skeleton', { timeout: 5000 });

    // Quick screenshot of loading state before it disappears
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-loading-state.png',
      fullPage: true,
    });
  });

  test('Screenshot 9: Filtered view - Untrusted plugins', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'llm-openai',
                trustLevel: 'trusted',
                isBuiltIn: true,
                signatureValid: null,
                grantedCapabilities: ['network', 'llm'],
                deniedCapabilities: [],
                requiredCapabilities: ['network', 'llm'],
              },
              {
                pluginName: 'untrusted-plugin-1',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: null,
                grantedCapabilities: [],
                deniedCapabilities: ['network'],
                requiredCapabilities: ['network'],
              },
              {
                pluginName: 'untrusted-plugin-2',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: false,
                grantedCapabilities: [],
                deniedCapabilities: ['filesystem'],
                requiredCapabilities: ['filesystem'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click Untrusted filter
    const untrustedTab = page.locator('.tab:has-text("Untrusted")');
    await untrustedTab.click();
    await page.waitForTimeout(1000);

    // Verify only untrusted plugins are shown
    await expect(page.getByText('untrusted-plugin-1')).toBeVisible();
    await expect(page.getByText('untrusted-plugin-2')).toBeVisible();

    // Screenshot: Filtered view
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-filtered-untrusted.png',
      fullPage: true,
    });
  });

  test('Screenshot 10: Success message after verification', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'test-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: [],
                deniedCapabilities: [],
                requiredCapabilities: ['network'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    // Mock verification endpoint
    await page.route('/api/admin/plugins/test-plugin/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Plugin verified successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });
    await expect(page.getByText('test-plugin')).toBeVisible();

    // Click Re-verify button
    const reverifyButton = page.locator('button:has-text("Re-verify")').first();
    await reverifyButton.click();

    // Wait for success message
    await expect(page.getByText(/Plugin 'test-plugin' verified successfully/)).toBeVisible();
    await page.waitForTimeout(500);

    // Screenshot: Success message
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-success-message.png',
      fullPage: true,
    });
  });

  test('Screenshot 11: Built-in plugins view', async ({ page }) => {
    await page.route('/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plugins: [
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
                pluginName: 'community-plugin',
                trustLevel: 'trusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: ['network'],
                deniedCapabilities: [],
                requiredCapabilities: ['network'],
              },
            ],
          },
          message: 'Plugin security status retrieved successfully',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/plugin-security');

    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click Built-in filter
    const builtinTab = page.locator('.tab:has-text("Built-in")');
    await builtinTab.click();
    await page.waitForTimeout(1000);

    // Verify only built-in plugins are shown
    await expect(page.getByText('llm-openai')).toBeVisible();
    await expect(page.getByText('llm-anthropic')).toBeVisible();
    await expect(page.getByText('message-discord')).toBeVisible();
    await expect(page.getByText('Built-in plugins are always trusted')).toBeVisible();

    // Screenshot: Built-in plugins view
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-builtin-plugins.png',
      fullPage: true,
    });
  });
});
