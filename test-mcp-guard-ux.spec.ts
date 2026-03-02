import { test, expect } from '@playwright/test';
import { setupAuth } from './tests/e2e/test-utils';

test('verify MCP Guard UX', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/admin/guards');

  await page.getByRole('button', { name: 'New Profile' }).click();

  const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
  await expect(modal).toBeVisible();

  // Enable Access Control
  const mcpToggle = modal.locator('.collapse-title', { hasText: 'Access Control' }).locator('input[type="checkbox"].toggle-primary');

  // Actually the toggle is enabled by default in Create Empty Profile? Let's check.
  const isChecked = await mcpToggle.isChecked();
  if (!isChecked) {
    await mcpToggle.click();
  }

  // Set type to 'Custom Allowed Users'
  await modal.locator('select').filter({ has: page.locator('option[value="custom"]') }).selectOption('custom');

  const usersInput = modal.locator('input[id="allowed-users"]');
  await usersInput.fill('user1');
  await usersInput.type(', user2');

  console.log('Input value:', await usersInput.inputValue());
  expect(await usersInput.inputValue()).toBe('user1, user2');
});
