import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Provider Health Page Screenshots', () => {
  test('capture Provider Health page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    await page.route('**/api/auth/check', (route) =>
      route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
    );

    await page.route('**/api/providers/health', (route) =>
      route.fulfill({
        status: 200,
        json: {
          llm: [
            {
              id: 'openai',
              name: 'OpenAI',
              type: 'llm',
              status: 'healthy',
              latencyMs: 120,
              lastChecked: new Date().toISOString(),
              details: 'Connected successfully',
            },
            {
              id: 'anthropic',
              name: 'Anthropic',
              type: 'llm',
              status: 'degraded',
              latencyMs: 450,
              lastChecked: new Date().toISOString(),
              details: 'High latency detected',
            }
          ],
          memory: [
            {
              id: 'postgres',
              name: 'PostgreSQL',
              type: 'memory',
              status: 'healthy',
              latencyMs: 5,
              lastChecked: new Date().toISOString(),
              details: 'Database connected',
            }
          ]
        },
      })
    );

    // Provide default empty routes for other potential API calls to prevent errors
    await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/csrf-token', (route) => route.fulfill({ status: 200, json: { token: 'mock-csrf' } }));
    await page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } }));


    // Navigate to Provider Health page
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/admin/health/providers');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Provider Health' })).toBeVisible();

    // Wait for health data to fully render
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/provider-health-page.png', fullPage: true });
  });
});
