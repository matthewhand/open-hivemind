import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady
} from './test-utils';

/**
 * Bot Config E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Bot Configuration', () => {
    test.setTimeout(90000);

    test('displays bot config page without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/bots');

        expect(page.url()).toContain('/admin/bots');
        await page.screenshot({ path: 'test-results/bot-config-01-page.png', fullPage: true });

        await assertNoErrors(errors, 'Bot config page load');
    });

    test('can view bot details without errors', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/bots');

        const cards = page.locator('[class*="card"]');
        if (await cards.count() > 0) {
            await cards.first().click();
            await page.waitForTimeout(500);
        }
        await page.screenshot({ path: 'test-results/bot-config-02-details.png', fullPage: true });

        await assertNoErrors(errors, 'Bot details view');
    });
});
