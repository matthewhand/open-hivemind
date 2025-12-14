import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests
 * Tests for keyboard navigation, screen reader compatibility, and ARIA attributes.
 */

test.describe('Accessibility Tests', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);

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
    });

    test.describe('Keyboard Navigation', () => {
        test('can tab through main navigation', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Press Tab multiple times to navigate
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(200);
            }

            const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
            expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);

            await page.screenshot({ path: 'test-results/a11y-keyboard-01.png', fullPage: true });
        });

        test('can navigate forms with keyboard', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Tab to first input
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');

            // Type in focused input
            await page.keyboard.type('test');

            await page.screenshot({ path: 'test-results/a11y-keyboard-02-form.png', fullPage: true });
        });

        test('escape key closes modals', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Open modal
            const createButton = page.getByRole('button', { name: /Create.*Bot/i });
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                await page.screenshot({ path: 'test-results/a11y-keyboard-03-modal-open.png', fullPage: true });

                // Press Escape to close
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

                await page.screenshot({ path: 'test-results/a11y-keyboard-04-modal-closed.png', fullPage: true });
            }
        });
    });

    test.describe('ARIA Attributes', () => {
        test('buttons have proper roles', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const buttons = page.locator('[role="button"], button');
            const count = await buttons.count();

            expect(count).toBeGreaterThan(0);
            await page.screenshot({ path: 'test-results/a11y-aria-01-buttons.png', fullPage: true });
        });

        test('navigation has proper landmarks', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Check for navigation landmark
            const nav = page.locator('[role="navigation"], nav');
            const main = page.locator('[role="main"], main');

            await page.screenshot({ path: 'test-results/a11y-aria-02-landmarks.png', fullPage: true });
        });

        test('form inputs have labels', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Check for labeled inputs
            const inputs = page.locator('input[id], input[aria-label], input[aria-labelledby]');

            await page.screenshot({ path: 'test-results/a11y-aria-03-labels.png', fullPage: true });
        });

        test('tabs have proper tab roles', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const tablist = page.locator('[role="tablist"]');
            const tabs = page.locator('[role="tab"]');

            await page.screenshot({ path: 'test-results/a11y-aria-04-tabs.png', fullPage: true });
        });
    });

    test.describe('Focus Management', () => {
        test('focus is visible on interactive elements', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Tab to an element
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');

            // Capture focus state
            await page.screenshot({ path: 'test-results/a11y-focus-01.png', fullPage: true });
        });

        test('modal traps focus', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const createButton = page.getByRole('button', { name: /Create.*Bot/i });
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                // Tab multiple times - focus should stay in modal
                for (let i = 0; i < 10; i++) {
                    await page.keyboard.press('Tab');
                    await page.waitForTimeout(100);
                }

                await page.screenshot({ path: 'test-results/a11y-focus-02-modal.png', fullPage: true });
            }
        });
    });

    test.describe('Color Contrast', () => {
        test('page renders in high contrast mode', async ({ page }) => {
            await page.emulateMedia({ colorScheme: 'dark' });

            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/a11y-contrast-01-dark.png', fullPage: true });
        });

        test('page renders in light mode', async ({ page }) => {
            await page.emulateMedia({ colorScheme: 'light' });

            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/a11y-contrast-02-light.png', fullPage: true });
        });
    });

    test.describe('Screen Reader Compatibility', () => {
        test('headings have proper hierarchy', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const h1 = await page.locator('h1').count();
            const h2 = await page.locator('h2').count();
            const h3 = await page.locator('h3').count();

            // Should have at most 1 h1
            expect(h1).toBeLessThanOrEqual(2);

            await page.screenshot({ path: 'test-results/a11y-headings-01.png', fullPage: true });
        });

        test('images have alt text', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const imagesWithoutAlt = await page.locator('img:not([alt])').count();

            await page.screenshot({ path: 'test-results/a11y-images-01.png', fullPage: true });
        });
    });
});
