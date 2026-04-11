import { expect, test } from '@playwright/test';
import { setupAuth, registerViteSourceBypass } from './test-utils';

/**
 * Onboarding Wizard E2E Tests
 *
 * Verifies the full onboarding wizard flow:
 *   Welcome (step 1) → LLM (step 2) → Messenger (step 3) → Bot (step 4) → Done (step 5)
 */
test.describe('Onboarding Wizard', () => {
  test.setTimeout(90000);

  /** Shared mock setup for every test in this suite. */
  async function setupOnboardingMocks(page: import('@playwright/test').Page) {
    await setupAuth(page);

    // Onboarding not yet completed – redirect should happen
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { completed: false, step: 1 } },
      });
    });

    // Allow step updates (POST)
    await page.route('**/api/onboarding/step', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          json: { data: { completed: false, step: body?.step ?? 1 } },
        });
      } else {
        await route.continue();
      }
    });

    // Mark complete (POST)
    await page.route('**/api/onboarding/complete', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { completed: true, step: 5 } },
      });
    });

    // LLM profiles – empty (fresh install)
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: { profiles: { llm: [] } },
      });
    });

    // Generic config endpoints
    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: {} });
      } else {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      }
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: [] } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      });
    });

    await page.route('**/api/bots', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: { bots: [] } } });
      } else {
        await route.fulfill({ status: 201, json: { data: { id: 'new-bot-1', name: 'TestBot' } } });
      }
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'healthy' } });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { active: false } });
    });

    // Must be last — lets Vite source-module requests pass through so they are
    // not intercepted by the broad API mock patterns above.
    await registerViteSourceBypass(page);
  }

  test('navigates through all 5 wizard steps in correct order', async ({ page }) => {
    await setupOnboardingMocks(page);

    // Navigate to /onboarding directly
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // ---------------------------------------------------------------
    // Step 1 – Welcome
    // ---------------------------------------------------------------
    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/onboarding-01-welcome.png', fullPage: true });

    // Click Next to advance to LLM step
    const nextButton = page.locator('button', { hasText: 'Next' });
    await nextButton.click();

    // ---------------------------------------------------------------
    // Step 2 – LLM
    // ---------------------------------------------------------------
    await expect(page.getByText('Configure LLM Provider')).toBeVisible({ timeout: 10000 });

    // Verify "Manage LLM Providers" link exists
    const llmLink = page.locator('a', { hasText: 'Manage LLM Providers' });
    await expect(llmLink).toBeVisible();
    await expect(llmLink).toHaveAttribute('href', '/admin/providers/llm');

    await page.screenshot({ path: 'test-results/onboarding-02-llm.png', fullPage: true });

    // Click Next to advance to Messenger step
    await nextButton.click();

    // ---------------------------------------------------------------
    // Step 3 – Messenger
    // ---------------------------------------------------------------
    await expect(page.getByText('Connect a Messenger')).toBeVisible({ timeout: 10000 });

    // Verify "Manage Message Providers" link exists
    const messengerLink = page.locator('a', { hasText: 'Manage Message Providers' });
    await expect(messengerLink).toBeVisible();
    await expect(messengerLink).toHaveAttribute('href', '/admin/providers/message');

    await page.screenshot({ path: 'test-results/onboarding-03-messenger.png', fullPage: true });

    // Click Next to advance to Bot step
    await nextButton.click();

    // ---------------------------------------------------------------
    // Step 4 – Bot
    // ---------------------------------------------------------------
    await expect(page.getByText('Create Your First Bot')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/onboarding-04-bot.png', fullPage: true });

    // Click Next to advance to Done step
    await nextButton.click();

    // ---------------------------------------------------------------
    // Step 5 – Done
    // ---------------------------------------------------------------
    await expect(page.getByText('You are All Set!')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/onboarding-05-done.png', fullPage: true });
  });

  test('step order is LLM before Messenger before Bot', async ({ page }) => {
    await setupOnboardingMocks(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Collect step headings in order as we navigate
    const stepHeadings: string[] = [];
    const nextButton = page.locator('button', { hasText: 'Next' });

    // Step 1 – Welcome
    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });
    stepHeadings.push('Welcome');

    // Step 2
    await nextButton.click();
    await expect(page.getByText('Configure LLM Provider')).toBeVisible({ timeout: 10000 });
    stepHeadings.push('LLM');

    // Step 3
    await nextButton.click();
    await expect(page.getByText('Connect a Messenger')).toBeVisible({ timeout: 10000 });
    stepHeadings.push('Messenger');

    // Step 4
    await nextButton.click();
    await expect(page.getByText('Create Your First Bot')).toBeVisible({ timeout: 10000 });
    stepHeadings.push('Bot');

    // Step 5
    await nextButton.click();
    await expect(page.getByText('You are All Set!')).toBeVisible({ timeout: 10000 });
    stepHeadings.push('Done');

    // Assert correct order
    expect(stepHeadings).toEqual(['Welcome', 'LLM', 'Messenger', 'Bot', 'Done']);

    // Verify LLM comes before Messenger which comes before Bot
    const llmIdx = stepHeadings.indexOf('LLM');
    const messengerIdx = stepHeadings.indexOf('Messenger');
    const botIdx = stepHeadings.indexOf('Bot');
    expect(llmIdx).toBeLessThan(messengerIdx);
    expect(messengerIdx).toBeLessThan(botIdx);
  });

  test('redirects to /onboarding when onboarding is incomplete', async ({ page }) => {
    await setupOnboardingMocks(page);

    // Navigate to root – the app should redirect to /onboarding
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for either the redirect or the onboarding content
    await expect(
      page.getByText('Welcome to Open-Hivemind').or(page.getByText('Open-Hivemind Setup')).first()
    ).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/onboarding-06-redirect.png', fullPage: true });
  });

  test('Back button navigates to previous step', async ({ page }) => {
    await setupOnboardingMocks(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    const nextButton = page.locator('button', { hasText: 'Next' });

    // Go to step 2 (LLM)
    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });
    await nextButton.click();
    await expect(page.getByText('Configure LLM Provider')).toBeVisible({ timeout: 10000 });

    // Go to step 3 (Messenger)
    await nextButton.click();
    await expect(page.getByText('Connect a Messenger')).toBeVisible({ timeout: 10000 });

    // Click Back – should return to LLM step
    const backButton = page.locator('button', { hasText: 'Back' });
    await backButton.click();
    await expect(page.getByText('Configure LLM Provider')).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'test-results/onboarding-07-back-navigation.png',
      fullPage: true,
    });
  });

  test('Skip Setup button is visible on intermediate steps', async ({ page }) => {
    await setupOnboardingMocks(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Skip Setup should be visible on Welcome step
    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });
    const skipButton = page.locator('button', { hasText: 'Skip Setup' });
    await expect(skipButton).toBeVisible();

    // Advance to LLM step – Skip Setup should still be visible
    const nextButton = page.locator('button', { hasText: 'Next' });
    await nextButton.click();
    await expect(page.getByText('Configure LLM Provider')).toBeVisible({ timeout: 10000 });
    await expect(skipButton).toBeVisible();

    await page.screenshot({ path: 'test-results/onboarding-08-skip-setup.png', fullPage: true });
  });

  test('Skip Setup navigates to /admin/overview and does not bounce back', async ({ page }) => {
    await setupOnboardingMocks(page);

    // After complete is posted, status must return completed: true so OverviewPage doesn't loop
    let onboardingDone = false;
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, data: { completed: onboardingDone, step: onboardingDone ? 5 : 1 } },
      });
    });
    await page.route('**/api/onboarding/complete', async (route) => {
      onboardingDone = true;
      await route.fulfill({
        status: 200,
        json: { success: true, data: { completed: true, step: 5 } },
      });
    });

    // Additional routes OverviewPage fetches after onboarding check passes
    await page.route('**/api/dashboard/config-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { llmConfigured: true, botConfigured: true, messengerConfigured: true } },
      });
    });
    await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, json: {} }));

    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });

    // Click Skip Setup
    const skipButton = page.locator('button', { hasText: 'Skip Setup' });
    await skipButton.click();

    // Should land on /admin/overview and STAY there
    await page.waitForURL('**/admin/overview', { timeout: 10000 });
    await expect(page.url()).toContain('/admin/overview');

    // Wait a moment and verify we haven't been bounced back to onboarding
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/onboarding');

    await page.screenshot({
      path: 'test-results/onboarding-09-skip-stays-on-overview.png',
      fullPage: true,
    });
  });

  test('OverviewPage does not redirect to onboarding when completed flag is set', async ({
    page,
  }) => {
    await setupAuth(page);

    // Status returns completed (wrapped in ApiResponse envelope)
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, data: { completed: true, step: 5 } },
      });
    });

    // Stub other endpoints OverviewPage needs
    await page.route('**/api/dashboard/config-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { llmConfigured: true, botConfigured: true, messengerConfigured: true } },
      });
    });
    await page.route('**/api/bots', async (route) => {
      await route.fulfill({ status: 200, json: { data: { bots: [] } } });
    });
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'healthy' } });
    });
    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });
    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { active: false } });
    });
    await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/config/**', async (route) => route.fulfill({ status: 200, json: {} }));

    await page.goto('/admin/overview');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to settle — should NOT redirect to /onboarding
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/onboarding');
    expect(page.url()).toContain('/admin/overview');

    await page.screenshot({
      path: 'test-results/onboarding-10-no-redirect-when-complete.png',
      fullPage: true,
    });
  });

  test('step Skip button advances without marking complete', async ({ page }) => {
    await setupOnboardingMocks(page);

    let completeCallCount = 0;
    await page.route('**/api/onboarding/complete', async (route) => {
      completeCallCount++;
      await route.fulfill({
        status: 200,
        json: { success: true, data: { completed: true, step: 5 } },
      });
    });

    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });

    // Advance to step 2
    await page.locator('button', { hasText: 'Next' }).click();
    await expect(page.getByText('Configure LLM Provider')).toBeVisible({ timeout: 10000 });

    // Click the per-step Skip (not "Skip Setup")
    const stepSkipButton = page
      .locator('button', { hasText: 'Skip' })
      .filter({ hasNotText: 'Setup' });
    await stepSkipButton.click();

    // Should advance to step 3 (Messenger), not trigger complete
    await expect(page.getByText('Connect a Messenger')).toBeVisible({ timeout: 10000 });
    expect(completeCallCount).toBe(0);
  });

  test('completes full wizard and navigates to dashboard', async ({ page }) => {
    await setupOnboardingMocks(page);

    let onboardingDone = false;
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, data: { completed: onboardingDone, step: onboardingDone ? 5 : 1 } },
      });
    });

    await page.route('**/api/onboarding/complete', async (route) => {
      onboardingDone = true;
      await route.fulfill({
        status: 200,
        json: { success: true, data: { completed: true, step: 5 } },
      });
    });

    // Mock dashboard config status
    await page.route('**/api/dashboard/config-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { llmConfigured: true, botConfigured: true, messengerConfigured: true } },
      });
    });

    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    const nextButton = page.locator('button', { hasText: 'Next' });

    // Step 1 -> 2
    await nextButton.click();
    // Step 2 -> 3
    await nextButton.click();
    // Step 3 -> 4
    await nextButton.click();
    // Step 4 -> 5
    await nextButton.click();

    // Final step: Done
    await expect(page.getByText('You are All Set!')).toBeVisible({ timeout: 10000 });

    // Click Go to Dashboard
    const finishButton = page.locator('button', { hasText: 'Go to Dashboard' }).first();
    await finishButton.click();

    // Should land on /admin/overview
    await page.waitForURL('**/admin/overview', { timeout: 10000 });
    await expect(page.url()).toContain('/admin/overview');

    await page.screenshot({
      path: 'test-results/onboarding-11-complete-to-dashboard.png',
      fullPage: true,
    });
  });
});
