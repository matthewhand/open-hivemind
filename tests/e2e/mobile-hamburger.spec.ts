import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Mobile Viewport & Touch Targets Baseline', () => {
  test('Capture Mobile Header Navigation', async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header.fixed.top-0');
    await expect(header).toBeVisible();

    await page.screenshot({ path: 'test-results/mobile-viewport-baseline-after.png' });
  });
});
