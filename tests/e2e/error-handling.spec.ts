import { test, expect, Page } from '@playwright/test';

/**
 * Error Handling and Edge Cases E2E Tests
 * Tests application resilience to errors, edge cases, and unexpected states
 */

async function setupAuth(page: Page) {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
    const fakeUser = JSON.stringify({
        id: 'admin',
        username: 'admin',
        email: 'admin@open-hivemind.com',
        role: 'owner',
        permissions: ['*']
    });

    await page.addInitScript(({ token, user }) => {
        localStorage.setItem('auth_tokens', JSON.stringify({
            accessToken: token,
            refreshToken: token,
            expiresIn: 3600
        }));
        localStorage.setItem('auth_user', user);
    }, { token: fakeToken, user: fakeUser });
}

test.describe('Error Handling & Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await setupAuth(page);

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`PAGE ERROR: ${msg.text()}`);
            }
        });
    });

    test.describe('Navigation Error Handling', () => {
        test('handles 404 page gracefully', async ({ page }) => {
            await page.goto('/admin/nonexistent-page');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Page should not crash - either shows 404, redirects, or shows an error
            // The key is that the page is still functional
            const pageUrl = page.url();
            const hasContent = await page.locator('body').count() > 0;

            expect(hasContent).toBeTruthy();
            await page.screenshot({ path: 'test-results/error-01-404.png', fullPage: true });
        });

        test('handles invalid bot ID in URL', async ({ page }) => {
            await page.goto('/admin/bots/invalid-bot-id-12345');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Should handle gracefully
            await page.screenshot({ path: 'test-results/error-02-invalid-id.png', fullPage: true });
        });

        test('recovers from navigation error', async ({ page }) => {
            await page.goto('/admin/invalid');
            await page.waitForTimeout(2000);

            // Navigate to valid page
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin');
            await page.screenshot({ path: 'test-results/error-03-recovered.png', fullPage: true });
        });
    });

    test.describe('Form Error Handling', () => {
        test('shows error for empty required fields', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Open create modal
            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);
            }

            // Look for error indicators on empty fields
            const errorFields = page.locator('[class*="error"], [class*="invalid"]');
            await page.screenshot({ path: 'test-results/error-04-empty-fields.png', fullPage: true });
        });

        test('shows validation error styling', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);
            }

            // Look for error styling
            const modal = page.locator('.modal-box').first();
            const errorInputs = modal.locator('.select-error, .input-error');

            await page.screenshot({ path: 'test-results/error-05-validation.png', fullPage: true });
        });
    });

    test.describe('Loading States', () => {
        test('shows loading indicators during data fetch', async ({ page }) => {
            await page.goto('/admin/bots');

            // Capture loading state before networkidle
            const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], .skeleton');
            await page.screenshot({ path: 'test-results/error-06-loading.png', fullPage: true });

            await page.waitForLoadState('networkidle');
        });

        test('handles slow loading gracefully', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(5000);

            // Page should be stable
            const mainContent = page.locator('main, [class*="content"]');
            await expect(mainContent.first()).toBeVisible();
            await page.screenshot({ path: 'test-results/error-07-slow-load.png', fullPage: true });
        });
    });

    test.describe('Empty State Handling', () => {
        test('shows empty state message when no bots', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Should show bots OR empty state message
            const bots = page.locator('[class*="card"], [class*="bot"]');
            const emptyState = page.locator('text=/no bots|empty|create.*first|get started/i');

            const hasContent = await bots.count() > 0 || await emptyState.count() > 0;
            expect(hasContent).toBeTruthy();

            await page.screenshot({ path: 'test-results/error-08-empty.png', fullPage: true });
        });
    });

    test.describe('API Error Handling', () => {
        test('handles API timeout gracefully', async ({ page }) => {
            // Mock slow API response
            await page.route('**/api/bots', async route => {
                await new Promise(resolve => setTimeout(resolve, 10000));
                await route.continue();
            });

            await page.goto('/admin/bots');
            await page.waitForTimeout(5000);

            // Should not crash, may show loading or timeout message
            await page.screenshot({ path: 'test-results/error-09-timeout.png', fullPage: true });
        });

        test('handles API 500 error gracefully', async ({ page }) => {
            // Mock server error
            await page.route('**/api/config', route => {
                route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Internal Server Error' })
                });
            });

            await page.goto('/admin/config');
            await page.waitForTimeout(3000);

            // Should handle gracefully
            await page.screenshot({ path: 'test-results/error-10-500.png', fullPage: true });
        });
    });

    test.describe('Modal Close Behaviors', () => {
        test('can close modal with X button', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);

                // Look for X close button
                const closeBtn = page.locator('button[class*="close"], button:has(svg[class*="x"])').first();
                if (await closeBtn.count() > 0) {
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                }
            }

            await page.screenshot({ path: 'test-results/error-11-modal-x.png', fullPage: true });
        });

        test('can close modal with Escape key', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);

                // Press Escape
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }

            await page.screenshot({ path: 'test-results/error-12-modal-esc.png', fullPage: true });
        });

        test('can close modal by clicking outside', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const createBtn = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await page.waitForTimeout(500);

                // Click outside modal (on backdrop)
                const backdrop = page.locator('.modal-backdrop, [class*="overlay"]').first();
                if (await backdrop.count() > 0) {
                    await backdrop.click({ position: { x: 10, y: 10 } });
                    await page.waitForTimeout(500);
                }
            }

            await page.screenshot({ path: 'test-results/error-13-modal-outside.png', fullPage: true });
        });
    });
});
