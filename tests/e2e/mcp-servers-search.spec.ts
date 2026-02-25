import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
} from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(60000);

  const MOCK_SERVERS = {
    data: {
      servers: [
        {
          name: 'Running Server',
          serverUrl: 'http://localhost:3000',
          connected: true,
          description: 'A running MCP server',
          tools: ['tool1', 'tool2'],
          lastConnected: new Date().toISOString(),
        },
        {
          name: 'Stopped Server',
          serverUrl: 'http://localhost:3001',
          connected: false,
          description: 'A stopped MCP server',
          tools: [],
        },
      ],
      configurations: [],
    },
  };

  test.beforeEach(async ({ page }) => {
    // Mock common API endpoints to prevent 404s/errors from Layout components
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profiles: { llm: [] } }) });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [] }) });
    });

    await page.route('**/api/notifications', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Catch-all for other API requests to avoid network errors
    await page.route('**/api/**', async (route) => {
       const url = route.request().url();
       await route.continue();
    });
  });

  test('should filter servers by name and status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock API responses
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SERVERS),
      });
    });

    // Navigate to the page
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Verify initial state (all servers visible)
    await expect(page.getByText('Running Server')).toBeVisible();
    await expect(page.getByText('Stopped Server')).toBeVisible();

    // Test Search
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Running');
    await expect(page.getByText('Running Server')).toBeVisible();
    await expect(page.getByText('Stopped Server')).not.toBeVisible();

    // Clear search
    // We expect the button to be clickable now that pointer-events-auto is added
    await page.getByLabel('Clear search').click();
    await expect(page.getByText('Running Server')).toBeVisible();
    await expect(page.getByText('Stopped Server')).toBeVisible();

    // Test Status Filter
    const statusSelect = page.getByRole('combobox');
    await statusSelect.selectOption('stopped');
    await expect(page.getByText('Running Server')).not.toBeVisible();
    await expect(page.getByText('Stopped Server')).toBeVisible();

    // Test "No Results" Empty State
    await statusSelect.selectOption('All');
    await searchInput.fill('NonExistentServer');
    await expect(page.getByText('No results found')).toBeVisible();
    await expect(page.getByText('No servers match your search')).toBeVisible();

    // Clear search via Empty State action
    // Scope to empty state to avoid ambiguity if there was another "Clear Search" button
    await page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.getByText('Running Server')).toBeVisible();

    await assertNoErrors(errors, 'MCP Servers Search');
  });

  test('should show empty state when no servers exist', async ({ page }) => {
     const errors = await setupTestWithErrorDetection(page);

    // Mock API with empty list
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { servers: [], configurations: [] } }),
      });
    });

    await navigateAndWaitReady(page, '/admin/mcp/servers');

    await expect(page.getByText('No servers configured')).toBeVisible();

    // Scope the button check to the empty state container to avoid ambiguity
    // with the page header "Add Server" button
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Add Server' })).toBeVisible();

    await assertNoErrors(errors, 'MCP Servers Empty State');
  });
});
