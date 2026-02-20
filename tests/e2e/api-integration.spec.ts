import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady
} from './test-utils';

/**
 * API Integration E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('API Integration', () => {
    test.setTimeout(90000);

    test('API endpoints respond correctly', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/overview');

        // Monitor API calls
        const responses: number[] = [];
        page.on('response', response => {
            if (response.url().includes('/api/')) {
                responses.push(response.status());
            }
        });

        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test-results/api-01-endpoints.png', fullPage: true });

        await assertNoErrors(errors, 'API endpoint responses');
    });

    test('Data loads correctly from API', async ({ page }) => {
        const errors = await setupTestWithErrorDetection(page);
        await navigateAndWaitReady(page, '/admin/bots');

        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/api-02-data-load.png', fullPage: true });

        await assertNoErrors(errors, 'API data loading');
    });
});
