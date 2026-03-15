import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Marketplace Page', () => {
  test('Capture Marketplace Page', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock the API response to provide packages
    await page.route('**/api/marketplace/packages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'open-hivemind/llm-openai',
            displayName: 'OpenAI Integration',
            description: 'Core LLM integration for OpenAI GPT models',
            type: 'llm',
            version: '1.0.0',
            status: 'built-in'
          },
          {
            name: 'open-hivemind/message-discord',
            displayName: 'Discord Integration',
            description: 'Core messaging integration for Discord',
            type: 'message',
            version: '1.0.0',
            status: 'built-in'
          },
          {
            name: 'custom/memory-redis',
            displayName: 'Redis Memory Storage',
            description: 'High-performance Redis memory storage',
            type: 'memory',
            version: '2.1.0',
            status: 'installed',
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: 'community/tool-weather',
            displayName: 'Weather Tool',
            description: 'Check current weather anywhere',
            type: 'tool',
            version: '0.9.5',
            status: 'available',
            repoUrl: 'https://github.com/community/tool-weather'
          }
        ]),
      });
    });

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

    // Mock the API response to provide packages
    await page.route('**/api/marketplace/packages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'open-hivemind/llm-openai',
            displayName: 'OpenAI Integration',
            description: 'Core LLM integration for OpenAI GPT models',
            type: 'llm',
            version: '1.0.0',
            status: 'built-in'
          },
          {
            name: 'open-hivemind/message-discord',
            displayName: 'Discord Integration',
            description: 'Core messaging integration for Discord',
            type: 'message',
            version: '1.0.0',
            status: 'built-in'
          }
        ]),
      });
    });

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

    // Mock the API response to provide packages
    await page.route('**/api/marketplace/packages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'open-hivemind/llm-openai',
            displayName: 'OpenAI Integration',
            description: 'Core LLM integration for OpenAI GPT models',
            type: 'llm',
            version: '1.0.0',
            status: 'built-in'
          },
          {
            name: 'open-hivemind/message-discord',
            displayName: 'Discord Integration',
            description: 'Core messaging integration for Discord',
            type: 'message',
            version: '1.0.0',
            status: 'built-in'
          }
        ]),
      });
    });

    // Navigate to Marketplace page
    await navigateAndWaitReady(page, '/admin/marketplace');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Package Marketplace")', { timeout: 10000 });

    // Wait for loading spinner to disappear and cards to appear
    await page.waitForSelector('.card', { state: 'visible', timeout: 10000 });

    // Click on LLM filter tab
    const llmTab = page.getByRole('button', { name: 'LLM', exact: true });
    await llmTab.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify only LLM packages are shown
    // Let's match by looking at the package cards directly, waiting for them to populate.
    await page.waitForSelector('.card', { state: 'visible', timeout: 10000 });
    const packageCards = page.locator('.card');
    const count = await packageCards.count();
    expect(count).toBeGreaterThan(0);

    // We expect 1 LLM package based on our mock data.
    expect(count).toBe(1);

    // Optional: wait for badge
    const llmBadge = page.locator('.card span.badge-outline', { hasText: /LLM/i });
    await expect(llmBadge).toBeVisible();
  });
});
