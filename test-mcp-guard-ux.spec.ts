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
  const isChecked = await mcpToggle.isChecked();
  if (!isChecked) {
    await mcpToggle.click();
  }

  // Set type to 'Custom Allowed Users'
  await modal.locator('select').filter({ has: page.locator('option[value="custom"]') }).selectOption('custom');

  const usersInput = modal.locator('input[id="allowed-users"]');

  // Test typing normally (buffered text)
  await usersInput.fill('user1');
  await usersInput.type(', user2');
  expect(await usersInput.inputValue()).toBe('user1, user2');

  // Commit it
  await usersInput.press('Enter');

  // Give it a moment to render
  await page.waitForTimeout(500);

  // The input should be empty, and chips should be visible
  expect(await usersInput.inputValue()).toBe('');

  const chips = modal.locator('[data-testid="chip"]');
  await expect(chips).toHaveCount(2);

  // Wait for the clear button to be visible
  const clearButton = modal.locator('button[aria-label="Clear all items"]').first();
  await expect(clearButton).toBeVisible();

  // Take screenshot with chips
  await page.screenshot({ path: 'after-fix-feedback.png' });

  // Clear it
  await clearButton.click();

  // Give it a moment to render
  await page.waitForTimeout(500);

  // Verify it cleared
  await expect(clearButton).not.toBeVisible();
  await expect(chips).toHaveCount(0);
});
