/**
 * Bot Create Page - Intelligence Section Layout Regression Tests
 *
 * Prevents regression of the grid misalignment bug where the System Instruction
 * text area used md:col-span-2 (compressing content horizontally and pushing the
 * LLM Provider dropdown out of alignment) instead of md:row-span-2 (spanning
 * vertically as intended).
 */
import { test, expect } from '@playwright/test';

test.describe('BotCreatePage - Intelligence & Personality section layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/bots/create');
        // Navigate to the Intelligence & Personality step (step 2)
        // Click Next to move past the first "Bot Identity" step
        const nextBtn = page.getByRole('button', { name: /next/i }).first();
        if (await nextBtn.isVisible()) {
            await nextBtn.click();
        }
    });

    test('System Instruction textarea is visible and not horizontally compressed', async ({ page }) => {
        const textarea = page.locator('textarea').filter({ hasText: '' }).first();
        await expect(textarea).toBeVisible();

        const box = await textarea.boundingBox();
        // Textarea should be at least 200px wide — if it's compressed it'll be much narrower
        expect(box?.width).toBeGreaterThan(200);
    });

    test('LLM Provider dropdown is visible and not pushed off-screen', async ({ page }) => {
        const llmLabel = page.locator('label', { hasText: /LLM Provider/i });
        await expect(llmLabel).toBeVisible();

        const llmSelect = llmLabel.locator('~ *').first();
        const box = await llmLabel.boundingBox();
        // Label should be within the visible viewport (not scrolled below or off to the right)
        expect(box?.x).toBeLessThan(1280);
        expect(box?.y).toBeLessThan(900);
    });

    test('Persona selector and System Instruction are in the same visible grid section', async ({ page }) => {
        const personaLabel = page.locator('label', { hasText: /Persona/i }).first();
        const systemInstructionLabel = page.locator('label', { hasText: /System Instruction/i }).first();

        await expect(personaLabel).toBeVisible();
        await expect(systemInstructionLabel).toBeVisible();

        const personaBox = await personaLabel.boundingBox();
        const siBox = await systemInstructionLabel.boundingBox();

        // Both should be in the same horizontal band (within 300px vertically of each other)
        if (personaBox && siBox) {
            expect(Math.abs(personaBox.y - siBox.y)).toBeLessThan(300);
        }
    });

    test('character count shows 0/2000 initially', async ({ page }) => {
        const charCount = page.locator('text=/^0\\/2000$/');
        await expect(charCount).toBeVisible();
    });

    test('typing in System Instruction updates character count', async ({ page }) => {
        const sampleText = 'You are a helpful assistant.';
        const textarea = page.locator('[placeholder*="helpful"]').first();
        await textarea.fill(sampleText);

        const charCount = page.locator(`text=/${sampleText.length}\\/2000/`);
        await expect(charCount).toBeVisible();
    });

    test('warning appears when system instruction is very short (1-9 chars)', async ({ page }) => {
        const textarea = page.locator('[placeholder*="helpful"]').first();
        await textarea.fill('Hi');

        const warning = page.locator('text=/very short/i');
        await expect(warning).toBeVisible();
    });

    test('error appears when system instruction exceeds 2000 chars', async ({ page }) => {
        const textarea = page.locator('[placeholder*="helpful"]').first();
        const longText = 'a'.repeat(2001);
        await textarea.fill(longText);

        const error = page.locator('text=/very long/i');
        await expect(error).toBeVisible();
    });
});
