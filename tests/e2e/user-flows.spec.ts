import { test, expect } from '@playwright/test';

/**
 * User Flow E2E Tests
 * Tests complete user journeys that span multiple pages and features.
 */

test.describe('Complete User Flows', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);

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
    });

    test.describe('Bot Creation with Persona Assignment', () => {
        test('create bot and assign persona flow', async ({ page }) => {
            // Step 1: Go to Bots page
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-bot-persona-01-bots.png', fullPage: true });

            // Step 2: Create a new bot
            const createButton = page.getByRole('button', { name: /Create.*Bot/i });
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                const modal = page.locator('.modal-box').first();

                // Fill bot name
                const nameInput = modal.locator('input').first();
                if (await nameInput.count() > 0) {
                    await nameInput.fill('Flow Test Bot ' + Date.now());
                }

                // Fill all required fields - selects in order: persona, message provider, LLM provider
                const selects = modal.locator('select');
                const selectCount = await selects.count();

                // Select message provider (index 1)
                if (selectCount >= 2) {
                    await selects.nth(1).selectOption('discord');
                }
                // Select LLM provider (index 2)
                if (selectCount >= 3) {
                    await selects.nth(2).selectOption('openai');
                }

                await page.screenshot({ path: 'test-results/flow-bot-persona-02-form.png', fullPage: true });

                // Submit - button should now be enabled
                const submitButton = modal.locator('button').filter({ hasText: /create bot/i });
                if (await submitButton.count() > 0 && await submitButton.isEnabled()) {
                    await submitButton.click();
                    await page.waitForTimeout(2000);
                }

                await page.screenshot({ path: 'test-results/flow-bot-persona-03-created.png', fullPage: true });
            }
        });
    });

    test.describe('Full Configuration Flow', () => {
        test('configure integrations then settings flow', async ({ page }) => {
            // Step 1: Configure Integrations
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-config-01-integrations.png', fullPage: true });

            // Step 2: Navigate to Settings
            await page.goto('/admin/settings');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-config-02-settings.png', fullPage: true });

            // Step 3: Configure General settings
            const generalTab = page.locator('text=General').first();
            if (await generalTab.count() > 0) {
                await generalTab.click();
                await page.waitForTimeout(500);
            }
            await page.screenshot({ path: 'test-results/flow-config-03-general.png', fullPage: true });

            // Step 4: Navigate to Global Defaults
            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-config-04-global.png', fullPage: true });
        });
    });

    test.describe('Sidebar Navigation Flow', () => {
        test('navigate through all main pages via sidebar', async ({ page }) => {
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const pages = [
                { name: 'Bots', url: '/bots' },
                { name: 'Personas', url: '/personas' },
                { name: 'Integrations', url: '/config' },
                { name: 'Settings', url: '/settings' }
            ];

            for (const p of pages) {
                // Try to click on sidebar link
                const sidebarLink = page.locator(`a[href*="${p.url}"], button:has-text("${p.name}"), nav >> text=${p.name}`).first();

                if (await sidebarLink.count() > 0) {
                    await sidebarLink.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(1500);

                    expect(page.url()).toContain(p.url);
                    await page.screenshot({ path: `test-results/flow-nav-${p.name.toLowerCase()}.png`, fullPage: true });
                }
            }
        });
    });

    test.describe('Dashboard to Bot Detail Flow', () => {
        test('navigate from overview to bot details', async ({ page }) => {
            // Step 1: Start at overview
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-overview-01.png', fullPage: true });

            // Step 2: Go to bots
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-overview-02-bots.png', fullPage: true });

            // Step 3: Click on a bot card for details (if exists)
            const botCard = page.locator('[class*="card"]').first();
            if (await botCard.count() > 0) {
                await botCard.click();
                await page.waitForTimeout(1000);
                await page.screenshot({ path: 'test-results/flow-overview-03-detail.png', fullPage: true });
            }
        });
    });

    test.describe('Error Recovery Flow', () => {
        test('handles navigation to invalid pages gracefully', async ({ page }) => {
            // Invalid page should be handled
            await page.goto('/admin/nonexistent');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/flow-error-01-404.png', fullPage: true });

            // Should still be able to navigate back
            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            expect(page.url()).toContain('/admin');
            await page.screenshot({ path: 'test-results/flow-error-02-recovered.png', fullPage: true });
        });
    });

    test.describe('Breadcrumb Navigation', () => {
        test('can navigate using breadcrumbs', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Look for breadcrumbs
            const breadcrumbs = page.locator('[class*="breadcrumb"], nav >> ol, .breadcrumbs');

            if (await breadcrumbs.count() > 0) {
                await page.screenshot({ path: 'test-results/flow-breadcrumb-01.png', fullPage: true });

                // Click first breadcrumb (usually home/admin)
                const firstCrumb = breadcrumbs.locator('a').first();
                if (await firstCrumb.count() > 0) {
                    await firstCrumb.click();
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: 'test-results/flow-breadcrumb-02.png', fullPage: true });
                }
            }
        });
    });
});
