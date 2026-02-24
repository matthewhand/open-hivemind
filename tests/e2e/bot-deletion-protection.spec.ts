import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(60000);

  test('requires name confirmation to delete a bot', async ({ page }) => {
    // Setup error detection (ignoring 401s as per previous step)
    const errors = await setupTestWithErrorDetection(page);

    const botId = 'test-bot-123';
    const botName = 'Deletion Test Bot';

    // Mock Backend Responses
    await page.route('**/api/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [{
            id: botId,
            name: botName,
            provider: 'discord',
            messageProvider: 'discord',
            llmProvider: 'openai',
            status: 'active',
            connected: true,
            messageCount: 10,
            errorCount: 0
          }]
        })
      });
    });

    await page.route('**/api/config/global', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.route('**/api/personas', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.route('**/api/config/llm-profiles', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ profiles: { llm: [] } }) });
    });

    await page.route(`**/api/bots/${botId}/activity*`, async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { activity: [] } }) });
    });

    await page.route(`**/api/bots/${botId}/history*`, async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { history: [] } }) });
    });

    await page.route(`**/api/bots/${botId}`, async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to page
    await navigateAndWaitReady(page, '/admin/bots');

    // Verify bot is visible (from mock)
    const botCard = page.locator('.group').filter({ hasText: botName });
    await expect(botCard).toBeVisible();

    // Open Settings
    await botCard.locator('button[title="Bot Settings"]').click();

    // Click Delete in Settings Modal
    await page.click('button:has-text("Delete Bot")');

    // Verify Delete Confirmation Modal
    const deleteModal = page.locator('.modal-box').filter({ hasText: 'Delete Bot' }).last();
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal).toContainText(`Please type ${botName} to confirm deletion.`);

    // Verify Deletion Protection
    const deleteBtn = deleteModal.locator('button.btn-error');

    // Verify input exists
    const confirmInput = deleteModal.locator(`input[placeholder="Type ${botName} to confirm"]`);
    await expect(confirmInput).toBeVisible();

    // Verify button is disabled initially
    await expect(deleteBtn).toBeDisabled();

    // Type wrong name
    await confirmInput.fill('Wrong Name');
    await expect(deleteBtn).toBeDisabled();

    // Type correct name
    await confirmInput.fill(botName);
    await expect(deleteBtn).toBeEnabled();

    // Delete
    await deleteBtn.click();

    // Verify modal closes
    await expect(deleteModal).not.toBeVisible();

    // In a real scenario, we would check if the bot disappears from the list.
    // Since we mocked GET /api/config, the list won't update unless the frontend optimistically updates
    // or refetches (and we change the mock).
    // But checking the modal interaction is sufficient for this UI task.

    await assertNoErrors(errors, 'Bot deletion protection');
  });
});
