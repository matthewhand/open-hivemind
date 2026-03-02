import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Message Platforms Check', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    await page.route('/api/config/message-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { message: [] } } });
    });
    await page.route('/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
    });
  });

  test('check message providers modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/message');
    await expect(page.locator('text="Available Provider Types"').first()).toBeVisible();
    await page.mouse.wheel(0, 1000); // scroll down
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/message-platforms-modal-check-bottom.png' });
  });
});
