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

    // Mock MCP servers list with diverse tools
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
            {
              name: 'Utility Server',
              serverUrl: 'http://localhost:3000',
              connected: true,
              tools: [
                {
                  name: 'weather_report',
                  description: 'Get weather report for a location.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      city: { type: 'string', description: 'City name' },
                      days: { type: 'integer', description: 'Number of days forecast' },
                      include_humidity: { type: 'boolean', description: 'Include humidity data' },
                    },
                    required: ['city'],
                  },
                },
              ],
              lastConnected: new Date().toISOString(),
              description: 'General utility tools.',
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools page and run modal screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for the page to load and tools to be displayed
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on the first tool
    await page.getByRole('button', { name: 'Run Tool' }).first().click();

    // Wait for modal to be visible
    const runModal = page.locator('.modal-box').filter({ hasText: 'Run Tool: weather_report' });
    await expect(runModal).toBeVisible();

    // Fill out the form
    await runModal.getByPlaceholder('City name').fill('San Francisco');
    await runModal.getByPlaceholder('Number of days forecast').fill('5');
    // Check boolean input (toggle) by finding the form control with the label
    await runModal.locator('.form-control', { hasText: 'include_humidity' }).locator('input[type="checkbox"]').check();

    // Take screenshot of the run modal with filled form
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
