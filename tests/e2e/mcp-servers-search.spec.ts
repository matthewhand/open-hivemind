import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock common endpoints
    await page.route('**/api/csrf-token', async route => {
      await route.fulfill({ json: { token: 'mock-token' } });
    });
  });

  test('MCP Servers Page shows empty state when no servers configured', async ({ page }) => {
    // Mock empty servers
    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: { data: { servers: [], configurations: [] } } });
    });

    await page.goto('/admin/mcp/servers');

    // Verify empty state
    await expect(page.getByText('No servers configured')).toBeVisible();
    await expect(page.getByText('Get started by adding your first MCP server')).toBeVisible();
    // Check for "Add Server" button in the empty state
    // Use the last one because there is one in the header too
    await expect(page.getByRole('button', { name: 'Add Server' }).last()).toBeVisible();
  });

  test('MCP Servers Page filters by search term', async ({ page }) => {
    // Mock servers
    const mockServers = {
      servers: [
        {
          name: 'Running Server',
          url: 'http://localhost:3000',
          connected: true,
          description: 'A running server',
          tools: [],
          lastConnected: new Date().toISOString()
        }
      ],
      configurations: [
        {
          name: 'Stopped Server',
          serverUrl: 'http://localhost:3001',
          connected: false,
          description: 'A stopped server'
        }
      ]
    };

    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: { data: mockServers } });
    });

    await page.goto('/admin/mcp/servers');

    // Verify both servers are visible
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Search for "Running"
    await page.getByPlaceholder('Search servers...').fill('Running');
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();

    // Search for "Stopped"
    await page.getByPlaceholder('Search servers...').fill('Stopped');
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Search for "NonExistent"
    await page.getByPlaceholder('Search servers...').fill('NonExistent');
    await expect(page.getByText('No results found')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' })).toBeVisible();

    // Clear search
    await page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
  });

  test('MCP Servers Page filters by status', async ({ page }) => {
     // Mock servers
    const mockServers = {
      servers: [
        {
          name: 'Running Server',
          url: 'http://localhost:3000',
          connected: true,
          description: 'A running server',
          tools: [],
          lastConnected: new Date().toISOString()
        }
      ],
      configurations: [
        {
          name: 'Stopped Server',
          serverUrl: 'http://localhost:3001',
          connected: false,
          description: 'A stopped server'
        }
      ]
    };

    await page.route('**/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: { data: mockServers } });
    });

    await page.goto('/admin/mcp/servers');

    // Filter by Running
    await page.getByRole('combobox').selectOption('running');
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();

    // Filter by Stopped
    await page.getByRole('combobox').selectOption('stopped');
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Filter by All
    await page.getByRole('combobox').selectOption('all');
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
  });
});
