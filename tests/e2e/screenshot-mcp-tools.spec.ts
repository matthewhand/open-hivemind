import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Screenshots', () => {
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

    // Mock MCP servers list for Tools page (endpoint: /api/mcp/servers)
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
            {
              name: 'Demo Server',
              connected: true,
              tools: [
                {
                  name: 'process_data',
                  description: 'Process data with options.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string', description: 'Search query' },
                      limit: { type: 'integer', description: 'Max results' },
                      verbose: { type: 'boolean', description: 'Detailed output' },
                    },
                    required: ['query'],
                  },
                },
              ],
            },
          ],
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
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on the first tool
    await page.locator('.card').first().getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box').filter({ hasText: 'Run Tool: process_data' });
    await expect(modal).toBeVisible();

    // Fill out the form
    await modal.getByPlaceholder('Enter text for query').fill('playwright test');
    await modal.getByPlaceholder('Enter number for limit').fill('10');
    // Toggle check (targeting the verbose field specifically)
    await modal.locator('.form-control').filter({ hasText: 'verbose' }).locator('input[type="checkbox"]').check();

    // Take screenshot of the run modal with filled form
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
