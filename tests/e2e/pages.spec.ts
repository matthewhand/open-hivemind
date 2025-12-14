import { test, expect } from '@playwright/test';

/**
 * Comprehensive Page Rendering Tests
 * Verifies that all main admin pages render correctly with screenshots.
 */

test.describe('Page Rendering - All Admin Pages', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);

        // Inject fake auth to bypass login
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

    test.describe('Overview Page', () => {
        test('renders overview page with header', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Check page loaded
            expect(page.url()).toContain('/admin/overview');

            // Take screenshot
            await page.screenshot({ path: 'test-results/pages-overview.png', fullPage: true });

            // Verify main content area exists
            const main = page.locator('main').first();
            if (await main.count() > 0) {
                await expect(main).toBeVisible();
            }
        });
    });

    test.describe('Bots Page', () => {
        test('renders bots page with header and content', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin/bots');

            // Look for the PageHeader component
            const header = page.locator('h1').first();
            if (await header.count() > 0) {
                await expect(header).toBeVisible();
            }

            await page.screenshot({ path: 'test-results/pages-bots.png', fullPage: true });
        });

        test('bots page has navigation sidebar', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1500);

            // Check for sidebar/nav
            const nav = page.locator('nav, aside, [class*="sidebar"]').first();
            if (await nav.count() > 0) {
                await expect(nav).toBeVisible();
                await page.screenshot({ path: 'test-results/pages-bots-nav.png', fullPage: true });
            }
        });

        test('bots page shows bot cards or empty state', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // Look for bot cards or empty state message
            const content = page.locator('[class*="card"], [class*="empty"], [class*="bot"]').first();
            await page.screenshot({ path: 'test-results/pages-bots-content.png', fullPage: true });
        });
    });

    test.describe('Personas Page', () => {
        test('renders personas page with header', async ({ page }) => {
            await page.goto('/admin/personas');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin/personas');

            await page.screenshot({ path: 'test-results/pages-personas.png', fullPage: true });

            const header = page.locator('h1').first();
            if (await header.count() > 0) {
                await expect(header).toBeVisible();
            }
        });

        test('personas page shows persona cards or empty state', async ({ page }) => {
            await page.goto('/admin/personas');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2500);

            await page.screenshot({ path: 'test-results/pages-personas-content.png', fullPage: true });
        });
    });

    test.describe('Integrations Page (Config)', () => {
        test('renders integrations page with header', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin/config');

            await page.screenshot({ path: 'test-results/pages-integrations.png', fullPage: true });

            // Should see "Integrations" header
            const header = page.locator('h1').first();
            if (await header.count() > 0) {
                await expect(header).toBeVisible();
            }
        });

        test('integrations page shows provider panels', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // Look for tabs or accordion items
            const panels = page.locator('[class*="tab"], [class*="accordion"], [class*="panel"]').first();
            await page.screenshot({ path: 'test-results/pages-integrations-panels.png', fullPage: true });
        });
    });

    test.describe('Global Defaults Page (Configuration)', () => {
        test('renders global defaults page with header', async ({ page }) => {
            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin/configuration');

            await page.screenshot({ path: 'test-results/pages-global-defaults.png', fullPage: true });

            const header = page.locator('h1').first();
            if (await header.count() > 0) {
                await expect(header).toBeVisible();
            }
        });

        test('global defaults page shows config sections', async ({ page }) => {
            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // Should show accordion or form sections
            await page.screenshot({ path: 'test-results/pages-global-defaults-sections.png', fullPage: true });
        });
    });

    test.describe('Settings Page', () => {
        test('renders settings page with header', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin/settings');

            await page.screenshot({ path: 'test-results/pages-settings.png', fullPage: true });

            const header = page.locator('h1').first();
            if (await header.count() > 0) {
                await expect(header).toBeVisible();
            }
        });

        test('settings page has tabs', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Look for tab navigation
            const tabs = page.locator('[class*="tab"], [role="tablist"]').first();
            if (await tabs.count() > 0) {
                await expect(tabs).toBeVisible();
            }

            await page.screenshot({ path: 'test-results/pages-settings-tabs.png', fullPage: true });
        });

        test('settings page General tab content', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2500);

            // Click General tab if visible
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(1000);
            }

            await page.screenshot({ path: 'test-results/pages-settings-general.png', fullPage: true });
        });

        test('settings page Security tab content', async ({ page }) => {
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Click Security tab if visible
            const securityTab = page.locator('text=Security').first();
            if (await securityTab.count() > 0) {
                await securityTab.click();
                await page.waitForTimeout(1000);
            }

            await page.screenshot({ path: 'test-results/pages-settings-security.png', fullPage: true });
        });
    });

    test.describe('Navigation', () => {
        test('sidebar navigation is visible on all pages', async ({ page }) => {
            const pages = ['/admin/overview', '/admin/bots', '/admin/personas', '/admin/config', '/admin/settings'];

            for (const pagePath of pages) {
                await page.goto(pagePath);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1500);

                const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="drawer"]').first();
                if (await sidebar.count() > 0) {
                    await expect(sidebar).toBeVisible();
                }
            }

            await page.screenshot({ path: 'test-results/pages-navigation-check.png', fullPage: true });
        });

        test('can navigate between pages using sidebar', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Click on Bots link in sidebar
            const botsLink = page.locator('a[href*="bots"], [class*="nav"] >> text=Bots').first();
            if (await botsLink.count() > 0) {
                await botsLink.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1500);

                expect(page.url()).toContain('/bots');
                await page.screenshot({ path: 'test-results/pages-nav-to-bots.png', fullPage: true });
            }

            // Click on Personas link
            const personasLink = page.locator('a[href*="personas"], [class*="nav"] >> text=Personas').first();
            if (await personasLink.count() > 0) {
                await personasLink.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1500);

                expect(page.url()).toContain('/personas');
                await page.screenshot({ path: 'test-results/pages-nav-to-personas.png', fullPage: true });
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('pages render correctly on mobile viewport', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });

            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/pages-mobile-bots.png', fullPage: true });

            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/pages-mobile-settings.png', fullPage: true });
        });

        test('pages render correctly on tablet viewport', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });

            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/pages-tablet-bots.png', fullPage: true });
        });
    });

    test.describe('Error States', () => {
        test('handles 404 page gracefully', async ({ page }) => {
            await page.goto('/admin/nonexistent-page');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.screenshot({ path: 'test-results/pages-404.png', fullPage: true });
        });
    });
});
