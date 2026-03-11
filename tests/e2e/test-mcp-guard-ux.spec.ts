import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('verify MCP Guard UX', async ({ page }) => {
  await setupAuth(page);

  // Mock background polling endpoints
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
  await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
  await page.route('/api/config/llm-profiles', async (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('/api/demo/status', async (route) =>
    route.fulfill({ status: 200, json: { enabled: false } })
  );
  await page.route('/api/csrf-token', async (route) =>
    route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
  );
  await page.route('/api/admin/mcp-servers', async (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: { servers: [], configurations: [] } },
    })
  );

  // Mock Guard Profiles
  await page.route('/api/admin/guard-profiles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto('/admin/guards');

  await page.getByRole('button', { name: 'New Profile' }).first().click();

  const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
  await expect(modal).toBeVisible();

  // Enable Access Control
  const mcpToggle = modal
    .locator('.collapse-title', { hasText: 'Access Control' })
    .locator('input[type="checkbox"].toggle-primary');
  const isChecked = await mcpToggle.isChecked();
  if (!isChecked) {
    await mcpToggle.click();
  }

  // Set type to 'Custom Allowed Users'
  await modal
    .locator('select')
    .filter({ has: page.locator('option[value="custom"]') })
    .selectOption('custom');

  const usersInput = modal.locator('input[id="allowed-users"]');

  // Test typing normally (buffered text)
  await usersInput.fill('user1');
  await usersInput.press('Enter');
  await usersInput.fill('user2');
  await usersInput.press('Enter');

  const chips = modal.locator('[data-testid="chip"]');
  await expect(chips).toHaveCount(2);

  // Clear all
  const clearButton = modal.locator('button[aria-label="Clear all items"]').first();
  await clearButton.click();
  await expect(chips).toHaveCount(0);

  // Test Undo functionality
  const undoButton = modal.locator('button[aria-label="Undo"]').first();
  await undoButton.click();
  await expect(chips).toHaveCount(2);

  // Take screenshot with chips restored via undo
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-after-undo.png' });
});
