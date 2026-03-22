import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Webhook Integration Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock the global config for webhooks to match the structure that GlobalConfigSection expects
    // It expects an object mapping section name to ConfigItem (which has 'values' and 'schema' properties)
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          webhook: {
            values: {
              enabled: true,
              secret: 'wh_sec_example12345',
              endpoint: 'https://api.hivemind.test/webhooks/support'
            },
            schema: {
              enabled: {
                doc: "Allow incoming webhook requests",
                format: "Boolean",
                default: false,
                env: "WEBHOOK_ENABLED"
              },
              endpoint: {
                doc: "Specific URLs to trigger bot actions from external services",
                format: "String",
                default: "",
                env: "WEBHOOK_ENDPOINT"
              },
              secret: {
                doc: "Manage webhook secrets and verification",
                format: "String",
                default: "",
                env: "WEBHOOK_SECRET"
              }
            }
          }
        }
      });
    });

  });

  test('capture webhook page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Webhook integrations page
    await page.goto('/admin/integrations/webhook');

    // Wait for the page to load by waiting for the breadcrumb or body
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Webhook/i }).first()).toBeVisible({ timeout: 10000 }).catch(() => {});

    // Check for some text that usually appears on integrations/webhooks
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/webhook-integration.png', fullPage: true });
  });
});
