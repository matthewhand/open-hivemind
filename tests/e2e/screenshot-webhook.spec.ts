import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Webhook Integration Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock the global config for webhooks
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          webhook: {
            values: {
              enabled: true,
              secret: 'wh_sec_example12345',
              endpoint: 'https://api.hivemind.test/webhooks/support',
            },
            schema: {
              enabled: {
                doc: 'Allow incoming webhook requests',
                format: 'Boolean',
                default: false,
                env: 'WEBHOOK_ENABLED',
              },
              endpoint: {
                doc: 'Specific URLs to trigger bot actions from external services',
                format: 'String',
                default: '',
                env: 'WEBHOOK_ENDPOINT',
              },
              secret: {
                doc: 'Manage webhook secrets and verification',
                format: 'String',
                default: '',
                env: 'WEBHOOK_SECRET',
              },
            },
          },
        },
      });
    });
  });

  test('capture webhook page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/integrations/webhook');

    // Wait for page to render
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: 'docs/screenshots/webhook-integration.png', fullPage: true });
  });
});
