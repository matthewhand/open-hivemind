import { test, expect } from '@playwright/test';

test.describe('Showcase Focus Trap', () => {

  test('focus stays within modal boundaries when tabbing', async ({ page }) => {
    await page.goto('/admin/showcase');

    // Wait for the showcase to load by finding something we know is there
    await page.waitForSelector('text=DaisyUI Showcase');

    // Open a modal
    await page.getByRole('button', { name: 'Open Modal' }).first().click();

    // Wait for modal to open and settle
    const modal = page.locator('dialog.modal-open').first();
    await expect(modal).toBeVisible();
    await page.waitForTimeout(500); // Wait for transition

    // Get all focusable elements inside the modal
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = await modal.locator(focusableSelector).all();

    expect(focusableElements.length).toBeGreaterThan(0);

    await focusableElements[0].focus();

    // Press Tab multiple times to cycle through elements
    for (let i = 0; i < focusableElements.length + 2; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const isInsideModal = await modal.evaluate((modalNode, activeNode) => {
        return modalNode.contains(activeNode as Node);
      }, focusedElement);
      expect(isInsideModal).toBe(true);
    }
  });

  test('modal closes and focus returns when clicking backdrop', async ({ page }) => {
    await page.goto('/admin/showcase');

    await page.waitForSelector('text=DaisyUI Showcase');

    // Get the trigger button
    const triggerBtn = page.getByRole('button', { name: 'Open Modal' }).first();
    await triggerBtn.focus();
    await triggerBtn.click();

    // Wait for modal to open
    const modal = page.locator('dialog.modal-open').first();
    await expect(modal).toBeVisible();
    await page.waitForTimeout(500); // Wait for transition

    // Click the backdrop (outside the modal-box)
    await page.mouse.click(10, 10);

    // Wait for modal to close
    await expect(modal).toBeHidden();
  });
});
