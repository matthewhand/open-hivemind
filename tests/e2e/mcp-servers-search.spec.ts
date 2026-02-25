import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock common endpoints
    await page.route('**/api/config/llm-status', async route => {
      await route.fulfill({ json: { defaultConfigured: false, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } });
    });
    await page.route('**/api/demo/status', async (route) => route.fulfill({ json: { active: false } }));
  });

  test('Filters servers by name and status', async ({ page }) => {
    const mockServers = {
      data: {
        servers: [
          { name: 'Running Server', serverUrl: 'mcp://running', connected: true, description: 'A running server', tools: [] },
          { name: 'Stopped Server', serverUrl: 'mcp://stopped', connected: false, description: 'A stopped server', tools: [] },
        ],
        configurations: []
      }
    };

    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: mockServers });
    });

    await page.goto('/admin/mcp/servers');

    // Initial state: both servers visible
    // Use headings to be specific
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // 1. Search by name
    await page.getByPlaceholder('Search servers...').fill('Running');
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeHidden();

    // Clear search using the X button in input
    await page.getByLabel('Clear search').click();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // 2. Filter by status
    await page.getByRole('combobox').selectOption('stopped');
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Reset status
    await page.getByRole('combobox').selectOption('all');
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
  });

  test('Shows empty state when no servers configured', async ({ page }) => {
    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: { data: { servers: [], configurations: [] } } });
    });

    await page.goto('/admin/mcp/servers');

    await expect(page.getByText('No Servers Configured')).toBeVisible();
    // Use last() because header also has "Add Server" button
    await expect(page.getByRole('button', { name: 'Add Server' }).last()).toBeVisible();
  });

  test('Shows no results state when search matches nothing', async ({ page }) => {
    const mockServers = {
      data: {
        servers: [
          { name: 'My Server', serverUrl: 'mcp://myserver', connected: true, description: 'My server', tools: [] },
        ],
        configurations: []
      }
    };

    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: mockServers });
    });

    await page.goto('/admin/mcp/servers');

    await page.getByPlaceholder('Search servers...').fill('NonExistent');

    await expect(page.getByText('No Results Found')).toBeVisible();
    await expect(page.getByText('No servers match your search for "NonExistent"')).toBeVisible();

    // Click "Clear Search" button in EmptyState
    // Use testid to distinguish from the X button in the input (if visible/matched) or other buttons
    await page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' }).click();

    await expect(page.getByRole('heading', { name: 'My Server' })).toBeVisible();
  });
});
