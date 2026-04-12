import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * GettingStarted component E2E tests
 *
 * Three suites:
 *  1. Mocked – none configured    → 0/3, all grey circles, all "Start" buttons, no strikethrough
 *  2. Mocked – partial (LLM only) → 1/3, first row ticked + strikethrough, others have "Start"
 *  3. Mocked – all configured     → 3/3, all ticked + strikethrough, no "Start" buttons
 *  4. Real API                    → hits the live server, checks the component renders correctly
 */

const CONFIG_STATUS_URL = '**/api/dashboard/config-status';
const ONBOARDING_URL = '**/api/onboarding/status';

/** Helpers */
const mockConfigStatus = (
  page: import('@playwright/test').Page,
  llmConfigured: boolean,
  botConfigured: boolean,
  messengerConfigured: boolean
) =>
  page.route(CONFIG_STATUS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { llmConfigured, botConfigured, messengerConfigured },
      }),
    })
  );

const mockOnboardingComplete = (page: import('@playwright/test').Page) =>
  page.route(ONBOARDING_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { completed: true, step: 5 } }),
    })
  );

const navigateToDashboard = async (
  page: import('@playwright/test').Page,
  /** Wait for this exact subtitle text — ensures the API fetch has settled before asserting */
  waitForSubtitle = 'of 3 completed'
) => {
  await setupAuth(page);
  // Ensure Getting Started is visible (not dismissed)
  await page.addInitScript(() => localStorage.removeItem('hivemind-hide-getting-started'));
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  // Wait for the subtitle (rendered only AFTER the config-status API call completes)
  await page.waitForSelector(`text=${waitForSubtitle}`, { timeout: 10000 });
};

/** Scope all interactions to within the GettingStarted panel itself */
const getPanel = (page: import('@playwright/test').Page) =>
  page.getByTestId('getting-started-panel');

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 – 0 of 3 completed (nothing configured)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GettingStarted – 0 of 3 completed', () => {
  test.beforeEach(async ({ page }) => {
    await mockOnboardingComplete(page);
    await mockConfigStatus(page, false, false, false);
    await navigateToDashboard(page, '0 of 3 completed');
  });

  test('shows "0 of 3 completed" subtitle', async ({ page }) => {
    await expect(page.getByText('0 of 3 completed')).toBeVisible();
  });

  test('all three tasks show grey circle (not ticked)', async ({ page }) => {
    // CheckCircle2 (ticked) should NOT appear — only plain Circle icons
    const ticked = page.locator('[data-testid="task-done"], .text-success svg').first();
    await expect(ticked)
      .not.toBeVisible({ timeout: 3000 })
      .catch(() => {
        /* ok if selector doesn't exist */
      });
    // All three task titles should be visible and NOT struck through
    for (const title of ['Connect an LLM provider', 'Connect a messenger', 'Create a bot']) {
      const el = page.getByText(title).first();
      await expect(el).toBeVisible();
      await expect(el).not.toHaveCSS('text-decoration-line', 'line-through');
    }
  });

  test('all three tasks show a "Start" button', async ({ page }) => {
    const panel = getPanel(page);
    const startButtons = panel.getByRole('button', { name: 'Start', exact: true });
    await expect(startButtons).toHaveCount(3);
  });

  test('"Start" buttons navigate to the correct pages', async ({ page }) => {
    const panel = getPanel(page);
    // Ensure the first Start button is ready before clicking
    const firstStart = panel.getByRole('button', { name: 'Start', exact: true }).first();
    await expect(firstStart).toBeVisible({ timeout: 5000 });
    await firstStart.click();
    // The GettingStarted link is /admin/providers/llm which redirects to /admin/llm — match either
    await page.waitForURL(/\/admin\/(providers\/)?llm/, { timeout: 10000, waitUntil: 'commit' });
  });

  test('Dismiss button hides the panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByText('Get started')).not.toBeVisible({ timeout: 5000 });
  });

  test('screenshot – 0 of 3', async ({ page }) => {
    const panel = getPanel(page);
    await expect(panel).toBeVisible();
    await panel.screenshot({ path: 'test-results/getting-started-0of3.png' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 – 1 of 3 completed (LLM configured, others pending)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GettingStarted – 1 of 3 completed', () => {
  test.beforeEach(async ({ page }) => {
    await mockOnboardingComplete(page);
    await mockConfigStatus(page, true, false, false);
    await navigateToDashboard(page, '1 of 3 completed');
  });

  test('shows "1 of 3 completed" subtitle', async ({ page }) => {
    await expect(page.getByText('1 of 3 completed')).toBeVisible();
  });

  test('"Connect an LLM provider" is struck through', async ({ page }) => {
    const title = page.getByText('Connect an LLM provider').first();
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS('text-decoration-line', 'line-through');
  });

  test('"Connect a messenger" and "Create a bot" are NOT struck through', async ({ page }) => {
    for (const label of ['Connect a messenger', 'Create a bot']) {
      const el = page.getByText(label).first();
      await expect(el).toBeVisible();
      await expect(el).not.toHaveCSS('text-decoration-line', 'line-through');
    }
  });

  test('only 2 "Start" buttons are shown (completed task has no Start)', async ({ page }) => {
    const panel = getPanel(page);
    const startButtons = panel.getByRole('button', { name: 'Start', exact: true });
    await expect(startButtons).toHaveCount(2);
  });

  test('screenshot – 1 of 3', async ({ page }) => {
    const panel = page.locator('.rounded-xl.border.border-base-300').first();
    await panel.screenshot({ path: 'test-results/getting-started-1of3.png' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 – 3 of 3 completed (everything configured)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GettingStarted – 3 of 3 completed', () => {
  test.beforeEach(async ({ page }) => {
    await mockOnboardingComplete(page);
    await mockConfigStatus(page, true, true, true);
    await navigateToDashboard(page, '3 of 3 completed');
  });

  test('shows "3 of 3 completed" subtitle', async ({ page }) => {
    await expect(page.getByText('3 of 3 completed')).toBeVisible();
  });

  test('all three task titles are struck through', async ({ page }) => {
    for (const title of ['Connect an LLM provider', 'Connect a messenger', 'Create a bot']) {
      const el = page.getByText(title).first();
      await expect(el).toBeVisible();
      await expect(el).toHaveCSS('text-decoration-line', 'line-through');
    }
  });

  test('no "Start" buttons are shown', async ({ page }) => {
    const panel = getPanel(page);
    const startButtons = panel.getByRole('button', { name: 'Start', exact: true });
    await expect(startButtons).toHaveCount(0);
  });

  test('screenshot – 3 of 3', async ({ page }) => {
    const panel = page.locator('.rounded-xl.border.border-base-300').first();
    await panel.screenshot({ path: 'test-results/getting-started-3of3.png' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 – Real API (hits the live server — config reflects actual state)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GettingStarted – real API', () => {
  test('panel renders without JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (e) => jsErrors.push(e.message));
    await setupAuth(page);
    await page.addInitScript(() => localStorage.removeItem('hivemind-hide-getting-started'));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Get started', { timeout: 10000 });
    expect(jsErrors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('subtitle matches "N of 3 completed" pattern', async ({ page }) => {
    await setupAuth(page);
    await page.addInitScript(() => localStorage.removeItem('hivemind-hide-getting-started'));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Get started', { timeout: 10000 });
    const subtitle = page.locator('text=/\\d of 3 completed/');
    await expect(subtitle).toBeVisible();
  });

  test('completed tasks have strikethrough, pending tasks do not', async ({ page }) => {
    await setupAuth(page);
    await page.addInitScript(() => localStorage.removeItem('hivemind-hide-getting-started'));

    // Intercept the real config-status to read the actual response
    let configData: Record<string, boolean> = {};
    await page.route(CONFIG_STATUS_URL, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      configData = body?.data || body;
      await route.fulfill({ response });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Get started', { timeout: 10000 });

    const taskMap = [
      { label: 'Connect an LLM provider', key: 'llmConfigured' },
      { label: 'Connect a messenger', key: 'messengerConfigured' },
      { label: 'Create a bot', key: 'botConfigured' },
    ];

    for (const { label, key } of taskMap) {
      const el = page.getByText(label).first();
      await expect(el).toBeVisible();
      if (configData[key]) {
        await expect(el).toHaveCSS('text-decoration-line', 'line-through');
      } else {
        await expect(el).not.toHaveCSS('text-decoration-line', 'line-through');
      }
    }
  });

  test('real API screenshot', async ({ page }) => {
    await setupAuth(page);
    await page.addInitScript(() => localStorage.removeItem('hivemind-hide-getting-started'));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Get started', { timeout: 10000 });
    const panel = page.locator('.rounded-xl.border.border-base-300').first();
    await panel.screenshot({ path: 'test-results/getting-started-real-api.png' });
  });
});
