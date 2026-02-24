import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
} from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(90000);

  const BOT_NAME = 'Deletion Protection Test Bot';

  test('Requires typing bot name to confirm deletion', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock API to bypass backend auth/state issues
    let bots: any[] = [];

    // Log requests to debug
    // page.on('request', request => console.log('>>', request.method(), request.url()));

    // Initial Config
    await page.route(/\/api\/config$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { bots } });
      } else {
        await route.continue();
      }
    });

    // Global Config (for provider dropdowns)
    await page.route(/\/api\/config\/global/, async (route) => {
      await route.fulfill({
        json: {
          discord: { values: {} },
          openai: { values: {} },
        },
      });
    });

    // Other dependencies
    await page.route(/\/api\/personas/, async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.route(/\/api\/config\/llm-profiles/, async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    await page.route(/\/api\/config\/llm-status/, async (route) => {
      await route.fulfill({ json: { defaultConfigured: true } });
    });

    // Create Bot (POST /api/bots)
    await page.route(/\/api\/bots$/, async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        const newBot = {
          id: 'test-bot-' + Date.now(),
          name: payload.name,
          provider: payload.messageProvider || 'discord',
          llmProvider: payload.llmProvider || 'openai',
          status: 'active',
          connected: true,
          messageCount: 0,
          errorCount: 0,
          config: {},
        };
        bots.push(newBot);
        await route.fulfill({ json: { success: true, bot: newBot } });
      } else {
        await route.continue();
      }
    });

    // Delete Bot & Activity/History (paths with IDs)
    await page.route(/\/api\/bots\/.+/, async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'DELETE') {
        const id = url.split('/').pop();
        bots = bots.filter((b) => b.id !== id);
        await route.fulfill({ json: { success: true } });
      } else if (url.includes('/activity')) {
         await route.fulfill({ json: { data: { activity: [] }, events: [] } });
      } else if (url.includes('/history')) {
         await route.fulfill({ json: { data: { history: [] } } });
      } else if (url.includes('/clone')) { // clone path
         await route.fulfill({ json: { success: true } });
      } else {
         // Fallback for other methods like PUT or POST actions
         await route.fulfill({ json: { success: true } });
      }
    });

    // CSRF Token (handled by apiService)
    await page.route(/\/api\/csrf-token/, async (route) => {
        await route.fulfill({ json: { token: 'mock-csrf-token' } });
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // 1. Create a bot first to ensure we have something to delete
    // Resolve strict mode violation by taking the first one (header button)
    await page.getByRole('button', { name: /create bot/i }).first().click();

    // Target the Create Bot modal specifically
    const createModal = page.locator('dialog.modal', { hasText: 'Create New Bot' });
    await expect(createModal).toBeVisible();

    // Step 1: Basics
    await createModal.locator('input').first().fill(BOT_NAME);
    // Defaults are fine (Discord, Default LLM)

    // Navigate Wizard
    const nextBtn = createModal.getByRole('button', { name: 'Next' });
    await nextBtn.click(); // To Step 2 (Persona)
    await nextBtn.click(); // To Step 3 (Guardrails)
    await nextBtn.click(); // To Step 4 (Review)

    // Finish
    const finishBtn = createModal.getByRole('button', { name: /Finish/i });
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    await expect(createModal).not.toBeVisible();

    // Wait for the bot to appear in the list
    // Use .first() to avoid strict mode violation if modal element still exists in DOM
    const botInList = page.locator('.card-body').getByText(BOT_NAME).first();
    await expect(botInList).toBeVisible();

    // 2. Open Settings for the bot
    const botRow = page.locator('.card-body .border', { hasText: BOT_NAME }).first();
    await botRow.locator('button[title="Bot Settings"]').click();

    // 3. Initiate Deletion from Settings Modal
    const settingsModal = page.locator('dialog.modal', { hasText: 'Core Configuration' }); // Targeting something unique to settings
    await expect(settingsModal).toBeVisible();
    await expect(settingsModal).toContainText(BOT_NAME);

    // Click Delete Bot button
    await settingsModal.getByRole('button', { name: /delete bot/i }).click();

    // 4. Verify Delete Confirmation Modal
    const deleteModal = page.locator('dialog.modal', { hasText: 'Delete Bot' });
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal).toContainText(`Are you sure you want to delete ${BOT_NAME}?`);

    // 5. Check Initial State
    const deleteConfirmButton = deleteModal.getByRole('button', { name: 'Delete', exact: true });

    const confirmationInput = deleteModal.locator('input[placeholder*="Type"][placeholder*="to confirm"]');

    await expect(confirmationInput).toBeVisible();
    await expect(deleteConfirmButton).toBeDisabled();

    await page.screenshot({ path: 'test-results/bot-deletion-protection.png' });

    // 6. Test Incorrect Input
    await confirmationInput.fill('Wrong Name');
    await expect(deleteConfirmButton).toBeDisabled();

    // 7. Test Correct Input
    await confirmationInput.fill(BOT_NAME);
    await expect(deleteConfirmButton).toBeEnabled();

    // 8. Perform Deletion
    await deleteConfirmButton.click();

    // 9. Verify Deletion
    await expect(deleteModal).not.toBeVisible();
    await expect(page.getByText(BOT_NAME)).not.toBeVisible();

    // Filter out expected 401s if any persist (though mocks should prevent them)
    const filteredErrors = errors.filter(e => !e.includes('401') && !e.includes('Unauthorized'));
    await assertNoErrors(filteredErrors, 'Bot deletion protection');
  });
});
