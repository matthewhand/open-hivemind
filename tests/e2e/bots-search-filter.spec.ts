import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, registerViteSourceBypass, setupTestWithErrorDetection } from './test-utils';


test.describe('Bots Search and Filter', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Support Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 0,
    },
    {
      id: 'bot-2',
      name: 'Internal Helper',
      provider: 'slack',
      messageProvider: 'slack',
      llmProvider: 'anthropic',
      status: 'active',
      connected: false,
      messageCount: 5,
      errorCount: 2,
    },
    {
      id: 'bot-3',
      name: 'Creative Writer',
      provider: 'telegram',
      messageProvider: 'telegram',
      llmProvider: 'openai-gpt4',
      status: 'disabled',
      connected: false,
      messageCount: 0,
      errorCount: 0,
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock /health/* endpoints (outside /api/ prefix)
    await page.route('**/health/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path === '/health/detailed') {
        return route.fulfill({
          status: 200,
          json: {
            status: 'healthy',
            services: {},
            system: {
              platform: 'linux',
              memory: { total: 8e9, used: 4e9, free: 4e9 },
              cpu: { cores: 4, usage: 25 },
              loadAverage: [1, 0.8, 0.5],
            },
          },
        });
      }
      if (path === '/health/api-endpoints') {
        return route.fulfill({
          status: 200,
          json: { stats: { total: 0 }, endpoints: [], timestamp: new Date().toISOString() },
        });
      }
      return route.fulfill({ status: 200, json: {} });
    });

    // Use a single route handler for all /api/* endpoints
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === '/api/config') {
        return route.fulfill({ status: 200, json: { bots: mockBots } });
      }
      if (path === '/api/bots') {
        return route.fulfill({ status: 200, json: { data: { bots: mockBots } } });
      }
      if (path === '/api/config/global') {
        return route.fulfill({ status: 200, json: {} });
      }
      if (path === '/api/personas') {
        return route.fulfill({ status: 200, json: [] });
      }
      if (path === '/api/config/llm-profiles') {
        return route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
      }
      if (path === '/api/config/llm-status') {
        return route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        });
      }
      if (path === '/api/admin/guard-profiles') {
        return route.fulfill({ status: 200, json: { data: [] } });
      }
      if (path === '/api/health/detailed') {
        return route.fulfill({ status: 200, json: { status: 'healthy' } });
      }
      if (path === '/api/health') {
        return route.fulfill({ status: 200, json: { status: 'ok' } });
      }
      if (path === '/api/csrf-token') {
        return route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
      }
      if (path === '/api/demo/status') {
        return route.fulfill({ status: 200, json: { active: false } });
      }
      if (path === '/api/config/sources') {
        return route.fulfill({ status: 200, json: { sources: [] } });
      }

      // Catch-all: return empty 200 for any unmatched API endpoint
      return route.fulfill({ status: 200, json: {} });
    });

    // CRITICAL: register AFTER all other routes so Vite source-module paths
    // (/src/**) are not intercepted by the **/api/** catch-all above.
    await registerViteSourceBypass(page);
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for the page to fully render (bots loaded, search bar visible)
    const searchInput = page.locator('input[placeholder="Search agents by name or purpose..."]');
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });

    await searchInput.fill('Support');

    // Wait for filter to apply
    
    // We expect 1 visible row
    const visibleBot = page.getByRole('heading', { name: 'Support Bot' });
    await expect(visibleBot).toBeVisible();

    // Check others are not visible
    await expect(page.locator('text=Internal Helper')).not.toBeVisible();
    await expect(page.locator('text=Creative Writer')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name');
    await page.screenshot({ path: 'docs/screenshots/verification-bots-search.png' });
  });

  test('can search bots by partial name (Internal)', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search agents by name or purpose..."]');
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.fill('Internal');

    const visibleBot = page.getByRole('heading', { name: 'Internal Helper' });
    await expect(visibleBot).toBeVisible();

    await expect(page.locator('text=Support Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by partial name');
  });

  test('can search bots by name (Creative)', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search agents by name or purpose..."]');
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.fill('Creative');

    const visibleBot = page.getByRole('heading', { name: 'Creative Writer' });
    await expect(visibleBot).toBeVisible();

    await expect(page.locator('text=Support Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name Creative');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search agents by name or purpose..."]');
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.fill('NonExistentBot');

    await expect(page.locator('text=No agents found')).toBeVisible();

    await assertNoErrors(errors, 'Bot empty search state');
  });
});
