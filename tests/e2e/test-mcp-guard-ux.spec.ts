import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';
import { FuzzingUtils } from './utils/fuzzing';

test.describe('MCP Guard UX', () => {

test('verify MCP Guard UX standard flow', async ({ page }) => {
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
  const toggle = modal.locator('input[type="checkbox"].toggle-primary');
  await toggle.click();

  // Wait for the form to render
  const select = modal.locator('select').first();
  await expect(select).toBeVisible();

  // Set type to 'Custom Allowed Users'
  await select.selectOption('custom');

  const usersInput = modal.locator('input[id="allowed-users"]');
  await usersInput.fill('user1');

  // Screenshot before typing comma
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-before.png' });

  await usersInput.pressSequentially(',user2');

  // Screenshot after typing comma
  await page.screenshot({ path: 'docs/screenshots/mcp-guard-ux-after.png' });

  const value = await usersInput.inputValue();
  console.log('Input value after typing ",user2":', value);
  expect(value).toBe('user1,user2');
});

test('verify MCP Guard UX fuzzing with rapid malformed input', async ({ page }) => {
  await setupAuth(page);
  await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));
  await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } }));
  await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
  await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
  await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
  await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));
  await page.route('/api/admin/mcp-servers', async (route) => route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } }));

  await page.route('/api/admin/guard-profiles', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.goto('/admin/guards');
  await page.getByRole('button', { name: 'New Profile' }).click();
  const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
  await expect(modal).toBeVisible();

  const toggle = modal.locator('input[type="checkbox"].toggle-primary');
  await toggle.click();

  const select = modal.locator('select').first();
  await expect(select).toBeVisible();
  await select.selectOption('custom');

  const usersInput = modal.locator('input[id="allowed-users"]');

  // Rapid typing malformed fuzzing data
  const rapidFuzzingData = FuzzingUtils.getRapidMalformedInput();

  // Actually wait for it to be ready
  await usersInput.click();

  // Fill without delay can cause form control not to update immediately. Type it rapidly to test real edge condition race scenarios.
  await usersInput.pressSequentially(rapidFuzzingData, { delay: 1 });

  // Wait to let the react event loop settle, then verify input is reset to empty to signify handling is done.
  await usersInput.press('Enter');

  // Expect to see the badges rendered
  const chips = modal.locator('div[data-testid="chip"]');
  await expect(chips).toHaveCount(4, { timeout: 5000 });

  await expect(chips.nth(0)).toHaveText('user1');
  await expect(chips.nth(1)).toHaveText('user2');
  await expect(chips.nth(2)).toHaveText('user3');
  await expect(chips.nth(3)).toHaveText('user4');
});

});
