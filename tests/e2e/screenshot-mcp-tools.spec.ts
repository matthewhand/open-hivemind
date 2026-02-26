import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Common mocks
    await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));
    await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } }));
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
    await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));

    // Mock MCP servers with diverse tools
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
                  name: 'weather_report',
                  description: 'Get weather report for a location.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      city: { type: 'string', description: 'City name' },
                      days: { type: 'integer', description: 'Number of days (1-7)' },
                      include_humidity: { type: 'boolean', description: 'Include humidity data' }
                    },
                    required: ['city']
                  },
                },
                {
                   name: 'system_status',
                   description: 'Check system status.',
                   inputSchema: { type: 'object', properties: {} }
                }
              ],
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools page and runner screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/admin/mcp/tools');

    // Wait for tools to load
    await expect(page.getByText('weather_report')).toBeVisible();

    // Screenshot list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Open Run Tool modal for weather_report
    const runButton = page.locator('.card').filter({ hasText: 'weather_report' }).getByRole('button', { name: 'Run Tool' });
    await runButton.click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Run Tool: weather_report' });
    await expect(modal).toBeVisible();

    // Verify Form Mode is active (default)
    await expect(modal.getByText('Form Builder')).toBeVisible();

    // Fill the form
    await modal.getByPlaceholder('City name').fill('San Francisco');
    await modal.getByPlaceholder('Number of days (1-7)').fill('3');
    // The checkbox is the last input in the form
    await modal.locator('input[type="checkbox"].toggle-primary').check();

    // Screenshot modal
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
