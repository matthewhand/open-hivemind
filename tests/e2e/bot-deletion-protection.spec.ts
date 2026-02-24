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
    await navigateAndWaitReady(page, '/admin/bots');

    // 1. Create a bot first to ensure we have something to delete
    await page.getByRole('button', { name: /create bot/i }).click();
    const createModal = page.locator('.modal-box').last();
    await expect(createModal).toBeVisible();

    await createModal.locator('input').first().fill(BOT_NAME);

    // Select Message Provider (assuming index 1 based on other tests)
    const selects = createModal.locator('select');
    if (await selects.count() >= 2) {
      await selects.nth(1).selectOption('discord'); // Using 'discord' as a safe default
    }

    // Click Create
    await createModal.locator('button', { hasText: /create bot/i }).click();
    await expect(createModal).not.toBeVisible();

    // Wait for the bot to appear in the list
    await expect(page.getByText(BOT_NAME)).toBeVisible();

    // 2. Open Settings for the bot
    // Find the row containing the bot name
    const botRow = page.locator('.card-body .bg-base-100', { hasText: BOT_NAME });

    // Click the settings button (gear icon)
    await botRow.locator('button[title="Bot Settings"]').click();

    // 3. Initiate Deletion from Settings Modal
    const settingsModal = page.locator('dialog.modal[open]');
    await expect(settingsModal).toBeVisible();
    await expect(settingsModal).toContainText(BOT_NAME);

    // Click Delete Bot button
    await settingsModal.getByRole('button', { name: /delete bot/i }).click();

    // 4. Verify Delete Confirmation Modal
    // The settings modal should close or be replaced by the confirmation modal
    // Based on code, it sets deleteModal state which opens a new modal.
    // We need to find the new modal.
    const deleteModal = page.locator('.modal-box', { hasText: 'Delete Bot' }).last();
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal).toContainText(`Are you sure you want to delete ${BOT_NAME}?`);

    // 5. Check Initial State
    const deleteConfirmButton = deleteModal.getByRole('button', { name: 'Delete', exact: true });

    // Initially, it might be enabled in current implementation, but we want to assert the *future* state
    // For now, let's just check the input existence (which will fail initially) or add the input.
    // Since we are writing the test *before* the implementation (TDD), we expect this part to fail
    // if we assert the input exists.

    // However, since I cannot easily run a failing test and continue in this environment without it aborting or causing confusion,
    // I will write the test to EXPECT the input and disabled button.

    const confirmationInput = deleteModal.locator('input[placeholder*="Type"][placeholder*="to confirm"]');

    // This assertion is expected to fail currently
    // await expect(confirmationInput).toBeVisible();

    // But since I am an agent, I will write the test assuming the feature is there.
    // I will modify the test slightly to handle the "before" state if I wanted to verify failure,
    // but the instruction is to "make 1 UI/UX improvement... use playwright to confirm working".
    // So I will write the FULL test for the COMPLETED feature.

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
    await deleteConfirmButton.click();

    // 9. Verify Deletion
    await expect(deleteModal).not.toBeVisible();
    await expect(page.getByText(BOT_NAME)).not.toBeVisible();

    await assertNoErrors(errors, 'Bot deletion protection');
  });
});
