import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Marketplace Page', () => {
  test('Capture Marketplace Page', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Marketplace page
    await navigateAndWaitReady(page, '/admin/marketplace');

    // Wait for packages to load
    await page.waitForSelector('h1:has-text("Package Marketplace")', { timeout: 10000 });

    // Wait for package cards to appear (or loading spinner to disappear)
    await page.waitForTimeout(2000);

    // Screenshot Marketplace Page
    await page.screenshot({ path: 'docs/screenshots/marketplace-page.png', fullPage: true });

    // Verify package cards are present
    const packageCards = page.locator('.card');
    const count = await packageCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least one built-in package exists
    const builtInBadge = page.locator('span:has-text("Built-in")');
    await expect(builtInBadge.first()).toBeVisible();
  });

  test('Capture Install from URL Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Marketplace page
    await navigateAndWaitReady(page, '/admin/marketplace');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Package Marketplace")', { timeout: 10000 });

    // Click "Install from URL" button
    const installButton = page.locator('button:has-text("Install from URL")');
    await installButton.click();

    // Wait for modal to appear
    const modal = page.locator('.modal-box, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill in a sample URL for visual purposes
    await modal.locator('input[type="text"]').fill('https://github.com/user/custom-provider');

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Install Modal
    await page.screenshot({
      path: 'docs/screenshots/marketplace-install-modal.png',
      fullPage: true,
    });

    // Verify modal has correct content
    await expect(modal.locator('h3:has-text("Install Package from GitHub")')).toBeVisible();
    await expect(modal.locator('input[type="text"]')).toHaveValue(
      'https://github.com/user/custom-provider'
    );
  });

  test('Filter packages by type', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Marketplace page
    await navigateAndWaitReady(page, '/admin/marketplace');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Package Marketplace")', { timeout: 10000 });

    // Click on LLM filter tab
    const llmTab = page.locator('.tab:has-text("LLM")');
    await llmTab.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify only LLM packages are shown (check for LLM badge)
    const llmBadges = page.locator('.badge-outline:has-text("LLM")');
    const count = await llmBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});
