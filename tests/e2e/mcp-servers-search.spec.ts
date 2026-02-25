import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady, assertNoErrors } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  const mockServers = {
    servers: [
      {
        name: 'Running Server',
        url: 'http://running.com',
        connected: true,
        tools: [{ name: 'tool1' }],
        lastConnected: new Date().toISOString(),
        description: 'A running server',
      }
    ],
    configurations: [
      {
        name: 'Stopped Server',
        serverUrl: 'http://stopped.com',
        status: 'stopped',
        description: 'A stopped server',
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock the MCP servers endpoint
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

    // Mock auth check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock other potential API calls to prevent 404s
    await page.route('**/api/config/**', async route => route.fulfill({ status: 200, body: '{}' }));
  });

  test('should filter servers by search query', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.getByPlaceholder('Search servers...');
    await expect(searchInput).toBeVisible();

    // Search by name
    await searchInput.fill('Running');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();

    // Search by description
    await searchInput.fill('stopped server');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();

    await page.screenshot({ path: 'mcp-search-running.png' });

    // Filter out expected 401s if any (background polling)
    const relevantErrors = errors.filter(e => !e.includes('401 Unauthorized'));
    await assertNoErrors(relevantErrors, 'Filter by search query');
  });

  test('should filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const statusSelect = page.locator('select');
    await expect(statusSelect).toBeVisible();

    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();

    await statusSelect.selectOption('running');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();

    await page.screenshot({ path: 'mcp-filter-stopped.png' });

    const relevantErrors = errors.filter(e => !e.includes('401 Unauthorized'));
    await assertNoErrors(relevantErrors, 'Filter by status');
  });

  test('should show empty state when no matches', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('NonExistent');
    await page.waitForTimeout(500);

    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();

    // Test Clear Filters action
    const clearButton = page.getByRole('button', { name: 'Clear Filters' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    await page.screenshot({ path: 'mcp-empty-state.png' });

    const relevantErrors = errors.filter(e => !e.includes('401 Unauthorized'));
    await assertNoErrors(relevantErrors, 'Empty state');
  });
});
