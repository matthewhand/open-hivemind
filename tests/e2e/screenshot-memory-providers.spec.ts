import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Memory Providers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints to prevent errors/warnings
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

    // Mock memory profiles data
    await page.route('**/api/config/memory-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          memory: [
            {
              key: 'redis-cache-main',
              name: 'Redis Cache Main',
              type: 'redis',
              provider: 'Redis',
              config: {
                host: 'redis.internal',
                port: 6379,
              },
              inUseBy: ['support-bot', 'sales-assistant'],
              isDefault: true,
            },
            {
              key: 'vector-db-pinecone',
              name: 'Pinecone Vector DB',
              type: 'pinecone',
              provider: 'Pinecone',
              config: {
                environment: 'us-west1-gcp',
                index: 'knowledge-base',
              },
              inUseBy: ['docs-bot'],
              isDefault: false,
            },
          ],
        },
      });
    });
  });

  test('Memory Providers List', async ({ page }) => {
    // Navigate to Memory Providers page
    await page.goto('/admin/providers/memory');

    // Wait for the page to load
    await expect(page.locator('text=Memory Providers').first()).toBeVisible();
    await expect(page.locator('text=redis-cache-main').first()).toBeVisible();

    // Take screenshot of the entire page
    await page.screenshot({
      path: 'docs/screenshots/memory-providers-list.png',
      fullPage: true,
    });
  });
});
