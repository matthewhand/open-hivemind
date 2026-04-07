import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

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
    await expect(page.getByText('Welcome to Open-Hivemind').or(
      page.getByText('Open-Hivemind Setup')
    )).toBeVisible({ timeout: 15000 });

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

    await page.screenshot({ path: 'test-results/onboarding-07-back-navigation.png', fullPage: true });
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
});
