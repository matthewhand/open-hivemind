import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Static Pages Screenshots', () => {
  test('Capture Gallery and Preview', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Static Pages
    await navigateAndWaitReady(page, '/admin/static');

    // Wait for content to load properly
    await expect(page.locator('h1:has-text("Static Pages")')).toBeVisible();
    await expect(page.getByText('Enhanced Homepage')).toBeVisible();

    // Screenshot Gallery
    await page.screenshot({ path: 'docs/images/static-pages-gallery.png', fullPage: true });

    // Open Preview for Enhanced Homepage
    const previewButton = page.locator('button:has-text("Preview")').first();
    await previewButton.click();

    // Wait for modal and iframe
    const modal = page.locator('.modal-box, [role="dialog"]').first();
    await expect(modal).toBeVisible();
    await expect(modal.locator('iframe')).toBeVisible();

    // Wait a bit for iframe to "load" (even if just starting)
    await page.waitForTimeout(1000);

    // Screenshot Preview Modal
    await page.screenshot({ path: 'docs/images/static-pages-preview.png' });
  });
});
