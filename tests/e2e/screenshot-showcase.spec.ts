import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('UI Components Showcase Screenshots', () => {
  test('capture Showcase page screenshot', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Navigate to UI Components page
    await page.goto('/admin/showcase');

    // Wait for a key element to ensure it's loaded
    await expect(page.getByText('DaisyUI Component Reference')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/showcase-page.png', fullPage: true });
  });
});
