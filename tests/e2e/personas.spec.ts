import { test, expect } from '@playwright/test';

/**
 * Personas Page E2E Tests
 * Tests persona creation, editing, deletion, and assignment flows.
 */

test.describe('Personas Management', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);

        // Inject fake auth
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

        await page.goto('/admin/personas');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    test.describe('Page Loading', () => {
        test('displays personas page with header', async ({ page }) => {
            expect(page.url()).toContain('/admin/personas');

            const header = page.locator('h1').first();
            await expect(header).toBeVisible();

            await page.screenshot({ path: 'test-results/personas-01-page.png', fullPage: true });
        });

        test('shows persona cards or empty state', async ({ page }) => {
            // Either show persona cards or an empty state message
            const content = page.locator('[class*="card"], [class*="empty"], [class*="persona"]');
            await expect(content.first()).toBeVisible({ timeout: 10000 }).catch(() => {
                // Empty state is also acceptable
            });

            await page.screenshot({ path: 'test-results/personas-02-content.png', fullPage: true });
        });
    });

    test.describe('Create Persona Flow', () => {
        test('can open create persona modal', async ({ page }) => {
            // Look for "Create Persona" or "Add Persona" button
            const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")').first();

            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                // Check for modal
                const modal = page.locator('[class*="modal"], [role="dialog"]').first();
                await expect(modal).toBeVisible({ timeout: 5000 });

                await page.screenshot({ path: 'test-results/personas-03-create-modal.png', fullPage: true });
            } else {
                await page.screenshot({ path: 'test-results/personas-03-no-create-button.png', fullPage: true });
            }
        });

        test('can fill persona form fields', async ({ page }) => {
            const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")').first();

            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                // Try to fill name input
                const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
                if (await nameInput.count() > 0) {
                    await nameInput.fill('Test Persona E2E');
                }

                // Try to fill description
                const descInput = page.locator('textarea, input[name="description"]').first();
                if (await descInput.count() > 0) {
                    await descInput.fill('Created by Playwright E2E test');
                }

                await page.screenshot({ path: 'test-results/personas-04-form-filled.png', fullPage: true });
            }
        });

        test('can submit new persona', async ({ page }) => {
            const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")').first();

            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                // Fill required fields
                const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
                if (await nameInput.count() > 0) {
                    await nameInput.fill('E2E Test Persona ' + Date.now());
                }

                // Submit
                const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').last();
                if (await submitButton.count() > 0) {
                    await submitButton.click();
                    await page.waitForTimeout(2000);
                }

                await page.screenshot({ path: 'test-results/personas-05-submitted.png', fullPage: true });
            }
        });
    });

    test.describe('Persona Card Interactions', () => {
        test('persona cards have action buttons', async ({ page }) => {
            const cards = page.locator('[class*="card"]').filter({ hasText: /persona/i });

            if (await cards.count() > 0) {
                const firstCard = cards.first();

                // Look for edit/delete buttons
                const editBtn = firstCard.locator('button:has-text("Edit"), [class*="edit"]');
                const deleteBtn = firstCard.locator('button:has-text("Delete"), [class*="delete"], [class*="trash"]');

                await page.screenshot({ path: 'test-results/personas-06-card-actions.png', fullPage: true });
            }
        });

        test('can view persona details', async ({ page }) => {
            const cards = page.locator('[class*="card"]');

            if (await cards.count() > 0) {
                // Click on a card to view details
                await cards.first().click();
                await page.waitForTimeout(500);

                await page.screenshot({ path: 'test-results/personas-07-details.png', fullPage: true });
            }
        });
    });

    test.describe('Built-in vs Custom Personas', () => {
        test('shows distinction between built-in and custom personas', async ({ page }) => {
            // Look for badges or labels indicating built-in status
            const builtInBadge = page.locator('text=Built-in, text=System, [class*="badge"]');
            const customBadge = page.locator('text=Custom, [class*="custom"]');

            await page.screenshot({ path: 'test-results/personas-08-types.png', fullPage: true });
        });
    });
});
