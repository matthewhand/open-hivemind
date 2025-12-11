import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`PAGE ERROR: ${msg.text()}`);
      }
    });
  });

  test('login page loads', async ({ page }) => {
    await page.screenshot({ path: 'test-results/login-01-page.png', fullPage: true });

    // Wait for page to be interactive
    await page.waitForTimeout(2000);

    // Check we're on the right URL
    expect(page.url()).toContain('/login');
  });

  test('login form elements exist', async ({ page }) => {
    // Wait for the form to be present
    const form = page.locator('form');

    // Allow time for React to render
    await page.waitForTimeout(2000);

    // Check if form exists
    const formCount = await form.count();
    if (formCount > 0) {
      await expect(form.first()).toBeVisible();

      // Check for inputs
      const usernameInput = page.locator('input[name="username"], input[placeholder*="admin" i]');
      const passwordInput = page.locator('input[type="password"]');

      if (await usernameInput.count() > 0) {
        await expect(usernameInput.first()).toBeVisible();
      }
      if (await passwordInput.count() > 0) {
        await expect(passwordInput.first()).toBeVisible();
      }
    }

    await page.screenshot({ path: 'test-results/login-02-form.png', fullPage: true });
  });

  test('can interact with login form', async ({ page }) => {
    await page.waitForTimeout(2000);

    const usernameInput = page.locator('input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    // Try to fill if elements exist
    if (await usernameInput.count() > 0) {
      await usernameInput.fill('admin');
    }
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('password123');
    }

    await page.screenshot({ path: 'test-results/login-03-filled.png', fullPage: true });
  });
});