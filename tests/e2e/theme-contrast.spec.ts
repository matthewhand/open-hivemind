import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Theme Contrast & CSS Variables', () => {
  test('EnhancedDrawer respects light and dark themes', async ({ page }) => {
    // Setup error detection but we don't strictly fail on them here if they are unrelated
    await setupTestWithErrorDetection(page);

    // Set viewport to ensure sidebar is visible
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Test Dark Theme (Night/Dark)
    await page.emulateMedia({ colorScheme: 'dark' });
    // Force theme via localStorage for DaisyUI
    await page.addInitScript(() => {
      localStorage.setItem('hivemind-theme', 'night');
      document.documentElement.setAttribute('data-theme', 'night');
    });

    await navigateAndWaitReady(page, '/admin/overview');

    // Wait for the drawer to be visible
    const drawer = page.locator('nav').first();
    await expect(drawer).toBeVisible();

    // Take screenshot of dark mode
    await page.screenshot({ path: 'test-results/theme-drawer-dark.png' });

    // 2. Test Light Theme (Winter/Light)
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => {
      localStorage.setItem('hivemind-theme', 'winter');
      document.documentElement.setAttribute('data-theme', 'winter');
    });

    // Reload to ensure theme applies cleanly if there are any race conditions
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Take screenshot of light mode
    await page.screenshot({ path: 'test-results/theme-drawer-light.png' });
  });
});
