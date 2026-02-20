import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady
} from './test-utils';

/**
 * Configuration Page E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Configuration Page', () => {
    test.setTimeout(90000);

    test('displays configuration page without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/configuration');

        expect(page.url()).toContain('/admin/configuration');
        await page.screenshot({ path: 'test-results/configuration-01-page.png', fullPage: true });

        await assertNoErrors(errors, 'Configuration page load');
    });

    test('shows configuration sections without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/configuration');

        const sections = page.locator('[class*="section"], [class*="card"], [class*="collapse"]');
        await page.screenshot({ path: 'test-results/configuration-02-sections.png', fullPage: true });

        await assertNoErrors(errors, 'Configuration sections');
    });
});
