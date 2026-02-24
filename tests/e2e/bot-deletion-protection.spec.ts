import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
} from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(90000);

  const BOT_NAME = 'Deletion Protection Test Bot';
  const BOT_ID = 'test-bot-id';

  test('Requires typing bot name to confirm deletion', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock API responses

    // Catch-all for other API requests
    await page.route('**/api/**', async (route) => {
        // const url = route.request().url();
        // console.log(`Fallback mock for: ${url}`);
        await route.fulfill({ status: 200, body: '{}', contentType: 'application/json' });
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              id: BOT_ID,
              name: BOT_NAME,
              provider: 'discord',
              llmProvider: 'openai',
              status: 'active',
              connected: true,
              messageCount: 0,
              errorCount: 0,
            },
          ],
        }),
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profiles: { llm: [] } }) });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [] }) });
    });

    // Mock activity and history to prevent 404s/errors
    await page.route(`**/api/bots/${BOT_ID}/activity?limit=20`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { activity: [] } }) });
    });

    await page.route(`**/api/bots/${BOT_ID}/history?limit=20`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { history: [] } }) });
    });

    // Mock DELETE request
    let deleteRequested = false;
    await page.route(`**/api/bots/${BOT_ID}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      } else {
        await route.continue();
      }
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for the bot to appear in the list (from mock)
    await expect(page.getByText(BOT_NAME)).toBeVisible();

    // 2. Open Settings for the bot
    // Find the row containing the bot name
    const botRow = page.locator('.bg-base-100', { hasText: BOT_NAME }).first();

    // Click the settings button (gear icon)
    await botRow.locator('button[title="Bot Settings"]').click();

    // 3. Initiate Deletion from Settings Modal
    // BotSettingsModal uses className="modal modal-open", NOT <dialog open>
    const settingsModal = page.locator('.modal.modal-open');
    await expect(settingsModal).toBeVisible();
    await expect(settingsModal).toContainText(BOT_NAME);

    // Click Delete Bot button
    await settingsModal.getByRole('button', { name: /delete bot/i }).click();

    // 4. Verify Delete Confirmation Modal
    // The settings modal should close or be replaced by the confirmation modal
    // Delete Confirmation Modal uses Shared Modal which uses <dialog open> (via showModal())
    // We need to find the new modal.
    const deleteModal = page.locator('dialog[open]', { hasText: 'Delete Bot' }).last();
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal).toContainText(`Are you sure you want to delete ${BOT_NAME}?`);

    // 5. Check Initial State
    const deleteConfirmButton = deleteModal.getByRole('button', { name: 'Delete', exact: true });
    // Input placeholder is just the bot name
    const confirmationInput = deleteModal.getByPlaceholder(BOT_NAME);

    // Check for input field
    await expect(confirmationInput).toBeVisible();

    // Check delete button is disabled initially
    await expect(deleteConfirmButton).toBeDisabled();

    // 6. Test Incorrect Input
    await confirmationInput.fill('Wrong Name');
    await expect(deleteConfirmButton).toBeDisabled();

    // 7. Test Correct Input
    await confirmationInput.fill(BOT_NAME);
    await expect(deleteConfirmButton).toBeEnabled();

    // 8. Perform Deletion
    const deleteRequestPromise = page.waitForRequest(request =>
      request.url().includes(`/api/bots/${BOT_ID}`) && request.method() === 'DELETE'
    );
    await deleteConfirmButton.click();
    await deleteRequestPromise;

    // 9. Verify Deletion Request was made
    // The previous await deleteRequestPromise ensures the request was sent.

    // 10. Verify Modal Closes
    await expect(deleteModal).not.toBeVisible();

    await assertNoErrors(errors, 'Bot deletion protection');
  });
});
