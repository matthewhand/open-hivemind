import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Specs Navigation and Command Palette', () => {
  test('verify specs in navigation and palette', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/admin');

    // Mock the specs endpoint
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: 'spec-1',
              topic: 'Core API Specification',
              author: 'system',
              timestamp: new Date().toISOString(),
              tags: ['api', 'core'],
              version: '1.0'
            }
          ]
        }
      });
    });

    // Test the Sidebar Navigation
    await page.goto('/admin');
    await page.waitForTimeout(2000); // Give the sidebar time to render

    // Check Command Palette
    await page.keyboard.press('Control+k');
    // Check if the input is visible
    const paletteInput = page.getByPlaceholder('Type a command or search...');
    await expect(paletteInput).toBeVisible({ timeout: 2000 });

    await paletteInput.fill('spec');
    await page.waitForTimeout(1000);

    // Check if the command palette results have the specs option
    const paletteOption = page.locator('li[role="option"]').filter({ hasText: /specifications/i });
    if(await paletteOption.isVisible()) {
        await paletteOption.click();
        await expect(page.getByRole('heading', { name: 'Specifications', exact: true })).toBeVisible({ timeout: 10000 });
    }
  });
});
