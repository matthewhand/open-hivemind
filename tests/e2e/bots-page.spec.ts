import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Bots Page E2E Tests
 *
 * Covers the core bot list rendering and interaction flows.
 * Previously broken by a hooks-after-early-return violation (React error #310)
 * that caused the page to crash on first data render.
 */

const MOCK_BOTS = [
  {
    id: 'bot-1',
    name: 'AlphaBot',
    description: 'Primary assistant',
    messageProvider: 'discord',
    llmProvider: 'openai',
    persona: 'default',
    status: 'active',
    connected: false,
    messageCount: 12,
    errorCount: 0,
  },
  {
    id: 'bot-2',
    name: 'BetaBot',
    description: 'Support agent',
    messageProvider: 'slack',
    llmProvider: 'flowise',
    persona: 'tech_support',
    status: 'inactive',
    connected: false,
    messageCount: 0,
    errorCount: 2,
  },
  {
    id: 'bot-3',
    name: 'DisabledBot',
    description: 'Disabled agent',
    messageProvider: 'discord',
    llmProvider: 'openai',
    persona: 'default',
    status: 'disabled',
    connected: false,
    messageCount: 0,
    errorCount: 0,
  },
];

async function setupBotsMocks(page: import('@playwright/test').Page) {
  await setupAuth(page);

  await page.route('**/api/bots', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: { success: true, data: MOCK_BOTS } });
    } else {
      await route.fulfill({
        status: 201,
        json: { success: true, data: { id: 'new-bot', name: 'NewBot' } },
      });
    }
  });

  await page.route('**/api/onboarding/status', async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true, data: { completed: true, step: 5 } },
    });
  });

  await page.route('**/api/personas', async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: { personas: [] } } });
  });

  await page.route('**/api/config/global', async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: {} } });
  });

  await page.route('**/api/config/llm-profiles', async (route) => {
    await route.fulfill({ status: 200, json: { success: true, llm: [] } });
  });

  await page.route('**/api/config/llm-status', async (route) => {
    await route.fulfill({ status: 200, json: { defaultConfigured: true, hasMissing: false } });
  });

  await page.route('**/api/csrf-token', async (route) => {
    await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
  });

  await page.route('**/api/demo/status', async (route) => {
    await route.fulfill({ status: 200, json: { active: false } });
  });

  await page.route('**/api/health/**', async (route) => {
    await route.fulfill({ status: 200, json: { status: 'healthy' } });
  });

  await page.route('**/api/admin/**', async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: {} } });
  });
}

test.describe('Bots Page', () => {
  test.setTimeout(30000);

  test('renders bot list without React hook crash', async ({ page }) => {
    await setupBotsMocks(page);
    await page.goto('/admin/bots');
    await page.waitForLoadState('domcontentloaded');

    // The page must not throw a React error boundary
    const errorBoundary = page
      .locator('text=Something went wrong')
      .or(page.locator('text=React error'));
    await expect(errorBoundary).not.toBeVisible({ timeout: 8000 });

    // Bot names must be visible
    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('BetaBot')).toBeVisible();
  });

  test('renders all three bots including one with unknown status', async ({ page }) => {
    await setupBotsMocks(page);
    await page.goto('/admin/bots');

    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('BetaBot')).toBeVisible();
    // DisabledBot has status='disabled' which is not in BotStatus — page must not crash
    await expect(page.getByText('DisabledBot')).toBeVisible();
  });

  test('search filters bot list by name', async ({ page }) => {
    await setupBotsMocks(page);
    await page.goto('/admin/bots');
    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Alpha');

    await expect(page.getByText('AlphaBot')).toBeVisible();
    await expect(page.getByText('BetaBot')).not.toBeVisible();
  });

  test('status filter hides inactive bots', async ({ page }) => {
    await setupBotsMocks(page);
    await page.goto('/admin/bots');
    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });

    // Select "Active Only" filter
    const statusSelect = page.locator('select').filter({ hasText: 'All Status' });
    await statusSelect.selectOption('active');

    await expect(page.getByText('AlphaBot')).toBeVisible();
    await expect(page.getByText('BetaBot')).not.toBeVisible();
  });

  test('Create Bot button opens the create wizard', async ({ page }) => {
    await setupBotsMocks(page);
    await page.goto('/admin/bots');
    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });

    // Find and click create button
    const createButton = page.locator('button', { hasText: /create|add bot/i }).first();
    await createButton.click();

    // The create modal or wizard should appear
    await expect(page.getByRole('dialog', { name: 'Create New Bot' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('clicking a bot opens the detail drawer', async ({ page }) => {
    await setupBotsMocks(page);

    // Also mock activity/chat endpoints the drawer fetches
    await page.route('**/api/activity**', async (route) => {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    });
    await page.route('**/api/bots/*/activity**', async (route) => {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    });
    await page.route('**/api/bots/*/chat**', async (route) => {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    });

    await page.goto('/admin/bots');
    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });

    // Click the bot card to open the detail drawer
    await page.getByText('AlphaBot').first().click();

    // The detail drawer should open — it uses role="dialog" with the bot name as label
    await expect(page.getByRole('dialog', { name: 'AlphaBot' })).toBeVisible({ timeout: 5000 });
  });

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(msg.text());
      }
    });

    await setupBotsMocks(page);
    await page.goto('/admin/bots');
    await expect(page.getByText('AlphaBot')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const reactErrors = consoleErrors.filter((e) => e.includes('React') || e.includes('Error #'));
    expect(reactErrors, `React errors: ${reactErrors.join('\n')}`).toHaveLength(0);
  });
});
