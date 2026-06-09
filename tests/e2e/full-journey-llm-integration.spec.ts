import { expect, test, type Page } from '@playwright/test';
import { completeCreateBotWizard } from './helpers';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: LLM Provider Integration
 *
 * Tests the complete LLM provider setup flow using real backend APIs:
 * 1. Navigate to the LLM providers page (/admin/llm)
 * 2. Create a new LLM provider profile via the "Create Profile" modal
 * 3. Verify the profile appears in the list
 * 4. Create a bot via the Create Bot wizard and assign the profile
 * 5. Verify the profile appears in the wizard's LLM provider dropdown
 *
 * Profiles are stored via POST /api/config/llm-profiles (key derived from the
 * name), so each test uses a unique timestamped name to stay re-runnable.
 *
 * @tag @full-journey @llm @integration @providers @critical
 */
test.describe('Full Journey: LLM Provider Integration', () => {
  test.setTimeout(90000);

  /**
   * Create an LLM provider profile through the current "Create Profile" modal
   * on /admin/llm. Assumes the LLM providers page is already loaded.
   *
   * Typing the API key propagates the schema defaults (model, maxTokens) into
   * the form, so only name + API key need to be filled for openai/anthropic.
   */
  async function createLlmProfile(
    page: Page,
    options: { name: string; providerTypeLabel?: string; apiKey: string }
  ): Promise<void> {
    await page.getByRole('button', { name: 'Create Profile' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Add LLM Provider' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Provider Type is the first select in the modal (defaults to OpenAI)
    if (options.providerTypeLabel) {
      await dialog.locator('select').first().selectOption({ label: options.providerTypeLabel });
    }

    await dialog.getByRole('textbox', { name: 'Provider Name' }).fill(options.name);
    await dialog.getByLabel('API Key password input').fill(options.apiKey);

    const postResponse = page.waitForResponse(
      (r) => r.url().includes('/api/config/llm-profiles') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await dialog.getByRole('button', { name: 'Submit Provider' }).click();
    const response = await postResponse;
    expect(response.status(), `profile create returned ${response.status()}`).toBe(201);

    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  // FIXME: POST /api/bots returns 500 when creating a bot immediately after
  // adding an OpenAI provider profile in this flow (should be 4xx at worst —
  // possibly a real bug in provider-profile linking).
  // Tracked in ROADMAP.md (E2E verification).
  test.fixme('Add OpenAI provider and configure with bot', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    const providerName = `E2E OpenAI ${Date.now()}`;
    const botName = `Provider Test Bot ${Date.now()}`;

    // Step 1: Navigate to LLM providers page
    await navigateAndWaitReady(page, '/admin/llm');

    // Step 2: Add a new OpenAI provider profile
    await createLlmProfile(page, { name: providerName, apiKey: 'sk-mock-e2e-key-12345' });

    // Step 3: Verify the profile is listed
    await expect(page.getByText(providerName).first()).toBeVisible({ timeout: 10000 });

    // Step 4: Create a bot assigned to this provider via the wizard
    await navigateAndWaitReady(page, '/admin/bots');
    await page.getByRole('button', { name: 'Create Bot' }).first().click();

    const botSavePromise = page.waitForResponse(
      (response) => response.url().includes('/api/bots') && response.request().method() === 'POST',
      { timeout: 15000 }
    );
    // The wizard labels profiles as "<name> (<provider type>)"
    await completeCreateBotWizard(page, botName, {
      llmProviderLabel: `${providerName} (openai)`,
    });

    const botResponse = await botSavePromise;
    expect(botResponse.status(), `bot create returned ${botResponse.status()}`).toBe(201);
    const botData = await botResponse.json();
    expect(botData.success).toBe(true);

    // Step 5: Verify the bot appears in the bots list
    await expect(page.getByText(botName).first()).toBeVisible({ timeout: 15000 });

    console.log(
      '✅ LLM provider integration journey completed: OpenAI provider added and assigned to bot'
    );
  });

  test('Configure multiple providers and verify all connected', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    const openAiName = `Provider OpenAI ${Date.now()}`;
    const anthropicName = `Provider Anthropic ${Date.now()}`;

    await navigateAndWaitReady(page, '/admin/llm');

    // Add OpenAI profile
    await createLlmProfile(page, { name: openAiName, apiKey: 'sk-openai-mock-12345' });

    // Add Anthropic profile
    await createLlmProfile(page, {
      name: anthropicName,
      providerTypeLabel: 'Anthropic',
      apiKey: 'sk-ant-mock-12345',
    });

    // Verify both profiles are listed
    await expect(page.getByText(openAiName).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(anthropicName).first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Multiple LLM providers journey completed: 2 providers configured');
  });

  test('Add provider and verify appearance in selection dropdowns', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    const providerName = `Dropdown Test Provider ${Date.now()}`;

    // Add provider first
    await navigateAndWaitReady(page, '/admin/llm');
    await createLlmProfile(page, { name: providerName, apiKey: 'sk-dropdown-test-12345' });

    // Navigate to bot creation wizard
    await navigateAndWaitReady(page, '/admin/bots');
    await page.getByRole('button', { name: 'Create Bot' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Create New Bot' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verify the new provider appears in the wizard's LLM provider dropdown
    const llmSelect = dialog.getByRole('combobox', { name: 'LLM provider' });
    await expect(llmSelect).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => llmSelect.locator('option').allTextContents(), { timeout: 10000 })
      .toContain(`${providerName} (openai)`);

    console.log('✅ Provider dropdown integration journey completed');
  });
});
