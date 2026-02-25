import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(60000);

  const mockResponse = {
    data: {
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
          apiKey: '123',
          description: 'A stopped server',
        }
      ]
    }
  };

  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock initial list of servers
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    // Mock other endpoints to avoid errors
    await page.route('**/api/config/**', async (route) => {
        await route.fulfill({ status: 200, body: '{}' });
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

    // Check others are not visible
    await expect(page.locator('text=Stopped Server')).not.toBeVisible();

    await assertNoErrors(errors, 'Server search by name');
    await page.screenshot({ path: 'verification-mcp-search-name.png' });
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Select 'Stopped' status
    const statusSelect = page.locator('select').first(); // Assumption: it's the first/only select
    await statusSelect.selectOption('stopped');

    await page.waitForTimeout(500);

    const visibleServer = page.locator('.card', { hasText: 'Stopped Server' });
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

    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();

    // Verify "Clear Filters" button works
    const clearButton = page.getByRole('button', { name: 'Clear Filters' });
    await clearButton.click();

    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    await assertNoErrors(errors, 'Server empty search state');
    await page.screenshot({ path: 'verification-mcp-empty-state.png' });
  });
});
