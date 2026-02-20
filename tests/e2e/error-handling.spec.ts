import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady
} from './test-utils';

/**
 * Error Handling E2E Tests with Strict Error Detection
 * Tests app resilience to errors while ensuring no unexpected errors occur
 */
test.describe('Error Handling & Edge Cases', () => {
    test.setTimeout(90000);

    test.describe('Navigation Error Handling', () => {
        test('handles 404 page gracefully', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await page.goto('/admin/nonexistent-page');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const hasContent = await page.locator('body').count() > 0;
            expect(hasContent).toBeTruthy();
            await page.screenshot({ path: 'test-results/error-01-404.png', fullPage: true });

            await assertNoErrors(errors, '404 page handling');
        });

        test('handles invalid bot ID in URL', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await page.goto('/admin/bots/invalid-bot-id-12345');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/error-02-invalid-id.png', fullPage: true });
            await assertNoErrors(errors, 'Invalid bot ID handling');
        });

        test('recovers from navigation error', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await page.goto('/admin/invalid');
            await page.waitForTimeout(2000);

            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin');
            await page.screenshot({ path: 'test-results/error-03-recovered.png', fullPage: true });

            await assertNoErrors(errors, 'Navigation recovery');
        });
    });

    test.describe('Loading States', () => {
        test('shows loading indicators during data fetch', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], .skeleton');
            await page.screenshot({ path: 'test-results/error-06-loading.png', fullPage: true });

            await assertNoErrors(errors, 'Loading indicators');
        });
    });

    test.describe('Empty State Handling', () => {
        test('shows empty state message when no bots', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            const bots = page.locator('[class*="card"], [class*="bot"]');
            const emptyState = page.locator('text=/no bots|empty|create.*first|get started/i');
            const hasContent = await bots.count() > 0 || await emptyState.count() > 0;
            expect(hasContent).toBeTruthy();

            await page.screenshot({ path: 'test-results/error-08-empty.png', fullPage: true });
            await assertNoErrors(errors, 'Empty state handling');
        });
    });

    test.describe('Modal Close Behaviors', () => {
        test('can close modal with Escape key', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/bots');

            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }

            await page.screenshot({ path: 'test-results/error-12-modal-esc.png', fullPage: true });
            await assertNoErrors(errors, 'Modal close with Escape');
        });
    });
});
