import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(90000);

  const mockServers = {
    servers: [
      {
        name: 'Weather Service',
        serverUrl: 'http://localhost:8001',
        connected: true,
        description: 'Provides weather updates',
        tools: [{ name: 'get_weather' }, { name: 'get_forecast' }],
        lastConnected: '2023-10-27T10:00:00Z'
      },
      {
        name: 'Database Connector',
        serverUrl: 'http://localhost:8002',
        connected: false,
        description: 'SQL database access',
        tools: [],
        lastConnected: null
      }
    ],
    configurations: [
      {
        name: 'Failing Server',
        serverUrl: 'http://localhost:8003',
        description: 'Always fails',
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('*/**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockServers
        })
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
  });

  test('can search servers by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Weather');
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    await expect(serverCards.filter({ hasText: 'Weather Service' })).toBeVisible();
    await expect(serverCards.filter({ hasText: 'Database Connector' })).not.toBeVisible();

    await assertNoErrors(errors, 'Server search by name');
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Select "Running" status
    // The Select component uses standard <select> element
    const statusSelect = page.locator('select');
    await statusSelect.selectOption('running');
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    await expect(serverCards.filter({ hasText: 'Weather Service' })).toBeVisible();
    await expect(serverCards.filter({ hasText: 'Database Connector' })).not.toBeVisible();
    // Failing Server from configurations comes as 'stopped' because it's not in the connected list in the mock logic inside MCPServersPage

    // Select "Stopped" status
    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    await expect(serverCards.filter({ hasText: 'Weather Service' })).not.toBeVisible();
    await expect(serverCards.filter({ hasText: 'Database Connector' })).toBeVisible();
    await expect(serverCards.filter({ hasText: 'Failing Server' })).toBeVisible();

    await assertNoErrors(errors, 'Server filter by status');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No servers found')).toBeVisible();
    await expect(page.locator('text=Clear Search')).toBeVisible();

    // Test clear search functionality
    await page.click('text=Clear Search');
    await expect(page.locator('.card')).toHaveCount(3); // Weather, DB, Failing

    await assertNoErrors(errors, 'Server empty search state');
  });

   test('shows empty state when no servers configured', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Override the mock for this test
    await page.route('*/**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { servers: [], configurations: [] }
        })
      });
    });

    await navigateAndWaitReady(page, '/admin/mcp/servers');

    await expect(page.locator('text=No MCP Servers Configured')).toBeVisible();
    await expect(page.locator('button:has-text("Add First Server")')).toBeVisible();

    await assertNoErrors(errors, 'Server empty initial state');
  });
});
