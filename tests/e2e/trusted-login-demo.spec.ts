import { expect, test } from '@playwright/test';
import { assertNoErrors, setupErrorCollection } from './test-utils';

/**
 * Trusted Network Login + Demo Mode E2E Tests
 *
 * Verifies:
 * 1. Trusted-network login button appears when /api/auth/trusted-status returns trusted: true
 * 2. Clicking the button logs the user in and redirects to the dashboard
 * 3. Demo Mode can be toggled from the Quick Actions bar
 * 4. Demo bots (SupportBot, SalesAssistant, etc.) appear after enabling demo mode
 */

const FAKE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';

const FAKE_USER = {
  id: 'admin',
  username: 'admin',
  email: 'admin@open-hivemind.com',
  role: 'owner',
  permissions: ['*'],
};

const DEMO_BOTS = [
  {
    id: 'demo-bot-1',
    name: 'SupportBot',
    description: 'Friendly customer support agent',
    status: 'active',
    connected: true,
    messageProvider: 'discord',
    llmProvider: 'openai',
    provider: 'discord',
    messageCount: 342,
    errorCount: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-bot-2',
    name: 'SalesAssistant',
    description: 'Sales inquiry assistant',
    status: 'active',
    connected: true,
    messageProvider: 'slack',
    llmProvider: 'flowise',
    provider: 'slack',
    messageCount: 187,
    errorCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-bot-3',
    name: 'OnboardingHelper',
    description: 'New-user onboarding guide',
    status: 'active',
    connected: true,
    messageProvider: 'mattermost',
    llmProvider: 'openwebui',
    provider: 'mattermost',
    messageCount: 95,
    errorCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-bot-4',
    name: 'AnalyticsBot',
    description: 'Data analytics assistant',
    status: 'active',
    connected: true,
    messageProvider: 'discord',
    llmProvider: 'perplexity',
    provider: 'discord',
    messageCount: 210,
    errorCount: 2,
    createdAt: new Date().toISOString(),
  },
];

/** Mock every common API endpoint so navigation doesn't produce console errors. */
async function setupCommonMocks(page: import('@playwright/test').Page) {
  await page.route('**/api/csrf-token', (route) =>
    route.fulfill({ json: { token: 'mock-csrf-token' } })
  );
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: { status: 'ok' } })
  );
  await page.route('**/api/health/detailed', (route) =>
    route.fulfill({ json: { status: 'healthy' } })
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { bots: [] } })
  );
  await page.route('**/api/config/global', (route) =>
    route.fulfill({ json: {} })
  );
  await page.route('**/api/config/llm-status', (route) =>
    route.fulfill({
      json: {
        defaultConfigured: true,
        defaultProviders: [],
        botsMissingLlmProvider: [],
        hasMissing: false,
      },
    })
  );
  await page.route('**/api/config/llm-profiles', (route) =>
    route.fulfill({ json: { profiles: { llm: [] } } })
  );
  await page.route('**/api/personas', (route) =>
    route.fulfill({ json: [] })
  );
  await page.route('**/api/admin/guard-profiles', (route) =>
    route.fulfill({ json: { data: [] } })
  );
  await page.route('**/api/bots', (route) =>
    route.fulfill({ status: 200, json: { data: { bots: [] } } })
  );
}

test.describe('Trusted Network Login + Demo Mode', () => {
  test.setTimeout(60000);

  test('trusted login button visible and redirects to dashboard', async ({ page }) => {
    const errors = setupErrorCollection(page);

    // --- Mock trusted-status to report a trusted network ---
    await page.route('**/api/auth/trusted-status', (route) =>
      route.fulfill({
        json: { success: true, data: { trusted: true } },
      })
    );

    // --- Mock trusted-login to return valid tokens ---
    await page.route('**/api/auth/trusted-login', (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            accessToken: FAKE_TOKEN,
            refreshToken: FAKE_TOKEN,
            expiresIn: 3600,
            user: FAKE_USER,
          },
        },
      })
    );

    // Setup mocks for the dashboard the user lands on after login
    await setupCommonMocks(page);
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ json: { active: false } })
    );
    await page.route('**/api/dashboard/status', (route) =>
      route.fulfill({ json: { bots: [], uptime: 100 } })
    );
    await page.route('**/api/dashboard/api/status', (route) =>
      route.fulfill({ json: { bots: [], uptime: 100 } })
    );

    // Navigate to the login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // The trusted-network button should be visible
    const trustedButton = page.getByText('Login as Admin (Trusted Network)');
    await expect(trustedButton).toBeVisible({ timeout: 10000 });

    // Screenshot: login page with the trusted-network button
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: 'docs/screenshots/login-trusted-network.png', fullPage: true });

    // Click the trusted login button
    await trustedButton.click();

    // Wait for navigation to the dashboard
    await page.waitForURL('**/admin/overview', { timeout: 15000 });
    expect(page.url()).toContain('/admin/overview');

    await page.screenshot({ path: 'test-results/trusted-login-dashboard.png', fullPage: true });
    await assertNoErrors(errors, 'Trusted login redirect');
  });

  test('demo mode toggle shows demo bots on dashboard', async ({ page }) => {
    const errors = setupErrorCollection(page);

    // Pre-authenticate via localStorage so we land directly on the dashboard
    await page.addInitScript(
      ({ token, user }) => {
        localStorage.setItem(
          'auth_tokens',
          JSON.stringify({ accessToken: token, refreshToken: token, expiresIn: 3600 })
        );
        localStorage.setItem('auth_user', user);
      },
      { token: FAKE_TOKEN, user: JSON.stringify(FAKE_USER) }
    );

    await setupCommonMocks(page);

    // --- Demo status: initially OFF ---
    let demoEnabled = false;

    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ json: { active: demoEnabled, isDemoMode: demoEnabled } })
    );

    // --- Demo toggle: flip the flag and return new state ---
    await page.route('**/api/demo/toggle', (route) => {
      demoEnabled = !demoEnabled;
      return route.fulfill({
        json: { success: true, data: { enabled: demoEnabled, message: demoEnabled ? 'Demo mode enabled' : 'Demo mode disabled' } },
      });
    });

    // --- Dashboard status: return demo bots when demo mode is on ---
    await page.route('**/api/dashboard/status', (route) =>
      route.fulfill({
        json: demoEnabled
          ? { bots: DEMO_BOTS, uptime: 9999, isDemoMode: true }
          : { bots: [], uptime: 100 },
      })
    );
    await page.route('**/api/dashboard/api/status', (route) =>
      route.fulfill({
        json: demoEnabled
          ? { bots: DEMO_BOTS, uptime: 9999, isDemoMode: true }
          : { bots: [], uptime: 100 },
      })
    );

    // --- Demo bots endpoint ---
    await page.route('**/api/demo/bots', (route) =>
      route.fulfill({
        json: { success: true, data: { bots: DEMO_BOTS, count: DEMO_BOTS.length, isDemo: true } },
      })
    );

    // Navigate to the dashboard
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');

    // Locate the Demo Mode button in Quick Actions
    const demoButton = page.getByRole('button', { name: /Demo Mode/i });
    await expect(demoButton).toBeVisible({ timeout: 10000 });

    // Click it to enable demo mode
    await demoButton.click();

    // Wait for the toast confirmation
    await expect(page.getByText(/demo mode enabled/i)).toBeVisible({ timeout: 10000 });

    // Wait for the dashboard to refresh with demo data
    await page.waitForTimeout(1000);

    // Verify demo bots appear on the page
    // The dashboard renders bot names from the status response
    const supportBot = page.getByText('SupportBot');
    const salesAssistant = page.getByText('SalesAssistant');

    // At least check that the bot names are present somewhere on the page
    const hasSupportBot = (await supportBot.count()) > 0;
    const hasSalesAssistant = (await salesAssistant.count()) > 0;
    expect(hasSupportBot || hasSalesAssistant).toBeTruthy();

    // Screenshot: dashboard with demo data active
    await page.screenshot({ path: 'docs/screenshots/dashboard-demo-mode.png', fullPage: true });

    await assertNoErrors(errors, 'Demo mode toggle');
  });
});
