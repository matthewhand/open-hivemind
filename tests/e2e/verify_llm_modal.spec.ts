import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('capture LLM modal', async ({ page }) => {
  // Setup authentication
  await setupAuth(page);

  // Mock successful authentication check
  await page.route('/api/auth/check', async (route) => {
    await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/admin/providers/llm');

  // Wait for the page to load and profiles to be displayed
  await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Create Profile' }).first().click();
  await expect(page.locator('.modal-box')).toBeVisible();

  // Wait for rendering
  await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: './test-results/llm-modal.png' });
});
