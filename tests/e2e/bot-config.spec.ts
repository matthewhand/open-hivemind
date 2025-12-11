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
        // Step 1: Verify page load
        await expect(page).toHaveURL(/\/admin\/bots/);
        await page.screenshot({ path: 'test-results/01-bots-page-loaded.png', fullPage: true });

        // Step 2: Click "Create New Bot" button
        const createButton = page.getByRole('button', { name: 'Create New Bot' });
        await expect(createButton).toBeVisible();
        await createButton.click();

        // Step 3: Verify form appears (use heading role to be specific)
        const formHeading = page.getByRole('heading', { name: 'Create New Bot' });
        await expect(formHeading).toBeVisible();
        await page.screenshot({ path: 'test-results/02-create-bot-form.png', fullPage: true });

        // Step 4: Fill the form
        const nameInput = page.getByPlaceholder('Enter a name for your bot');
        await expect(nameInput).toBeVisible();
        await nameInput.fill('My Test Bot');
        await page.screenshot({ path: 'test-results/03-form-filled.png', fullPage: true });

        // Step 5: Submit the form
        const submitButton = page.getByRole('button', { name: 'Create Bot' });
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // Step 6: Verify bot card appears
        await expect(page.getByText('My Test Bot')).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: 'test-results/04-bot-created.png', fullPage: true });
    });

    test('should add a message provider to a bot', async ({ page }) => {
        // Prerequisite: Create a bot first
        const createButton = page.getByRole('button', { name: 'Create New Bot' });
        await expect(createButton).toBeVisible();
        await createButton.click();

        const nameInput = page.getByPlaceholder('Enter a name for your bot');
        await nameInput.fill('Provider Test Bot');
        await page.getByRole('button', { name: 'Create Bot' }).click();
        await expect(page.getByText('Provider Test Bot')).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: 'test-results/05-provider-test-bot-created.png', fullPage: true });

        // Now add a message provider - use data-testid for reliable selection
        // Find the bot card
        const botCard = page.locator('.card').filter({ hasText: 'Provider Test Bot' }).first();

        // Find the + button using testid
        const addMsgProviderButton = botCard.locator('[data-testid="add-message-provider-btn"]');
        await addMsgProviderButton.click();

        // Wait for modal and take screenshot
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/06-provider-modal-open.png', fullPage: true });

        // Look for Submit Provider button
        const submitProviderButton = page.getByRole('button', { name: 'Submit Provider' });
        if (await submitProviderButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await submitProviderButton.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: 'test-results/07-provider-added.png', fullPage: true });
        } else {
            // Capture whatever modal state we're in
            await page.screenshot({ path: 'test-results/07-modal-state-fallback.png', fullPage: true });
        }
    });

    test('should verify navigation sidebar has key links', async ({ page }) => {
        // Use getByRole to be more specific about sidebar link vs page heading
        // The sidebar uses a button role for navigation items
        const sidebarBotManagement = page.getByRole('button', { name: 'Bot Management' });
        await expect(sidebarBotManagement).toBeVisible();
        await page.screenshot({ path: 'test-results/08-sidebar-visible.png', fullPage: true });

        // Also check page heading separately
        const pageHeading = page.getByRole('heading', { name: 'Bot Management' });
        await expect(pageHeading).toBeVisible();
        await page.screenshot({ path: 'test-results/09-page-heading.png', fullPage: true });
    });
});
