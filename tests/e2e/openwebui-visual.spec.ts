import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('OpenWebUI configuration UI visual baseline', async ({ page }) => {
  await setupAuth(page);
  // Mock routes for bypassing auth and loading providers
  await page.route('/api/auth/check', async (route) => {
    await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
  });
  await page.route('/api/config/global', async (route) => {
    await route.fulfill({ status: 200, json: {} });
  });
  await page.route('/api/health/detailed', async (route) => {
    await route.fulfill({ status: 200, json: { status: 'ok' } });
  });
  await page.route('/api/csrf-token', async (route) => {
    await route.fulfill({ status: 200, json: { csrfToken: 'test' } });
  });
  await page.route('/api/config/llm-profiles', async (route) => {
    await route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
  });
  await page.route('/api/admin/guard-profiles', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });

  // Navigate to LLM Providers
  await page.goto('http://localhost:3028/admin/providers/llm');

  // Click Add Profile
  await page.getByRole('button', { name: /Create Profile/i }).click();

  // Select OpenWebUI
  await page.getByRole('tab', { name: /OpenWebUI/i }).click();

  // Wait for the form to render
  await page.waitForTimeout(500);

  // Take screenshot of the OpenWebUI config form
  await page.screenshot({ path: 'openwebui-before.png' });
});
