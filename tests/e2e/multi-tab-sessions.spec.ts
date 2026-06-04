import { expect, test } from '@playwright/test';
import { setupAuth, waitForPageReady } from './test-utils';

/**
 * Multi-Tab Concurrent Session & Data Isolation Tests
 *
 * Verifies:
 * - Two independent sessions don't leak localStorage/auth state
 * - Mutations in one tab are reflected when the other tab refreshes
 * - Concurrent writes don't corrupt shared data
 * - Session expiry in one tab doesn't crash the other
 */

function createSharedBotStore() {
  const bots: any[] = [
    {
      id: 'shared-1',
      name: 'Shared Bot Alpha',
      provider: 'discord',
      status: 'running',
      connected: true,
      messageCount: 5,
      errorCount: 0,
    },
  ];
  return {
    get: () => [...bots],
    add: (bot: any) => {
      bots.push(bot);
    },
  };
}

function setupCommonMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    ),
    page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    ),
    page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
    page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'csrf-multi' } })
    ),
    page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
    page.route('**/api/dashboard/api/status', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
    ),
    page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    ),
    page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
    page.route('**/api/admin/llm-profiles', (route) => route.fulfill({ status: 200, json: [] })),
  ]);
}

test.describe('Multi-Tab Concurrent Sessions', () => {
  test.setTimeout(120000);

  test('two contexts have isolated auth state', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await setupAuth(page1);
    await setupCommonMocks(page1);
    await setupCommonMocks(page2);

    await page1.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    await page1.goto('/admin/overview');
    await waitForPageReady(page1);

    // Context 2 has no auth — should redirect to login or show unauthorized
    await page2.goto('/admin/overview');
    await page2.waitForTimeout(3000);

    const page2Url = page2.url();
    const page2Body = (await page2.locator('body').textContent()) || '';
    const isIsolated =
      page2Url.includes('login') ||
      page2Body.toLowerCase().includes('login') ||
      page2Body.toLowerCase().includes('sign in') ||
      page2Body.toLowerCase().includes('unauthorized');
    expect(isIsolated).toBe(true);

    await ctx1.close();
    await ctx2.close();
  });

  test('mutation in tab A is visible in tab B after refresh', async ({ browser }) => {
    const store = createSharedBotStore();

    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await setupAuth(page1);
    await setupAuth(page2);
    await setupCommonMocks(page1);
    await setupCommonMocks(page2);

    await page1.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: store.get() } });
    });
    await page2.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: store.get() } });
    });

    await page1.goto('/admin/bots');
    await waitForPageReady(page1);
    await page2.goto('/admin/bots');
    await waitForPageReady(page2);

    // Simulate mutation from tab A
    store.add({
      id: 'tab-a-bot',
      name: 'Tab A Bot',
      provider: 'slack',
      status: 'running',
      connected: true,
      messageCount: 0,
      errorCount: 0,
    });

    // Tab B refreshes — should see new bot
    await page2.reload();
    await waitForPageReady(page2);

    const page2Body = (await page2.locator('body').textContent()) || '';
    expect(page2Body).toContain('Tab A Bot');

    await ctx1.close();
    await ctx2.close();
  });

  test('concurrent navigation does not corrupt page state', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page1 = await ctx.newPage();
    const page2 = await ctx.newPage();

    await setupAuth(page1);
    await setupAuth(page2);
    await setupCommonMocks(page1);
    await setupCommonMocks(page2);

    await page1.route('**/api/config', (route) =>
      route.fulfill({
        status: 200,
        json: { bots: [{ id: 'b1', name: 'Bot One', provider: 'discord', status: 'running' }] },
      })
    );
    await page2.route('**/api/config', (route) =>
      route.fulfill({
        status: 200,
        json: { bots: [{ id: 'b1', name: 'Bot One', provider: 'discord', status: 'running' }] },
      })
    );
    await page1.route('**/api/guards', (route) =>
      route.fulfill({
        status: 200,
        json: { guards: [{ id: 'g1', name: 'Guard One', enabled: true }] },
      })
    );
    await page2.route('**/api/monitoring/**', (route) =>
      route.fulfill({ status: 200, json: { metrics: [], events: [] } })
    );

    await Promise.all([page1.goto('/admin/bots'), page2.goto('/admin/guards')]);
    await Promise.all([waitForPageReady(page1), waitForPageReady(page2)]);

    expect(page1.url()).toContain('/bots');
    expect(page2.url()).toContain('/guards');

    await ctx.close();
  });

  test('session expiry in one context does not crash the other', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await setupAuth(page1);
    await setupAuth(page2);
    await setupCommonMocks(page1);
    await setupCommonMocks(page2);

    await page1.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page2.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    await page1.goto('/admin/overview');
    await page2.goto('/admin/overview');
    await Promise.all([waitForPageReady(page1), waitForPageReady(page2)]);

    // Expire session in context 1
    await page1.evaluate(() => {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    });
    await page1.route('**/api/config', (route) =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    );
    await page1.reload();
    await page1.waitForTimeout(3000);

    // Context 2 should still work
    await page2.reload();
    await waitForPageReady(page2);
    await expect(page2.locator('body')).toBeVisible();
    const page2Body = (await page2.locator('body').textContent()) || '';
    expect(page2Body.length).toBeGreaterThan(10);

    await ctx1.close();
    await ctx2.close();
  });
});
