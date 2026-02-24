import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(90000);

  test('requires typing bot name to confirm deletion', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    const botId = 'bot-123';
    const botName = 'Deletion Test Bot';
    let botDeleted = false;

    // Mock API responses
    await page.route('**/api/config', async (route) => {
        if (route.request().method() === 'GET') {
            if (!botDeleted) {
                // First call returns the bot
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        bots: [{
                            id: botId,
                            name: botName,
                            provider: 'discord',
                            llmProvider: 'openai',
                            status: 'active',
                            connected: true,
                            messageCount: 0,
                            errorCount: 0
                        }]
                    })
                });
            } else {
                // Subsequent calls (after delete) return empty list
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ bots: [] })
                });
            }
        } else {
            await route.continue();
        }
    });

    // Mock other endpoints to avoid errors
    await page.route('**/api/config/global', async (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/api/personas', async (route) => route.fulfill({ status: 200, body: '[]' }));
    await page.route('**/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, body: '{"profiles":{"llm":[]}}' }));
    await page.route(`**/api/bots/${botId}/activity*`, async (route) => route.fulfill({ status: 200, body: '{"data":{"activity":[]}}' }));
    await page.route(`**/api/bots/${botId}/history*`, async (route) => route.fulfill({ status: 200, body: '{"data":{"history":[]}}' }));

    // Mock Delete API
    await page.route(`**/api/bots/${botId}`, async (route) => {
        if (route.request().method() === 'DELETE') {
            botDeleted = true;
            await route.fulfill({ status: 200, body: '{}' });
        } else {
            await route.continue();
        }
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for bot to appear
    await expect(page.locator(`text=${botName}`)).toBeVisible();

    // Open Settings
    const botCard = page.locator('.card, .border').filter({ hasText: botName }).first();
    await botCard.locator('button[title="Bot Settings"]').click();

    const settingsModal = page.locator('.modal-box').filter({ hasText: botName });
    await expect(settingsModal).toBeVisible();

    // Click Delete in Settings
    await settingsModal.locator('button:has-text("Delete Bot")').click();

    // Verify Delete Confirmation Modal
    const deleteModal = page.locator('.modal-box').filter({ hasText: 'Delete Bot' });
    await expect(deleteModal).toBeVisible();

    // Verify Delete Button Disabled
    const deleteBtn = deleteModal.locator('button.btn-error');
    await expect(deleteBtn).toBeDisabled();

    // Verify Input Field and Interaction
    const confirmInput = deleteModal.locator('input[type="text"]');
    await expect(confirmInput).toBeVisible();

    // Type Wrong Name
    await confirmInput.fill('Wrong Name');
    await expect(deleteBtn).toBeDisabled();

    // Type Correct Name
    await confirmInput.fill(botName);
    await expect(deleteBtn).toBeEnabled();

    // Click Delete
    await deleteBtn.click();

    // Verify Deletion (UI update)
    await expect(deleteModal).not.toBeVisible();
    await expect(page.locator(`text=${botName}`)).not.toBeVisible();

    // Check if delete API was called
    expect(botDeleted).toBe(true);

    // Filter out expected 401 errors that may occur during initial load
    const filteredErrors = errors.filter(e => !e.includes('401 (Unauthorized)'));
    await assertNoErrors(filteredErrors, 'Bot deletion protection');
  });
});
