import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(60000);

  const mockServers = {
    data: {
      servers: [
        {
          name: 'Running Server',
          url: 'http://running.com',
          connected: true,
          tools: [{ name: 'tool1' }],
          lastConnected: new Date().toISOString(),
          description: 'A running server',
        },
        {
          name: 'Stopped Server',
          url: 'http://stopped.com',
          connected: false,
          tools: [],
          description: 'A stopped server',
        }
      ],
      configurations: []
    }
  };

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockServers)
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    // Mock auth check usually handled by global setup or test-utils if using setupAuth
    // But here we rely on existing session or mock if needed.
    // mcp-crud.spec.ts mocks /api/auth/check.
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
    // We expect 1 visible card (or more if layout adds wrappers, but .card usually targets the component)
    const visibleServer = serverCards.filter({ hasText: 'Running Server' });
    await expect(visibleServer).toBeVisible();

    // Check others are not visible
    await expect(page.locator('text=Stopped Server')).not.toBeVisible();

    await assertNoErrors(errors, 'Server search by name');
    await page.screenshot({ path: 'verification-mcp-search.png' });
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Use specific selector for the select element inside SearchFilterBar
    // It has options: All Statuses, Running, Stopped, Error
    const statusSelect = page.getByRole('combobox');
    await statusSelect.selectOption('stopped');

    await page.waitForTimeout(500);

    const visibleServer = page.locator('.card', { hasText: 'Stopped Server' });
    await expect(visibleServer).toBeVisible();

    await expect(page.locator('text=Running Server')).not.toBeVisible();

    await assertNoErrors(errors, 'Server filter by status');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No servers found')).toBeVisible();
    await expect(page.locator('text=Try adjusting your search or filters')).toBeVisible();

    await assertNoErrors(errors, 'Server empty search state');
  });

  test('clearing search restores all servers', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('Running');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();

    // Clear search using the 'X' button
    const clearButton = page.getByLabel('Clear search');
    await clearButton.click();

    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    await assertNoErrors(errors, 'Server clear search');
  });
});
