import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(90000);

  const mockServers = {
    servers: [
      {
        name: 'Running Server',
        serverUrl: 'http://running.com',
        connected: true,
        tools: [],
        lastConnected: new Date().toISOString(),
        description: 'A running server'
      }
    ],
    configurations: [
      {
        name: 'Stopped Server',
        serverUrl: 'http://stopped.com',
        apiKey: '123',
        description: 'A stopped server'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockServers
        }),
      });
    });

    // Mock auth check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock other config endpoints to prevent errors in UberLayout
    await page.route('*/**/api/config/global', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('*/**/api/config/llm-status', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true }) });
    });
     await page.route('*/**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
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

    await assertNoErrors(errors, 'Server search by name');
    await page.screenshot({ path: 'verification-mcp-search-name.png' });
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Select 'Stopped' from filter
    // The SearchFilterBar uses DaisyUI Select which is a standard select under the hood
    const statusSelect = page.locator('select');
    await statusSelect.selectOption('stopped');

    await page.waitForTimeout(500);

    const visibleServer = page.locator('.card').filter({ hasText: 'Stopped Server' });
    await expect(visibleServer).toBeVisible();

    await expect(page.locator('text=Running Server')).not.toBeVisible();

    await assertNoErrors(errors, 'Server filter by status');
    await page.screenshot({ path: 'verification-mcp-filter-status.png' });
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No servers found')).toBeVisible();
    await expect(page.locator('text=Try adjusting your search or filters')).toBeVisible();

    // Verify Clear Filters button works
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('.card').filter({ hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Stopped Server' })).toBeVisible();

    await assertNoErrors(errors, 'Server empty search state');
    await page.screenshot({ path: 'verification-mcp-empty-state.png' });
  });
});
