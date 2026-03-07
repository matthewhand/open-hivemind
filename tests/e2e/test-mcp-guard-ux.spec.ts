import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('verify MCP Guard UX', async ({ page }) => {
  await setupAuth(page);
  // Mock background polling endpoints
  await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));
  await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } }));
  await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
  await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
  await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
  await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));
  await page.route('/api/admin/mcp-servers', async (route) => route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } }));

  // Mock Guard Profiles
  await page.route('/api/admin/guard-profiles', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.goto('/admin/guards');

  await page.getByRole('button', { name: 'New Profile' }).click();

  const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
  await expect(modal).toBeVisible();

  // Enable Access Control toggle first since the select is disabled initially
  const toggle = modal.locator('input[type="checkbox"].toggle').first();
  await toggle.click();

  // Wait for the form to render
  const select = modal.locator('select').first();
  await expect(select).toBeVisible();

  // Set type to 'Custom Allowed Users'
  await select.selectOption('custom');

  const usersInput = modal.locator('input[id="allowed-users"]');
  await usersInput.fill('user1');

  // Press enter to commit the first chip
  await usersInput.press('Enter');

  // Screenshot before typing second value
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-before.png' });

  // Type second value and press enter
  await usersInput.pressSequentially('user2');
  await usersInput.press('Enter');

  // Screenshot after typing second value
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-after.png' });

  const value = await usersInput.inputValue();
  console.log('Input value after typing ",user2":', value);
<<<<<<< HEAD
  expect(value).toBe('user1, user2');
=======
  expect(value).toBe('user1,user2');

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

  const undoButton = modal.locator('button[aria-label="Undo"]').first();
  await undoButton.click();
  await expect(chips).toHaveCount(2);
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-after-undo.png' });
>>>>>>> origin/main
});
