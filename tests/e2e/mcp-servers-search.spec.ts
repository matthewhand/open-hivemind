import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock the MCP servers API response
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            servers: [
              {
                name: 'Running Server',
                serverUrl: 'http://localhost:3000',
                connected: true,
                description: 'This is a running server',
                tools: [{}, {}],
                lastConnected: new Date().toISOString(),
              },
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://localhost:3001',
                description: 'This is a stopped server',
              },
              {
                name: 'Error Server',
                serverUrl: 'http://localhost:3002',
                description: 'This server has an error',
              },
            ],
          },
        }),
      });
    });

    // Navigate to the MCP Servers page
    await page.goto('/admin/mcp/servers');
  });

  test('should display all servers initially', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Error Server' })).toBeVisible();
  });

  test('should filter servers by search term', async ({ page }) => {
    // Search for "Running"
    await page.getByPlaceholder('Search servers by name, description, or URL...').fill('Running');

    // Verify only "Running Server" is visible
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Error Server' })).not.toBeVisible();

    // Search for "stopped" (case insensitive)
    await page.getByPlaceholder('Search servers by name, description, or URL...').fill('stopped');

    // Verify only "Stopped Server" is visible
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Error Server' })).not.toBeVisible();
  });

  test('should filter servers by status', async ({ page }) => {
    // Select "Running" status
    await page.getByRole('combobox').selectOption('running');

    // Verify only "Running Server" is visible
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Error Server' })).not.toBeVisible();

    // Select "Stopped" status
    await page.getByRole('combobox').selectOption('stopped');

    // Verify "Stopped Server" and "Error Server"
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Error Server' })).toBeVisible();
  });

  test('should show empty state when no results found', async ({ page }) => {
    await page.getByPlaceholder('Search servers by name, description, or URL...').fill('NonExistentServer');

    await expect(page.getByText('No Results Found')).toBeVisible();
    // Use testid to target the empty state button specifically
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' })).toBeVisible();

    // Click Clear Search
    await page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' }).click();

    // Verify servers are back
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
  });
});

test.describe('MCP Servers Empty State', () => {
  test('should show no data empty state when no servers exist', async ({ page }) => {
     // Mock empty response
     await page.route('**/api/admin/mcp-servers', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              servers: [],
              configurations: [],
            },
          }),
        });
      });

    await page.goto('/admin/mcp/servers');

    await expect(page.getByText('No Servers Configured')).toBeVisible();
    // Use testid to target the empty state button specifically
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Add Server' })).toBeVisible();
  });
});
