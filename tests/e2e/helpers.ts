import { expect, type Page } from '@playwright/test';

/**
 * Helper utilities for Playwright E2E tests
 * Re-exports common test utilities for convenience
 */

/**
 * Mock the endpoints the Create Bot wizard depends on:
 * - GET /api/personas (step 2 requires at least one persona to select)
 * - GET /api/config/llm-status (step 1 requires a configured default LLM)
 *
 * Call this in specs that do not already mock these endpoints themselves.
 */
export async function mockBotWizardPrereqs(page: Page): Promise<void> {
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
  await page.route('**/api/personas', (route) =>
    route.fulfill({
      status: 200,
      json: [{ id: 'default', name: 'Default Assistant', description: 'A helpful assistant' }],
    })
  );
}

/**
 * Walk the "Create New Bot" wizard (Basics → Persona → Guardrails → Review)
 * and submit. Matches the current 4-step CreateBotWizard UI.
 *
 * Preconditions:
 * - The wizard modal is open (click the "Create Bot" button first).
 * - GET /api/personas returns at least one persona (see mockBotWizardPrereqs).
 * - GET /api/config/llm-status reports a configured default LLM, OR an
 *   llmProviderLabel is passed to pick an explicit provider.
 */
export async function completeCreateBotWizard(
  page: Page,
  botName: string,
  options: { messageProvider?: string; llmProviderLabel?: string } = {}
): Promise<void> {
  const { messageProvider = 'discord', llmProviderLabel } = options;

  const dialog = page.getByRole('dialog', { name: 'Create New Bot' });
  await expect(dialog).toBeVisible({ timeout: 10000 });

  // Step 1: Basics
  await dialog.getByRole('textbox', { name: /Bot Name/i }).fill(botName);
  await dialog.getByRole('combobox', { name: 'Message provider' }).selectOption(messageProvider);
  if (llmProviderLabel) {
    await dialog
      .getByRole('combobox', { name: 'LLM provider' })
      .selectOption({ label: llmProviderLabel });
  } // otherwise LLM provider stays on "Use System Default"
  await dialog.getByRole('button', { name: 'Next →' }).click();

  // Step 2: Persona (required) — only one select rendered on this step
  const personaSelect = dialog.locator('select').first();
  await expect(personaSelect).toBeVisible({ timeout: 5000 });
  await personaSelect.selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Next →' }).click();

  // Step 3: Guardrails (optional)
  await dialog.getByRole('button', { name: 'Next →' }).click();

  // Step 4: Review — submit
  const postResponse = page.waitForResponse(
    (r) => r.url().includes('/api/bots') && r.request().method() === 'POST',
    { timeout: 15000 }
  );
  await dialog.getByRole('button', { name: 'Complete' }).click();

  // A config-diff confirmation dialog may appear before submission
  const confirmBtn = page.getByRole('button', { name: /Confirm & Save/i });
  const confirmVisible = await confirmBtn
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (confirmVisible) {
    await confirmBtn.click();
  }

  await postResponse;
}

/**
 * Authenticate as admin user
 * Sets up localStorage with fake auth tokens for testing
 */
export async function authenticateAsAdmin(page: Page): Promise<void> {
  const fakeToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
  const fakeUser = JSON.stringify({
    id: 'admin',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: 'owner',
    permissions: ['*'],
  });

  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem(
        'auth_tokens',
        JSON.stringify({
          accessToken: token,
          refreshToken: token,
          expiresIn: 3600,
        })
      );
      localStorage.setItem('auth_user', user);
    },
    { token: fakeToken, user: fakeUser }
  );
}

/**
 * Wait for an API response from a specific endpoint
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match (string or regex)
 * @param timeout - Timeout in milliseconds
 * @returns The response object
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<Response> {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Setup common API mocks for a page
 * Useful for tests that need basic data without full backend
 */
export async function setupCommonMocks(page: Page): Promise<void> {
  // Mock health check
  await page.route('**/{,api/}health/detailed', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        version: '1.0.0',
        uptime: 12345,
      }),
    });
  });

  // Mock user info
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'admin',
        username: 'admin',
        email: 'admin@open-hivemind.com',
        role: 'owner',
      }),
    });
  });
}

/**
 * Take a screenshot with consistent naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? true,
  });
}

// Re-export from test-utils for convenience
export { setupAuth, setupErrorCollection, assertNoErrors, waitForPageReady } from './test-utils';
