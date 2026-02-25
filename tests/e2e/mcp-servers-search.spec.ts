import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Common mocks
    await page.route('**/api/csrf-token', async route => route.fulfill({ json: { token: 'mock-token' } }));
    await page.route('**/api/config/global', async route => route.fulfill({ json: {} }));
    await page.route('**/api/health', async route => route.fulfill({ json: { status: 'ok' } }));

    // Mock the MCP servers endpoint with data for testing
    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({
        json: {
          data: {
            servers: [
              {
                name: 'Production Server',
                serverUrl: 'http://prod:8080',
                connected: true,
                description: 'Main production server',
                tools: [{ name: 'tool1' }, { name: 'tool2' }],
                lastConnected: new Date().toISOString()
              },
              {
                name: 'Dev Server',
                serverUrl: 'http://dev:3000',
                connected: false,
                description: 'Development server for testing',
                tools: [],
                lastConnected: null
              }
            ],
            configurations: []
          }
        }
      });
    });
  });

  test('Search and filter MCP servers', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Initial state: both servers visible
    await expect(page.getByRole('heading', { name: 'Production Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Server' })).toBeVisible();

    // 1. Test Search
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Production');

    // Production Server should be visible, Dev Server should be hidden
    await expect(page.getByRole('heading', { name: 'Production Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Server' })).not.toBeVisible();

    // Clear search using the 'x' button inside the input (if provided by browser/SearchFilterBar)
    // Or just clear the input text
    await searchInput.fill('');
    await expect(page.getByRole('heading', { name: 'Production Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Server' })).toBeVisible();

    // 2. Test Status Filter
    // Select 'Stopped' (Dev Server is stopped because connected: false)
    // The Select component renders a standard select element
    const statusSelect = page.locator('select');
    await statusSelect.selectOption('stopped');

    await expect(page.getByRole('heading', { name: 'Dev Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Production Server' })).not.toBeVisible();

    // Select 'Running'
    await statusSelect.selectOption('running');

    await expect(page.getByRole('heading', { name: 'Production Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Server' })).not.toBeVisible();

    // Reset to 'All'
    await statusSelect.selectOption('all');
    await expect(page.getByRole('heading', { name: 'Production Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Server' })).toBeVisible();

    // 3. Test No Results Empty State
    await searchInput.fill('NonExistentServer');

    await expect(page.getByText('No servers found')).toBeVisible();
    // Use partial match for the description text as it includes dynamic search term
    await expect(page.getByText('No servers match your search')).toBeVisible();

    // Test Clear Search button in Empty State
    await page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' }).click();

    await expect(page.getByRole('heading', { name: 'Production Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dev Server' })).toBeVisible();
    await expect(searchInput).toHaveValue('');
  });

  test('Show empty state when no servers configured', async ({ page }) => {
    // Override the mock for this test
    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: { data: { servers: [], configurations: [] } } });
    });

    await page.goto('/admin/mcp/servers');

    await expect(page.getByText('No servers configured')).toBeVisible();
    // Target the button inside the empty state to avoid strict mode violation with the header button
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Add Server' })).toBeVisible();
  });
});
