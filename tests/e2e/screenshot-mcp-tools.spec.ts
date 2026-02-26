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
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
     await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock MCP servers list with Tools for /api/mcp/servers
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
                  name: 'weather_forecast',
                  description: 'Get weather forecast for a location.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      city: { type: 'string', description: 'City name', default: 'San Francisco' },
                      days: { type: 'integer', description: 'Number of days', default: 1 },
                      units: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' },
                      detailed: { type: 'boolean', description: 'Include hourly data' }
                    },
                    required: ['city']
                  },
                },
                {
                    name: 'generate_uuid',
                    description: 'Generate a random UUID.',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
              ],
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools page and run modal screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for the page to load and tools to be displayed
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on the "weather_forecast" tool
    await page.locator('.card').filter({ hasText: 'weather_forecast' }).getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal to be visible
    const runModal = page.locator('.modal-box').filter({ hasText: 'Run Tool: weather_forecast' });
    await expect(runModal).toBeVisible();

    // Ensure we are in "Form Mode" (check for Form button active state or form elements)
    await expect(runModal.getByTitle('Form View')).toHaveClass(/btn-primary/);

    // Fill out the form
    await runModal.getByLabel('city').fill('London');
    await runModal.getByLabel('days').fill('3');
    await runModal.getByLabel('units').selectOption('celsius');
    await runModal.getByLabel('detailed').check();

    // Wait a brief moment for state updates (though fill/check usually wait)
    await page.waitForTimeout(200);

    // Take screenshot of the run modal with filled form
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
