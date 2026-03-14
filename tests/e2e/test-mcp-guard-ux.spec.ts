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

  // Screenshot before typing comma
  await page.screenshot({ path: 'mcp-guard-ux-before.png' });

  await usersInput.pressSequentially(',user2');
  await usersInput.press('Enter');

  // Screenshot after typing comma
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux.png' });

  const chips = modal.locator('[data-testid="chip"]');
  await expect(chips).toHaveCount(2);
  await expect(chips.first()).toContainText('user1');
  await expect(chips.nth(1)).toContainText('user2');
});

test('graceful degradation on API failure', async ({ page }) => {
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

  // Force the profiles API to fail with 500 Internal Server Error
  await page.route('/api/admin/guard-profiles', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Internal Server Error' }),
    });
  });

  await page.goto('/admin/guards');

  // Verify that an error notification appears
  await expect(page.locator('.toast, .alert-error').first()).toContainText('Failed to fetch profiles');

  // Take screenshot of graceful degradation state
  await page.screenshot({ path: 'mcp-guard-ux-api-failure.png' });

  // Ensure the page doesn't crash to "Something went wrong" entirely
  await expect(page.locator('h1', { hasText: 'Guard Profiles' })).toBeVisible();
});
