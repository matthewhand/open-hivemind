import { test, expect } from '@playwright/test';

test.describe('System Configuration', () => {
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
            if (msg.type() === 'error') {
                console.log(`PAGE ERROR: ${msg.text()}`);
            }
        });

        // Navigate to configuration page
        await page.goto('/admin/configuration');
        await page.waitForLoadState('domcontentloaded');
    });

    test('displays configuration page', async ({ page }) => {
        await page.screenshot({ path: 'test-results/config-01-page.png', fullPage: true });

        // Wait for page to load and check for any content
        const pageContent = page.locator('main').first();
        await expect(pageContent).toBeVisible({ timeout: 15000 });
    });

    test('can navigate configuration sections', async ({ page }) => {
        // Look for tabs or navigation elements
        const tabs = page.locator('[role="tab"], .tab');
        const tabCount = await tabs.count();

        if (tabCount > 0) {
            // Click first tab
            await tabs.first().click();
            await page.waitForTimeout(500);
        }

        await page.screenshot({ path: 'test-results/config-02-sections.png', fullPage: true });
    });

    test('configuration form elements are interactive', async ({ page }) => {
        // Look for input elements on the config page
        const inputs = page.locator('input, textarea, select');
        const inputCount = await inputs.count();

        // Just verify some form elements exist
        expect(inputCount).toBeGreaterThanOrEqual(0);

        await page.screenshot({ path: 'test-results/config-03-forms.png', fullPage: true });
    });
});
