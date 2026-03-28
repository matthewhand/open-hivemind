import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('Visual Proof: Barrel Export Audit and Tree-Shaking Optimisation', async ({ page }) => {
  await setupAuth(page);

  // Mock API endpoints
  await page.route('**/api/health/detailed', (route) =>
    route.fulfill({ status: 200, json: { status: 'healthy' } })
  );
  await page.route('**/api/config/llm-status', (route) =>
    route.fulfill({
      status: 200,
      json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
    })
  );
  await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
  await page.route('**/api/csrf-token', (route) =>
    route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
  );
  await page.route('**/api/demo/status', (route) =>
    route.fulfill({ status: 200, json: { active: false } })
  );
  await page.route('**/api/admin/guard-profiles', (route) =>
    route.fulfill({ status: 200, json: { data: [] } })
  );
  await page.route('**/api/dashboard/api/status', (route) =>
    route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
  );

  // Navigate to Dashboard
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Verify dashboard loaded properly and components rendered
  await expect(page.locator('text=Hivemind')).toBeVisible();

  // Save baseline screenshot
  await page.screenshot({ path: '.jules/before-barrel-export.png', fullPage: true });
});
