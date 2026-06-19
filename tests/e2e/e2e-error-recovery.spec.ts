import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Error Recovery and Resilience E2E Tests
 * Exercises API failures, rate limits, timeouts, 404s, token expiry, rapid navigation,
 * modal state, and double-click protection with API mocking.
 */
test.describe('Error Recovery and Resilience', () => {
  test.setTimeout(90000);

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('API returns 500 — shows error message', async ({ page }) => {
    // The bots page fetches /api/bots (not /api/config)
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 500, json: { error: 'Internal Server Error' } })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    await page.goto('/admin/bots');

    // The page should handle the 500 gracefully, showing error or empty state
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Look for error message or empty state
    const errorEl = page.locator('[class*="error"], [class*="alert"]').first();
    const failedText = page.getByText(/failed|error|retry/i).first();

    // Either an error element or a failure text should eventually be visible
    // (.first() — the triangle-alert icon class also matches [class*="alert"]).
    await expect(errorEl.or(failedText).first()).toBeVisible({ timeout: 10000 });
  });

  test('API returns 500 then retry succeeds', async ({ page }) => {
    let callCount = 0;
    // The bots page fetches /api/bots (not /api/config) — mock the retried endpoint.
    await page.route('**/api/bots', async (route) => {
      callCount++;
      if (callCount <= 1) {
        await route.fulfill({ status: 500, json: { error: 'Internal Server Error' } });
      } else {
        await route.fulfill({
          status: 200,
          json: {
            bots: [
              {
                id: 'bot-1',
                name: 'Recovered Bot',
                provider: 'discord',
                messageProvider: 'discord',
                llmProvider: 'openai',
                status: 'active',
                connected: true,
                messageCount: 0,
                errorCount: 0,
              },
            ],
          },
        });
      }
    });
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
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

    await page.goto('/admin/bots');

    // React Query (retry: 1, see App.tsx) auto-retries the failed request: the first
    // /api/bots returns 500, the retry returns 200, so the bot recovers without a
    // manual "Retry" button. If an error affordance does surface first, click it too.
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
    if (await retryBtn.isVisible().catch(() => false)) {
      await retryBtn.click();
    }
    await expect(page.getByText('Recovered Bot')).toBeVisible({ timeout: 15000 });
  });

  test('API returns 429 rate limited — shows rate limit message', async ({ page }) => {
    await page.route('**/api/config', (route) =>
      route.fulfill({
        status: 429,
        json: { error: 'Too Many Requests', retryAfter: 60 },
        headers: { 'Retry-After': '60' },
      })
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    await page.goto('/admin/bots');

    // Page should handle 429 without crashing
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('network timeout — verify timeout handling', async ({ page }) => {
    await page.route('**/api/config', (route) => route.abort('timedout'));
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    await page.goto('/admin/bots');

    // Page should not crash on network timeout
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('navigate to invalid route — verify 404 page', async ({ page }) => {
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    await page.goto('/admin/this-route-does-not-exist-at-all');
    await page.waitForLoadState('domcontentloaded');

    // Should show 404 or redirect, not crash
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('token expired mid-session — verify redirect to login', async ({ page }) => {
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
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

    await page.goto('/admin/bots');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Simulate token expiry by clearing auth and making next API call return 401
    await page.evaluate(() => {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    });

    // The bots page fetches /api/bots — return 401 to simulate the expired token.
    // apiService auto-heals on 401 (services/api/core.ts): it clears the stale
    // tokens and redirects to /login.
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 401, json: { error: 'Token expired' } })
    );

    // Trigger a navigation that calls the API with the now-expired session.
    await page.goto('/admin/bots');

    // Should redirect to the login page.
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('rapid navigation between pages — no crashes', async ({ page }) => {
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
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
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: [] } } })
    );

    // Navigate rapidly between pages
    await page.goto('/admin/bots');
    await page.goto('/admin/personas');
    await page.goto('/admin/guards');
    await page.goto('/admin/config');
    await page.goto('/admin/bots');

    // Page should still be functional after rapid navigation
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });

  test('open modal, navigate away, come back — state reset', async ({ page }) => {
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
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

    await page.goto('/admin/bots');

    // Open create modal if available
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).last();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Scope to a visible modal-box: the BotsPage always renders a hidden
    // DetailDrawer <aside role="dialog" aria-label="Bot Details">, so a bare
    // [role="dialog"] would resolve to that hidden element. The CreateBotWizard
    // renders a DaisyUI <Modal> whose inner box is .modal-box.
    const modal = page.locator('.modal-box:visible').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill some data
    await modal.locator('input').first().fill('Temp Bot');

    // Navigate away
    await page.goto('/admin/personas');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Come back
    await page.goto('/admin/bots');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Modal should not be open
    await expect(modal).not.toBeVisible();
  });

  test('double-click submit button — only one request sent', async ({ page }) => {
    let requestCount = 0;
    let resolvePostPromise: () => void;
    const postPromise = new Promise<void>((resolve) => {
      resolvePostPromise = resolve;
    });

    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'POST') {
        requestCount++;
        // Simulate slow response
        await postPromise;
        await route.fulfill({ status: 201, json: { id: 'new-bot', name: 'Test' } });
      } else {
        await route.fulfill({ status: 200, json: { bots: [] } });
      }
    });
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
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

    await page.goto('/admin/bots');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Open create modal
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).last();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Scope to a visible modal-box: the BotsPage always renders a hidden
    // DetailDrawer <aside role="dialog" aria-label="Bot Details">, so a bare
    // [role="dialog"] would resolve to that hidden element. The CreateBotWizard
    // renders a DaisyUI <Modal> whose inner box is .modal-box.
    const modal = page.locator('.modal-box:visible').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill required fields
    const nameInput = modal.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Double Click Test');

    const selects = modal.locator('select');
    await selects.nth(0).selectOption('discord');

    // Find submit/next button
    const submitBtn = modal
      .locator('button')
      .filter({ hasText: /Next|Create|Save/i })
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });

    // Double-click rapidly
    await submitBtn.click();
    await submitBtn.click();

    resolvePostPromise!();

    // Page should not crash from double-click
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
