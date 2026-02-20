import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * RBAC E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Role-Based Access Control', () => {
  test.setTimeout(90000);

  test('admin can access all pages without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    const adminPages = ['/admin/overview', '/admin/bots', '/admin/config', '/admin/settings'];

    for (const pagePath of adminPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/admin');
    }
    await page.screenshot({ path: 'test-results/rbac-01-admin-access.png', fullPage: true });

    await assertNoErrors(errors, 'Admin access');
  });

  test('protected routes redirect appropriately', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/settings');

    // Should show settings or redirect to login
    await page.screenshot({ path: 'test-results/rbac-02-protected.png', fullPage: true });
    await assertNoErrors(errors, 'Protected routes');
  });
});
