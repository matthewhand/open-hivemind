import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints to prevent errors/warnings
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock MCP servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [
              {
                name: 'Filesystem Server',
                serverUrl: 'http://localhost:3000',
                connected: true,
                tools: [
                  { name: 'read_file', description: 'Reads a file from the filesystem' },
                  { name: 'write_file', description: 'Writes content to a file on the filesystem' }
                ],
                lastConnected: new Date().toISOString(),
                description: 'Allows access to the local filesystem for reading and writing files.',
              },
              {
                name: 'Search Server',
                serverUrl: 'http://search-mcp:8080',
                connected: true,
                tools: [{ name: 'google_search' }],
                lastConnected: new Date().toISOString(),
                description: 'Provides search capabilities via Google Custom Search API.',
              },
            ],
            configurations: [
              {
                name: 'Database Server',
                serverUrl: 'postgres://user:pass@localhost:5432/db',
                apiKey: 'secret-key',
                description: 'Connects to the production database for querying data.',
              },
            ],
          },
        }),
      });
    });
  });

  test('capture MCP servers page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and servers to be displayed
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server" button
    // Note: use .first() to avoid conflict with the button inside the hidden modal
    await page.getByRole('button', { name: 'Add Server' }).first().click();

    // Wait for modal to be visible
    const addModal = page.locator('.modal-box').filter({ hasText: 'Add MCP Server' });
    await expect(addModal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });

    // Close the modal
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Click "View Tools" button for the first server
    // The "View Tools" button has title="View Tools"
    await page.locator('button[title="View Tools"]').first().click();

    // Wait for modal
    await expect(page.getByText('Tools: Filesystem Server')).toBeVisible();

    // Take screenshot of the tools modal
    await page.screenshot({ path: 'docs/screenshots/mcp-server-tools-modal.png' });
  });
});
