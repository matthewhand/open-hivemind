import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

test.describe('Plugin Security Dashboard', () => {
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

    // Mock Plugin Security API
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
  });

  test('Capture Plugin Security Dashboard', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for stats cards to appear
    await page.waitForSelector('.text-2xl.font-bold', { timeout: 5000 });

    // Wait a bit for all content to render
    await page.waitForTimeout(2000);

    // Screenshot Plugin Security Dashboard
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-dashboard.png',
      fullPage: true,
    });

    // Verify key elements are present
    const statsCards = page.locator('.text-2xl.font-bold');
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least one plugin card exists
    const pluginCards = page.locator('h3:has-text("-")'); // Plugin names contain hyphens
    const pluginCount = await pluginCards.count();
    expect(pluginCount).toBeGreaterThan(0);

    // Verify trust level badges are visible
    const trustedBadge = page.locator('span:has-text("Trusted")');
    await expect(trustedBadge.first()).toBeVisible();
  });

  test('Capture Plugin Security Filters', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click on "Untrusted" filter
    const untrustedTab = page.locator('.tab:has-text("Untrusted")');
    await untrustedTab.click();

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Verify untrusted plugins are shown
    const untrustedPlugins = page.locator('h3:has-text("community-")');
    const untrustedCount = await untrustedPlugins.count();
    expect(untrustedCount).toBeGreaterThan(0);

    // Screenshot filtered view
    await page.screenshot({
      path: 'docs/screenshots/plugin-security-filtered.png',
      fullPage: true,
    });
  });

  test('Capture Plugin Details with Capabilities', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for plugin cards to load
    await page.waitForTimeout(2000);

    // Verify capability badges are present
    const capabilityBadges = page.locator(
      '.badge:has-text("network"), .badge:has-text("llm"), .badge:has-text("database")'
    );
    const badgeCount = await capabilityBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Verify granted capabilities section
    const grantedSection = page.locator('div:has-text("Granted Capabilities")').first();
    await expect(grantedSection).toBeVisible();

    // Verify denied capabilities section
    const deniedSection = page.locator('div:has-text("Denied Capabilities")').first();
    await expect(deniedSection).toBeVisible();
  });

  test('Verify action buttons for non-built-in plugins', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for plugin cards to load
    await page.waitForTimeout(2000);

    // Verify Re-verify button exists for community plugins
    const reverifyButtons = page.locator('button:has-text("Re-verify")');
    const reverifyCount = await reverifyButtons.count();
    expect(reverifyCount).toBeGreaterThan(0);

    // Verify Trust/Revoke buttons exist
    const trustButtons = page.locator(
      'button:has-text("Trust Plugin"), button:has-text("Revoke Trust")'
    );
    const trustCount = await trustButtons.count();
    expect(trustCount).toBeGreaterThan(0);
  });

  test('Verify built-in plugins have no action buttons', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for plugin cards to load
    await page.waitForTimeout(2000);

    // Verify built-in message is present
    const builtInMessage = page.locator('div:has-text("Built-in plugins are always trusted")');
    await expect(builtInMessage.first()).toBeVisible();
  });

  test('Filter by verification failed status', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Click on "Verification Failed" filter
    const failedTab = page.locator('.tab:has-text("Verification Failed")');
    await failedTab.click();

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Verify failed plugins are shown (should only show plugins with signatureValid: false)
    const failedPlugins = page.locator('h3:has-text("community-advanced-tools")');
    await expect(failedPlugins.first()).toBeVisible();
  });

  test('Verify statistics match plugin counts', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Plugin Security page
    await navigateAndWaitReady(page, '/admin/plugin-security');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Plugin Security Dashboard")', { timeout: 10000 });

    // Wait for stats to load
    await page.waitForTimeout(2000);

    // Get all stat values
    const statsCards = page.locator('.text-2xl.font-bold');
    const statsCount = await statsCards.count();
    expect(statsCount).toBe(5); // Total, Trusted, Untrusted, Built-in, Failed

    // Verify total count (6 plugins in mock data)
    const totalStat = statsCards.nth(0);
    const totalText = await totalStat.textContent();
    expect(totalText).toBe('6');
  });
});
