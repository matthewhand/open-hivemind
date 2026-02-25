import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock MCP servers/tools list
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          servers: [
            {
              name: 'Filesystem',
              serverUrl: 'http://localhost:3000',
              connected: true,
              tools: [
                {
                  name: 'read_file',
                  description: 'Reads a file from the local filesystem.',
                  inputSchema: {
                    type: 'object',
                    properties: { path: { type: 'string', description: 'Path to file' } },
                    required: ['path']
                  }
                },
                {
                  name: 'write_file',
                  description: 'Writes content to a file on the local filesystem.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string', description: 'Path to file' },
                      content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['path', 'content']
                  }
                }
              ]
            },
            {
              name: 'Search',
              serverUrl: 'http://search:8080',
              connected: true,
              tools: [
                {
                  name: 'google_search',
                  description: 'Perform a Google search.',
                  inputSchema: {
                    type: 'object',
                    properties: { query: { type: 'string' } },
                    required: ['query']
                  }
                }
              ]
            }
          ]
        }),
      });
    });
  });

  test('capture MCP tools page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for the page to load and tools to be displayed
    await expect(page.getByText('MCP Tools', { exact: true })).toBeVisible();
    await expect(page.getByText('read_file')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Open "Run Tool" modal for read_file
    await page.locator('.card').filter({ hasText: 'read_file' }).getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal to be visible
    const runModal = page.locator('.modal-box').filter({ hasText: 'Run Tool: read_file' });
    await expect(runModal).toBeVisible();

    // Take screenshot of the run modal
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-run-modal.png' });
  });
});
