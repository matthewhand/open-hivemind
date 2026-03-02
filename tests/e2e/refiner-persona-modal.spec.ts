import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Refiner: Persona Modal AI Assist Integration', () => {
  test('verify missing AI Assist buttons on PersonaConfigModal', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Find and click the Create Persona button
    const createButton = page
        .locator(
          'button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")'
        )
        .first();
    await createButton.click();

    // Wait for the modal to appear
    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait a moment for rendering
    await page.waitForTimeout(2000);

    // Take screenshot of the "After" state showing AI buttons
    await page.screenshot({ path: 'test-results/refiner-persona-modal-after.png', fullPage: true });

    // Try to find an AI Assist Button inside the modal
    const aiButtons = modal.locator('button[aria-label^="Generate"]');

    // In before state, we only expect 1 button (Generate from Traits)
    // After our fix, we'll expect 3 (Generate Name, Generate Description, Generate from Traits)
    const count = await aiButtons.count();
    console.log(`Found ${count} AI Generate buttons in the modal.`);

    const nameAiBtn = modal.locator('button[aria-label="Generate Name"]');
    const descAiBtn = modal.locator('button[aria-label="Generate Description"]');

    await expect(nameAiBtn).toBeVisible({ timeout: 5000 });
    await expect(descAiBtn).toBeVisible({ timeout: 5000 });

    await assertNoErrors(errors, 'Refiner Persona Modal check');
  });
});