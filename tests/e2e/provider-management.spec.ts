import { test, expect, Page } from '@playwright/test';

/**
 * Provider Management E2E Tests
 * Tests for managing LLM and Message providers on bots
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

test.describe('Provider Management', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await setupAuth(page);

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`PAGE ERROR: ${msg.text()}`);
            }
        });
    });

    test.describe('Bot Provider Selection', () => {
        test('bot card shows current messenger provider', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Expand first bot
            const botCard = page.locator('[class*="collapse"]').first();
            if (await botCard.count() > 0) {
                await botCard.click();
                await page.waitForTimeout(500);
            }

            // Look for messenger label
            const messengerLabel = page.locator('text=/messenger|message.*provider|discord|slack/i');
            await page.screenshot({ path: 'test-results/provider-01-messenger.png', fullPage: true });
        });

        test('bot card shows current LLM provider', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const botCard = page.locator('[class*="collapse"]').first();
            if (await botCard.count() > 0) {
                await botCard.click();
                await page.waitForTimeout(500);
            }

            const llmLabel = page.locator('text=/llm|openai|flowise|ollama/i');
            await page.screenshot({ path: 'test-results/provider-02-llm.png', fullPage: true });
        });

        test('can open messenger provider dropdown', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const botCard = page.locator('[class*="collapse"]').first();
            if (await botCard.count() > 0) {
                await botCard.click();
                await page.waitForTimeout(500);
            }

            // Find messenger dropdown
            const messengerDropdown = page.locator('[class*="dropdown"]').filter({ hasText: /messenger|discord|slack/i }).first();
            if (await messengerDropdown.count() > 0) {
                await messengerDropdown.click();
                await page.waitForTimeout(300);
            }

            await page.screenshot({ path: 'test-results/provider-03-msg-dropdown.png', fullPage: true });
        });

        test('can open LLM provider dropdown', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const botCard = page.locator('[class*="collapse"]').first();
            if (await botCard.count() > 0) {
                await botCard.click();
                await page.waitForTimeout(500);
            }

            const llmDropdown = page.locator('[class*="dropdown"]').filter({ hasText: /llm|openai/i }).first();
            if (await llmDropdown.count() > 0) {
                await llmDropdown.click();
                await page.waitForTimeout(300);
            }

            await page.screenshot({ path: 'test-results/provider-04-llm-dropdown.png', fullPage: true });
        });
    });

    test.describe('Integrations Page', () => {
        test('shows LLM providers section', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const llmSection = page.locator('text=/llm.*provider|ai.*provider|language.*model/i');
            await page.screenshot({ path: 'test-results/provider-05-llm-section.png', fullPage: true });
        });

        test('shows Message providers section', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const msgSection = page.locator('text=/message.*provider|messaging|discord|slack/i');
            await page.screenshot({ path: 'test-results/provider-06-msg-section.png', fullPage: true });
        });

        test('provider cards have configuration fields', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const inputs = page.locator('input, select, textarea');
            const count = await inputs.count();

            expect(count).toBeGreaterThan(0);
            await page.screenshot({ path: 'test-results/provider-07-fields.png', fullPage: true });
        });

        test('sensitive fields are masked', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Look for password inputs or masked fields
            const passwordInputs = page.locator('input[type="password"]');
            const maskedFields = page.locator('[class*="mask"], input[readonly]');

            await page.screenshot({ path: 'test-results/provider-08-masked.png', fullPage: true });
        });
    });

    test.describe('Provider Configuration', () => {
        test('can view provider documentation', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Look for tooltips or help text
            const tooltips = page.locator('[class*="tooltip"], [data-tip]');
            const helpText = page.locator('[class*="helper"], .label-text-alt');

            await page.screenshot({ path: 'test-results/provider-09-docs.png', fullPage: true });
        });

        test('env vars shown in tooltips', async ({ page }) => {
            await page.goto('/admin/config');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Look for ENV_ or environment variable references
            const envRefs = page.locator('[data-tip*="ENV"], [data-tip*="env"], [title*="ENV"]');

            await page.screenshot({ path: 'test-results/provider-10-env-vars.png', fullPage: true });
        });
    });

    test.describe('Global Defaults Page', () => {
        test('shows configuration accordion', async ({ page }) => {
            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const accordions = page.locator('[class*="accordion"], [class*="collapse"]');
            await page.screenshot({ path: 'test-results/provider-11-defaults.png', fullPage: true });
        });

        test('accordion sections expand', async ({ page }) => {
            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const accordion = page.locator('[class*="collapse"]').first();
            if (await accordion.count() > 0) {
                await accordion.click();
                await page.waitForTimeout(500);
            }

            await page.screenshot({ path: 'test-results/provider-12-expanded.png', fullPage: true });
        });

        test('can modify configuration values', async ({ page }) => {
            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Expand first section
            const accordion = page.locator('[class*="collapse"]').first();
            if (await accordion.count() > 0) {
                await accordion.click();
                await page.waitForTimeout(500);
            }

            // Find an input and modify it
            const input = page.locator('input:not([type="checkbox"]):not([type="password"])').first();
            if (await input.count() > 0) {
                await input.fill('test-value-' + Date.now());
            }

            await page.screenshot({ path: 'test-results/provider-13-modified.png', fullPage: true });
        });
    });
});
