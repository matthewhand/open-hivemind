import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock the MCP servers API response
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            servers: [
              {
                name: 'Alpha Server',
                serverUrl: 'http://alpha.local',
                connected: true,
                tools: [{ name: 'tool1' }],
                lastConnected: new Date().toISOString(),
                description: 'The first server',
              },
              {
                name: 'Beta Server',
                serverUrl: 'http://beta.local',
                connected: false,
                tools: [],
                description: 'The second server',
              },
            ],
            configurations: [
              {
                name: 'Gamma Server',
                serverUrl: 'http://gamma.local',
                apiKey: '123',
                description: 'The third server',
              }
            ]
          }
        }),
      });
    });

    // Mock other potentially called endpoints to avoid 404s/errors
    await page.route('/api/config/global', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });
  });

  test('should search and filter servers', async ({ page }) => {
    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and servers to be displayed
    await expect(page.getByText('Alpha Server')).toBeVisible();
    await expect(page.getByText('Beta Server')).toBeVisible();
    await expect(page.getByText('Gamma Server')).toBeVisible();

    // Verify SearchFilterBar is present
    const searchInput = page.getByPlaceholder('Search servers...');
    await expect(searchInput).toBeVisible();

    // Test 1: Search functionality
    await searchInput.fill('Alpha');
    // Wait for filtering
    await expect(page.getByText('Alpha Server')).toBeVisible();
    await expect(page.getByText('Beta Server')).not.toBeVisible();
    await expect(page.getByText('Gamma Server')).not.toBeVisible();

    // Test 2: Clear search
    await searchInput.fill('');
    await expect(page.getByText('Alpha Server')).toBeVisible();
    await expect(page.getByText('Beta Server')).toBeVisible();
    await expect(page.getByText('Gamma Server')).toBeVisible();

    // Test 3: Filter by status
    const statusFilter = page.locator('select');
    await statusFilter.selectOption('running');

    await expect(page.getByText('Alpha Server')).toBeVisible();
    await expect(page.getByText('Beta Server')).not.toBeVisible();
    await expect(page.getByText('Gamma Server')).not.toBeVisible();

    await statusFilter.selectOption('stopped');
    await expect(page.getByText('Alpha Server')).not.toBeVisible();
    await expect(page.getByText('Beta Server')).toBeVisible();
    await expect(page.getByText('Gamma Server')).toBeVisible();

    // Test 4: Empty State
    await statusFilter.selectOption('all');
    await searchInput.fill('Zeta'); // Non-existent

    // Verify EmptyState
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('No servers match your search criteria.')).toBeVisible();

    // Test 5: Clear Search action on EmptyState
    const clearButton = page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Verify all servers back
    await expect(page.getByText('Alpha Server')).toBeVisible();
    await expect(page.getByText('Beta Server')).toBeVisible();
    await expect(page.getByText('Gamma Server')).toBeVisible();
    await expect(searchInput).toHaveValue('');

    // Take screenshot
    await page.screenshot({ path: 'mcp-servers-search.png', fullPage: true });
  });
});
