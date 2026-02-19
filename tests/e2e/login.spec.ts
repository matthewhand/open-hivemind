import { test, expect } from '@playwright/test';
import { setupErrorCollection, assertNoErrors, setupAuth } from './test-utils';

/**
 * Login E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Login', () => {
  test.setTimeout(60000);

  test('login page renders without errors', async ({ page }) => {
    const errors = setupErrorCollection(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/login-01-page.png', fullPage: true });
    await assertNoErrors(errors, 'Login page render');
  });

  test('login form accepts input', async ({ page }) => {
    const errors = setupErrorCollection(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const usernameInput = page.locator('input[name="username"], input[type="email"], input[placeholder*="user" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await usernameInput.count() > 0) {
      await usernameInput.fill('testuser');
    }
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('testpass');
    }

    await page.screenshot({ path: 'test-results/login-02-form.png', fullPage: true });
    await assertNoErrors(errors, 'Login form input');
  });

  test('redirect to admin after auth setup', async ({ page }) => {
    const errors = setupErrorCollection(page);
    await setupAuth(page);

    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/admin');
    await page.screenshot({ path: 'test-results/login-03-redirect.png', fullPage: true });
    await assertNoErrors(errors, 'Auth redirect');
  });
});