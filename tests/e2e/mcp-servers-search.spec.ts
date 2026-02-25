import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(90000);

  const mockServers = [
    {
      name: 'Running Server',
      serverUrl: 'http://running.com',
      connected: true,
      tools: [{ name: 'tool1' }],
      lastConnected: new Date().toISOString(),
      description: 'A running MCP server',
    },
    {
      name: 'Stopped Server',
      serverUrl: 'http://stopped.com',
      connected: false,
      tools: [],
      description: 'A stopped MCP server',
    },
    {
      name: 'Error Server',
      serverUrl: 'http://error.com',
      connected: false, // In UI logic, status is running/stopped, but 'error' status is handled if status prop is 'error'.
                      // However, the component derives status from `server.connected`.
                      // Wait, let's check MCPServersPage logic:
                      // status: server.connected ? 'running' : 'stopped'
                      // So 'error' status is not easily mockable via just connected flag unless we change how it's mapped or if the API returns a status field.
                      // Looking at MCPServersPage.tsx:
                      // const connectedServers = ... status: server.connected ? 'running' : 'stopped'
                      // So currently it only supports running/stopped from API data.
                      // But existing code had `status: 'running' | 'stopped' | 'error'`.
                      // I will stick to running/stopped for now as that's what the component derives.
      description: 'Another server',
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [mockServers[0]], // running
            configurations: [mockServers[1], mockServers[2]] // stopped (since not in servers list)
          }
        })
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
  });

  test('can search servers by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Running');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    const visibleServer = serverCards.filter({ hasText: 'Running Server' });
    await expect(visibleServer).toBeVisible();

    await expect(page.locator('text=Stopped Server')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP server search by name');
    await page.screenshot({ path: 'verification-mcp-search.png' });
  });

  test('can search servers by url', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('stopped.com');
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    const visibleServer = serverCards.filter({ hasText: 'Stopped Server' });
    await expect(visibleServer).toBeVisible();

    await expect(page.locator('text=Running Server')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP server search by url');
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Select 'Running' status
    const statusSelect = page.locator('select');
    await statusSelect.selectOption('running');
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    await expect(serverCards.filter({ hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('text=Stopped Server')).not.toBeVisible();

    // Select 'Stopped' status
    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    await expect(serverCards.filter({ hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('text=Running Server')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP server filter by status');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No servers found')).toBeVisible();
    await expect(page.locator('text=Try adjusting your search')).toBeVisible();

    // Test clear action
    const clearButton = page.getByRole('button', { name: 'Clear Filters' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await page.waitForTimeout(500);
    // Should show all servers again
    await expect(page.locator('text=Running Server')).toBeVisible();
    await expect(page.locator('text=Stopped Server')).toBeVisible();

    await assertNoErrors(errors, 'MCP server empty search state');
  });
});
