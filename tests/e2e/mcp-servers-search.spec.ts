import { expect, test } from '@playwright/test';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock initial list of servers
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [
              {
                name: 'Running Server',
                url: 'http://running.com',
                connected: true,
                tools: [],
                lastConnected: new Date().toISOString(),
                description: 'A running server instance',
              }
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                apiKey: '123',
                description: 'A stopped server instance',
              }
            ],
          },
        }),
      });
    });

    // Mock other endpoints that might be called
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true }) });
    });
  });

  test('should search and filter servers', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // 1. Search for "Running"
    const searchInput = page.getByPlaceholder('Search servers...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Running');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify "Running Server" is visible and "Stopped Server" is hidden
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).not.toBeVisible();

    // 2. Search by Description
    await searchInput.fill('stopped server instance');
    await page.waitForTimeout(500);
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).not.toBeVisible();

    // 3. Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();

    // 4. Filter by Status "Stopped"
    // Assuming the Select component renders a standard <select> element or similar structure
    // Since SearchFilterBar uses DaisyUI Select, it likely renders a <select>.
    const statusSelect = page.locator('select');
    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).not.toBeVisible();

    // 5. Test Empty State
    // Reset status to all first (or just search for something impossible with current filter)
    await statusSelect.selectOption('all');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    // Verify EmptyState is shown
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search')).toBeVisible();

    // Take screenshot for demonstration
    await page.screenshot({ path: 'mcp-servers-search.png', fullPage: true });
  });
});
