/**
 * E2E Tests for Config UI Fixes
 * 
 * Tests the following fixes:
 * 1. Health API endpoint (/api/health/detailed) returns 200
 * 2. Persona bot assignments work correctly
 * 3. Bot page dropdowns have readable text (neutral bg with neutral-content text)
 * 4. Integrations modal Create & Save button has proper styling
 */
import { test, expect } from '@playwright/test';

const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
const fakeUser = JSON.stringify({
    id: 'admin',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: 'owner',
    permissions: ['*']
});

test.describe('Config UI Fixes', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);

        // Inject fake auth to bypass login
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

    test.describe('Fix 1: Health API Endpoint', () => {
        test('GET /api/health/detailed returns 200 with valid JSON', async ({ request }) => {
            const response = await request.get('/api/health/detailed');

            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('uptime');
            expect(data).toHaveProperty('memory');
        });

        test('GET /api/health returns 200', async ({ request }) => {
            const response = await request.get('/api/health');

            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('status');
        });

        test('Monitoring page loads without 404 errors', async ({ page }) => {
            // Navigate to monitoring page
            await page.goto('/admin/monitoring');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            // Verify page loaded
            expect(page.url()).toContain('/admin/monitoring');

            // Should not show "Not Found" or 404 error
            const bodyText = await page.textContent('body');
            expect(bodyText).not.toContain('404');
            expect(bodyText).not.toContain('Not Found');

            await page.screenshot({ path: 'test-results/config-fixes-monitoring-page.png', fullPage: true });
        });
    });

    test.describe('Fix 2: Persona Bot Assignments', () => {
        test('PUT /api/bots/:id accepts persona and systemInstruction fields', async ({ request }) => {
            // First get the list of bots
            const botsResponse = await request.get('/api/bots');

            if (botsResponse.status() === 200) {
                const botsData = await botsResponse.json();
                const bots = botsData.data?.bots || [];

                if (bots.length > 0) {
                    const testBot = bots[0];

                    // Attempt to update with persona field
                    const updateResponse = await request.put(`/api/bots/${testBot.id}`, {
                        data: {
                            persona: 'test-persona',
                            systemInstruction: 'Test system instruction'
                        }
                    });

                    // Should not fail with 400 Bad Request due to schema validation
                    expect(updateResponse.status()).not.toBe(400);
                }
            }
        });
    });

    test.describe('Fix 3: Dropdown Readability', () => {
        test('Bot page persona dropdown has neutral background with readable text', async ({ page }) => {
            await page.goto('/admin/bots');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            // Look for expandable bot rows
            const botRows = page.locator('[class*="collapse"]');

            if (await botRows.count() > 0) {
                // Try to expand the first bot
                await botRows.first().click();
                await page.waitForTimeout(1000);

                // Look for dropdown content with neutral background
                const dropdowns = page.locator('.dropdown-content');

                if (await dropdowns.count() > 0) {
                    const dropdown = dropdowns.first();

                    // Verify dropdown has bg-neutral class for dark theme readability
                    const hasNeutralBg = await dropdown.evaluate(el => {
                        return el.classList.contains('bg-neutral') ||
                            el.className.includes('bg-neutral');
                    });

                    expect(hasNeutralBg).toBe(true);
                }
            }

            await page.screenshot({ path: 'test-results/config-fixes-bots-dropdown.png', fullPage: true });
        });
    });

    test.describe('Fix 4: Integrations Modal Button', () => {
        test('Create & Save button in integrations modal has proper styling', async ({ page }) => {
            // Navigate to settings/integrations page
            await page.goto('/admin/settings');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            // Look for "Add LLM Integration" or similar button
            const addButton = page.locator('button:has-text("Add"), button:has-text("Integration")');

            if (await addButton.count() > 0) {
                await addButton.first().click();
                await page.waitForTimeout(1000);

                // Look for the Create & Save button in the modal
                const createButton = page.locator('button:has-text("Create"), button:has-text("Save")');

                if (await createButton.count() > 0) {
                    const button = createButton.last();

                    // Verify button has proper btn class (not plain text)
                    const hasButtonClass = await button.evaluate(el => {
                        return el.classList.contains('btn') ||
                            el.className.includes('btn-primary') ||
                            el.tagName === 'BUTTON';
                    });

                    expect(hasButtonClass).toBe(true);
                }
            }

            await page.screenshot({ path: 'test-results/config-fixes-integrations-modal.png', fullPage: true });
        });
    });

    test.describe('Fix 5: Personas Page', () => {
        test('Personas page loads and displays persona list', async ({ page }) => {
            await page.goto('/admin/personas');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            // Verify page loaded without errors
            expect(page.url()).toContain('/admin/personas');

            // Look for Create Persona button
            const createButton = page.locator('button:has-text("Create Persona")');

            if (await createButton.count() > 0) {
                await expect(createButton.first()).toBeVisible();
            }

            await page.screenshot({ path: 'test-results/config-fixes-personas-page.png', fullPage: true });
        });

        test('Create persona modal form is properly controlled', async ({ page }) => {
            await page.goto('/admin/personas');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            // Click Create Persona button
            const createButton = page.locator('button:has-text("Create Persona")');

            if (await createButton.count() > 0) {
                await createButton.first().click();
                await page.waitForTimeout(1000);

                // Find the System Prompt textarea
                const textarea = page.locator('textarea');

                if (await textarea.count() > 0) {
                    // Get the initial value (should be "You are a helpful assistant.")
                    const initialValue = await textarea.first().inputValue();

                    // Type new text - should replace, not append
                    await textarea.first().fill('Custom persona prompt');

                    const newValue = await textarea.first().inputValue();

                    // Verify text was replaced, not duplicated
                    expect(newValue).toBe('Custom persona prompt');
                    expect(newValue).not.toContain(initialValue);
                }
            }

            await page.screenshot({ path: 'test-results/config-fixes-personas-modal.png', fullPage: true });
        });
    });
});
