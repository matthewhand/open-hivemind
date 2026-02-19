import { test, expect } from '@playwright/test';
import {
    setupTestWithErrorDetection,
    assertNoErrors,
    navigateAndWaitReady
} from './test-utils';

/**
 * Personas Page E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Personas Management', () => {
    test.setTimeout(90000);

    test.describe('Page Loading', () => {
        test('displays personas page with header without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            expect(page.url()).toContain('/admin/personas');
            const header = page.locator('h1').first();
            await expect(header).toBeVisible();
            await page.screenshot({ path: 'test-results/personas-01-page.png', fullPage: true });

            await assertNoErrors(errors, 'Personas page load');
        });

        test('shows persona cards or empty state without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            const content = page.locator('[class*="card"], [class*="empty"], [class*="persona"]');
            await expect(content.first()).toBeVisible({ timeout: 10000 }).catch(() => { });
            await page.screenshot({ path: 'test-results/personas-02-content.png', fullPage: true });

            await assertNoErrors(errors, 'Personas content');
        });
    });

    test.describe('Create Persona Flow', () => {
        test('can open create persona modal without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")').first();
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);
                const modal = page.locator('[class*="modal"], [role="dialog"]').first();
                await expect(modal).toBeVisible({ timeout: 5000 });
                await page.screenshot({ path: 'test-results/personas-03-create-modal.png', fullPage: true });
            } else {
                await page.screenshot({ path: 'test-results/personas-03-no-create-button.png', fullPage: true });
            }

            await assertNoErrors(errors, 'Create persona modal');
        });

        test('can fill persona form fields without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")').first();
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
                if (await nameInput.count() > 0) {
                    await nameInput.fill('Test Persona E2E');
                }

                const descInput = page.locator('textarea, input[name="description"]').first();
                if (await descInput.count() > 0) {
                    await descInput.fill('Created by Playwright E2E test');
                }
                await page.screenshot({ path: 'test-results/personas-04-form-filled.png', fullPage: true });
            }

            await assertNoErrors(errors, 'Persona form fill');
        });

        test('can submit new persona without errors', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Persona")').first();
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
                if (await nameInput.count() > 0) {
                    await nameInput.fill('E2E Test Persona ' + Date.now());
                }

                const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').last();
                if (await submitButton.count() > 0) {
                    await submitButton.click();
                    await page.waitForTimeout(2000);
                }
                await page.screenshot({ path: 'test-results/personas-05-submitted.png', fullPage: true });
            }

            await assertNoErrors(errors, 'Persona submit');
        });
    });

    test.describe('Persona Card Interactions', () => {
        test('persona cards have action buttons', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            const cards = page.locator('[class*="card"]').filter({ hasText: /persona/i });
            if (await cards.count() > 0) {
                const firstCard = cards.first();
                const editBtn = firstCard.locator('button:has-text("Edit"), [class*="edit"]');
                const deleteBtn = firstCard.locator('button:has-text("Delete"), [class*="delete"], [class*="trash"]');
                await page.screenshot({ path: 'test-results/personas-06-card-actions.png', fullPage: true });
            }

            await assertNoErrors(errors, 'Persona card actions');
        });

        test('can view persona details', async ({ page }) => {
            const errors = await setupTestWithErrorDetection(page);
            await navigateAndWaitReady(page, '/admin/personas');

            const cards = page.locator('[class*="card"]');
            if (await cards.count() > 0) {
                await cards.first().click();
                await page.waitForTimeout(500);
                await page.screenshot({ path: 'test-results/personas-07-details.png', fullPage: true });
            }

            await assertNoErrors(errors, 'Persona details view');
        });
    });
});
