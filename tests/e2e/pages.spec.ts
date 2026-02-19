import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady,
    waitForPageReady
} from './test-utils';

/**
 * Comprehensive Page Rendering Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Page Rendering - All Admin Pages', () => {
    test.setTimeout(90000);

    test.describe('Overview Page', () => {
        test('renders overview page without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/overview');

            expect(page.url()).toContain('/admin/overview');
            const main = page.locator('main').first();
            if (await main.count() > 0) {
                await expect(main).toBeVisible();
            }
            await page.screenshot({ path: 'test-results/pages-overview.png', fullPage: true });

            await assertNoErrors(errors, 'Overview page');
        });
    });

    test.describe('Bots Page', () => {
        test('renders bots page without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            expect(page.url()).toContain('/admin/bots');
            await page.screenshot({ path: 'test-results/pages-bots.png', fullPage: true });

            await assertNoErrors(errors, 'Bots page');
        });
    });

    test.describe('Personas Page', () => {
        test('renders personas page without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            expect(page.url()).toContain('/admin/personas');
            await page.screenshot({ path: 'test-results/pages-personas.png', fullPage: true });

            await assertNoErrors(errors, 'Personas page');
        });
    });

    test.describe('Navigation', () => {
        test('can navigate between pages without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);

            const pages = ['/admin/overview', '/admin/bots', '/admin/personas', '/admin/config', '/admin/settings'];
            for (const pagePath of pages) {
                await page.goto(pagePath);
                await waitForPageReady(page);
            }
            await page.screenshot({ path: 'test-results/pages-navigation-check.png', fullPage: true });

            await assertNoErrors(errors, 'Multi-page navigation');
        });
    });

    test.describe('Responsive Design', () => {
        test('pages render on mobile viewport without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await page.setViewportSize({ width: 375, height: 667 });
            await navigateAndWaitReady(page, '/admin/bots');

            await page.screenshot({ path: 'test-results/pages-mobile-bots.png', fullPage: true });
            await assertNoErrors(errors, 'Mobile viewport');
        });

        test('pages render on tablet viewport without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await page.setViewportSize({ width: 768, height: 1024 });
            await navigateAndWaitReady(page, '/admin/bots');

            await page.screenshot({ path: 'test-results/pages-tablet-bots.png', fullPage: true });
            await assertNoErrors(errors, 'Tablet viewport');
        });
    });
});
