import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Configuration Page Screenshots', () => {
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
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock the global configuration data
    await page.route('/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          "general": {
            "values": {
              "instanceName": "Open-Hivemind Production",
              "logLevel": "info",
              "maxConcurrentBots": 100,
              "allowUnknownTools": false,
            },
            "schema": {
              "properties": {
                "instanceName": { "doc": "Name of the instance", "format": "string" },
                "logLevel": { "doc": "Logging level", "format": ["debug", "info", "warn", "error"] },
                "maxConcurrentBots": { "doc": "Maximum number of concurrent bots", "format": "int" },
                "allowUnknownTools": { "doc": "Allow bots to use unknown MCP tools", "format": "boolean" }
              }
            }
          },
          "messaging": {
             "values": {
               "defaultPersona": "Assistant",
               "maxMessageLength": 2000,
               "allowMarkdown": true,
             },
             "schema": {
               "properties": {
                 "defaultPersona": { "doc": "Default persona for new bots", "format": "string" },
                 "maxMessageLength": { "doc": "Maximum length of a single message", "format": "int" },
                 "allowMarkdown": { "doc": "Allow markdown formatting in messages", "format": "boolean" }
               }
             }
          }
        }),
      });
    });

    // Mock the rollbacks data
    await page.route('/api/config/hot-reload/rollbacks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rollbacks: [
            "rollback_1711234567890_xxyyzz",
            "rollback_1711230000000_aabbcc"
          ]
        }),
      });
    });
  });

  test('capture configuration page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Configuration page
    await page.goto('/admin/configuration');

    // Wait for network to settle
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await expect(page.locator('h1:has-text("Global Defaults")')).toBeVisible();

    // Take screenshot of the main page
    await page.screenshot({ path: 'docs/screenshots/configuration.png', fullPage: true });

  });
});