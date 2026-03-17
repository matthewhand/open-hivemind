import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('API Rate Limiting UI', async ({ page }) => {
  await setupAuth(page);

  await page.goto('/admin/guards');

  // Wait a bit just in case
  await page.waitForTimeout(2000);

  // Click edit to open modal
  const editButton = page.locator('.card', { hasText: 'Strict Protection' }).locator('.btn-ghost').nth(1);
  await editButton.click();

  // Wait for modal
  const editModal = page.locator('.modal-box').filter({ hasText: 'Edit Guard Profile' });
  await expect(editModal).toBeVisible();

  // Find the Rate Limiter section and open it
  const rateLimiterTitle = editModal.locator('.collapse-title', { hasText: 'Rate Limiter' });
  await expect(rateLimiterTitle).toBeVisible();

  // Click on the title to expand
  await rateLimiterTitle.click({ force: true });
  await page.waitForTimeout(500); // wait for animation

  // Scroll modal content to bottom
  await page.evaluate(() => {
    const modal = document.querySelector('.modal-box');
    if (modal) modal.scrollTop = modal.scrollHeight;
  });

  await page.waitForTimeout(500); // Wait for scroll to settle
  await editModal.screenshot({ path: 'after-fix.png' });
});
