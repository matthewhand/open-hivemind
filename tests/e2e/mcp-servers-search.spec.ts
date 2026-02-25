import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(60000);

  const mockServers = {
    servers: [
      {
        name: 'Running Server',
        url: 'http://running.com',
        connected: true,
        description: 'A running server',
        tools: [],
        lastConnected: new Date().toISOString(),
      },
      {
        name: 'Error Server',
        url: 'http://error.com',
        connected: false, // In UI this maps to stopped or error depending on other factors, but usually connected=false is stopped unless status is explicitly handled in backend response structure.
                          // Wait, looking at MCPServersPage.tsx: status: server.connected ? 'running' : 'stopped'
                          // The 'error' status comes from... nowhere in the fetch logic I saw?
                          // Let's re-read MCPServersPage.tsx fetch logic.
                          // `status: server.connected ? 'running' : 'stopped'`
                          // Ah, so it only supports running or stopped in the mapped data?
                          // "status: 'running' | 'stopped' | 'error';" is the type.
                          // But the mapping is: `status: server.connected ? 'running' : 'stopped'`
                          // So 'error' might not be reachable unless I missed something.
                          // Wait, the status color function handles 'error'.
                          // But the fetch logic only sets running/stopped.
                          // Wait, I might have misread.
                          // "const connectedServers = ... status: server.connected ? 'running' : 'stopped'"
                          // Yes. So 'error' is currently not used in the initial fetch?
                          // Maybe it is used if I mock data differently?
                          // Actually, let's stick to running and stopped for now.
      }
    ],
    configurations: [
      {
        name: 'Stopped Config',
        serverUrl: 'http://stopped.com',
        description: 'A stopped configuration',
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock MCP servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockServers,
        }),
      });
    });
  });

  test('can search servers by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Running');
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    const visibleServer = serverCards.filter({ hasText: 'Running Server' });
    await expect(visibleServer).toBeVisible();

    // Check others are not visible
    await expect(page.locator('text=Stopped Config')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP server search by name');
    await page.screenshot({ path: 'verification-mcp-search.png' });
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Default shows all (Running Server and Stopped Config)
    // "Running Server" is connected=true -> Running
    // "Stopped Config" is in configurations -> Stopped
    // "Error Server" (if connected=false) -> Stopped

    // Filter by Stopped
    const statusSelect = page.getByRole('combobox'); // Select component
    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    await expect(serverCards.filter({ hasText: 'Stopped Config' })).toBeVisible();
    await expect(serverCards.filter({ hasText: 'Running Server' })).not.toBeVisible();

    await assertNoErrors(errors, 'MCP server filter by status');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No servers found')).toBeVisible();
    await expect(page.locator('text=No servers match your search criteria')).toBeVisible();

    await assertNoErrors(errors, 'MCP server empty search state');
  });
});
