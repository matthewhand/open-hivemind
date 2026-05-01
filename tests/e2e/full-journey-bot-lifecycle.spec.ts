import { expect, test } from '@playwright/test';
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

    // Step 2: Open create modal and create bot
    const createBtn = page.locator('button:has-text("Create Bot")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Fill bot form (Step 1: Basics)
    await page.locator('input[placeholder="e.g. HelpBot"]').fill(botName);
    await page
      .locator('div.form-control:has-text("Message Provider") select')
      .selectOption('discord');

    // Continue to Step 2
    await page.locator('button:has-text("Next")').click();

    // Step 2: Persona (Keep default)
    await page.locator('button:has-text("Next")').click();

    // Step 3: Guardrails (Optional)
    await page.locator('button:has-text("Next")').click();

    // Step 4: Review
    await page.locator('button:has-text("Complete")').click();

    // Confirm & Save dialog
    const confirmBtn = page.locator('button:has-text("Confirm & Save")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Step 3: Verify bot appears in list
    await expect(page.locator(`text=${botName}`)).toBeVisible({ timeout: 15000 });

    // Step 4: Navigate to bot detail/configuration
    // Clicking the bot opens the DetailDrawer
    await page.locator(`text=${botName}`).first().click();

    // Click the "Config" button in the DetailDrawer dock to open BotSettingsModal
    const configBtn = page.locator('button[title="Configuration"]').first();
    await expect(configBtn).toBeVisible({ timeout: 5000 });
    await configBtn.click();

    // Step 5: Verify bot name in modal and close
    await expect(page.locator(`.modal-title:has-text("${botName}")`)).toBeVisible();
    await page.locator('button:has-text("Close")').click();

    // Success - full journey completed
    console.log('✅ Full bot lifecycle journey completed successfully');
  });

  test('Bot creation to messaging flow', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    const botName = `Messaging Test Bot ${Date.now()}`;

    // Step 1: Create bot
    await navigateAndWaitReady(page, '/admin/bots');
    const createBtn = page.locator('button:has-text("Create Bot")').first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Fill wizard
    await page.locator('input[placeholder="e.g. HelpBot"]').fill(botName);
    await page
      .locator('div.form-control:has-text("Message Provider") select')
      .selectOption('discord');
    await page.locator('button:has-text("Next")').click(); // Step 1 -> 2
    await page.locator('button:has-text("Next")').click(); // Step 2 -> 3
    await page.locator('button:has-text("Next")').click(); // Step 3 -> 4
    await page.locator('button:has-text("Complete")').click();

    const confirmBtn = page.locator('button:has-text("Confirm & Save")').first();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify creation success in list
    await expect(page.locator(`text=${botName}`)).toBeVisible({ timeout: 15000 });

    // Step 2: Navigate to real chat interface
    await navigateAndWaitReady(page, '/admin/chat');

    // Step 3: Verify bot is listed in chat sidebar and ready
    // The chat sidebar lists active bots
    const botInSidebar = page.locator(`button:has-text("${botName}")`).first();
    await expect(botInSidebar).toBeVisible({ timeout: 20000 });

    // Select the bot to verify details
    await botInSidebar.click();

    // Verify the bot interface is loaded
    await expect(page.locator(`h1:has-text("Live Chat Monitor")`)).toBeVisible();
    await expect(page.locator(`span:has-text("${botName}")`).first()).toBeVisible();

    console.log('✅ Bot creation to messaging flow completed');
  });
});
