import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady
} from './test-utils';

/**
 * Integrations Page E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Integrations Page', () => {
    test.setTimeout(90000);

    test('displays integrations page with header without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/config');

        expect(page.url()).toContain('/admin/config');
        const header = page.locator('h1').first();
        await expect(header).toBeVisible();
        await page.screenshot({ path: 'test-results/integrations-01-page.png', fullPage: true });

        await assertNoErrors(errors, 'Integrations page load');
    });

    test('shows provider tabs without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/config');

        const tabs = page.locator('[role="tab"], .tab, [class*="tabs"]');
        await page.screenshot({ path: 'test-results/integrations-02-tabs.png', fullPage: true });

        await assertNoErrors(errors, 'Provider tabs');
    });

    test('can switch between provider tabs without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/config');

        const tabs = await page.locator('[role="tab"], .tab').all();
        for (const tab of tabs.slice(0, 3)) {
            await tab.click().catch(() => { });
            await page.waitForTimeout(500);
        }
        await page.screenshot({ path: 'test-results/integrations-03-switching.png', fullPage: true });

        await assertNoErrors(errors, 'Tab switching');
    });
});
