import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

const SCREENSHOT_PATH = 'docs/screenshots/showcase-page.png';

test.describe('UI Components Showcase Screenshots', () => {
  /**
   * Navigates to the UI Components Showcase page and captures a full-page screenshot
   * for documentation purposes. Ensures that the DaisyUI Component Reference is visible
   * before taking the screenshot.
   */
  test('capture Showcase page screenshot', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Navigate to UI Components page
    await page.goto('/admin/showcase');

    // Wait for a key element to ensure it's loaded
    await expect(page.getByText('DaisyUI Component Reference')).toBeVisible();

    // Take screenshot
    try {
      await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    } catch (error) {
      console.error(`Failed to capture screenshot at ${SCREENSHOT_PATH}:`, error);
      throw error;
    }
  });
});
