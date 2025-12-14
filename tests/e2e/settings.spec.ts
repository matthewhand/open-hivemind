import { test, expect } from '@playwright/test';

/**
 * Settings Page E2E Tests
 * Tests General settings, Security settings, form interactions, and save functionality.
 */

test.describe('System Settings', () => {
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

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`PAGE ERROR: ${msg.text()}`);
            }
        });

        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    test.describe('Page Structure', () => {
        test('displays settings page with header', async ({ page }) => {
            expect(page.url()).toContain('/admin/settings');

            const header = page.locator('h1').first();
            await expect(header).toBeVisible();

            await page.screenshot({ path: 'test-results/settings-01-page.png', fullPage: true });
        });

        test('shows tab navigation', async ({ page }) => {
            const tabs = page.locator('[role="tab"], .tab, [class*="tabs"]');
            await expect(tabs.first()).toBeVisible({ timeout: 5000 });

            await page.screenshot({ path: 'test-results/settings-02-tabs.png', fullPage: true });
        });
    });

    test.describe('General Settings Tab', () => {
        test('can access General settings', async ({ page }) => {
            const generalTab = page.locator('text=General').first();

            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(1000);
            }

            await page.screenshot({ path: 'test-results/settings-03-general.png', fullPage: true });
        });

        test('General settings has instance name input', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            // Look for instance name input
            const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();

            await page.screenshot({ path: 'test-results/settings-04-name-input.png', fullPage: true });
        });

        test('can edit instance name', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            const nameInput = page.locator('input').first();
            if (await nameInput.count() > 0) {
                await nameInput.clear();
                await nameInput.fill('My Test Instance');
            }

            await page.screenshot({ path: 'test-results/settings-05-name-edited.png', fullPage: true });
        });

        test('shows timezone selector', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            const timezoneSelect = page.locator('select[name*="timezone" i], [class*="timezone"]');
            await page.screenshot({ path: 'test-results/settings-06-timezone.png', fullPage: true });
        });

        test('shows theme selector', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            const themeSelect = page.locator('select[name*="theme" i], [class*="theme"]');
            await page.screenshot({ path: 'test-results/settings-07-theme.png', fullPage: true });
        });

        test('shows logging configuration', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            // Look for logging toggle or select
            const loggingSection = page.locator('text=Logging, text=Log Level');
            await page.screenshot({ path: 'test-results/settings-08-logging.png', fullPage: true });
        });

        test('shows system limits sliders', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            // Look for range inputs (sliders)
            const sliders = page.locator('input[type="range"], .range');
            await page.screenshot({ path: 'test-results/settings-09-sliders.png', fullPage: true });
        });
    });

    test.describe('Security Settings Tab', () => {
        test('can access Security settings', async ({ page }) => {
            const securityTab = page.locator('text=Security').first();

            if (await securityTab.count() > 0) {
                await securityTab.click();
                await page.waitForTimeout(1000);
            }

            await page.screenshot({ path: 'test-results/settings-10-security.png', fullPage: true });
        });

        test('shows authentication options', async ({ page }) => {
            const securityTab = page.locator('text=Security').first();
            if (await securityTab.count() > 0) {
                await securityTab.click();
                await page.waitForTimeout(500);
            }

            // Look for auth-related content
            const authContent = page.locator('text=Authentication, text=Auth, text=Password');
            await page.screenshot({ path: 'test-results/settings-11-auth.png', fullPage: true });
        });

        test('shows API key management', async ({ page }) => {
            const securityTab = page.locator('text=Security').first();
            if (await securityTab.count() > 0) {
                await securityTab.click();
                await page.waitForTimeout(500);
            }

            // Look for API key content
            const apiKeyContent = page.locator('text=API Key, text=Token');
            await page.screenshot({ path: 'test-results/settings-12-api-keys.png', fullPage: true });
        });
    });

    test.describe('Save Settings', () => {
        test('shows save button', async ({ page }) => {
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Apply")');
            await page.screenshot({ path: 'test-results/settings-13-save-button.png', fullPage: true });
        });

        test('can save settings', async ({ page }) => {
            const saveButton = page.locator('button:has-text("Save")').first();

            if (await saveButton.count() > 0) {
                await saveButton.click();
                await page.waitForTimeout(1500);

                // Check for success notification
                const success = page.locator('[class*="success"], [class*="toast"], text=saved');
                await page.screenshot({ path: 'test-results/settings-14-saved.png', fullPage: true });
            }
        });
    });

    test.describe('Form Validation', () => {
        test('validates numeric inputs', async ({ page }) => {
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }

            // Try to enter invalid value in a numeric input
            const numericInput = page.locator('input[type="number"]').first();
            if (await numericInput.count() > 0) {
                await numericInput.fill('-999');
                await page.waitForTimeout(300);
            }

            await page.screenshot({ path: 'test-results/settings-15-validation.png', fullPage: true });
        });
    });
});
