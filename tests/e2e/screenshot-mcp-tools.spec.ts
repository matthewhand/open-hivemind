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
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
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

    // Mock MCP servers list (used by MCPToolsPage)
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          servers: [
            {
              name: 'Utility Server',
              serverUrl: 'http://localhost:3000',
              connected: true,
              tools: [
                {
                  name: 'generate_report',
                  description: 'Generates a report based on provided parameters.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      filename: { type: 'string', description: 'Name of the output file' },
                      count: { type: 'integer', description: 'Number of items to include' },
                      include_summary: { type: 'boolean', description: 'Include a summary section' }
                    },
                    required: ['filename']
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
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for tool card
    await expect(page.locator('.card').first()).toBeVisible();

    // Screenshot list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool"
    await page.click('button:has-text("Run Tool")');

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Run Tool: generate_report' });
    await expect(modal).toBeVisible();

    // Fill form
    await modal.getByPlaceholder('Enter filename...').fill('monthly-report.pdf');
    await modal.getByPlaceholder('Enter count...').fill('10');
    // Toggle checkbox
    await modal.locator('input[type="checkbox"]').check();

    // Screenshot modal
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
