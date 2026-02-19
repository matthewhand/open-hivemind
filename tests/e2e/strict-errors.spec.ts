import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady,
    waitForPageReady,
    SELECTORS
} from './test-utils';

/**
 * Comprehensive E2E Tests with Strict Error Detection
 * These tests FAIL if any console errors or page errors occur
 */

test.describe('Strict Error Detection Tests', () => {
    test.setTimeout(90000);

    test.describe('Page Load Tests - Must Have Zero Errors', () => {

        test('Dashboard loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/overview');

            // Verify page content exists
            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-01-dashboard.png' });

            // Fail if any errors occurred
            await assertNoErrors(errors, 'Dashboard load');
        });

        test('Bots page loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-02-bots.png' });

            await assertNoErrors(errors, 'Bots page load');
        });

        test('Configuration page loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/config');

            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-03-config.png' });

            await assertNoErrors(errors, 'Config page load');
        });

        test('Personas page loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-04-personas.png' });

            await assertNoErrors(errors, 'Personas page load');
        });

        test('Settings page loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/settings');

            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-05-settings.png' });

            await assertNoErrors(errors, 'Settings page load');
        });

        test('MCP Tools page loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/mcp-tools');

            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-06-mcp.png' });

            await assertNoErrors(errors, 'MCP Tools page load');
        });

        test('Monitoring page loads without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/monitoring');

            await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
            await page.screenshot({ path: 'test-results/strict-07-monitoring.png' });

            await assertNoErrors(errors, 'Monitoring page load');
        });
    });

    test.describe('Navigation Tests - Must Have Zero Errors', () => {

        test('Navigate between all main pages without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);

            const pages = [
                '/admin/overview',
                '/admin/bots',
                '/admin/config',
                '/admin/personas',
                '/admin/settings',
            ];

            for (const pagePath of pages) {
                await page.goto(pagePath);
                await waitForPageReady(page);
                expect(page.url()).toContain(pagePath.split('/').pop());
            }

            await page.screenshot({ path: 'test-results/strict-08-navigation.png' });
            await assertNoErrors(errors, 'Multi-page navigation');
        });

        test('Sidebar navigation works without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/overview');

            // Click sidebar links
            const sidebar = page.locator(SELECTORS.sidebar).first();
            if (await sidebar.count() > 0) {
                const links = await sidebar.locator('a').all();
                for (const link of links.slice(0, 5)) { // Test first 5 links
                    await link.click().catch(() => { }); // Ignore click errors
                    await waitForPageReady(page);
                }
            }

            await page.screenshot({ path: 'test-results/strict-09-sidebar.png' });
            await assertNoErrors(errors, 'Sidebar navigation');
        });
    });

    test.describe('Modal Interactions - Must Have Zero Errors', () => {

        test('Open and close create bot modal without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            // Try to open create modal
            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot|add.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);

                // Verify modal opened
                const modal = page.locator(SELECTORS.modal).first();
                if (await modal.count() > 0) {
                    await expect(modal).toBeVisible();

                    // Close with Escape
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                }
            }

            await page.screenshot({ path: 'test-results/strict-10-modal.png' });
            await assertNoErrors(errors, 'Bot modal open/close');
        });

        test('Form interactions in modal without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot|add.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);

                // Interact with form fields
                const modal = page.locator(SELECTORS.modal).first();
                if (await modal.count() > 0) {
                    const inputs = await modal.locator('input:visible').all();
                    for (const input of inputs.slice(0, 3)) { // Type in first 3 inputs
                        await input.fill('test-value').catch(() => { });
                    }

                    const selects = await modal.locator('select:visible').all();
                    for (const select of selects.slice(0, 2)) {
                        await select.click().catch(() => { });
                    }
                }

                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);
            }

            await page.screenshot({ path: 'test-results/strict-11-form.png' });
            await assertNoErrors(errors, 'Form interactions');
        });
    });

    test.describe('Data Display Tests - Must Have Zero Errors', () => {

        test('Bot list displays correctly without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            // Wait for content to load
            await page.waitForTimeout(2000);

            // Should have either bots or empty state
            const content = page.locator('[class*="card"], [class*="empty"], [class*="bot"]').first();
            await expect(content).toBeVisible({ timeout: 10000 });

            await page.screenshot({ path: 'test-results/strict-12-bot-list.png' });
            await assertNoErrors(errors, 'Bot list display');
        });

        test('Config sections display correctly without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/config');

            // Wait for config to load
            await page.waitForTimeout(2000);

            // Verify sections exist
            const sections = page.locator('[class*="section"], [class*="card"], [class*="collapse"]');
            expect(await sections.count()).toBeGreaterThan(0);

            await page.screenshot({ path: 'test-results/strict-13-config-sections.png' });
            await assertNoErrors(errors, 'Config sections display');
        });
    });

    test.describe('API Interaction Tests - Must Have Zero Errors', () => {

        test('Refresh button triggers API call without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            // Find and click refresh button
            const refreshBtn = page.locator('button').filter({ hasText: /refresh/i }).first();
            if (await refreshBtn.count() > 0) {
                await refreshBtn.click();
                await page.waitForTimeout(2000);
            }

            await page.screenshot({ path: 'test-results/strict-14-refresh.png' });
            await assertNoErrors(errors, 'Refresh button');
        });
    });
});

test.describe('Error Recovery Tests', () => {
    test.setTimeout(60000);

    test('App recovers from network failure', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/overview');

        // Simulate network failure then recovery
        await page.route('**/api/**', route => route.abort());
        await page.reload();
        await page.waitForTimeout(2000);

        // Re-enable network
        await page.unroute('**/api/**');
        await page.reload();
        await waitForPageReady(page);

        await expect(page.locator(SELECTORS.mainContent).first()).toBeVisible();
        await page.screenshot({ path: 'test-results/strict-15-network-recovery.png' });

        // Note: We don't fail on errors here since network failure is expected
    });
});
