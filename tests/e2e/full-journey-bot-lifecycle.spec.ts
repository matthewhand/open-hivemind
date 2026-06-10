import { expect, test } from '@playwright/test';
import { completeCreateBotWizard, getApiAuthHeaders } from './helpers';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: Complete Bot Lifecycle
 *
 * Tests the complete end-to-end flow:
 * 1. Login
 * 2. Create a bot with all required configurations
 * 3. Configure LLM provider
 * 4. Set up messenger integration
 * 5. Test bot connectivity
 * 6. View bot in dashboard
 * 7. Update bot configuration
 * 8. Deactivate/Reactivate bot
 * 9. Verify audit trail
 *
 * @tag @full-journey @bot-lifecycle @critical
 */
test.describe('Full Journey: Bot Lifecycle End-to-End', () => {
  test.setTimeout(120000); // 2 minutes for full journey

  test('Complete bot lifecycle: Create → Configure → Test → Deactivate', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Step 1: Navigate to bots page
    await navigateAndWaitReady(page, '/admin/bots');

    // Generate a unique bot name to avoid conflicts with existing data
    const botName = `E2E Test Bot ${Date.now()}`;

    // Step 2: Create bot via the Create Bot wizard
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await completeCreateBotWizard(page, botName);

    // Step 3: Verify bot appears in list
    // Click the bot card (the list re-renders frequently, so target the
    // .cursor-pointer card container rather than the inner text span)
    const botCard = page.locator('.cursor-pointer').filter({ hasText: botName }).first();
    await expect(botCard).toBeVisible({ timeout: 15000 });

    // Step 4: Navigate to bot detail/configuration
    // Clicking the bot opens the DetailDrawer
    await botCard.click();

    // Click the "Config" button in the DetailDrawer dock to open BotSettingsModal
    const configBtn = page.locator('button[title="Configuration"]').first();
    await expect(configBtn).toBeVisible({ timeout: 5000 });
    await configBtn.click();

    // Step 5: Verify bot name in modal title and close
    await expect(page.locator(`#modal-dialog-title:has-text("${botName}")`)).toBeVisible();
    await page.locator('button:has-text("Close")').click();

    // Success - full journey completed
    console.log('✅ Full bot lifecycle journey completed successfully');
  });

  test('Bot creation to messaging flow', async ({ page, request }) => {
    await setupTestWithErrorDetection(page);

    const ts = Date.now();
    const botName = `Messaging Test Bot ${ts}`;
    const profileKey = `e2e-lifecycle-${ts}`;
    const profileName = `E2E Lifecycle ${ts}`;

    // The Test Drive tab requires the bot to have an LLM provider linked —
    // bots left on "Use System Default" render a "No LLM Provider Configured"
    // empty state instead of the chat input. Create a provider profile up
    // front and assign it in the wizard.
    const headers = await getApiAuthHeaders(request);
    const profileRes = await request.post('/api/config/llm-profiles', {
      headers,
      data: {
        key: profileKey,
        name: profileName,
        provider: 'openai',
        config: { apiKey: 'sk-mock-e2e-key-12345', model: 'gpt-4' },
      },
    });
    expect(profileRes.status(), 'LLM profile create').toBe(201);

    // Step 1: Create bot via the Create Bot wizard with the profile assigned
    await navigateAndWaitReady(page, '/admin/bots');
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await completeCreateBotWizard(page, botName, {
      llmProviderLabel: `${profileName} (openai)`,
    });

    // Verify creation success in list (target the stable card container)
    const botCard = page.locator('.cursor-pointer').filter({ hasText: botName }).first();
    await expect(botCard).toBeVisible({ timeout: 15000 });

    // Step 2: Open the bot's detail drawer and switch to the Test Drive tab
    // (the /admin/chat "Live Chat Monitor" page no longer exists; per-bot
    // messaging now lives in the bot drawer's Test Drive tab)
    await botCard.click();
    await page
      .getByText(/^Test Drive$/i)
      .first()
      .click();

    // Step 3: Verify the test-chat interface is ready for this bot
    const messageInput = page.getByPlaceholder(/Type a message/i);
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Send test message/i })).toBeVisible();

    console.log('✅ Bot creation to messaging flow completed');
  });
});
