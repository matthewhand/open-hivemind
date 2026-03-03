import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('OpenWebUI missing from LLM Providers dropdown', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/admin/bots');

  // Wait for load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Wait for the specific Create Bot button
  const createBtn = page.getByRole('button', { name: /Create Bot/i }).first();
  await createBtn.waitFor({ state: 'visible' });
  await createBtn.click();
  await page.waitForTimeout(1000);

  // LLM Provider select dropdown
  const llmSelect = page.locator('select').nth(1);
  await llmSelect.click();

  // Wait a bit for dropdown to render (or just taking a screenshot is fine)
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'after-fix-llm-providers.png' });
});
