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

    // Mock MCP servers list with a rich tool for form demonstration
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
            {
              name: 'Utility Server',
              serverUrl: 'http://utils:8080',
              connected: true,
              tools: [
                {
                  name: 'get_weather',
                  description: 'Get current weather conditions for a specific city.',
                  category: 'utility',
                  inputSchema: {
                    type: 'object',
                    required: ['city'],
                    properties: {
                      city: {
                        type: 'string',
                        description: 'The name of the city (e.g., "Paris")',
                      },
                      days: {
                        type: 'integer',
                        description: 'Number of days to forecast (1-7)',
                      },
                      detailed: {
                        type: 'boolean',
                        description: 'Include detailed wind and pressure data',
                      },
                    },
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

  test('capture MCP tools and runner form', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for the tools to be displayed
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByText('get_weather')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on the weather tool
    await page
      .locator('.card')
      .filter({ hasText: 'get_weather' })
      .getByRole('button', { name: 'Run Tool' })
      .click();

    // Wait for modal to be visible and check for form elements
    const runModal = page.locator('.modal-box').filter({ hasText: 'Run Tool: get_weather' });
    await expect(runModal).toBeVisible();

    // Check that we are in Form mode (default)
    await expect(runModal.getByText('Arguments Form')).toBeVisible();

    // Fill in the form
    await runModal.getByPlaceholder('Enter city...').fill('San Francisco');
    await runModal.getByPlaceholder('Enter days...').fill('3');
    await runModal.locator('input[type="checkbox"]').check();

    // Take screenshot of the filled form
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
