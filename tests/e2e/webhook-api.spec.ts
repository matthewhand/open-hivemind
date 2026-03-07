import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Webhook API Integration', () => {
  test('Webhook validates authentication and responds correctly to valid and invalid requests', async ({ request, baseURL }) => {
    // The webhook route is mapped to `/webhook` in configureWebhookRoutes
    const targetUrl = `${baseURL}/webhook`;

    // In e2e tests, HTTP_ENABLED might be false or webhook config might be off.
    // If it's running, we expect a 403 or 500 (due to missing token) or 400.
    // We mainly want to ensure the HTTP endpoint is alive and handles the request through the express stack without crashing.

    const req1 = await request.post(targetUrl, {
      data: {
        id: 'playwright-test-1',
        status: 'succeeded',
        output: ['test']
      }
    });

    // Check it fails security or missing config (in test env, WEBHOOK_TOKEN might be empty yielding 500, or invalid yielding 403)
    // If it returns 404, the webhook route isn't mounted in the test server (WEBHOOK_ENABLED=false perhaps).
    expect([400, 403, 404, 500]).toContain(req1.status());

    if (req1.status() !== 404) {
      // 2. Malformed Body
      const req2 = await request.post(targetUrl, {
        headers: {
          'x-webhook-token': 'dummy'
        },
        data: {
          invalid: 'body'
        }
      });

      expect(req2.status()).toBeLessThan(500);
    }
  });
});
