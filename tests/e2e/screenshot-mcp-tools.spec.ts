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

    // Mock background polling endpoints
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

    // Mock MCP servers list with tools
    // Note: MCPToolsPage calls /api/mcp/servers directly
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          servers: [
            {
              name: 'Data Processor',
              serverUrl: 'http://data-mcp:3000',
              connected: true,
              tools: [
                {
                  name: 'process_csv',
                  description: 'Process a CSV file and filter rows based on a column value.',
                  category: 'utility',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      filePath: {
                        type: 'string',
                        description: 'Path to the CSV file',
                      },
                      filterColumn: {
                        type: 'string',
                        description: 'Column name to filter by',
                      },
                      minValue: {
                        type: 'number',
                        description: 'Minimum value for the filter column',
                      },
                      includeHeader: {
                        type: 'boolean',
                        description: 'Whether the output should include headers',
                      },
                    },
                    required: ['filePath', 'filterColumn'],
                  },
                },
              ],
              lastConnected: new Date().toISOString(),
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools page screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'MCP Tools' })).toBeVisible();
    await expect(page.getByText('process_csv')).toBeVisible();

    // Screenshot list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool"
    await page.getByRole('button', { name: 'Run Tool' }).first().click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Run Tool: process_csv' });
    await expect(modal).toBeVisible();

    // Verify form fields
    // Using getByText for labels because "filePath *" includes the asterisk which might be in a separate span or part of the text
    await expect(modal.getByText('filePath')).toBeVisible();
    await expect(modal.getByText('minValue')).toBeVisible();

    // Fill form (to show active state)
    // Note: inputs are associated with labels implicitly via layout or proximity, but since I didn't use htmlFor/id, getByLabel might fail if not properly associated.
    // In SchemaForm, I used:
    // <label className="label">
    //   <span className="label-text font-medium">{key} ...</span>
    // </label>
    // <input ... />
    // They are siblings in a div, not nested or linked by ID.
    // So getByLabel won't work automatically. I need to target inputs relative to labels or by placeholder.

    await modal.locator('input[placeholder="Enter text..."]').first().fill('/data/sales_2024.csv');
    await modal.locator('input[placeholder="Enter text..."]').nth(1).fill('revenue');
    await modal.locator('input[placeholder="Enter number..."]').first().fill('1000');
    await modal.locator('.checkbox').check();

    // Screenshot modal
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
