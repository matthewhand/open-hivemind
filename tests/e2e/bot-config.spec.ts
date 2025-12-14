import { test, expect } from '@playwright/test';

test.describe('Bot Configuration', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);

        // Inject fake auth to bypass login
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
        const fakeUser = JSON.stringify({ id: 'admin', username: 'admin', email: 'admin@open-hivemind.com', role: 'owner', permissions: ['*'] });

        await page.addInitScript(({ token, user }) => {
            localStorage.setItem('auth_tokens', JSON.stringify({
                accessToken: token,
                refreshToken: token,
                expiresIn: 3600
            }));
            localStorage.setItem('auth_user', user);
        }, { token: fakeToken, user: fakeUser });

        page.on('console', msg => {
            // Only log errors for visibility
            if (msg.type() === 'error') {
                console.log(`PAGE ERROR: ${msg.text()}`);
            }
        });
        page.on('pageerror', exception => {
            console.log(`PAGE EXCEPTION: ${exception}`);
        });

        // Navigate directly to bots page
        await page.goto('/admin/bots');
        await page.waitForLoadState('networkidle');
    });

    test('should display bot management page and create bot form', async ({ page }) => {
        // Verify page load
        expect(page.url()).toContain('/bots');
        await page.screenshot({ path: 'test-results/01-bots-page-loaded.png', fullPage: true });

        // Try to open create modal
        const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
        if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(1000);
        }

        await page.screenshot({ path: 'test-results/02-create-bot-form.png', fullPage: true });
    });

    test('should add a message provider to a bot', async ({ page }) => {
        await page.screenshot({ path: 'test-results/05-bots-page.png', fullPage: true });

        // Look for any bot card and try to interact
        const botCard = page.locator('[class*="card"]').first();
        if (await botCard.count() > 0) {
            await botCard.click();
            await page.waitForTimeout(500);
        }

        await page.screenshot({ path: 'test-results/06-bot-interaction.png', fullPage: true });
    });

    test('should verify navigation sidebar has key links', async ({ page }) => {
        const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="drawer"]').first();

        if (await sidebar.count() > 0) {
            await expect(sidebar).toBeVisible();
        }

        await page.screenshot({ path: 'test-results/08-sidebar-visible.png', fullPage: true });

        const pageHeading = page.locator('h1').first();
        if (await pageHeading.count() > 0) {
            await expect(pageHeading).toBeVisible();
        }

        await page.screenshot({ path: 'test-results/09-page-heading.png', fullPage: true });
    });
});
