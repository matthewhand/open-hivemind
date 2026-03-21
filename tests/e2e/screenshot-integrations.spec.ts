import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Integrations Page Screenshots', () => {
  test('Capture Integrations Page', async ({ page }) => {
    // Setup authentication and error detection
    await setupAuth(page);

    // Navigate to Integrations page
    await page.goto('/admin/integrations/llm');

    // Wait for content to load
    await expect(page.getByText('Settings').first()).toBeVisible();

    // Give it a short moment for animations
    await page.waitForTimeout(500);

    // Capture screenshot
    await page.screenshot({ path: 'docs/screenshots/integrations-llm.png', fullPage: true });
  });
});
